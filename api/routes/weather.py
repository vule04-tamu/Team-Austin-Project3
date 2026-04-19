import requests
from flask import Blueprint, jsonify

weather_bp = Blueprint('weather', __name__)

@weather_bp.route("/current", methods=["GET"])
def get_weather():
    
    latitude = "30.6280"
    longitude = "-96.3344"

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude}&longitude={longitude}"
        f"&current=temperature_2m"
        f"&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max"
        f"&temperature_unit=fahrenheit"
        f"&timezone=America%2FChicago"
        f"&forecast_days=3"
    )

    try:
        response = requests.get(url)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500