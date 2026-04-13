from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from api.db import get_connection, get_cursor

orders_bp = Blueprint("orders", __name__)

TAX_RATE = Decimal("0.0825")


def _normalize_customization_ids(raw):
    if not raw:
        return []
    if not isinstance(raw, list):
        return []
    out = []
    for x in raw:
        try:
            out.append(int(x))
        except (TypeError, ValueError):
            continue
    return list(dict.fromkeys(out))


def _resolve_customization_ids_by_name(cur, ice_name, sugar_name):
    """Map legacy kiosk string labels to customization_options ids."""
    ids = []
    for label in (ice_name, sugar_name):
        if not label or not str(label).strip():
            continue
        cur.execute(
            """
            SELECT id FROM customization_options
            WHERE lower(name) = lower(%s)
            LIMIT 1
            """,
            (str(label).strip(),),
        )
        row = cur.fetchone()
        if row:
            ids.append(row[0])
    return ids


def _unit_price_for_line(cur, menu_item_id, customization_ids):
    cur.execute("SELECT price FROM menu_items WHERE id = %s", (menu_item_id,))
    row = cur.fetchone()
    if not row:
        raise ValueError(f"Unknown menu item id={menu_item_id}")
    base = Decimal(str(row[0] or 0))
    if not customization_ids:
        return base
    cur.execute(
        """
        SELECT COALESCE(SUM(price_modifier), 0)
        FROM customization_options
        WHERE id IN %s
        """,
        (tuple(customization_ids),),
    )
    mod = Decimal(str(cur.fetchone()[0] or 0))
    return (base + mod).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _apply_customization_inventory(cur, menu_item_id, qty, customization_ids):
    if not customization_ids:
        return
    cur.execute(
        """
        SELECT inventory_item_id, COALESCE(inventory_use_qty, 1)
        FROM customization_options
        WHERE id IN %s AND inventory_item_id IS NOT NULL
        """,
        (tuple(customization_ids),),
    )
    for inv_id, use_qty in cur.fetchall():
        delta = Decimal(str(use_qty or 1)) * int(qty)
        cur.execute(
            """
            UPDATE inventory_items
            SET quantity = COALESCE(quantity, 0) - %s
            WHERE id = %s
            """,
            (delta, inv_id),
        )


