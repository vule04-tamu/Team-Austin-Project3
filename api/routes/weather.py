from flask import Blueprint, request, jsonify

weather_bp = Blueprint('weather', __name__)

@weather_bp.route("/current", methods=["GET"])
def get_weather():
    return