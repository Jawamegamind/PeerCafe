"""
Order management routes for PeerCafe backend
"""

import json
import logging
import os
import random
import threading
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
import httpx

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from database.supabase_db import create_supabase_client
from models.order_model import Order, OrderCreate, OrderStatus
from utils.geocode import geocode_address

router = APIRouter(tags=["orders"])\

MAPBOX_TOKEN = os.environ.get("MAPBOX_TOKEN")


def get_supabase():
    """Dependency to get Supabase client"""
    return create_supabase_client()


# Compatibility helpers from main branch (used by tests and admin endpoints)
def get_supabase_client():
    """Return a usable supabase client.

    To keep tests isolated we avoid caching the client in module-global state — tests
    patch `create_supabase_client` per-test and expect routes to use the mocked value.
    """
    try:
        return create_supabase_client()
    except Exception:
        return None


def _get_db_table(client, table_name: str):
    """Return a table-like query object compatible with different supabase clients.

    Prefer `table()` if available, otherwise fall back to `from_()` used by some clients/mocks.
    """
    if hasattr(client, "table"):
        return client.table(table_name)
    if hasattr(client, "from_"):
        return client.from_(table_name)
    # As a last resort try attribute access which will raise a clearer error.
    return getattr(client, "table")(table_name)


# Optional sanitization metrics to keep parity with main branch endpoints
_sanitization_lock = threading.Lock()
_sanitization_counts = {
    "records_sanitized": 0,
    "subtotal_corrections": 0,
    "total_corrections": 0,
}
logger = logging.getLogger("routes.order_routes")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def _safe_float(val, default=None):
    try:
        return float(val) if val is not None else default
    except Exception:
        return default


def _compute_item_subtotal(it) -> float:
    """Return a numeric subtotal for a single order item, resilient to malformed data."""
    if not it:
        return 0.0
    if isinstance(it, dict) and ("subtotal" in it):
        return _safe_float(it.get("subtotal"), 0) or 0
    price = _safe_float(getattr(it, "get", lambda k, d=None: d)("price", 0), 0) or 0
    qty = _safe_float(getattr(it, "get", lambda k, d=None: d)("quantity", 1), 1) or 1
    try:
        return float(price * qty)
    except Exception:
        return 0.0


def _compute_subtotal(items) -> float:
    total = 0.0
    for idx, it in enumerate(items):
        try:
            total += _compute_item_subtotal(it)
        except (TypeError, ValueError, AttributeError):
            # skip malformed items but keep going
            continue
    return total


def _recompute_total(o: dict):
    """Recompute total_amount from components and indicate whether it changed.

    Returns a tuple: (changed: bool, old_total_value_or_None, new_total_or_None)
    """
    tax = _safe_float(o.get("tax_amount"), 0) or 0
    delivery_fee = _safe_float(o.get("delivery_fee"), 0) or 0
    tip = _safe_float(o.get("tip_amount"), 0) or 0
    discount = _safe_float(o.get("discount_amount"), 0) or 0
    computed_total = round(
        o.get("subtotal", 0) + tax + delivery_fee + tip - discount, 2
    )
    stored_total = o.get("total_amount")
    stored_total_val = _safe_float(stored_total)
    if stored_total_val is None or abs((stored_total_val or 0) - computed_total) > 0.01:
        return True, stored_total_val, computed_total
    return False, stored_total_val, None


def _compute_and_update_subtotal(order: dict) -> tuple[bool, Optional[float]]:
    """Compute subtotal from order_items and update order if it differs.

    Returns (subtotal_changed: bool, old_subtotal_value_or_None)
    """
    items = order.get("order_items") or []
    computed_sub = _compute_subtotal(items)
    stored_sub_val = _safe_float(order.get("subtotal"))

    if stored_sub_val is None or abs((stored_sub_val or 0) - computed_sub) > 0.01:
        old = stored_sub_val
        order["subtotal"] = round(computed_sub, 2)
        return True, old
    return False, stored_sub_val


def _compute_and_update_total(
    order: dict,
) -> tuple[bool, Optional[float], Optional[float]]:
    """Attempt to recompute total_amount from components.

    Returns (total_changed: bool, old_total_value_or_None, new_total_or_None)
    """
    try:
        changed_flag, old_total, new_total = _recompute_total(order)
        if changed_flag:
            order["total_amount"] = new_total
            return True, old_total, new_total
        return False, old_total, None
    except Exception:
        return False, None, None


