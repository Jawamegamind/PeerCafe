"""
Order management routes for PeerCafe backend
"""

import logging
import threading
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status

from database.supabase_db import create_supabase_client
from models.order_model import Order, OrderCreate, OrderStatus

router = APIRouter(prefix="/orders", tags=["orders"])

# initialize once; may be None. We'll lazily create it in get_supabase_client so tests
# that patch `create_supabase_client` get the mocked client when endpoints run.
supabase = None

# Sanitization metrics (kept in-memory for simplicity). Use a lock for thread-safety.
_sanitization_lock = threading.Lock()
_sanitization_counts = {
    "records_sanitized": 0,
    "subtotal_corrections": 0,
    "total_corrections": 0,
}

# Logger for sanitization events
logger = logging.getLogger("routes.order_routes")
if not logger.handlers:
    # If app config hasn't configured logging, ensure at least a basic handler
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def get_supabase_client():
    """Return a usable supabase client.

    To keep tests isolated we avoid caching the client in module-global state
    — tests patch `create_supabase_client` per-test and expect the route to
    use the mocked value. Creating (or recreating) the client on each call is
    cheap for tests and avoids cross-test pollution.
    """
    try:
        return create_supabase_client()
    except Exception:
        return None


def _get_db_table(client, table_name: str):
    """Return a table-like query object compatible with different supabase clients.

    Some runtimes expose `table()` while older versions or tests/mocks use
    `from_()`. Prefer `table()` if available, otherwise fall back to `from_()`.
    """
    if hasattr(client, "table"):
        return client.table(table_name)
    if hasattr(client, "from_"):
        return client.from_(table_name)
    # As a last resort try attribute access which will raise a clearer error.
    return getattr(client, "table")(table_name)


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
    for it in items:
        try:
            total += _compute_item_subtotal(it)
        except Exception:
            # skip malformed items
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
    computed_total = round(o.get("subtotal", 0) + tax + delivery_fee + tip - discount, 2)
    stored_total = o.get("total_amount")
    stored_total_val = _safe_float(stored_total)
    if stored_total_val is None or abs((stored_total_val or 0) - computed_total) > 0.01:
        return True, stored_total_val, computed_total
    return False, stored_total_val, None


@router.get("/sanitization-metrics", response_model=dict)
async def sanitization_metrics():
    """Return in-memory sanitization metrics."""
    with _sanitization_lock:
        return dict(_sanitization_counts)


def _sanitize_order_record(order: dict) -> dict:  # noqa: C901  (complexity tracked; consider refactor)
    """Fix simple data inconsistencies in an order record.

    - Recomputes subtotal from order_items when it disagrees with stored subtotal.
    - Recomputes total_amount when possible (subtotal + tax + delivery_fee + tip - discount).

    This is a pragmatic server-side fix to avoid blowing up admin list endpoints
    when there are legacy rows with inconsistent values.
    """
    try:
        items = order.get("order_items") or []
        computed_sub = _compute_subtotal(items)

        # compare with stored subtotal (allow tiny rounding diffs)
        stored_sub_val = _safe_float(order.get("subtotal"))

        subtotal_changed = False
        total_changed = False

        if stored_sub_val is None or abs((stored_sub_val or 0) - computed_sub) > 0.01:
            old = stored_sub_val
            order["subtotal"] = round(computed_sub, 2)
            subtotal_changed = True

        # Try to recompute total_amount when components are present
        try:
            changed_flag, old_total, new_total = _recompute_total(order)
            if changed_flag:
                order["total_amount"] = new_total
                total_changed = True
        except Exception:
            # If anything fails, leave total_amount as-is
            total_changed = False

        # If any changes occurred, log and increment metrics
        if subtotal_changed or total_changed:
            changed = {}
            if subtotal_changed:
                changed["subtotal"] = {"old": old, "new": order.get("subtotal")}
            if total_changed:
                changed["total_amount"] = {
                    "old": old_total,
                    "new": order.get("total_amount"),
                }

            try:
                order_id = order.get("order_id") or order.get("id")
            except Exception:
                order_id = None

            logger.info("Sanitized order %s: %s", order_id, changed)

            with _sanitization_lock:
                _sanitization_counts["records_sanitized"] += 1
                if subtotal_changed:
                    _sanitization_counts["subtotal_corrections"] += 1
                if total_changed:
                    _sanitization_counts["total_corrections"] += 1

    except Exception:
        # Never let sanitization raise — return original record on unexpected shapes
        return order

    return order


