from fastapi import APIRouter, HTTPException, Depends
from database.supabase_db import create_supabase_client
from models.restaurant_model import Restaurant, RestaurantCreate
from typing import List

restaurant_router = APIRouter()
supabase = create_supabase_client()

@restaurant_router.post("/restaurants", response_model=dict)
async def create_restaurant(restaurant: RestaurantCreate):
    """Create a new restaurant (Admin only)"""
    try:
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
            "delivery_fee": restaurant.delivery_fee or 0.0
        }
        
        result = supabase.from_("restaurants").insert(restaurant_data).execute()
        
        if result.data:
            return {
                "success": True,
                "message": "Restaurant created successfully",
                "restaurant": result.data[0]
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
        result = supabase.from_("restaurants").select("*").execute()
        return result.data or []
    except Exception as e:
        print(f"Error fetching restaurants: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch restaurants")

@restaurant_router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: int):
    """Get a specific restaurant by ID"""
    try:
        result = supabase.from_("restaurants").select("*").eq("restaurant_id", restaurant_id).execute()
        
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
        update_data = {
            "name": restaurant.name,
            "description": restaurant.description,
            "address": restaurant.address,
            "phone": restaurant.phone,
            "email": restaurant.email,
            "cuisine_type": restaurant.cuisine_type,
            "delivery_fee": restaurant.delivery_fee or 0.0
        }

        result = supabase.from_("restaurants").update(update_data).eq("restaurant_id", restaurant_id).execute()

        if result.data:
            return {
                "success": True,
                "message": "Restaurant updated successfully",
                "restaurant": result.data[0]
            }
        else:
            raise HTTPException(status_code=404, detail="Restaurant not found")
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        print(f"Error updating restaurant: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update restaurant: {str(e)}")

@restaurant_router.delete("/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: int):
    """Delete a restaurant (Admin only)"""
    try:
        # Soft delete by setting is_active to False
        result = supabase.from_("restaurants").update({"is_active": False}).eq("restaurant_id", restaurant_id).execute()

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
        result = supabase.from_("restaurants").update({"is_active": True}).eq("restaurant_id", restaurant_id).execute()

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