def _sanitize_order_record(order: dict) -> dict:  # noqa: C901
    """Fix simple data inconsistencies in an order record.

    - Recomputes subtotal from order_items when it disagrees with stored subtotal.
    - Recomputes total_amount when possible (subtotal + tax + delivery_fee + tip - discount).
    """
    try:
        subtotal_changed, old = _compute_and_update_subtotal(order)
        total_changed, old_total, new_total = _compute_and_update_total(order)

        # If any changes occurred, log and increment metrics
        if subtotal_changed or total_changed:
            with _sanitization_lock:
                _sanitization_counts["records_sanitized"] += 1
                if subtotal_changed:
                    _sanitization_counts["subtotal_corrections"] += 1
                if total_changed:
                    _sanitization_counts["total_corrections"] += 1
    except Exception:
        return order

    return order


def _placeholder_delivery_address() -> dict:
    return {
        "street": "Unknown",
        "city": "Unknown",
        "state": "Unknown",
        "zip_code": "00000",
        "instructions": None,
    }


def _extract_first_row(data):
    if not data:
        return None
    if isinstance(data, list) and data:
        return data[0]
    if isinstance(data, dict):
        return data
    return None


def _maybe_fill_address_and_coords(order_row: dict, user_row: dict) -> dict:
    # Construct a minimal delivery_address using available info
    street = user_row.get("street") or "Unknown"
    city = user_row.get("city") or "Unknown"
    state = user_row.get("state") or "Unknown"
    zip_code = user_row.get("zip_code") or "00000"
    order_row["delivery_address"] = {
        "street": street,
        "city": city,
        "state": state,
        "zip_code": zip_code,
        "instructions": None,
    }
    # Copy coords if present
    try:
        if not order_row.get("latitude") and user_row.get("latitude"):
            order_row["latitude"] = float(user_row.get("latitude"))
        if not order_row.get("longitude") and user_row.get("longitude"):
            order_row["longitude"] = float(user_row.get("longitude"))
    except Exception:
        pass
    return order_row


async def _ensure_delivery_address(order_row: dict, supabase) -> dict:
    """Ensure `delivery_address` is present on an order row.

    If missing, attempt to populate from the user's profile (if available).
    If that fails, provide a minimal placeholder so Pydantic validation won't fail.
    This is defensive: the database should ideally contain a proper delivery_address.
    """
    if order_row is None:
        return order_row

    if order_row.get("delivery_address"):
        return order_row

    try:
        user_id = order_row.get("user_id")
        if user_id and hasattr(supabase, "from_"):
            user_res = (
                supabase.from_("users")
                .select("latitude, longitude")
                .eq("user_id", user_id)
                .execute()
            )
            user_row = _extract_first_row(getattr(user_res, "data", None))
            if user_row:
                return _maybe_fill_address_and_coords(order_row, user_row)
    except Exception:
        # ignore lookup errors and fall through to placeholder
        pass

    order_row["delivery_address"] = _placeholder_delivery_address()
    return order_row


def _extract_user_id_from_auth_object(user_obj):
    """Extract user_id from various auth object shapes."""
    if isinstance(user_obj, dict):
        return user_obj.get("user_id") or user_obj.get("id") or user_obj.get("sub")
    else:
        return (
            getattr(user_obj, "user_id", None)
            or getattr(user_obj, "id", None)
            or getattr(user_obj, "sub", None)
        )


def _normalize_user_object(maybe_user):
    """Normalize user object from various Supabase response shapes."""
    if isinstance(maybe_user, dict):
        user_obj = maybe_user.get("data") or maybe_user.get("user") or maybe_user
        if (
            isinstance(user_obj, dict)
            and "user" in user_obj
            and isinstance(user_obj["user"], dict)
        ):
            user_obj = user_obj["user"]
    else:
        user_obj = getattr(maybe_user, "user", getattr(maybe_user, "data", None))
    return user_obj


def _get_user_id_from_token(token, supabase):
    """Extract user_id from JWT token using Supabase auth."""
    try:
        if token and hasattr(supabase, "auth") and hasattr(supabase.auth, "get_user"):
            maybe_user = supabase.auth.get_user(token)
            user_obj = _normalize_user_object(maybe_user)
            if user_obj:
                return _extract_user_id_from_auth_object(user_obj)
    except Exception:
        pass
    return None


