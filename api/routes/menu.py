from decimal import Decimal
from flask import Blueprint, request, jsonify
from api.db import get_connection

menu_bp = Blueprint("menu", __name__)


@menu_bp.route("", methods=["GET"])
def get_all():
    sql = "SELECT id, name, price, customization FROM menu_items ORDER BY id"
    from api.db import get_cursor
    with get_cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    return jsonify([
        {
            "id": row[0],
            "name": row[1],
            "price": float(row[2]) if row[2] is not None else 0,
            "customization": bool(row[3]),
        }
        for row in rows
    ])


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
    from api.db import get_cursor
    with get_cursor(commit=True) as cur:
        cur.execute(sql, (price_dec, item_id))

    return jsonify({"success": True})


@menu_bp.route("", methods=["POST"])
def add_item():
    body = request.get_json(silent=True) or {}
    name = body.get("name", "").strip()
    price = body.get("price")
    customization = body.get("customization", False)
    ingredients = body.get("ingredients", [])

    if not name or price is None:
        return jsonify({"error": "name and price are required."}), 400

    try:
        price_dec = Decimal(str(price))
    except Exception:
        return jsonify({"error": "Invalid price value."}), 400

    insert_menu = "INSERT INTO menu_items(name, price, customization) VALUES(%s, %s, %s) RETURNING id"
    check_inv   = "SELECT id FROM inventory_items WHERE name = %s"
    insert_inv  = "INSERT INTO inventory_items(name, quantity) VALUES(%s, 500) RETURNING id"
    insert_rec  = "INSERT INTO recipes(menu_item_id, inventory_item_id, quantity_needed) VALUES(%s, %s, %s)"

    with get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(insert_menu, (name, price_dec, customization))
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
    from api.db import get_cursor
    with get_cursor(commit=True) as cur:
        cur.execute(sql, (item_id,))

    return jsonify({"success": True})
