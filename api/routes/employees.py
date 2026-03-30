from flask import Blueprint, request, jsonify
from api.db import get_cursor

employees_bp = Blueprint("employees", __name__)


@employees_bp.route("", methods=["GET"])
def get_all():
    sql = "SELECT employee_id, username, role FROM teammembers ORDER BY employee_id"
    with get_cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    return jsonify([
        {"employeeId": r[0], "username": r[1], "role": r[2]}
        for r in rows
    ])


@employees_bp.route("", methods=["POST"])
def add_employee():
    body = request.get_json(silent=True) or {}
    username = body.get("username", "").strip()
    password = body.get("password", "").strip()
    role     = body.get("role", "cashier").strip()

    if not username or not password:
        return jsonify({"error": "username and password are required."}), 400

    with get_cursor(commit=True) as cur:
        cur.execute("SELECT COALESCE(MAX(employee_id), 0) + 1 FROM teammembers")
        next_id = cur.fetchone()[0]

        cur.execute(
            "INSERT INTO teammembers (employee_id, username, password, role) "
            "VALUES (%s, %s, %s, %s)",
            (next_id, username, password, role),
        )

    return jsonify({"success": True, "employeeId": next_id}), 201


@employees_bp.route("/<int:emp_id>", methods=["PUT"])
def update_employee(emp_id):
    body = request.get_json(silent=True) or {}
    username = body.get("username", "").strip()
    role     = body.get("role", "").strip()

    if not username or not role:
        return jsonify({"error": "username and role are required."}), 400

    sql = "UPDATE teammembers SET username = %s, role = %s WHERE employee_id = %s"
    with get_cursor(commit=True) as cur:
        cur.execute(sql, (username, role, emp_id))

    return jsonify({"success": True})


@employees_bp.route("/<int:emp_id>/password", methods=["PUT"])
def reset_password(emp_id):
    body = request.get_json(silent=True) or {}
    new_password = body.get("password", "").strip()

    if not new_password:
        return jsonify({"error": "password is required."}), 400

    sql = "UPDATE teammembers SET password = %s WHERE employee_id = %s"
    with get_cursor(commit=True) as cur:
        cur.execute(sql, (new_password, emp_id))

    return jsonify({"success": True})


@employees_bp.route("/<int:emp_id>", methods=["DELETE"])
def delete_employee(emp_id):
    sql = "DELETE FROM teammembers WHERE employee_id = %s"
    with get_cursor(commit=True) as cur:
        cur.execute(sql, (emp_id,))

    return jsonify({"success": True})