def _get_user_profile_coordinates_from_supabase(supabase, user_id):
    """Fetch user's saved latitude/longitude from the users table.

    Returns (lat, lng) as floats if available, otherwise (None, None).
    """
    try:
        if not user_id or not hasattr(supabase, "from_"):
            return None, None
        res = (
            supabase.from_("users")
            .select("latitude, longitude")
            .eq("user_id", user_id)
            .execute()
        )
        row = _extract_first_row(getattr(res, "data", None))
        if not row:
            return None, None
        lat_raw, lng_raw = row.get("latitude"), row.get("longitude")
        try:
            return (
                (float(lat_raw), float(lng_raw))
                if lat_raw is not None and lng_raw is not None
                else (None, None)
            )
        except (TypeError, ValueError):
            return None, None
    except Exception:
        return None, None


def _coerce_number(v):
    """Coerce value to float, returning 0.0 on error."""
    try:
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            return float(v)
        return float(str(v))
    except Exception:
        return 0.0


def _normalize_order_item(item):
    """Normalize a single order item to dict format."""
    if not isinstance(item, dict):
        try:
            return item.model_dump()
        except Exception:
            try:
                return dict(item)
            except Exception:
                return {}
    return item if item is not None else {}


def _normalize_order_items(order_items):
    """Normalize order items from various formats."""
    # Handle JSON string
    if isinstance(order_items, str):
        try:
            order_items = json.loads(order_items)
        except Exception:
            return []

    # Normalize each item
    if not isinstance(order_items, (list, tuple)):
        return []

    normalized = []
    for item in order_items:
        it = _normalize_order_item(item)
        it["subtotal"] = _coerce_number(it.get("subtotal"))
        normalized.append(it)

    return normalized


async def _normalize_single_order(order, supabase):
    """Normalize a single order object."""
    try:
        norm = await _ensure_delivery_address(order, supabase)

        # Normalize order_items
        norm["order_items"] = _normalize_order_items(norm.get("order_items"))

        # Recompute subtotal
        calculated = sum(i.get("subtotal", 0.0) for i in norm["order_items"])
        norm["subtotal"] = round(calculated, 2)

        # Normalize delivery_address if it's a JSON string
        da = norm.get("delivery_address")
        if isinstance(da, str):
            try:
                norm["delivery_address"] = json.loads(da)
            except Exception:
                pass

        return norm
    except Exception:
        # Never fail on single order normalization
        return norm if "norm" in locals() else order


@router.get("/me", response_model=list[Order])
async def get_my_orders(
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(None),
    limit: int = 20,
    offset: int = 0,
    supabase=Depends(get_supabase),
):
    """
    Get orders for the currently authenticated user.

    This endpoint attempts to resolve the user from the Authorization: Bearer <token>
    header using the Supabase client where possible. For development convenience
    it will also accept an `X-User-Id` header to identify the user when a token
    is not available.
    """
    try:
        # Extract user_id from authorization token
        user_id = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1]
            user_id = _get_user_id_from_token(token, supabase)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to determine user from Authorization header",
            )

        # Query orders for the resolved user_id
        response = (
            supabase.table("orders")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        if not response.data:
            return []

        # Normalize all orders
        orders = []
        for order in response.data:
            normalized_order = await _normalize_single_order(order, supabase)
            orders.append(normalized_order)

        # Return a JSONResponse with encoded data to bypass FastAPI response_model
        # re-validation which can raise on dirty/legacy rows.
        return JSONResponse(content=jsonable_encoder(orders))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve authenticated user orders: {str(e)}",
        )


