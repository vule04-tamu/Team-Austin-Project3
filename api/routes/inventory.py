from flask import Blueprint, request, jsonify
from api.db import get_cursor

inventory_bp = Blueprint("inventory", __name__)


@inventory_bp.route("", methods=["GET"])
def get_all():
    sql = "SELECT id, name, quantity FROM inventory_items ORDER BY id"
    with get_cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    return jsonify([
        {"id": r[0], "name": r[1], "quantity": r[2]}
        for r in rows
    ])


@inventory_bp.route("/<int:item_id>/quantity", methods=["PUT"])
def set_quantity(item_id):
    body = request.get_json(silent=True) or {}
    qty = body.get("quantity")
    if qty is None:
        return jsonify({"error": "quantity is required."}), 400

    sql = "UPDATE inventory_items SET quantity = %s WHERE id = %s"
    with get_cursor(commit=True) as cur:
        cur.execute(sql, (int(qty), item_id))

    return jsonify({"success": True})


@inventory_bp.route("/<int:item_id>/add", methods=["PATCH"])
def add_quantity(item_id):
    body = request.get_json(silent=True) or {}
    delta = body.get("delta")
    if delta is None:
        return jsonify({"error": "delta is required."}), 400

    sql = "UPDATE inventory_items SET quantity = COALESCE(quantity, 0) + %s WHERE id = %s"
    with get_cursor(commit=True) as cur:
        cur.execute(sql, (int(delta), item_id))

    return jsonify({"success": True})


@inventory_bp.route("/report", methods=["GET"])
def inventory_report():
    sql = "SELECT name, quantity FROM inventory_items ORDER BY quantity ASC"
    with get_cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    return jsonify([
        {"name": r[0], "quantity": r[1]}
        for r in rows
    ])


@inventory_bp.route("/usage", methods=["GET"])
def usage():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify({"error": "start and end query params are required."}), 400

    sql = """
        SELECT i.name AS item_name,
               COALESCE(SUM(oi.quantity * r.quantity_needed), 0) AS used
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN recipes r ON r.menu_item_id = oi.menu_item_id
        JOIN inventory_items i ON i.id = r.inventory_item_id
        WHERE o.order_date::date BETWEEN %s AND %s
        GROUP BY i.name
        ORDER BY used DESC
    """
    with get_cursor() as cur:
        cur.execute(sql, (start, end))
        rows = cur.fetchall()

    return jsonify([
        {"itemName": r[0], "used": float(r[1])}
        for r in rows
    ])
