from fastapi import APIRouter, HTTPException, Depends, Query
from database.supabase_db import create_supabase_client
from models.delivery_model import Location
from utils.geocode import geocode_address
import os
import httpx
import asyncio

delivery_router = APIRouter()
supabase = create_supabase_client()

MAPBOX_TOKEN = os.environ.get("MAPBOX_TOKEN")
MAX_DEST_PER_MATRIX = int(os.environ.get("MAX_DEST_PER_MATRIX", 24))

def location_from_query(latitude: float = Query(...), longitude: float = Query(...)) -> Location:
    return Location(latitude=latitude, longitude=longitude)

@delivery_router.get("/deliveries/ready", response_model=list)
async def fetch_ready_orders(source: Location = Depends(location_from_query)):
    """Fetch all orders that are ready for delivery"""
    try:
        # In Python use None (not null) and the PostgREST client exposes `is_` (with underscore)
        # because `is` is a Python keyword. Use `is_` to test IS NULL.
        result = supabase.from_("orders").select(
            "order_id, user_id, restaurant_id, restaurants(name, latitude, longitude, address), delivery_fee, tip_amount, estimated_pickup_time, estimated_delivery_time, latitude, longitude, status"
            ).eq(
                "status", "ready"
            ).is_(
                "delivery_user_id", None
            ).execute()
        orders = result.data or []

        if orders == []:
            return []


        restaurant_ids = []
        restaurant_coords_by_id = {}
        for o in orders:
            rid = o.get("restaurant_id")
            if rid is not None and rid not in restaurant_ids:
                restaurant_ids.append(rid)
            # Safely extract restaurant coords if present in the order payload.
            rest_info = o.get("restaurants") or {}
            lat_raw = rest_info.get("latitude")
            lng_raw = rest_info.get("longitude")
            try:
                if lat_raw is not None and lng_raw is not None:
                    latitude = float(lat_raw)
                    longitude = float(lng_raw)
                    # If order row already contains restaurant coords, use them
                    restaurant_coords_by_id[rid] = (latitude, longitude)
            except (TypeError, ValueError):
                # If parsing fails, treat as missing coords and continue
                pass


        dests = []
        for rid in restaurant_ids:
            coords = restaurant_coords_by_id.get(rid)
            if coords:
                dests.append({"restaurant_id": rid, "lat": coords[0], "lng": coords[1]})
            else:
                dests.append({"restaurant_id": rid, "lat": None, "lng": None})

        src_lng, src_lat = float(source.longitude), float(source.latitude)
        dests = [ri for ri in dests if ri["lat"] is not None and ri["lng"] is not None]

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

            if dist_m is None and dur_s is None:
                # unreachable restaurant
                o_enriched = dict(o)
                o_enriched["distance_to_restaurant"] = None
                o_enriched["duration_to_restaurant"] = None
            
            else:

                o_enriched = dict(o)
                o_enriched["distance_to_restaurant"] = dist_m
                o_enriched["duration_to_restaurant"] = dur_s

            if dist_m is not None:
                o_enriched["distance_to_restaurant_miles"] = round(dist_m / 1609.34, 3)
                o_enriched["restaurant_reachable_by_road"] = True
            else:
                o_enriched["distance_to_restaurant_miles"] = None
                o_enriched["restaurant_reachable_by_road"] = False

            if dur_s is not None:
                # add minutes rounded
                o_enriched["duration_to_restaurant_minutes"] = round(dur_s / 60.0, 1)
            else:
                o_enriched["duration_to_restaurant_minutes"] = None

            enriched_orders.append(o_enriched)

        return enriched_orders

    except Exception as e:
        print(f"Error fetching ready orders: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch ready orders")