@router.post("/", response_model=Order, status_code=status.HTTP_201_CREATED)
async def place_order(order_data: OrderCreate, supabase=Depends(get_supabase)):
    """
    Place a new order
    """
    try:
        print("Placing order with data:", order_data)
        # Generate order ID
        order_id = str(uuid.uuid4())

        # Geocode customer delivery address to get lat/lng for navigation
        delivery_addr = order_data.delivery_address
        full_address = f"{delivery_addr.street}, {delivery_addr.city}, {delivery_addr.state} {delivery_addr.zip_code}"
        customer_lat, customer_lng = await geocode_address(full_address)

        # If geocoding the entered address fails, fall back to the user's current saved location
        if customer_lat is None or customer_lng is None:
            print(
                f"Warning: Failed to geocode entered address; attempting user profile fallback: {full_address}"
            )
            alt_lat, alt_lng = _get_user_profile_coordinates_from_supabase(
                supabase, order_data.user_id
            )
            if alt_lat is not None and alt_lng is not None:
                customer_lat, customer_lng = alt_lat, alt_lng
            else:
                print(
                    "Warning: No user profile coordinates available; proceeding without coordinates"
                )
                # Still allow order creation but navigation won't work until geocoded

        # Calculate estimated times (this can be made more sophisticated later)
        estimated_pickup_time = datetime.now() + timedelta(minutes=30)
        estimated_delivery_time = datetime.now() + timedelta(minutes=60)

        # Fetch restaurant location (to calculate distance and duration to from restaurant to delivery address)
        restaurant_location = supabase.from_("restaurants").select(
            "latitude, longitude"
        ).eq("restaurant_id", order_data.restaurant_id).single().execute()


        # Calculate distance and duration from restaurant to delivery address
        distance = None
        duration = None
        if (restaurant_location.data and
            restaurant_location.data.get("latitude") is not None and
            restaurant_location.data.get("longitude") is not None):
            rest_lat = restaurant_location.data["latitude"]
            rest_lon = restaurant_location.data["longitude"]

            directions_url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{rest_lon},{rest_lat};{customer_lng},{customer_lat}"
            directions_params = {
                "access_token": MAPBOX_TOKEN,
                "geometries": "geojson",
                "overview": "simplified",
            }

            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.get(directions_url, params=directions_params)
                    resp.raise_for_status()
                    directions_data = resp.json()
                    if (
                        directions_data.get("routes") and
                        len(directions_data["routes"]) > 0
                    ):
                        route = directions_data["routes"][0]
                        distance = route.get("distance")  # in meters
                        duration = route.get("duration")  # in seconds
            except httpx.HTTPError as http_err:
                print(f"HTTP error occurred while fetching directions: {http_err}")

        
        # Converting distance to miles and duration to minutes
        if distance is not None:
            distance = round(distance / 1609.34, 2)  # meters to miles
        if duration is not None:
            duration = round(duration / 60, 2)  # seconds to minutes

        # Prepare order data for database
        order_db_data = {
            "order_id": order_id,
            "user_id": order_data.user_id,
            "restaurant_id": order_data.restaurant_id,
            "order_items": [item.model_dump() for item in order_data.order_items],
            "delivery_address": order_data.delivery_address.model_dump(),
            "latitude": customer_lat,
            "longitude": customer_lng,
            "notes": order_data.notes,
            "subtotal": order_data.subtotal,
            "tax_amount": order_data.tax_amount,
            "delivery_fee": order_data.delivery_fee,
            "tip_amount": order_data.tip_amount,
            "discount_amount": order_data.discount_amount,
            "total_amount": order_data.total_amount,
            "status": OrderStatus.PENDING.value,
            "estimated_pickup_time": estimated_pickup_time.isoformat(),
            "estimated_delivery_time": estimated_delivery_time.isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "duration_restaurant_delivery": duration,
            "distance_restaurant_delivery": distance,
        }

        # Insert order into database
        response = supabase.table("orders").insert(order_db_data).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create order",
            )

        # Return the created order
        created_order = response.data[0]
        return Order(**created_order)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to place order: {str(e)}",
        )


@router.get("/", response_model=List[dict])
async def list_orders(limit: int = 1000, offset: int = 0):
    """
    List all orders (admin use). Supports pagination via limit/offset.
    Filtering by restaurant name should be done client-side by default.
    """
    try:
        client = get_supabase_client()
        if client is None:
            # Will be wrapped and surfaced as 500 below for consistency with tests
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )

        response = (
            _get_db_table(client, "orders")
            .select("*")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        # Return raw dictionaries to avoid hard validation errors when the DB contains
        # slightly inconsistent historical data (subtotal vs items). The admin UI
        # expects simple JSON objects and will handle display.
        return response.data or []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve orders: {str(e)}",
        )


@router.get("/sanitization-metrics", response_model=dict)
async def sanitization_metrics():
    """Return in-memory sanitization metrics (for admin diagnostics)."""
    with _sanitization_lock:
        return dict(_sanitization_counts)


