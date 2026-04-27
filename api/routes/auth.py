import os
import jwt
import time
from flask import Blueprint, request, jsonify, redirect, session
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from api.db import get_cursor

auth_bp = Blueprint("auth", __name__)

GOOGLE_CLIENT_ID     = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.environ.get("GOOGLE_REDIRECT_URI")
FRONTEND_URL         = os.environ.get("FRONTEND_URL", "http://localhost:5173")
FLASK_SECRET_KEY     = os.environ.get("FLASK_SECRET_KEY", "dev-secret")

# Allowed Google emails that are managers — add your manager emails here
ALLOWED_MANAGER_EMAILS = {
    "reveille.bubbletea@gmail.com",
    "derianhung@tamu.edu",
}

def make_flow():
    return Flow.from_client_config(
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
    )

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

@auth_bp.route("/google")
def google_login():
    """Redirect browser to Google's consent screen."""
    flow = make_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="select_account",
    )

    state_token = jwt.encode(
        {"state": state, "exp": time.time() + 600},  # expires in 10 minutes
        FLASK_SECRET_KEY,
        algorithm="HS256",
    )

    # Append state_token to the auth_url as a custom param Google will echo back
    # via the redirect — we store it in the URL itself since we have no session
    final_url = auth_url + f"&state={state}"

    # Store state in a short-lived JWT passed via redirect to callback
    response = redirect(final_url)
    response.set_cookie(
        "oauth_state",
        state_token,
        max_age=600,          # 10 minutes
        httponly=True,
        secure=True,
        samesite="None",      # needed because Google redirects cross-origin
    )
    return response

@auth_bp.route("/google/callback")
def google_callback():
    """Step 2: Google redirects here after user approves."""
    # Retrieve and verify the state cookie
    state_cookie = request.cookies.get("oauth_state")
    if not state_cookie:
        return redirect(f"{FRONTEND_URL}/?error=state_missing")

    try:
        decoded = jwt.decode(state_cookie, FLASK_SECRET_KEY, algorithms=["HS256"])
        expected_state = decoded["state"]
    except jwt.ExpiredSignatureError:
        return redirect(f"{FRONTEND_URL}/?error=state_expired")
    except Exception:
        return redirect(f"{FRONTEND_URL}/?error=state_invalid")

    # Verify state matches what Google sent back
    if request.args.get("state") != expected_state:
        return redirect(f"{FRONTEND_URL}/?error=state_mismatch")

    # Exchange the auth code for tokens
    flow = make_flow(state=expected_state)
    try:
        flow.fetch_token(authorization_response=request.url)
    except Exception:
        return redirect(f"{FRONTEND_URL}/?error=token_exchange_failed")

    # Verify the ID token and extract user info
    credentials = flow.credentials
    try:
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        return redirect(f"{FRONTEND_URL}/?error=invalid_token")

    email = id_info.get("email", "")
    name  = id_info.get("name", email)

    # Check this email is an allowed manager
    if email not in ALLOWED_MANAGER_EMAILS:
        return redirect(f"{FRONTEND_URL}/?error=unauthorized_email")

    # Create a signed JWT to act as the auth token
    # This replaces the server session — the token lives in the browser cookie
    auth_token = jwt.encode(
        {
            "email": email,
            "name": name,
            "role": "manager",
            "exp": time.time() + 60 * 60 * 8,  # 8 hour expiry
        },
        FLASK_SECRET_KEY,
        algorithm="HS256",
    )

    # Send the token to the frontend via a cookie
    response = redirect(f"{FRONTEND_URL}/manager")
    response.set_cookie(
        "manager_token",
        auth_token,
        max_age=60 * 60 * 8,   # 8 hours
        httponly=True,
        secure=True,
        samesite="None",
    )
    # Clear the oauth_state cookie now that we're done with it
    response.delete_cookie("oauth_state")
    return response

@auth_bp.route("/google/status")
def google_status():
    """Frontend calls this to check if the manager token is valid."""
    token = request.cookies.get("manager_token")
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
    """Clear the manager token cookie."""
    response = jsonify({"ok": True})
    response.delete_cookie(
        "manager_token",
        secure=True,
        samesite="None",
    )
    return response