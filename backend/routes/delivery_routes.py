import asyncio
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from database.supabase_db import create_supabase_client
from models.delivery_model import Location
from utils.geocode import geocode_address

delivery_router = APIRouter()
supabase = create_supabase_client()

MAPBOX_TOKEN = os.environ.get("MAPBOX_TOKEN")
MAX_DEST_PER_MATRIX = int(os.environ.get("MAX_DEST_PER_MATRIX", 24))


def location_from_query(
    latitude: float = Query(...), longitude: float = Query(...)
) -> Location:
    return Location(latitude=latitude, longitude=longitude)


def _extract_restaurant_coords(orders):
    """Extract restaurant IDs and coordinates from orders."""
    restaurant_ids = []
    restaurant_coords_by_id = {}

    for o in orders:
        rid = o.get("restaurant_id")
        if rid is not None and rid not in restaurant_ids:
            restaurant_ids.append(rid)

        rest_info = o.get("restaurants") or {}
        lat_raw = rest_info.get("latitude")
        lng_raw = rest_info.get("longitude")
        try:
            if lat_raw is not None and lng_raw is not None:
                latitude = float(lat_raw)
                longitude = float(lng_raw)
                restaurant_coords_by_id[rid] = (latitude, longitude)
        except (TypeError, ValueError):
            pass

    return restaurant_ids, restaurant_coords_by_id


def _prepare_destinations(restaurant_ids, restaurant_coords_by_id):
    """Prepare destination list and filter out those without coordinates."""
    dests = []
    for rid in restaurant_ids:
        coords = restaurant_coords_by_id.get(rid)
        if coords:
            dests.append({"restaurant_id": rid, "lat": coords[0], "lng": coords[1]})
        else:
            dests.append({"restaurant_id": rid, "lat": None, "lng": None})

    return [ri for ri in dests if ri["lat"] is not None and ri["lng"] is not None]


async def _fetch_matrix_for_chunk(src_lng, src_lat, chunk):
    """Fetch distance matrix for a chunk of destinations."""
    coordinates = [[src_lng, src_lat]] + [[c["lng"], c["lat"]] for c in chunk]
    coordinates_str = ";".join(f"{lng},{lat}" for lng, lat in coordinates)
    destinations_idx = ";".join(str(i) for i in range(1, len(coordinates)))

    params = {}

    # Different params if only one destination (no need to specify sources/destinations)
    # Need to do this because Mapbox API gives 422 error for single destination
    if len(chunk) == 1:
        params = {
            # "sources": "0",
            "annotations": "distance,duration",  # asking for distance and duration (meters),
            "access_token": MAPBOX_TOKEN,
        }

    else:

        params = {
            "sources": "0",
            "annotations": "distance,duration",  # asking for distance and duration (meters),
            "destinations": destinations_idx,
            "access_token": MAPBOX_TOKEN,
        }

    url = (
        f"https://api.mapbox.com/directions-matrix/v1/mapbox/driving/{coordinates_str}"
    )
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            results = resp.json()
            if len(chunk) == 1:
                # results = resp.json()
                # flatten distances/durations to single value lists
                results["distances"] = [[results["distances"][0][1]]]
                results["durations"] = [[results["durations"][0][1]]]
            return results
            # return resp.json()
    except httpx.HTTPError as http_err:
        print(f"HTTP error occurred while fetching matrix: {http_err}")
        return {}


async def _compute_distances_and_durations(src_lng, src_lat, dests):
    """Compute distances and durations to all destinations."""
    if not dests:
        return {}, {}

    chunks = [
        dests[i : i + MAX_DEST_PER_MATRIX]
        for i in range(0, len(dests), MAX_DEST_PER_MATRIX)
    ]

    tasks = [_fetch_matrix_for_chunk(src_lng, src_lat, chunk) for chunk in chunks]
    results = await asyncio.gather(*tasks)

    distance_by_restaurant = {}
    duration_by_restaurant = {}

    for chunk_result, chunk in zip(results, chunks):
        distances_matrix = chunk_result.get("distances")
        durations_matrix = chunk_result.get("durations")

        distances_from_source = (
            distances_matrix[0]
            if distances_matrix and len(distances_matrix) > 0
            else [None] * len(chunk)
        )
        durations_from_source = (
            durations_matrix[0]
            if durations_matrix and len(durations_matrix) > 0
            else [None] * len(chunk)
        )

        for item, dist_val, dur_val in zip(
            chunk, distances_from_source, durations_from_source
        ):
            rid = item.get("restaurant_id")
            distance_by_restaurant[rid] = (
                float(dist_val) if dist_val is not None else None
            )
            duration_by_restaurant[rid] = (
                float(dur_val) if dur_val is not None else None
            )

    return distance_by_restaurant, duration_by_restaurant