@router.get("/user/{user_id}", response_model=List[Order])
async def get_user_orders(
    user_id: str, limit: int = 20, offset: int = 0, supabase=Depends(get_supabase)
):
    """
    Get orders for a specific user
    """
    try:
        response = (
            supabase.table("orders")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        if response.data:
            orders = []
            for order in response.data:
                norm = await _ensure_delivery_address(order, supabase)
                orders.append(Order(**norm))
            return orders
        return []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user orders: {str(e)}",
        )


@router.get("/restaurant/{restaurant_id}", response_model=List[Order])
async def get_restaurant_orders(
    restaurant_id: int,
    status_filter: Optional[OrderStatus] = None,
    limit: int = 50,
    offset: int = 0,
    supabase=Depends(get_supabase),
):
    """
    Get orders for a specific restaurant (for restaurant dashboard)
    """
    try:
        query = supabase.table("orders").select("*").eq("restaurant_id", restaurant_id)

        if status_filter:
            query = query.eq("status", status_filter.value)

        response = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        if response.data:
            orders = []
            for order in response.data:
                norm = await _ensure_delivery_address(order, supabase)
                orders.append(Order(**norm))
            return orders
        return []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve restaurant orders: {str(e)}",
        )


@router.get("/{order_id}", response_model=Order)
async def get_order_by_id(order_id: str, supabase=Depends(get_supabase)):
    """
    Get a specific order by ID
    """
    try:
        # Get Supabase client
        client = _get_supabase_client_or_dependency(supabase)

        response = (
            _get_db_table(client, "orders")
            .select("*")
            .eq("order_id", order_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        # Normalize and return (reuse helper)
        norm = await _normalize_single_order(response.data[0], client)
        return Order(**norm)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve order: {str(e)}",
        )


def _get_supabase_client_or_dependency(supabase):
    """Get Supabase client from DI or create new one."""
    if hasattr(supabase, "table") or hasattr(supabase, "from_"):
        return supabase
    client = get_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured.",
        )
    return client


def _validate_status_transition(new_status, current_status):
    """Validate order status transition is allowed."""
    if new_status == OrderStatus.PICKED_UP and current_status not in [
        OrderStatus.ASSIGNED.value,
        OrderStatus.READY.value,
        OrderStatus.CONFIRMED.value,
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition: cannot mark as picked_up from '{current_status}'",
        )
    if new_status == OrderStatus.DELIVERED and current_status not in [
        OrderStatus.PICKED_UP.value,
        OrderStatus.EN_ROUTE.value,
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition: cannot mark as delivered from '{current_status}'",
        )


def _prepare_status_update_data(new_status, existing_row):
    """Prepare update data dict based on new status."""
    update_data = {
        "status": new_status.value,
        "updated_at": datetime.now().isoformat(),
    }

    if new_status == OrderStatus.PICKED_UP:
        update_data["actual_pickup_time"] = datetime.now().isoformat()
        # Generate delivery code if not present
        try:
            if not (existing_row and existing_row.get("delivery_code")):
                code = f"{random.randint(100000, 999999)}"
                update_data["delivery_code"] = code
                update_data["delivery_code_used"] = False
        except Exception:
            pass
    elif new_status == OrderStatus.DELIVERED:
        update_data["actual_delivery_time"] = datetime.now().isoformat()

    return update_data


def _restore_missing_nested_fields(final_row, existing_order):
    """Restore nested fields if missing from updated row."""
    if not final_row.get("delivery_address") and getattr(existing_order, "data", None):
        final_row["delivery_address"] = existing_order.data[0].get("delivery_address")

    if not final_row.get("restaurants") and getattr(existing_order, "data", None):
        final_row["restaurants"] = existing_order.data[0].get("restaurants")

    return final_row


def _perform_update_and_return_order(client, order_id, update_data, existing_order):
    """Perform update, refetch row, restore nested fields and construct Order."""
    response = (
        _get_db_table(client, "orders")
        .update(update_data)
        .eq("order_id", order_id)
        .execute()
    )

    updated_order = (
        _get_db_table(client, "orders").select("*").eq("order_id", order_id).execute()
    )

    data = getattr(updated_order, "data", None)
    if not data or not isinstance(data, (list, tuple)):
        # Try to surface Supabase error details
        error_msg = None
        try:
            error_msg = getattr(response, "error", None) or getattr(
                response, "message", None
            )
        except Exception:
            error_msg = None

        # If the update response contains the updated row, use it
        if getattr(response, "data", None):
            fallback = _restore_missing_nested_fields(response.data[0], existing_order)
            return Order(**fallback)

        if (
            error_msg
            and isinstance(error_msg, str)
            and "row level security" in error_msg.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"RLS blocked update: {error_msg}",
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update order status{f': {error_msg}' if error_msg else ''}",
        )

    # Restore missing nested fields and return
    final_row = _restore_missing_nested_fields(data[0], existing_order)
    try:
        return Order(**final_row)
    except Exception:
        # Fallback to update response payload if construction fails
        if getattr(response, "data", None):
            fallback = _restore_missing_nested_fields(response.data[0], existing_order)
            return Order(**fallback)
        raise


