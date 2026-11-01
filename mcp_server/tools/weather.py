"""
Weather Tool for MCP Server.
Fetches real-time weather information using Open-Meteo's open public API.
"""

from datetime import datetime
from typing import Any, Dict, Optional
import httpx

# WMO Weather interpretation codes (WW) mapping
WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    62: "Moderate rain",
    63: "Heavy rain",
    65: "Violent rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm: Slight or moderate",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def _generate_location_candidates(location: str) -> list:
    """
    Generate fallback query candidates for geocoding composite location strings like
    'Vyttila, Kochi, India' or 'Vyttila, Kochi' or 'Manhattan, New York'.
    """
    clean = location.strip()
    if not clean:
        return []

    parts = [p.strip() for p in clean.split(",") if p.strip()]
    candidates = [clean]

    if len(parts) >= 3:
        # 3 or more parts: [Locality, City, Country]
        candidates.append(f"{parts[0]}, {parts[-1]}")  # e.g. Vyttila, India
        candidates.append(f"{parts[1]}, {parts[-1]}")  # e.g. Kochi, India
        candidates.append(parts[0])                    # e.g. Vyttila
        candidates.append(parts[1])                    # e.g. Kochi
    elif len(parts) == 2:
        # 2 parts: [Locality, City] or [City, Country]
        candidates.append(parts[0])                    # e.g. Vyttila
        candidates.append(f"{parts[0]} {parts[1]}")    # e.g. Vyttila Kochi
        candidates.append(parts[1])                    # e.g. Kochi

    seen = set()
    unique_candidates = []
    for cand in candidates:
        cand_lower = cand.lower()
        if cand_lower not in seen:
            seen.add(cand_lower)
            unique_candidates.append(cand)

    return unique_candidates


async def get_weather_data(location: str) -> Dict[str, Any]:
    """
    Query Open-Meteo geocoding and forecast APIs for the given location name.
    Supports composite queries (e.g. 'Vyttila, Kochi, India') with automatic candidate fallback.
    Returns structured weather information.
    """
    if not location or not location.strip():
        return {"error": "Location parameter cannot be empty."}

    loc_name = location.strip()
    timeout = httpx.Timeout(10.0, connect=5.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        # Step 1: Geocode location to lat/lon using candidate fallback
        geo_url = "https://geocoding-api.open-meteo.com/v1/search"
        candidates = _generate_location_candidates(loc_name)
        results = None

        for cand in candidates:
            for attempt in range(2):
                try:
                    geo_resp = await client.get(geo_url, params={"name": cand, "count": 1, "language": "en"})
                    if geo_resp.status_code == 200:
                        geo_data = geo_resp.json()
                        cand_results = geo_data.get("results")
                        if cand_results:
                            results = cand_results
                            break
                except Exception:
                    if attempt == 0:
                        continue
            if results:
                break

        if not results:
            return {"error": f"Could not find coordinates for location '{loc_name}'. Please verify the city name (e.g., try 'Kochi' or 'Vyttila')."}

        first_match = results[0]
        lat = first_match["latitude"]
        lon = first_match["longitude"]
        resolved_name = first_match.get("name", loc_name)
        country = first_match.get("country", "")
        admin1 = first_match.get("admin1", "")
        timezone_str = first_match.get("timezone", "UTC")

        # Step 2: Fetch current weather metrics
        forecast_url = "https://api.open-meteo.com/v1/forecast"
        forecast_params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
            "temperature_unit": "celsius",
            "wind_speed_unit": "kmh",
            "timezone": timezone_str,
        }

        try:
            forecast_resp = await client.get(forecast_url, params=forecast_params)
            forecast_resp.raise_for_status()
            forecast_data = forecast_resp.json()
        except Exception as e:
            return {"error": f"Failed to retrieve weather data for '{resolved_name}': {str(e)}"}

        current = forecast_data.get("current", {})
        temp_c = current.get("temperature_2m", 0.0)
        temp_f = round(temp_c * 9 / 5 + 32, 1)
        feels_like_c = current.get("apparent_temperature", temp_c)
        feels_like_f = round(feels_like_c * 9 / 5 + 32, 1)
        humidity = current.get("relative_humidity_2m", 0)
        wind_speed_kmh = current.get("wind_speed_10m", 0.0)
        precipitation = current.get("precipitation", 0.0)
        weather_code = current.get("weather_code", 0)
        condition_desc = WEATHER_CODES.get(weather_code, "Partly Cloudy")

        loc_parts = [p.strip() for p in [resolved_name, admin1, country] if p and p.strip()]
        full_location = ", ".join(loc_parts)

        return {
            "location": full_location,
            "latitude": lat,
            "longitude": lon,
            "condition": condition_desc,
            "temperature_c": temp_c,
            "temperature_f": temp_f,
            "feels_like_c": feels_like_c,
            "feels_like_f": feels_like_f,
            "humidity_percent": humidity,
            "wind_speed_kmh": wind_speed_kmh,
            "precipitation_mm": precipitation,
            "timestamp": current.get("time", datetime.utcnow().isoformat()),
        }


def format_weather_summary(data: Dict[str, Any]) -> str:
    """Format the weather dictionary into a readable text summary."""
    if "error" in data:
        return f"Weather Error: {data['error']}"

    return (
        f"Weather for {data['location']}:\n"
        f"- Condition: {data['condition']}\n"
        f"- Temperature: {data['temperature_c']}°C / {data['temperature_f']}°F\n"
        f"- Feels Like: {data['feels_like_c']}°C / {data['feels_like_f']}°F\n"
        f"- Humidity: {data['humidity_percent']}%\n"
        f"- Wind Speed: {data['wind_speed_kmh']} km/h\n"
        f"- Precipitation: {data['precipitation_mm']} mm\n"
        f"- Recorded Time: {data['timestamp']}"
    )

