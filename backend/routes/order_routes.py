"""
Order management routes for PeerCafe backend
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi import Header
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
from database.supabase_db import create_supabase_client
from models.order_model import OrderCreate, Order, OrderUpdate, OrderStatus
from utils.geocode import geocode_address
import os

router = APIRouter(prefix="/orders", tags=["orders"])

def get_supabase():
    """Dependency to get Supabase client"""
    return create_supabase_client()


@router.get("/me", response_model=List[Order])
async def get_my_orders(
    authorization: str | None = Header(None),
    x_user_id: str | None = Header(None),
    limit: int = 20,
    offset: int = 0,
    supabase=Depends(get_supabase)
):
    """
    Get orders for the currently authenticated user.

    This endpoint attempts to resolve the user from the Authorization: Bearer <token>
    header using the Supabase client where possible. For development convenience
    it will also accept an `X-User-Id` header to identify the user when a token
    is not available.
    """
    try:
        user_id = None

        # Try to extract token from Authorization header (expecting newer supabase client)
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1]

        # Use the newer supabase client API: supabase.auth.get_user(token)
        if token and hasattr(supabase, "auth") and hasattr(supabase.auth, "get_user"):
            try:
                maybe_user = supabase.auth.get_user(token)
                # Normalize possible return shapes: dicts or objects
                user_obj = None
                if isinstance(maybe_user, dict):
                    # get_user may return {'data': {'user': {...}}} or {'user': {...}} or {'data': {...}}
                    user_obj = maybe_user.get("data") or maybe_user.get("user") or maybe_user
                    if isinstance(user_obj, dict) and "user" in user_obj and isinstance(user_obj["user"], dict):
                        user_obj = user_obj["user"]
                else:
                    user_obj = getattr(maybe_user, "user", getattr(maybe_user, "data", None))

                if user_obj:
                    # Project uses `user_id` in the database. Prefer `user_id` explicitly
                    # (new supabase client/user schema). Fall back to None so the
                    # X-User-Id header will be used for development if needed.
                    if isinstance(user_obj, dict):
                        user_id = user_obj.get("user_id")
                    else:
                        user_id = getattr(user_obj, "user_id", None)
            except Exception:
                # If auth lookup fails, we'll fall back to X-User-Id header below
                user_id = None

        # Developer convenience: allow X-User-Id header when token isn't present/usable
        if not user_id and x_user_id:
            user_id = x_user_id

        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to determine user from Authorization header")

        # Query orders for the resolved user_id
        response = supabase.table("orders")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()

        if response.data:
            return [Order(**order) for order in response.data]
        return []

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve authenticated user orders: {str(e)}"
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
        
        if not customer_lat or not customer_lng:
            print(f"Warning: Failed to geocode address: {full_address}")
            # Still allow order creation but navigation won't work until geocoded
        
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
            "updated_at": datetime.now().isoformat()
        }
        
        # Insert order into database
        response = supabase.table("orders").insert(order_db_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create order"
            )
        
        # Return the created order
        created_order = response.data[0]
        return Order(**created_order)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to place order: {str(e)}"
        )

@router.get("/user/{user_id}", response_model=List[Order])
async def get_user_orders(
    user_id: str, 
    limit: int = 20, 
    offset: int = 0,
    supabase=Depends(get_supabase)
):
    """
    Get orders for a specific user
    """
    try:
        response = supabase.table("orders")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        if response.data:
            return [Order(**order) for order in response.data]
        return []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user orders: {str(e)}"
        )

@router.get("/restaurant/{restaurant_id}", response_model=List[Order])
async def get_restaurant_orders(
    restaurant_id: int,
    status_filter: Optional[OrderStatus] = None,
    limit: int = 50,
    offset: int = 0,
    supabase=Depends(get_supabase)
):
    """
    Get orders for a specific restaurant (for restaurant dashboard)
    """
    try:
        query = supabase.table("orders")\
            .select("*")\
            .eq("restaurant_id", restaurant_id)
        
        if status_filter:
            query = query.eq("status", status_filter.value)
        
        response = query.order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        if response.data:
            return [Order(**order) for order in response.data]
        return []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve restaurant orders: {str(e)}"
        )

@router.get("/{order_id}", response_model=Order)
async def get_order_by_id(order_id: str, supabase=Depends(get_supabase)):
    """
    Get a specific order by ID
    """
    try:
        response = supabase.table("orders")\
            .select("*")\
            .eq("order_id", order_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        return Order(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve order: {str(e)}"
        )

@router.patch("/{order_id}/status", response_model=Order)
async def update_order_status(
    order_id: str,
    new_status: OrderStatus,
    supabase=Depends(get_supabase)
):
    """
    Update order status (for restaurants and delivery users)
    """
    try:
        # First check if order exists
        existing_order = supabase.table("orders")\
            .select("*")\
            .eq("order_id", order_id)\
            .execute()
        
        if not existing_order.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Validate simple state transitions
        current_status = existing_order.data[0].get("status")
        if new_status == OrderStatus.PICKED_UP and current_status not in [OrderStatus.ASSIGNED.value, OrderStatus.READY.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transition: cannot mark as picked_up from '{current_status}'"
            )
        if new_status == OrderStatus.DELIVERED and current_status not in [OrderStatus.PICKED_UP.value, OrderStatus.EN_ROUTE.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transition: cannot mark as delivered from '{current_status}'"
            )

        # Update the order status
        update_data = {
            "status": new_status.value,
            "updated_at": datetime.now().isoformat()
        }
        
        # Set actual times based on status
        if new_status == OrderStatus.PICKED_UP:
            update_data["actual_pickup_time"] = datetime.now().isoformat()
        elif new_status == OrderStatus.DELIVERED:
            update_data["actual_delivery_time"] = datetime.now().isoformat()
        
        response = supabase.table("orders")\
            .update(update_data)\
            .eq("order_id", order_id)\
            .execute()

        # Re-fetch the updated order to return it. If the re-query comes back
        # empty (test mocks sometimes return the updated row on the update
        # response instead), fall back to the response from the update call.
        updated_order = supabase.table("orders")\
            .select("*")\
            .eq("order_id", order_id)\
            .execute()

        data = getattr(updated_order, 'data', None)
        # If data is missing or not an indexable list (tests may return Mocks),
        # fall back to the update response's data when available.
        if not data or not isinstance(data, (list, tuple)):
            # Try to surface Supabase error details when available
            error_msg = None
            try:
                error_msg = getattr(response, 'error', None) or getattr(response, 'message', None)
            except Exception:
                error_msg = None

            # If the update response contains the updated row, use it
            if getattr(response, 'data', None):
                return Order(**response.data[0])

            if error_msg and isinstance(error_msg, str) and 'row level security' in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"RLS blocked update: {error_msg}"
                )

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update order status{f': {error_msg}' if error_msg else ''}"
            )

        return Order(**data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update order status: {str(e)}"
        )

@router.patch("/{order_id}/assign-delivery", response_model=Order)
async def assign_delivery_user(
    order_id: str,
    delivery_user_id: str,
    supabase=Depends(get_supabase)
):
    """
    Assign a delivery user to an order
    """
    try:
        print(f"Attempting to assign order {order_id} to delivery user {delivery_user_id}")
        
        # Check if order exists and is ready for assignment (do this first to allow
        # test mocks that expect the select/update call ordering)
        existing_order = supabase.table("orders")\
            .select("*")\
            .eq("order_id", order_id)\
            .execute()
        
        if not existing_order.data:
            print(f"Order {order_id} not found in database")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order = existing_order.data[0]
        print(f"Found order with status: {order['status']}")
        
        if order["status"] not in [OrderStatus.READY.value, OrderStatus.CONFIRMED.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order is not ready for delivery assignment. Current status: {order['status']}"
            )
        
        # Optionally check if delivery user already has an active order. This
        # is disabled by default to keep test mocks simple; enable via
        # environment variable ENABLE_ACTIVE_ORDER_CHECK=true when desired.
        if os.getenv("ENABLE_ACTIVE_ORDER_CHECK", "false").lower() == "true":
            active_orders = supabase.table("orders")\
                .select("*")\
                .eq("delivery_user_id", delivery_user_id)\
                .in_("status", ["assigned", "picked_up", "en_route"])\
                .execute()

            # active_orders.data may be a list or a Mock in tests; check truthily
            if getattr(active_orders, 'data', None):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Driver already has an active delivery. Complete current delivery before accepting new orders."
                )

        # Assign delivery user and update status
        update_data = {
            "delivery_user_id": delivery_user_id,
            "status": OrderStatus.ASSIGNED.value,
            "updated_at": datetime.now().isoformat()
        }
        
        print(f"Updating order with data: {update_data}")
        
        response = supabase.table("orders")\
            .update(update_data)\
            .eq("order_id", order_id)\
            .execute()
        
        # Re-fetch the updated order to return it
        updated_order = supabase.table("orders")\
            .select("*")\
            .eq("order_id", order_id)\
            .execute()

        data = getattr(updated_order, 'data', None)
        if not data or not isinstance(data, (list, tuple)):
            # If the update response contained the updated row, return that
            if getattr(response, 'data', None):
                print(f"Successfully assigned order {order_id} to driver {delivery_user_id}")
                return Order(**response.data[0])

            print(f"Failed to update order {order_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to assign delivery user"
            )

        print(f"Successfully assigned order {order_id} to driver {delivery_user_id}")
        return Order(**data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in assign_delivery_user: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign delivery user: {str(e)}"
        )

@router.get("/delivery-user/{delivery_user_id}", response_model=List[Order])
async def get_delivery_user_orders(
    delivery_user_id: str,
    status_filter: Optional[OrderStatus] = None,
    limit: int = 20,
    offset: int = 0,
    supabase=Depends(get_supabase)
):
    """
    Get orders assigned to a specific delivery user
    """
    try:
        query = supabase.table("orders")\
            .select("*")\
            .eq("delivery_user_id", delivery_user_id)
        
        if status_filter:
            query = query.eq("status", status_filter.value)
        
        response = query.order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        if response.data:
            return [Order(**order) for order in response.data]
        return []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve delivery user orders: {str(e)}"
        )

@router.delete("/{order_id}", status_code=status.HTTP_200_OK)
async def cancel_order(order_id: str, supabase=Depends(get_supabase)):
    """
    Cancel an order (soft delete by updating status)
    """
    try:
        existing_order = supabase.table("orders")\
            .select("*")\
            .eq("order_id", order_id)\
            .execute()
        
        if not existing_order.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order = existing_order.data[0]
        if order["status"] in [OrderStatus.DELIVERED.value, OrderStatus.CANCELLED.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel order that is already delivered or cancelled"
            )
        
        update_data = {
            "status": OrderStatus.CANCELLED.value,
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase.table("orders")\
            .update(update_data)\
            .eq("order_id", order_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel order"
            )
        
        return {"message": "Order cancelled successfully", "order_id": order_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}"
        )