@router.patch("/{order_id}/status", response_model=Order)
async def update_order_status(
    order_id: str, new_status: OrderStatus, supabase=Depends(get_supabase)
):
    """
    Update order status (for restaurants and delivery users)
    """
    try:
        # Get Supabase client
        client = _get_supabase_client_or_dependency(supabase)

        # First check if order exists
        existing_order = (
            _get_db_table(client, "orders")
            .select("*")
            .eq("order_id", order_id)
            .execute()
        )

        if not existing_order.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        # Validate state transitions
        current_status = existing_order.data[0].get("status")
        _validate_status_transition(new_status, current_status)

        # Prepare update data
        existing_row = getattr(existing_order, "data", None) and existing_order.data[0]
        update_data = _prepare_status_update_data(new_status, existing_row)

        return _perform_update_and_return_order(
            client, order_id, update_data, existing_order
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update order status: {str(e)}",
        )


def _validate_order_ready_for_assignment(order_row):
    """Validate order is ready for delivery assignment."""
    if order_row["status"] not in [
        OrderStatus.READY.value,
        OrderStatus.CONFIRMED.value,
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is not ready for delivery assignment. Current status: {order_row['status']}",
        )


def _check_driver_active_orders(client, delivery_user_id):
    """Optionally ensure the driver has no active orders (feature-flagged)."""
    if os.getenv("ENABLE_ACTIVE_ORDER_CHECK", "false").lower() != "true":
        return

    active_orders = (
        _get_db_table(client, "orders")
        .select("*")
        .eq("delivery_user_id", delivery_user_id)
        .in_("status", ["assigned", "picked_up", "en_route"])
        .execute()
    )

    if getattr(active_orders, "data", None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driver already has an active delivery. Complete current delivery before accepting new orders.",
        )


def _fetch_order_or_404(client, order_id):
    """Fetch order by id or raise 404 if not found; returns supabase response."""
    existing_order = (
        _get_db_table(client, "orders").select("*").eq("order_id", order_id).execute()
    )
    if not getattr(existing_order, "data", None):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return existing_order


def _assign_and_fetch_order(client, order_id, delivery_user_id, existing_order):
    """Assign delivery user, update status, refetch and construct Order model."""
    update_data = {
        "delivery_user_id": delivery_user_id,
        "status": OrderStatus.ASSIGNED.value,
        "updated_at": datetime.now().isoformat(),
    }

    response = (
        _get_db_table(client, "orders")
        .update(update_data)
        .eq("order_id", order_id)
        .execute()
    )

    updated_order = (
        _get_db_table(client, "orders").select("*").eq("order_id", order_id).execute()
    )

    data = getattr(updated_order, "data", None)
    if data and isinstance(data, (list, tuple)):
        final_row = _restore_missing_nested_fields(data[0], existing_order)
        return Order(**final_row)

    if getattr(response, "data", None):
        fallback = _restore_missing_nested_fields(response.data[0], existing_order)
        return Order(**fallback)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to assign delivery user",
    )


@router.patch("/{order_id}/assign-delivery", response_model=Order)
async def assign_delivery_user(
    order_id: str, delivery_user_id: str, supabase=Depends(get_supabase)
):
    """
    Assign a delivery user to an order
    """
    try:
        print(
            f"Attempting to assign order {order_id} to delivery user {delivery_user_id}"
        )

        # Get Supabase client
        client = _get_supabase_client_or_dependency(supabase)

        # Fetch order or 404
        existing_order = _fetch_order_or_404(client, order_id)
        order_row = existing_order.data[0]
        print(f"Found order with status: {order_row['status']}")

        # Validate order status and driver eligibility
        _validate_order_ready_for_assignment(order_row)
        _check_driver_active_orders(client, delivery_user_id)

        # Assign and return updated order
        return _assign_and_fetch_order(
            client, order_id, delivery_user_id, existing_order
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in assign_delivery_user: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign delivery user: {str(e)}",
        )


