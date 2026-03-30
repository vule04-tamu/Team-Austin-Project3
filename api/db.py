import os
import psycopg2
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def _get_conn_params():
    return {
        "host":     os.environ.get("PSQL_HOST", "csce-315-db.engr.tamu.edu"),
        "port":     os.environ.get("PSQL_PORT", "5432"),
        "dbname":   os.environ.get("PSQL_DATABASE", "team_01_db"),
        "user":     os.environ.get("PSQL_USER", "team_01"),
        "password": os.environ.get("PSQL_PASSWORD", ""),
        "sslmode":  "require",
    }

@contextmanager
def get_connection():
    conn = psycopg2.connect(**_get_conn_params())
    try:
        yield conn
    finally:
        conn.close()

@contextmanager
def get_cursor(commit=False):
    with get_connection() as conn:
        cur = conn.cursor()
        try:
            yield cur
            if commit:
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
