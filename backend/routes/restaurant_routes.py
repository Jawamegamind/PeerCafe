from fastapi import APIRouter, HTTPException, Depends, status
from database.supabase_db import create_supabase_client
from models.restaurant_model import Restaurant, RestaurantCreate
from typing import List

restaurant_router = APIRouter()
# Initialize once; may be None if env vars missing. Tests may patch this symbol.
supabase = create_supabase_client()

def get_supabase_client():
    global supabase
    if supabase is not None:
        return supabase
    supabase = create_supabase_client()
    return supabase

def transform_restaurant_data(restaurant_data: dict) -> dict:
    """Transform snake_case database fields to PascalCase for frontend compatibility"""
    return {
        "RestaurantId": restaurant_data.get("restaurant_id"),
        "Name": restaurant_data.get("name"),
        "PrimaryAdminId": restaurant_data.get("primary_admin_id"),
        "Logo": restaurant_data.get("logo"),
        "IsActive": restaurant_data.get("is_active"),
        "CreatedAt": restaurant_data.get("created_at"),
        "UpdatedAt": restaurant_data.get("updated_at"),
        "Description": restaurant_data.get("description"),
        "Address": restaurant_data.get("address"),
        "Phone": restaurant_data.get("phone"),
        "Email": restaurant_data.get("email"),
        "CuisineType": restaurant_data.get("cuisine_type"),
        "Rating": restaurant_data.get("rating"),
        "DeliveryFee": restaurant_data.get("delivery_fee"),
    }


@restaurant_router.post("/restaurants", response_model=dict)
async def create_restaurant(restaurant: RestaurantCreate):
    """Create a new restaurant (Admin only)"""
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
        # Insert restaurant data
        restaurant_data = {
            "Name": restaurant.Name,
            "Description": restaurant.Description,
            "Address": restaurant.Address,
            "Phone": restaurant.Phone,
            "Email": restaurant.Email,
            "CuisineType": restaurant.CuisineType,
            "IsActive": True,
            "Rating": 0.0,
            "DeliveryFee": restaurant.DeliveryFee or 0.0
        }
        
        result = client.from_("restaurants").insert(restaurant_data).execute()
        
        if result.data:
            return {
                "success": True,
                "message": "Restaurant created successfully",
                "restaurant": transform_restaurant_data(result.data[0])
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
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
        result = client.from_("restaurants").select("*").execute()
        # Transform each restaurant to PascalCase
        restaurants = [transform_restaurant_data(r) for r in (result.data or [])]
        return restaurants
    except Exception as e:
        print(f"Error fetching restaurants: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch restaurants")

@restaurant_router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: int):
    """Get a specific restaurant by ID"""
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
        result = client.from_("restaurants").select("*").eq("RestaurantId", restaurant_id).execute()
        
        if result.data:
            return transform_restaurant_data(result.data[0])
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
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
        update_data = {
            "Name": restaurant.Name,
            "Description": restaurant.Description,
            "Address": restaurant.Address,
            "Phone": restaurant.Phone,
            "Email": restaurant.Email,
            "CuisineType": restaurant.CuisineType,
            "DeliveryFee": restaurant.DeliveryFee or 0.0
        }
        
        result = client.from_("restaurants").update(update_data).eq("RestaurantId", restaurant_id).execute()
        
        if result.data:
            return {
                "success": True,
                "message": "Restaurant updated successfully",
                "restaurant": transform_restaurant_data(result.data[0])
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
        client = get_supabase_client()
        if client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
        # Soft delete by setting IsActive to False
        result = client.from_("restaurants").update({"IsActive": False}).eq("RestaurantId", restaurant_id).execute()
        
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
        client = get_supabase_client()
        if client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
        # Restore by setting IsActive to True
        result = client.from_("restaurants").update({"IsActive": True}).eq("RestaurantId", restaurant_id).execute()
        
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