def _validate_delivery_code_input(payload):
    """Validate and extract delivery code from payload."""
    code = payload.get("delivery_code") if isinstance(payload, dict) else None
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing delivery_code in request body",
        )
    return code


def _validate_delivery_code_match(code, stored_code):
    """Validate that the provided code matches the stored code."""
    if not stored_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No delivery code set for this order",
        )

    if str(code).strip() != str(stored_code).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid delivery code"
        )


def _validate_delivery_status_transition(current_status):
    """Validate that order can be marked as delivered from current status."""
    if current_status not in [
        OrderStatus.PICKED_UP.value,
        OrderStatus.EN_ROUTE.value,
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition: cannot mark as delivered from '{current_status}'",
        )


@router.post("/{order_id}/verify-delivery", status_code=status.HTTP_200_OK)
async def verify_delivery_code(
    order_id: str, payload: dict, supabase=Depends(get_supabase)
):
    """
    Verify a delivery code for an order. If the code matches, mark the order
    as delivered (set status to DELIVERED), set actual_delivery_time, and
    mark delivery_code_used = True.
    """
    try:
        # Validate input
        code = _validate_delivery_code_input(payload)

        # Fetch order
        existing_order = (
            supabase.table("orders").select("*").eq("order_id", order_id).execute()
        )

        if not existing_order.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        order_row = existing_order.data[0]

        # Validate delivery code
        _validate_delivery_code_match(code, order_row.get("delivery_code"))

        # Validate status transition
        _validate_delivery_status_transition(order_row.get("status"))

        # Perform atomic update: mark code used and set delivered
        update_data = {
            "status": OrderStatus.DELIVERED.value,
            "delivery_code_used": True,
            "actual_delivery_time": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

        response = (
            supabase.table("orders")
            .update(update_data)
            .eq("order_id", order_id)
            .execute()
        )

        # Re-fetch to return normalized payload
        updated = (
            supabase.table("orders").select("*").eq("order_id", order_id).execute()
        )

        if not getattr(updated, "data", None):
            if getattr(response, "data", None):
                updated_row = response.data[0]
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to mark order delivered",
                )
        else:
            updated_row = updated.data[0]

        # Normalize and return (reuse normalization helper)
        norm = await _normalize_single_order(updated_row, supabase)
        return JSONResponse(content=jsonable_encoder(norm))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify delivery code: {str(e)}",
        )


@router.get("/delivery-user/{delivery_user_id}", response_model=List[Order])
async def get_delivery_user_orders(
    delivery_user_id: str,
    status_filter: Optional[OrderStatus] = None,
    limit: int = 20,
    offset: int = 0,
    supabase=Depends(get_supabase),
):
    """
    Get orders assigned to a specific delivery user
    """
    try:
        query = (
            supabase.table("orders")
            .select("*")
            .eq("delivery_user_id", delivery_user_id)
        )

        if status_filter:
            query = query.eq("status", status_filter.value)

        response = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        if response.data:
            orders = []
            for order in response.data:
                norm = await _ensure_delivery_address(order, supabase)
                orders.append(Order(**norm))
            return orders
        return []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve delivery user orders: {str(e)}",
        )


@router.delete("/{order_id}", status_code=status.HTTP_200_OK)
async def cancel_order(order_id: str, supabase=Depends(get_supabase)):
    """
    Cancel an order (soft delete by updating status)
    """
    try:
        # Support both FastAPI DI and direct invocation in tests
        client = None
        if hasattr(supabase, "table") or hasattr(supabase, "from_"):
            client = supabase
        else:
            client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )

        existing_order = (
            _get_db_table(client, "orders")
            .select("*")
            .eq("order_id", order_id)
            .execute()
        )

        if not existing_order.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        order = existing_order.data[0]
        if order["status"] in [
            OrderStatus.DELIVERED.value,
            OrderStatus.CANCELLED.value,
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel order that is already delivered or cancelled",
            )

        update_data = {
            "status": OrderStatus.CANCELLED.value,
            "updated_at": datetime.now().isoformat(),
        }

        response = (
            _get_db_table(client, "orders")
            .update(update_data)
            .eq("order_id", order_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel order",
            )

        return {"message": "Order cancelled successfully", "order_id": order_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}",
        )
