from fastapi import APIRouter, HTTPException, Depends
from database.supabase_db import create_supabase_client
from models.delivery_model import Location
import os
import httpx
import asyncio

delivery_router = APIRouter()
supabase = create_supabase_client()

MAPBOX_TOKEN = os.environ.get("MAPBOX_TOKEN")
MAX_DEST_PER_MATRIX = int(os.environ.get("MAX_DEST_PER_MATRIX", 24))

@delivery_router.get("/deliveries/ready", response_model=list)
async def fetch_ready_orders(source: Location):
    """Fetch all orders that are ready for delivery"""
    try:
        # In Python use None (not null) and the PostgREST client exposes `is_` (with underscore)
        # because `is` is a Python keyword. Use `is_` to test IS NULL.
        result = supabase.from_("orders").select(
            "order_id, user_id, restaurant_id, restaurants(name, latitude, longitude), delivery_fee, tip_amount, estimated_pickup_time, estimated_delivery_time, latitude, longitude"
            ).eq(
                "status", "ready"
            ).is_(
                "delivery_user_id", None
            ).execute()
        orders = result.data or []


        restaurant_ids = []
        restaurant_coords_by_id = {}
        for o in orders:
            rid = o.get("restaurant_id")
            if rid is not None and rid not in restaurant_ids:
                restaurant_ids.append(rid)
            coords = o.get("restaurants", {}).get("latitude"), o.get("restaurants", {}).get("longitude")
            if coords:
                # If order row already contains restaurant coords, use them
                restaurant_coords_by_id[rid] = coords


        dests = []
        for rid in restaurant_ids:
            coords = restaurant_coords_by_id.get(rid)
            if coords:
                dests.append({"restaurant_id": rid, "lat": coords[0], "lng": coords[1]})

        src_lng, src_lat = float(source.longitude), float(source.latitude)

        # Helper to break dests into chunks of MAX_DEST_PER_MATRIX size
        chunks = [dests[i:i + MAX_DEST_PER_MATRIX] for i in range(0, len(dests), MAX_DEST_PER_MATRIX)] if dests else []

        distance_by_restaurant: dict[any, float] = {}  # meters

        async def _fetch_matrix_for_chunk(chunk: list[dict[str, any]]):
            # coordinates: first element is source, then chunk destinations
            coordinates = [[src_lng, src_lat]] + [[c["lng"], c["lat"]] for c in chunk]

            coordinates_str = ";".join(f"{lng},{lat}" for lng, lat in coordinates)
            destinations_idx = ";".join(str(i) for i in range(1, len(coordinates)))

            params = {
                "access_token": MAPBOX_TOKEN,
                "sources": "0",
                "destinations": destinations_idx,
                "annotations": "distance,duration"  # asking for distance and duration (meters)
            }

            url = f"https://api.mapbox.com/directions-matrix/v1/mapbox/driving/{coordinates_str}"
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.get(url, params=params)
                    resp.raise_for_status()
                    return resp.json()
            except httpx.HTTPError as http_err:
                print(f"HTTP error occurred while fetching matrix: {http_err}")
                return {}

        if chunks:
            tasks = [_fetch_matrix_for_chunk(chunk) for chunk in chunks]
            results = await asyncio.gather(*tasks)

            # Map returned distances/durations back to restaurant ids
            distance_by_restaurant = {}
            duration_by_restaurant = {}

            for chunk_result, chunk in zip(results, chunks):
                # distances: array of arrays; since we asked sources=0 there should be one row
                distances_matrix = chunk_result.get("distances")
                durations_matrix = chunk_result.get("durations")

                if distances_matrix and len(distances_matrix) > 0:
                    distances_from_source = distances_matrix[0]
                else:
                    distances_from_source = [None] * len(chunk)

                if durations_matrix and len(durations_matrix) > 0:
                    durations_from_source = durations_matrix[0]
                else:
                    durations_from_source = [None] * len(chunk)

                # assign per destination in the same order
                for item, dist_val, dur_val in zip(chunk, distances_from_source, durations_from_source):
                    rid = item.get("restaurant_id")
                    # Mapbox may return null for unreachable destinations
                    distance_by_restaurant[rid] = float(dist_val) if dist_val is not None else None
                    duration_by_restaurant[rid] = float(dur_val) if dur_val is not None else None

        else:
            # no destinations; nothing to compute
            distance_by_restaurant = {}
            duration_by_restaurant = {}

        # Attach distances and durations to orders
        enriched_orders = []
        for o in orders:
            rid = o.get("restaurant_id")
            dist_m = distance_by_restaurant.get(rid)
            dur_s = duration_by_restaurant.get(rid)

            o_enriched = dict(o)
            o_enriched["by_road_distance_meters"] = dist_m
            o_enriched["by_road_duration_seconds"] = dur_s

            if dist_m is not None:
                o_enriched["by_road_distance_km"] = round(dist_m / 1000.0, 3)
                o_enriched["is_reachable_by_road"] = True
            else:
                o_enriched["by_road_distance_km"] = None
                o_enriched["is_reachable_by_road"] = False

            if dur_s is not None:
                # add minutes rounded
                o_enriched["by_road_duration_minutes"] = round(dur_s / 60.0, 1)
            else:
                o_enriched["by_road_duration_minutes"] = None

            enriched_orders.append(o_enriched)

        return enriched_orders

    except Exception as e:
        print(f"Error fetching ready orders: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch ready orders")