@router.post("/", response_model=Order, status_code=status.HTTP_201_CREATED)
async def place_order(order_data: OrderCreate):
    """
    Place a new order
    """
    try:
        print("Placing order with data:", order_data)
        # Generate order ID
        order_id = str(uuid.uuid4())

        # Calculate estimated times (this can be made more sophisticated later)
        estimated_pickup_time = datetime.now() + timedelta(minutes=30)
        estimated_delivery_time = datetime.now() + timedelta(minutes=60)

        # Prepare order data for database
        order_db_data = {
            "order_id": order_id,
            "user_id": order_data.user_id,
            "restaurant_id": order_data.restaurant_id,
            "order_items": [item.model_dump() for item in order_data.order_items],
            "delivery_address": order_data.delivery_address.model_dump(),
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
        }

        # Insert order into database
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        response = _get_db_table(client, "orders").insert(order_db_data).execute()

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

        # Return raw dictionaries to avoid hard validation errors when the DB
        # contains slightly inconsistent historical data (subtotal vs items).
        # The admin UI expects simple JSON objects and will handle display.
        return response.data or []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve orders: {str(e)}",
        )


@router.get("/user/{user_id}", response_model=List[dict])
async def get_user_orders(user_id: str, limit: int = 20, offset: int = 0):
    """
    Get orders for a specific user
    """
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        response = (
            _get_db_table(client, "orders")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        return response.data or []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user orders: {str(e)}",
        )


@router.get("/restaurant/{restaurant_id}", response_model=List[dict])
async def get_restaurant_orders(
    restaurant_id: int,
    status_filter: Optional[OrderStatus] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Get orders for a specific restaurant (for restaurant dashboard)
    """
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        query = (
            _get_db_table(client, "orders")
            .select("*")
            .eq("restaurant_id", restaurant_id)
        )

        if status_filter:
            query = query.eq("status", status_filter.value)

        response = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        return response.data or []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve restaurant orders: {str(e)}",
        )


@router.get("/{order_id}", response_model=Order)
async def get_order_by_id(order_id: str):
    """
    Get a specific order by ID
    """
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        response = (
            _get_db_table(client, "orders")
            .select("*")
            .eq("order_id", order_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        sanitized = _sanitize_order_record(response.data[0])
        return Order(**sanitized)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve order: {str(e)}",
        )


@router.patch("/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, new_status: OrderStatus):
    """
    Update order status (for restaurants and delivery users)
    """
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )

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

        # Update the order status
        update_data = {
            "status": new_status.value,
            "updated_at": datetime.now().isoformat(),
        }

        # Set actual times based on status
        if new_status == OrderStatus.PICKED_UP:
            update_data["actual_pickup_time"] = datetime.now().isoformat()
        elif new_status == OrderStatus.DELIVERED:
            update_data["actual_delivery_time"] = datetime.now().isoformat()

        response = (
            _get_db_table(client, "orders")
            .update(update_data)
            .eq("order_id", order_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order status",
            )

        sanitized = _sanitize_order_record(response.data[0])
        return Order(**sanitized)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update order status: {str(e)}",
        )


@router.patch("/{order_id}/assign-delivery", response_model=Order)
async def assign_delivery_user(order_id: str, delivery_user_id: str):
    """
    Assign a delivery user to an order
    """
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )

        # Check if order exists and is ready for assignment
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
        if order["status"] not in [
            OrderStatus.READY.value,
            OrderStatus.CONFIRMED.value,
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order is not ready for delivery assignment",
            )

        # Assign delivery user and update status
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

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to assign delivery user",
            )

        sanitized = _sanitize_order_record(response.data[0])
        return Order(**sanitized)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign delivery user: {str(e)}",
        )


@router.get("/delivery-user/{delivery_user_id}", response_model=List[dict])
async def get_delivery_user_orders(
    delivery_user_id: str,
    status_filter: Optional[OrderStatus] = None,
    limit: int = 20,
    offset: int = 0,
):
    """
    Get orders assigned to a specific delivery user
    """
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )

        query = (
            _get_db_table(client, "orders")
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

        return response.data or []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve delivery user orders: {str(e)}",
        )


@router.delete("/{order_id}", status_code=status.HTTP_200_OK)
async def cancel_order(order_id: str):
    """
    Cancel an order (soft delete by updating status)
    """
    try:
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

        # sanitize returned order for consistency
        sanitized = _sanitize_order_record(response.data[0])
        return {
            "message": "Order cancelled successfully",
            "order_id": order_id,
            "order": sanitized,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}",
        )
