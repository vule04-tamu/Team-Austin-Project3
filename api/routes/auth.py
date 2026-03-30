from flask import Blueprint, request, jsonify
from api.db import get_cursor

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    username = body.get("username", "").strip()
    password = body.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    sql = """
        SELECT employee_id, username, role
        FROM teammembers
        WHERE username = %s AND password = %s
        LIMIT 1
    """

    with get_cursor() as cur:
        cur.execute(sql, (username, password))
        row = cur.fetchone()

    if row is None:
        return jsonify({"error": "Invalid credentials."}), 401

    employee_id, db_username, role_str = row
    role = "manager" if role_str and role_str.lower() == "manager" else "cashier"

    return jsonify({
        "employeeId": employee_id,
        "username": db_username,
        "role": role,
    })
