import os
import jwt
import time
from flask import Blueprint, request, jsonify, redirect
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from api.db import get_cursor

auth_bp = Blueprint("auth", __name__)

GOOGLE_CLIENT_ID     = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.environ.get("GOOGLE_REDIRECT_URI")
FRONTEND_URL         = os.environ.get("FRONTEND_URL", "https://team-austin-project3-two.vercel.app")
FLASK_SECRET_KEY     = os.environ.get("FLASK_SECRET_KEY", "dev-secret")

# Allowed Google manager emails
ALLOWED_MANAGER_EMAILS = {
    "reveille.bubbletea@gmail.com",
    "derianhung@tamu.edu",
    "vule04@tamu.edu",
}

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "0"

def make_flow(state=None):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI],
            }
        },
        scopes=[
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ],
        redirect_uri=GOOGLE_REDIRECT_URI,
        state=state,
    )
    flow.code_verifier = None  # ← disables PKCE code verifier
    return flow

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

@auth_bp.route("/google")
def google_login():
    """Step 1: Redirect browser to Google consent screen."""
    flow = make_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="select_account",
        code_challenge_method=None,  # ← disables PKCE
    )
    return redirect(auth_url)

@auth_bp.route("/google/callback")
def google_callback():
    state = request.args.get("state")
    if not state:
        return redirect(f"{FRONTEND_URL}/?error=state_missing")

    try:
        flow = make_flow(state=state)
        
        authorization_response = request.url
        if authorization_response.startswith("http://"):
            authorization_response = authorization_response.replace("http://", "https://", 1)

        flow.fetch_token(authorization_response=authorization_response)
    except Exception as e:
        # Send the exact error back so we can see it
        error_msg = str(e).replace(" ", "_")[:100]
        return redirect(f"{FRONTEND_URL}/?error={error_msg}")

    credentials = flow.credentials
    try:
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
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
    # Get token from Authorization header instead of cookie
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
    """Frontend just discards the token — nothing to do server side."""
    return jsonify({"ok": True})