@delivery_router.get("/deliveries/active/{order_id}/navigation")
async def get_navigation_route(
    order_id: str,
    driver_latitude: float = Query(...),
    driver_longitude: float = Query(...)
):
    """Get turn-by-turn navigation route for active delivery.
    Returns route from driver → restaurant (if not picked up yet)
    or restaurant → customer (if already picked up)."""
    try:
        # Fetch order details
        result = supabase.from_("orders").select(
            "order_id, user_id, status, restaurant_id, restaurants(name, latitude, longitude, address), latitude, longitude, delivery_address"
        ).eq("order_id", order_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = result.data[0]
        order_status = order.get("status")
        
        # Get coordinates
        restaurant_info = order.get("restaurants") or {}
        restaurant_name = restaurant_info.get("name", "Restaurant")
        restaurant_address = restaurant_info.get("address", "")

        # Safely parse restaurant coordinates, if present
        restaurant_lat = None
        restaurant_lng = None
        try:
            lat_raw = restaurant_info.get("latitude")
            lng_raw = restaurant_info.get("longitude")
            if lat_raw is not None and lng_raw is not None and lat_raw != "" and lng_raw != "":
                restaurant_lat = float(lat_raw)
                restaurant_lng = float(lng_raw)
        except (TypeError, ValueError):
            restaurant_lat = None
            restaurant_lng = None

        # Safely parse customer coordinates, if present
        customer_lat = None
        customer_lng = None
        try:
            cust_lat_raw = order.get("latitude")
            cust_lng_raw = order.get("longitude")
            if cust_lat_raw is not None and cust_lng_raw is not None and cust_lat_raw != "" and cust_lng_raw != "":
                customer_lat = float(cust_lat_raw)
                customer_lng = float(cust_lng_raw)
        except (TypeError, ValueError):
            customer_lat = None
            customer_lng = None

        customer_address = order.get("delivery_address", {})

        # Fallback: attempt to geocode restaurant address if coords missing
        if (restaurant_lat is None or restaurant_lng is None) and restaurant_address:
            try:
                lat, lng = await geocode_address(restaurant_address)
                if lat is not None and lng is not None:
                    restaurant_lat = lat
                    restaurant_lng = lng
            except Exception:
                # ignore geocode errors; will be handled below
                pass

        # Fallback: attempt to geocode customer/delivery address if coords missing
        if (customer_lat is None or customer_lng is None) and customer_address:
            # customer_address may be a string or a dict; prefer string
            addr_str = customer_address if isinstance(customer_address, str) else str(customer_address)
            try:
                lat, lng = await geocode_address(addr_str)
                if lat is not None and lng is not None:
                    customer_lat = lat
                    customer_lng = lng
            except Exception:
                pass

        # If customer coords are still missing and we don't have a delivery_address,
        # try to fall back to the user's saved profile coordinates (users.latitude/users.longitude)
        if (customer_lat is None or customer_lng is None) and not customer_address:
            try:
                user_id = order.get("user_id")
                if user_id:
                    user_res = supabase.from_("users").select("latitude, longitude").eq("user_id", user_id).execute()
                    udata = getattr(user_res, 'data', None)
                    user_row = None
                    if udata:
                        # user_res.data may be a list or a dict depending on client behavior
                        if isinstance(udata, list) and len(udata) > 0:
                            user_row = udata[0]
                        elif isinstance(udata, dict):
                            user_row = udata

                    if user_row:
                        try:
                            u_lat = user_row.get("latitude")
                            u_lng = user_row.get("longitude")
                            if u_lat is not None and u_lng is not None and u_lat != "" and u_lng != "":
                                customer_lat = float(u_lat)
                                customer_lng = float(u_lng)
                                print("Navigation debug: used user profile coords as fallback", {"user_id": user_id, "customer_lat": customer_lat, "customer_lng": customer_lng})
                        except (TypeError, ValueError):
                            pass
            except Exception:
                # ignore lookup errors; will surface below
                pass

        # Restaurant coords are required for any navigation
        # If restaurant coords are missing, attempt to geocode the restaurant address
        if restaurant_lat is None or restaurant_lng is None:
            # restaurant_address may be a string or structured data; prefer string
            try:
                addr_str = restaurant_address if isinstance(restaurant_address, str) else str(restaurant_address)
                if addr_str:
                    lat, lng = await geocode_address(addr_str)
                    if lat is not None and lng is not None:
                        restaurant_lat = lat
                        restaurant_lng = lng
            except Exception:
                # ignore geocode errors here; we'll surface below if still missing
                pass

        # After attempting geocode, if still missing then fail with debug info
        if restaurant_lat is None or restaurant_lng is None:
            print("Navigation debug: restaurant coords missing after geocode attempt", {
                "order": order,
                "restaurant_info": restaurant_info,
                "restaurant_address": restaurant_address,
                "restaurant_lat": restaurant_lat,
                "restaurant_lng": restaurant_lng
            })
            raise HTTPException(status_code=400, detail="Restaurant location not available")

        # NOTE: customer coordinates are only strictly required when routing to the customer
        # (i.e. when the order is already picked up). For assigned orders (driver -> restaurant)
        # we don't require customer coordinates and will not fail early.
        
        # Determine which route to show based on order status
        if order_status == "assigned":
            # Show driver → restaurant route
            start_lng, start_lat = driver_longitude, driver_latitude
            end_lng, end_lat = restaurant_lng, restaurant_lat
            route_type = "to_restaurant"
            destination_name = restaurant_name
            destination_address = restaurant_address
        elif order_status in ["picked_up", "en_route"]:
            # Show restaurant → customer route
            start_lng, start_lat = restaurant_lng, restaurant_lat
            end_lng, end_lat = customer_lng, customer_lat
            route_type = "to_customer"
            destination_name = "Customer"
            destination_address = customer_address
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Order status '{order_status}' does not require navigation"
            )

        # If we're routing to the customer, ensure customer coords are available
        if route_type == "to_customer":
            if customer_lat is None or customer_lng is None:
                print("Navigation debug: customer coords missing for to_customer route", {
                    "order": order,
                    "customer_address": customer_address,
                    "customer_lat": customer_lat,
                    "customer_lng": customer_lng
                }) 
                raise HTTPException(status_code=400, detail="Customer location not geocoded")
        
        # Fetch route from Mapbox Directions API
        url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{start_lng},{start_lat};{end_lng},{end_lat}"
        params = {
            "access_token": MAPBOX_TOKEN,
            "geometries": "geojson",
            "overview": "full",
            "steps": "true",
            "banner_instructions": "true",
            "voice_instructions": "true"
        }
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
        if not data.get("routes") or len(data["routes"]) == 0:
            raise HTTPException(status_code=404, detail="No route found")
        
        route = data["routes"][0]
        leg = route["legs"][0] if route.get("legs") else {}
        
        return {
            "order_id": order_id,
            "order_status": order_status,
            "route_type": route_type,
            "origin": {
                "latitude": start_lat,
                "longitude": start_lng
            },
            "destination": {
                "name": destination_name,
                "address": destination_address if isinstance(destination_address, str) else str(destination_address),
                "latitude": end_lat,
                "longitude": end_lng
            },
            "route": {
                "distance_meters": route.get("distance"),
                "distance_miles": round(route.get("distance", 0) / 1609.34, 2),
                "duration_seconds": route.get("duration"),
                "duration_minutes": round(route.get("duration", 0) / 60.0, 1),
                "geometry": route.get("geometry"),
                "steps": leg.get("steps", [])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching navigation route: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch navigation: {str(e)}")

