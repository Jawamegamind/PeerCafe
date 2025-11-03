from typing import List

from fastapi import APIRouter, HTTPException, status

from database.supabase_db import create_supabase_client
from models.restaurant_model import RestaurantCreate

restaurant_router = APIRouter()
# Initialize once; may be None if env vars missing. We'll lazily create it so
# tests that patch `create_supabase_client` or the `supabase` symbol get the
# mocked client when endpoints run.
supabase = None


def get_supabase_client():
    global supabase
    if supabase is not None:
        return supabase
    supabase = create_supabase_client()
    return supabase


def _get_db_table(client, table_name: str):
    """Return a table-like query object compatible with both supabase client versions

    Some tests/mocks use `from_()` while newer client code uses `table()`. Prefer
    `table()` when available, otherwise fall back to `from_()` so existing tests
    continue to work.
    """
    # Prefer `from_` for backwards compatibility with existing mocks/tests that
    # patch `supabase.from_`. If not available, fall back to `table`.
    if hasattr(client, "from_"):
        return client.from_(table_name)
    if hasattr(client, "table"):
        return client.table(table_name)
    # As a last resort, try attribute access (this will raise if unavailable)
    return getattr(client, "from_")(table_name)


@restaurant_router.post("/restaurants", response_model=dict)
async def create_restaurant(restaurant: RestaurantCreate):
    """Create a new restaurant (Admin only)"""
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        # Insert restaurant data
        restaurant_data = {
            "name": restaurant.name,
            "description": restaurant.description,
            "address": restaurant.address,
            "phone": restaurant.phone,
            "email": restaurant.email,
            "cuisine_type": restaurant.cuisine_type,
            "is_active": True,
            "rating": 0.0,
            "delivery_fee": restaurant.delivery_fee or 0.0,
        }

        # Use compatibility helper to support clients that expose either
        # `from_()` (older tests/mocks) or `table()` (newer clients).
        result = _get_db_table(client, "restaurants").insert(restaurant_data).execute()

        if result.data:
            return {
                "success": True,
                "message": "Restaurant created successfully",
                "restaurant": result.data[0],
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to create restaurant")

    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        print(f"Error creating restaurant: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@restaurant_router.get("/restaurants", response_model=List[dict])
async def get_all_restaurants():
    """Get all restaurants"""
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        result = _get_db_table(client, "restaurants").select("*").execute()
        return result.data or []
    except Exception as e:
        print(f"Error fetching restaurants: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch restaurants")


@restaurant_router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: int):
    """Get a specific restaurant by ID"""
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        result = (
            _get_db_table(client, "restaurants")
            .select("*")
            .eq("restaurant_id", restaurant_id)
            .execute()
        )

        if result.data:
            return result.data[0]
        else:
            raise HTTPException(status_code=404, detail="Restaurant not found")
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        print(f"Error fetching restaurant: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch restaurant")


@restaurant_router.put("/restaurants/{restaurant_id}")
async def update_restaurant(restaurant_id: int, restaurant: RestaurantCreate):
    """Update a restaurant (Admin only)"""
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        update_data = {
            "name": restaurant.name,
            "description": restaurant.description,
            "address": restaurant.address,
            "phone": restaurant.phone,
            "email": restaurant.email,
            "cuisine_type": restaurant.cuisine_type,
            "delivery_fee": restaurant.delivery_fee or 0.0,
        }

        result = (
            _get_db_table(client, "restaurants")
            .update(update_data)
            .eq("restaurant_id", restaurant_id)
            .execute()
        )

        if result.data:
            return {
                "success": True,
                "message": "Restaurant updated successfully",
                "restaurant": result.data[0],
            }
        else:
            raise HTTPException(status_code=404, detail="Restaurant not found")
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        print(f"Error updating restaurant: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to update restaurant: {str(e)}"
        )


@restaurant_router.delete("/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: int):
    """Delete a restaurant (Admin only)"""
    try:
        # Soft delete by setting is_active to False
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        result = (
            _get_db_table(client, "restaurants")
            .update({"is_active": False})
            .eq("restaurant_id", restaurant_id)
            .execute()
        )

        if result.data:
            return {"success": True, "message": "Restaurant deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Restaurant not found")
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        print(f"Error deleting restaurant: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete restaurant")


@restaurant_router.patch("/restaurants/{restaurant_id}/restore")
async def restore_restaurant(restaurant_id: int):
    """Restore a deleted restaurant (Admin only)"""
    try:
        # Restore by setting is_active to True
        client = get_supabase_client()
        if client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        result = (
            _get_db_table(client, "restaurants")
            .update({"is_active": True})
            .eq("restaurant_id", restaurant_id)
            .execute()
        )

        if result.data:
            return {"success": True, "message": "Restaurant restored successfully"}
        else:
            raise HTTPException(status_code=404, detail="Restaurant not found")
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        print(f"Error restoring restaurant: {e}")
        raise HTTPException(status_code=500, detail="Failed to restore restaurant")
