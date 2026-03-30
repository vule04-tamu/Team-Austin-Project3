from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from api.db import get_connection, get_cursor

orders_bp = Blueprint("orders", __name__)

TAX_RATE = Decimal("0.0825")


@orders_bp.route("", methods=["POST"])
def submit_order():
    body = request.get_json(silent=True) or {}
    cart = body.get("cart", [])
    payment_method = body.get("paymentMethod", "CARD")

    if not cart:
        return jsonify({"error": "Cart is empty."}), 400

    gross = Decimal("0")
    for item in cart:
        price = Decimal(str(item["price"]))
        qty = int(item["qty"])
        gross += price * qty

    tax = (gross * TAX_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    net = (gross + tax).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    method_upper = payment_method.upper()
    pay_cash   = net if method_upper == "CASH"   else Decimal("0")
    pay_credit = net if method_upper == "CARD"   else Decimal("0")
    pay_debit  = Decimal("0")
    pay_other  = net if method_upper == "MOBILE" else Decimal("0")

    with get_connection() as conn:
        cur = conn.cursor()
        try:
            # 1. Insert order
            cur.execute(
                "INSERT INTO orders(order_date, total_amount, payment_method) "
                "VALUES(%s, %s, %s) RETURNING id",
                (datetime.now(), net, method_upper),
            )
            order_id = cur.fetchone()[0]

            # 2. Insert order items
            for item in cart:
                cur.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM order_items")
                next_id = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO order_items(id, order_id, menu_item_id, quantity) "
                    "VALUES(%s, %s, %s, %s)",
                    (next_id, order_id, item["menuItemId"], item["qty"]),
                )

            # 3. Decrement inventory via recipes
            for item in cart:
                cur.execute(
                    """
                    UPDATE inventory_items inv
                    SET quantity = COALESCE(inv.quantity, 0) - (r.quantity_needed * %s)
                    FROM recipes r
                    WHERE r.menu_item_id = %s
                      AND r.inventory_item_id = inv.id
                    """,
                    (item["qty"], item["menuItemId"]),
                )

            # 4. Update daily totals
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
            return jsonify({"success": True, "orderId": order_id}), 201

        except Exception:
            conn.rollback()
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
        })

    rows.append({
        "hour": "TOTAL",
        "salesCount": total_count,
        "salesAmount": round(total_sales, 2),
    })

    return jsonify(rows)
