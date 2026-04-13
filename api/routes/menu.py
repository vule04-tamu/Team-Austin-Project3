from decimal import Decimal
from flask import Blueprint, request, jsonify
from api.db import get_connection, get_cursor

menu_bp = Blueprint("menu", __name__)


@menu_bp.route("/customizations", methods=["GET"])
def list_customizations():
    sql = """
        SELECT id, category, name, price_modifier, inventory_item_id
        FROM customization_options
        ORDER BY category, name
    """
    try:
        with get_cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    except Exception:
        return jsonify([])

    return jsonify([
        {
            "id": row[0],
            "category": row[1],
            "name": row[2],
            "priceModifier": float(row[3]) if row[3] is not None else 0,
            "inventoryItemId": row[4],
        }
        for row in rows
    ])


@menu_bp.route("", methods=["GET"])
def get_all():
    try:
        with get_cursor() as cur:
            cur.execute(
                "SELECT id, name, price, customizable FROM menu_items ORDER BY id",
            )
            rows = cur.fetchall()
        out = [
            {
                "id": row[0],
                "name": row[1],
                "price": float(row[2]) if row[2] is not None else 0,
                "customizable": bool(row[3]),
            }
            for row in rows
        ]
    except Exception:
        with get_cursor() as cur:
            cur.execute(
                "SELECT id, name, price, customization FROM menu_items ORDER BY id",
            )
            rows = cur.fetchall()
        out = [
            {
                "id": row[0],
                "name": row[1],
                "price": float(row[2]) if row[2] is not None else 0,
                "customizable": not bool(row[3]),
            }
            for row in rows
        ]

    return jsonify(out)


@menu_bp.route("/<int:item_id>/price", methods=["PUT"])
def update_price(item_id):
    body = request.get_json(silent=True) or {}
    new_price = body.get("price")
    if new_price is None:
        return jsonify({"error": "price is required."}), 400

    try:
        price_dec = Decimal(str(new_price))
    except Exception:
        return jsonify({"error": "Invalid price value."}), 400

    sql = "UPDATE menu_items SET price = %s WHERE id = %s"
    with get_cursor(commit=True) as cur:
        cur.execute(sql, (price_dec, item_id))

    return jsonify({"success": True})


@menu_bp.route("", methods=["POST"])
def add_item():
    body = request.get_json(silent=True) or {}
    name = body.get("name", "").strip()
    price = body.get("price")
    customizable = body.get("customizable", body.get("customization", False))
    ingredients = body.get("ingredients", [])

    if not name or price is None:
        return jsonify({"error": "name and price are required."}), 400

    try:
        price_dec = Decimal(str(price))
    except Exception:
        return jsonify({"error": "Invalid price value."}), 400

    insert_menu = (
        "INSERT INTO menu_items(name, price, customizable) VALUES(%s, %s, %s) RETURNING id"
    )
    insert_menu_legacy = (
        "INSERT INTO menu_items(name, price, customization) VALUES(%s, %s, %s) RETURNING id"
    )
    check_inv = "SELECT id FROM inventory_items WHERE name = %s"
    insert_inv = "INSERT INTO inventory_items(name, quantity) VALUES(%s, 500) RETURNING id"
    insert_rec = (
        "INSERT INTO recipes(menu_item_id, inventory_item_id, quantity_needed) "
        "VALUES(%s, %s, %s)"
    )

    with get_connection() as conn:
        cur = conn.cursor()
        try:
            try:
                cur.execute(insert_menu, (name, price_dec, bool(customizable)))
                menu_item_id = cur.fetchone()[0]
            except Exception:
                conn.rollback()
                cur.execute(
                    insert_menu_legacy,
                    (name, price_dec, not bool(customizable)),
                )
                menu_item_id = cur.fetchone()[0]

            for ing in ingredients:
                ing_name = ing.get("name", "").strip()
                qty_needed = ing.get("quantityNeeded", 1)

                cur.execute(check_inv, (ing_name,))
                row = cur.fetchone()
                if row:
                    inv_id = row[0]
                else:
                    cur.execute(insert_inv, (ing_name,))
                    inv_id = cur.fetchone()[0]

                cur.execute(insert_rec, (menu_item_id, inv_id, qty_needed))

            conn.commit()
            return jsonify({"success": True, "id": menu_item_id}), 201
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


@menu_bp.route("/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    sql = "DELETE FROM menu_items WHERE id = %s"
    with get_cursor(commit=True) as cur:
        cur.execute(sql, (item_id,))

    return jsonify({"success": True})