@orders_bp.route("", methods=["POST"])
def submit_order():
    body = request.get_json(silent=True) or {}
    cart = body.get("cart", [])
    payment_method = body.get("paymentMethod", "CARD")
    legacy_custom = body.get("customizations") or {}

    if not cart:
        return jsonify({"error": "Cart is empty."}), 400

    method_upper = payment_method.upper()

    with get_connection() as conn:
        cur = conn.cursor()
        try:
            gross = Decimal("0")
            normalized_lines = []

            for item in cart:
                menu_item_id = int(item["menuItemId"])
                qty = int(item["qty"])
                if qty < 1:
                    return jsonify({"error": "Invalid quantity."}), 400

                cids = _normalize_customization_ids(item.get("customizationIds"))
                normalized_lines.append((menu_item_id, qty, cids))

            legacy_ids = []
            if legacy_custom:
                legacy_ids = _resolve_customization_ids_by_name(
                    cur,
                    legacy_custom.get("ice"),
                    legacy_custom.get("sugar"),
                )
            if legacy_ids:
                normalized_lines = [
                    (
                        mid,
                        q,
                        _normalize_customization_ids(list(dict.fromkeys(lids + legacy_ids))),
                    )
                    for mid, q, lids in normalized_lines
                ]

            for menu_item_id, qty, cids in normalized_lines:
                unit = _unit_price_for_line(cur, menu_item_id, cids)
                gross += unit * qty

            tax = (gross * TAX_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            net = (gross + tax).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            pay_cash = net if method_upper == "CASH" else Decimal("0")
            pay_credit = net if method_upper == "CARD" else Decimal("0")
            pay_debit = Decimal("0")
            pay_other = net if method_upper == "MOBILE" else Decimal("0")

            cur.execute(
                "INSERT INTO orders(order_date, total_amount, payment_method) "
                "VALUES(%s, %s, %s) RETURNING id",
                (datetime.now(), net, method_upper),
            )
            order_id = cur.fetchone()[0]

            for menu_item_id, qty, cids in normalized_lines:
                cur.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM order_items")
                next_id = cur.fetchone()[0]
                unit = _unit_price_for_line(cur, menu_item_id, cids)
                cur.execute(
                    "INSERT INTO order_items(id, order_id, menu_item_id, quantity) "
                    "VALUES(%s, %s, %s, %s)",
                    (next_id, order_id, menu_item_id, qty),
                )
                for cid in cids:
                    cur.execute(
                        """
                        INSERT INTO order_item_customizations
                            (order_item_id, customization_option_id)
                        VALUES (%s, %s)
                        """,
                        (next_id, cid),
                    )

                cur.execute(
                    """
                    UPDATE inventory_items inv
                    SET quantity = COALESCE(inv.quantity, 0) - (r.quantity_needed * %s)
                    FROM recipes r
                    WHERE r.menu_item_id = %s
                      AND r.inventory_item_id = inv.id
                    """,
                    (qty, menu_item_id),
                )
                _apply_customization_inventory(cur, menu_item_id, qty, cids)

            cur.execute(
                """
                UPDATE daily_totals
                SET gross_sales   = gross_sales   + %s,
                    tax_collected = tax_collected + %s,
                    net_sales     = net_sales     + %s,
                    total_cash    = total_cash    + %s,
                    pay_cash      = pay_cash      + %s,
                    pay_credit    = pay_credit    + %s,
                    pay_debit     = pay_debit     + %s,
                    pay_other     = pay_other     + %s,
                    order_count   = order_count   + 1
                WHERE id = (SELECT id FROM daily_totals ORDER BY report_date DESC LIMIT 1)
                """,
                (gross, tax, net, net, pay_cash, pay_credit, pay_debit, pay_other),
            )

            conn.commit()
            return jsonify({"success": True, "orderId": order_id, "orderNumber": order_id}), 201

        except Exception as ex:
            conn.rollback()
            err = str(ex)
            el = err.lower()
            if (
                "order_item_customizations" in err
                or "customization_options" in err
                or 'column "customizable"' in el
                or "undefinedcolumn" in el.replace(" ", "")
            ):
                return jsonify({
                    "error": "Database migration required: run migrations/001_customization_schema.sql",
                    "detail": err,
                }), 503
            raise
        finally:
            cur.close()


@orders_bp.route("/recent", methods=["GET"])
def recent_orders():
    limit = request.args.get("limit", 20, type=int)
    sql = (
        "SELECT id, order_date, total_amount FROM orders "
        "ORDER BY order_date DESC NULLS LAST LIMIT %s"
    )

    with get_cursor() as cur:
        cur.execute(sql, (limit,))
        rows = cur.fetchall()

    return jsonify([
        {
            "id": r[0],
            "orderDate": r[1].isoformat() if r[1] else None,
            "total": float(r[2]) if r[2] else 0,
        }
        for r in rows
    ])


@orders_bp.route("/<int:order_id>", methods=["GET"])
def get_order_detail(order_id):
    with get_cursor() as cur:
        cur.execute(
            "SELECT id, order_date, total_amount, payment_method FROM orders WHERE id = %s",
            (order_id,),
        )
        order_row = cur.fetchone()
        if not order_row:
            return jsonify({"error": "Order not found."}), 404

        cur.execute(
            "SELECT oi.menu_item_id, oi.quantity, m.name "
            "FROM order_items oi "
            "JOIN menu_items m ON oi.menu_item_id = m.id "
            "WHERE oi.order_id = %s "
            "ORDER BY oi.id",
            (order_id,),
        )
        item_rows = cur.fetchall()

    return jsonify({
        "id": order_row[0],
        "orderDate": order_row[1].isoformat() if order_row[1] else None,
        "totalAmount": float(order_row[2]) if order_row[2] else 0,
        "paymentMethod": order_row[3] or None,
        "items": [
            {
                "menuItemId": r[0],
                "quantity": int(r[1]),
                "name": r[2] or "Unknown item",
            }
            for r in item_rows
        ],
    })


@orders_bp.route("/sales-summary", methods=["GET"])
def sales_summary():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify({"error": "start and end query params are required."}), 400

    sql = """
        SELECT DATE(order_date), COUNT(*), SUM(total_amount)
        FROM orders
        WHERE order_date BETWEEN %s::timestamp AND %s::timestamp
        GROUP BY DATE(order_date)
        ORDER BY DATE(order_date)
    """

    with get_cursor() as cur:
        cur.execute(sql, (start, end))
        rows = cur.fetchall()

    return jsonify([
        {
            "date": str(r[0]),
            "count": r[1],
            "revenue": float(r[2]) if r[2] else 0,
        }
        for r in rows
    ])


@orders_bp.route("/top-selling", methods=["GET"])
def top_selling():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify({"error": "start and end query params are required."}), 400

    sql = """
        SELECT m.name, SUM(oi.quantity)
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.order_date BETWEEN %s::timestamp AND %s::timestamp
        GROUP BY m.name
        ORDER BY SUM(oi.quantity) DESC
    """

    with get_cursor() as cur:
        cur.execute(sql, (start, end))
        rows = cur.fetchall()

    return jsonify([
        {"name": r[0], "quantity": int(r[1])}
        for r in rows
    ])


@orders_bp.route("/x-report", methods=["GET"])
def x_report():
    date_str = request.args.get("date")
    if not date_str:
        date_str = str(date.today())

    sql = """
        SELECT
            EXTRACT(HOUR FROM order_date)::int AS hr,
            COUNT(*)::int AS sales_count,
            COALESCE(SUM(total_amount), 0) AS sales_amount,
            COUNT(*) FILTER (WHERE payment_method = 'CASH')::int AS cash_count,
            COALESCE(SUM(total_amount) FILTER (WHERE payment_method = 'CASH'), 0) AS cash_amount,
            COUNT(*) FILTER (WHERE payment_method = 'CARD')::int AS card_count,
            COALESCE(SUM(total_amount) FILTER (WHERE payment_method = 'CARD'), 0) AS card_amount,
            COUNT(*) FILTER (WHERE payment_method = 'MOBILE')::int AS mobile_count,
            COALESCE(SUM(total_amount) FILTER (WHERE payment_method = 'MOBILE'), 0) AS mobile_amount
        FROM orders
        WHERE order_date >= %s::timestamp
          AND order_date < (%s::timestamp + INTERVAL '1 day')
        GROUP BY hr
        ORDER BY hr
    """

    report_date = date_str
    with get_cursor() as cur:
        cur.execute(sql, (report_date, report_date))
        db_rows = cur.fetchall()

    by_hour = {}
    for r in db_rows:
        by_hour[r[0]] = {
            "salesCount": r[1],
            "salesAmount": float(r[2]),
            "cashCount": r[3],
            "cashAmount": float(r[4]),
            "cardCount": r[5],
            "cardAmount": float(r[6]),
            "mobileCount": r[7],
            "mobileAmount": float(r[8]),
        }

    is_today = date_str == str(date.today())
    max_hour = datetime.now().hour if is_today else 23

    rows = []
    total_count = 0
    total_sales = 0.0

    for hour in range(max_hour + 1):
        b = by_hour.get(hour, {
            "salesCount": 0, "salesAmount": 0,
            "cashCount": 0, "cashAmount": 0,
            "cardCount": 0, "cardAmount": 0,
            "mobileCount": 0, "mobileAmount": 0,
        })
        total_count += b["salesCount"]
        total_sales += b["salesAmount"]
        rows.append({
            "hour": f"{hour:02d}:00-{hour:02d}:59",
            **b,
            "returnCount": 0,
            "returnAmount": 0,
            "voidCount": 0,
            "voidAmount": 0,
            "discardCount": 0,
            "discardAmount": 0,
        })

    rows.append({
        "hour": "TOTAL",
        "salesCount": total_count,
        "salesAmount": round(total_sales, 2),
        "cashCount": 0,
        "cashAmount": 0,
        "cardCount": 0,
        "cardAmount": 0,
        "mobileCount": 0,
        "mobileAmount": 0,
        "returnCount": 0,
        "returnAmount": 0,
        "voidCount": 0,
        "voidAmount": 0,
        "discardCount": 0,
        "discardAmount": 0,
    })

    return jsonify(rows)
