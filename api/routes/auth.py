import os
import jwt
import time
import secrets
import requests as req_lib
from flask import Blueprint, request, jsonify, redirect
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from api.db import get_cursor

auth_bp = Blueprint("auth", __name__)

GOOGLE_CLIENT_ID     = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.environ.get("GOOGLE_REDIRECT_URI")
FRONTEND_URL         = os.environ.get("FRONTEND_URL", "https://team-austin-project3-two.vercel.app")
FLASK_SECRET_KEY     = os.environ.get("FLASK_SECRET_KEY", "dev-secret")

ALLOWED_MANAGER_EMAILS = {
    "reveille.bubbletea@gmail.com",
    "derianhung@tamu.edu",
    "vule04@tamu.edu",
}

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = "openid email profile"


# ── Existing username/password login ─────────────────────────────────────────

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

    return jsonify({"employeeId": employee_id, "username": db_username, "role": role})


# ── Google OAuth routes ───────────────────────────────────────────────────────

@auth_bp.route("/google")
def google_login():
    """Step 1: Redirect browser to Google consent screen."""
    # Generate a random state and sign it into a JWT
    # embed it in the redirect so we can verify on callback
    raw_state = secrets.token_urlsafe(16)
    signed_state = jwt.encode(
        {"state": raw_state, "exp": time.time() + 600},
        FLASK_SECRET_KEY,
        algorithm="HS256",
    )

    # Build the Google auth URL manually — no PKCE, no library magic
    params = (
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={SCOPES.replace(' ', '%20')}"
        f"&access_type=offline"
        f"&prompt=select_account"
        f"&state={signed_state}"
    )
    return redirect(GOOGLE_AUTH_URL + params)


@auth_bp.route("/google/callback")
def google_callback():
    """Step 2: Google redirects here after user approves."""
    signed_state = request.args.get("state")
    code         = request.args.get("code")

    if not signed_state or not code:
        return redirect(f"{FRONTEND_URL}/?error=state_missing")

    # Verify the signed state JWT
    try:
        jwt.decode(signed_state, FLASK_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return redirect(f"{FRONTEND_URL}/?error=state_expired")
    except Exception:
        return redirect(f"{FRONTEND_URL}/?error=state_invalid")

    # Exchange the code for tokens manually — no PKCE
    try:
        token_response = req_lib.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_response.json()
        if "error" in token_data:
            error_msg = str(token_data.get("error_description", token_data["error"])).replace(" ", "_")[:100]
            return redirect(f"{FRONTEND_URL}/?error={error_msg}")
    except Exception as e:
        error_msg = str(e).replace(" ", "_")[:100]
        return redirect(f"{FRONTEND_URL}/?error=token_request_failed_{error_msg}")

    # Verify the ID token
    try:
        id_info = id_token.verify_oauth2_token(
            token_data["id_token"],
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception as e:
        error_msg = str(e).replace(" ", "_")[:100]
        return redirect(f"{FRONTEND_URL}/?error=token_verify_{error_msg}")

    email = id_info.get("email", "")
    name  = id_info.get("name", email)

    if email not in ALLOWED_MANAGER_EMAILS:
        return redirect(f"{FRONTEND_URL}/?error=unauthorized_email")

    # Create signed JWT auth token
    auth_token = jwt.encode(
        {
            "email": email,
            "name": name,
            "role": "manager",
            "exp": time.time() + 60 * 60 * 8,
        },
        FLASK_SECRET_KEY,
        algorithm="HS256",
    )

    return redirect(f"{FRONTEND_URL}/manager?token={auth_token}")


@auth_bp.route("/google/status")
def google_status():
    """Frontend calls this to check if the manager token is valid."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip()

    if not token:
        return jsonify({"authenticated": False}), 401

    try:
        decoded = jwt.decode(token, FLASK_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return jsonify({"authenticated": False, "reason": "expired"}), 401
    except Exception:
        return jsonify({"authenticated": False, "reason": "invalid"}), 401

    return jsonify({
        "authenticated": True,
        "email": decoded.get("email"),
        "name": decoded.get("name"),
    })


@auth_bp.route("/google/logout", methods=["POST"])
def google_logout():
    return jsonify({"ok": True})