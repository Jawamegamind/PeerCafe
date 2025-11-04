import os
from typing import Tuple, Optional

import httpx

MAPBOX_TOKEN = os.environ.get("MAPBOX_TOKEN")


async def geocode_address(address: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Resolve a human-readable address to latitude/longitude.

    - Uses Mapbox Geocoding API when MAPBOX_TOKEN is set.
    - Returns (None, None) on failure so callers can handle gracefully.

    Args:
        address: Freeform address string

    Returns:
        (latitude, longitude) as floats, or (None, None) when not found/failed.
    """
    if not address or not isinstance(address, str):
        return (None, None)

    # Prefer Mapbox when available to avoid adding heavier deps.
    if MAPBOX_TOKEN:
        try:
            # Mapbox expects URL-encoded address; httpx will encode query params.
            url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json"
            params = {"access_token": MAPBOX_TOKEN, "limit": 1}
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                features = data.get("features") or []
                if not features:
                    return (None, None)
                # Mapbox center is [lng, lat]
                center = features[0].get("center") or []
                if len(center) >= 2 and center[0] is not None and center[1] is not None:
                    lng = float(center[0])
                    lat = float(center[1])
                    return (lat, lng)
                return (None, None)
        except Exception:
            # Swallow errors and let callers handle lack of geocode by returning (None, None)
            return (None, None)

    # No provider configured; return empty so routes can still function without navigation.
    return (None, None)
