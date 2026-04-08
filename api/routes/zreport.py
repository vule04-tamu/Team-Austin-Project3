from decimal import Decimal
from flask import Blueprint, request, jsonify
from api.db import get_connection, get_cursor

zreport_bp = Blueprint("zreport", __name__)


def _totals_row_to_dict(row):
    if row is None:
        z = 0
        return {
            "reportDate": None,
            "grossSales": z, "discounts": z, "voids": z,
            "netSales": z, "taxCollected": z, "totalCash": z,
            "payCash": z, "payCredit": z, "payDebit": z, "payOther": z,
            "orderCount": 0, "voidCount": 0, "serviceCharges": z,
        }

    def f(v):
        return float(v) if v is not None else 0

    return {
        "reportDate":     str(row[0]) if row[0] else None,
        "grossSales":     f(row[1]),
        "discounts":      f(row[2]),
        "voids":          f(row[3]),
        "netSales":       f(row[4]),
        "taxCollected":   f(row[5]),
        "totalCash":      f(row[6]),
        "payCash":        f(row[7]),
        "payCredit":      f(row[8]),
        "payDebit":       f(row[9]),
        "payOther":       f(row[10]),
        "orderCount":     row[11] if row[11] is not None else 0,
        "voidCount":      row[12] if row[12] is not None else 0,
        "serviceCharges": f(row[13]),
    }


_TOTALS_COLS = """
    report_date,
    gross_sales, discounts, voids, net_sales,
    tax_collected, total_cash,
    pay_cash, pay_credit, pay_debit, pay_other,
    order_count, void_count, service_charges
"""


@zreport_bp.route("/today", methods=["GET"])
def today_totals():
    sql = f"SELECT {_TOTALS_COLS} FROM daily_totals ORDER BY report_date DESC LIMIT 1"
    with get_cursor() as cur:
        cur.execute(sql)
        row = cur.fetchone()

    return jsonify(_totals_row_to_dict(row))


@zreport_bp.route("/check", methods=["GET"])
def check_already_run():
    sql = "SELECT 1 FROM z_report_log WHERE business_date = CURRENT_DATE LIMIT 1"
    with get_cursor() as cur:
        cur.execute(sql)
        already_run = cur.fetchone() is not None

    return jsonify({"alreadyRun": already_run})

@zreport_bp.route("/clear-report", methods=["POST"])
def clear_z_report():
    with get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute("TRUNCATE TABLE z_report_log")
            conn.commit()
            return jsonify({"success": True})
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()

@zreport_bp.route("/run", methods=["POST"])
def run_zreport():
    body = request.get_json(silent=True) or {}
    run_by_user = body.get("runByUser", "unknown")

    with get_connection() as conn:
        cur = conn.cursor()
        try:
            # 1. Guard — check if already run today
            cur.execute("SELECT 1 FROM z_report_log WHERE business_date = CURRENT_DATE LIMIT 1")
            if cur.fetchone():
                return jsonify({"error": "Z-Report has already been run today."}), 409

            # 2. Read current totals (FOR UPDATE to lock the row)
            cur.execute(
                f"SELECT {_TOTALS_COLS} FROM daily_totals "
                "ORDER BY report_date DESC LIMIT 1 FOR UPDATE"
            )
            snap_row = cur.fetchone()
            snap = _totals_row_to_dict(snap_row)

            # 3. Archive to z_report_log
            cur.execute(
                """
                INSERT INTO z_report_log
                    (run_at, business_date,
                     gross_sales, discounts, voids, net_sales,
                     tax_collected, total_cash,
                     pay_cash, pay_credit, pay_debit, pay_other,
                     order_count, void_count, service_charges, run_by_user)
                VALUES (NOW(), CURRENT_DATE, %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    snap_row[1], snap_row[2], snap_row[3], snap_row[4],
                    snap_row[5], snap_row[6],
                    snap_row[7], snap_row[8], snap_row[9], snap_row[10],
                    snap_row[11], snap_row[12], snap_row[13],
                    run_by_user,
                ),
            )

            # 4. Reset — delete all daily_totals and insert a zero row for tomorrow
            cur.execute("DELETE FROM daily_totals")
            cur.execute(
                """
                INSERT INTO daily_totals (report_date,
                    gross_sales, discounts, voids, net_sales,
                    tax_collected, total_cash,
                    pay_cash, pay_credit, pay_debit, pay_other,
                    order_count, void_count, service_charges)
                VALUES (CURRENT_DATE + 1, 0,0,0,0,0,0,0,0,0,0,0,0,0)
                """
            )

            conn.commit()
            return jsonify({"success": True, "snapshot": snap})

        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