def _enrich_order_with_distance(order, distance_by_restaurant, duration_by_restaurant):
    """Enrich a single order with distance and duration information."""
    o_enriched = dict(order)
    rid = order.get("restaurant_id")
    dist_m = distance_by_restaurant.get(rid)
    dur_s = duration_by_restaurant.get(rid)

    o_enriched["distance_to_restaurant"] = dist_m
    o_enriched["duration_to_restaurant"] = dur_s

    if dist_m is not None:
        o_enriched["distance_to_restaurant_miles"] = round(dist_m / 1609.34, 3)
        o_enriched["restaurant_reachable_by_road"] = True
    else:
        o_enriched["distance_to_restaurant_miles"] = None
        o_enriched["restaurant_reachable_by_road"] = False

    if dur_s is not None:
        o_enriched["duration_to_restaurant_minutes"] = round(dur_s / 60.0, 1)
    else:
        o_enriched["duration_to_restaurant_minutes"] = None

    return o_enriched


@delivery_router.get("/deliveries/ready", response_model=list)
async def fetch_ready_orders(source: Location = Depends(location_from_query)):
    """Fetch all orders that are ready for delivery"""
    try:
        result = (
            supabase.from_("orders")
            .select(
                "order_id, user_id, restaurant_id, restaurants(name, latitude, longitude, address), customer:user_id(first_name, last_name), delivery_address , delivery_fee, tip_amount, estimated_pickup_time, estimated_delivery_time, latitude, longitude, status, distance_restaurant_delivery, duration_restaurant_delivery"
            )
            .eq("status", "ready")
            .is_("delivery_user_id", None)
            .execute()
        )
        orders = result.data or []

        if not orders:
            return []

        # Extract restaurant coordinates
        restaurant_ids, restaurant_coords_by_id = _extract_restaurant_coords(orders)

        # Prepare destinations
        dests = _prepare_destinations(restaurant_ids, restaurant_coords_by_id)
        src_lng, src_lat = float(source.longitude), float(source.latitude)

        # Compute distances and durations
        distance_by_restaurant, duration_by_restaurant = (
            await _compute_distances_and_durations(src_lng, src_lat, dests)
        )

        # Attach distances and durations to orders
        enriched_orders = [
            _enrich_order_with_distance(
                o, distance_by_restaurant, duration_by_restaurant
            )
            for o in orders
        ]

        return enriched_orders

    except Exception as e:
        print(f"Error fetching ready orders: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch ready orders")


def _parse_coordinates(lat_raw, lng_raw):
    """Safely parse latitude and longitude from raw values."""
    try:
        if (
            lat_raw is not None
            and lng_raw is not None
            and lat_raw != ""
            and lng_raw != ""
        ):
            return float(lat_raw), float(lng_raw)
    except (TypeError, ValueError):
        pass
    return None, None


async def _get_restaurant_coordinates(restaurant_info, restaurant_address):
    """Get restaurant coordinates, with geocoding fallback."""
    restaurant_lat, restaurant_lng = _parse_coordinates(
        restaurant_info.get("latitude"), restaurant_info.get("longitude")
    )

    if (restaurant_lat is None or restaurant_lng is None) and restaurant_address:
        try:
            lat, lng = await geocode_address(restaurant_address)
            if lat is not None and lng is not None:
                restaurant_lat, restaurant_lng = lat, lng
        except Exception:
            pass

    return restaurant_lat, restaurant_lng


async def _geocode_customer_address(customer_address):
    """Try to geocode customer address."""
    if not customer_address:
        return None, None

    addr_str = (
        customer_address if isinstance(customer_address, str) else str(customer_address)
    )
    try:
        lat, lng = await geocode_address(addr_str)
        if lat is not None and lng is not None:
            return lat, lng
    except Exception:
        pass
    return None, None


def _get_user_profile_coordinates(user_id):
    """Get coordinates from user profile."""
    try:
        user_res = (
            supabase.from_("users")
            .select("latitude, longitude")
            .eq("user_id", user_id)
            .execute()
        )
        udata = getattr(user_res, "data", None)
        if not udata:
            return None, None

        user_row = (
            udata[0]
            if isinstance(udata, list) and len(udata) > 0
            else udata if isinstance(udata, dict) else None
        )
        if user_row:
            return _parse_coordinates(
                user_row.get("latitude"), user_row.get("longitude")
            )
    except Exception:
        pass
    return None, None


async def _get_customer_coordinates(order, customer_address):
    """Get customer coordinates, with geocoding and user profile fallbacks."""
    # Try order coordinates first
    customer_lat, customer_lng = _parse_coordinates(
        order.get("latitude"), order.get("longitude")
    )

    # Try geocoding customer address
    if customer_lat is None or customer_lng is None:
        customer_lat, customer_lng = await _geocode_customer_address(customer_address)

    # Try user profile coordinates as last resort
    if (customer_lat is None or customer_lng is None) and not customer_address:
        user_id = order.get("user_id")
        if user_id:
            customer_lat, customer_lng = _get_user_profile_coordinates(user_id)

    return customer_lat, customer_lng


