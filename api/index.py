import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from flask_cors import CORS

from api.routes.auth import auth_bp
from api.routes.menu import menu_bp
from api.routes.orders import orders_bp
from api.routes.inventory import inventory_bp
from api.routes.employees import employees_bp
from api.routes.zreport import zreport_bp
from api.routes.weather import weather_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(auth_bp,      url_prefix="/api/auth")
app.register_blueprint(menu_bp,      url_prefix="/api/menu")
app.register_blueprint(orders_bp,    url_prefix="/api/orders")
app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
app.register_blueprint(employees_bp, url_prefix="/api/employees")
app.register_blueprint(zreport_bp,   url_prefix="/api/zreport")
app.register_blueprint(weather_bp,   url_prefix="/api/weather")

@app.route("/api/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(debug=True, port=3000)