def _determine_route_endpoints(
    order_status,
    driver_latitude,
    driver_longitude,
    restaurant_lat,
    restaurant_lng,
    restaurant_name,
    restaurant_address,
    customer_lat,
    customer_lng,
    customer_address,
):
    """Determine route start/end points based on order status."""
    if order_status == "assigned":
        return {
            "start_lat": driver_latitude,
            "start_lng": driver_longitude,
            "end_lat": restaurant_lat,
            "end_lng": restaurant_lng,
            "route_type": "to_restaurant",
            "destination_name": restaurant_name,
            "destination_address": restaurant_address,
        }
    elif order_status in ["picked_up", "en_route"]:
        if customer_lat is None or customer_lng is None:
            raise HTTPException(
                status_code=400, detail="Customer location not geocoded"
            )
        return {
            "start_lat": restaurant_lat,
            "start_lng": restaurant_lng,
            "end_lat": customer_lat,
            "end_lng": customer_lng,
            "route_type": "to_customer",
            "destination_name": "Customer",
            "destination_address": customer_address,
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Order status '{order_status}' does not require navigation",
        )


async def _fetch_mapbox_route(start_lng, start_lat, end_lng, end_lat):
    """Fetch route from Mapbox Directions API."""
    url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{start_lng},{start_lat};{end_lng},{end_lat}"
    params = {
        "access_token": MAPBOX_TOKEN,
        "geometries": "geojson",
        "overview": "full",
        "steps": "true",
        "banner_instructions": "true",
        "voice_instructions": "true",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


@delivery_router.get("/deliveries/active/{order_id}/navigation")
async def get_navigation_route(
    order_id: str,
    driver_latitude: float = Query(...),
    driver_longitude: float = Query(...),
):
    """Get turn-by-turn navigation route for active delivery.
    Returns route from driver → restaurant (if not picked up yet)
    or restaurant → customer (if already picked up)."""
    try:
        # Fetch order details
        result = (
            supabase.from_("orders")
            .select(
                "order_id, user_id, status, restaurant_id, restaurants(name, latitude, longitude, address), latitude, longitude, delivery_address"
            )
            .eq("order_id", order_id)
            .execute()
        )

        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Order not found")

        order = result.data[0]
        order_status = order.get("status")

        # Get coordinates
        restaurant_info = order.get("restaurants") or {}
        restaurant_name = restaurant_info.get("name", "Restaurant")
        restaurant_address = restaurant_info.get("address", "")
        customer_address = order.get("delivery_address", {})

        # Get restaurant and customer coordinates (with fallbacks)
        restaurant_lat, restaurant_lng = await _get_restaurant_coordinates(
            restaurant_info, restaurant_address
        )
        customer_lat, customer_lng = await _get_customer_coordinates(
            order, customer_address
        )

        # Validate restaurant coordinates
        if restaurant_lat is None or restaurant_lng is None:
            raise HTTPException(
                status_code=400, detail="Restaurant location not available"
            )

        # Determine route endpoints based on order status
        route_info = _determine_route_endpoints(
            order_status,
            driver_latitude,
            driver_longitude,
            restaurant_lat,
            restaurant_lng,
            restaurant_name,
            restaurant_address,
            customer_lat,
            customer_lng,
            customer_address,
        )

        # Fetch route from Mapbox
        data = await _fetch_mapbox_route(
            route_info["start_lng"],
            route_info["start_lat"],
            route_info["end_lng"],
            route_info["end_lat"],
        )

        if not data.get("routes") or len(data["routes"]) == 0:
            raise HTTPException(status_code=404, detail="No route found")

        route = data["routes"][0]
        leg = route["legs"][0] if route.get("legs") else {}

        return {
            "order_id": order_id,
            "order_status": order_status,
            "route_type": route_info["route_type"],
            "origin": {
                "latitude": route_info["start_lat"],
                "longitude": route_info["start_lng"],
            },
            "destination": {
                "name": route_info["destination_name"],
                "address": (
                    route_info["destination_address"]
                    if isinstance(route_info["destination_address"], str)
                    else str(route_info["destination_address"])
                ),
                "latitude": route_info["end_lat"],
                "longitude": route_info["end_lng"],
            },
            "route": {
                "distance_meters": route.get("distance"),
                "distance_miles": round(route.get("distance", 0) / 1609.34, 2),
                "duration_seconds": route.get("duration"),
                "duration_minutes": round(route.get("duration", 0) / 60.0, 1),
                "geometry": route.get("geometry"),
                "steps": leg.get("steps", []),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching navigation route: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch navigation: {str(e)}"
        )
