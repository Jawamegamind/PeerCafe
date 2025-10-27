from typing import List

from fastapi import APIRouter, HTTPException

from database.supabase_db import create_supabase_client
from models.menu_item_model import MenuItemCreate

menu_router = APIRouter()
# Initialize once; may be None if env vars missing. Tests may patch this symbol.
supabase = create_supabase_client()


@menu_router.get("/restaurants/{restaurant_id}/menu", response_model=List[dict])
async def get_menu_items(restaurant_id: int):
    """Get all menu items for a specific restaurant"""
    try:
        result = (
            supabase.from_("menu_items")
            .select("*")
            .eq("restaurant_id", restaurant_id)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"Error fetching menu items for restaurant {restaurant_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch menu items")


@menu_router.post("/restaurants/{restaurant_id}/menu", response_model=dict)
async def create_menu_item(restaurant_id: int, menu_item: MenuItemCreate):
    """Create a new menu item for a restaurant"""
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
        # Verify restaurant exists
        restaurant_check = (
            supabase.from_("restaurants")
            .select("restaurant_id")
            .eq("restaurant_id", restaurant_id)
            .execute()
        )
        if not restaurant_check.data:
            raise HTTPException(status_code=404, detail="Restaurant not found")

        # Create menu item data
        menu_item_data = {
            "restaurant_id": restaurant_id,
            "item_name": menu_item.item_name,
            "description": menu_item.description,
            "is_available": menu_item.is_available,
            "image": menu_item.image,
            "price": menu_item.price,
            "quantity": menu_item.quantity or 0,
        }

        result = supabase.from_("menu_items").insert(menu_item_data).execute()

        if result.data:
            return {
                "success": True,
                "message": "Menu item created successfully",
                "menu_item": result.data[0],
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to create menu item")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating menu item: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@menu_router.get("/restaurants/{restaurant_id}/menu/{item_id}")
async def get_menu_item(restaurant_id: int, item_id: int):
    """Get a specific menu item"""
    try:
        result = (
            supabase.from_("menu_items")
            .select("*")
            .eq("restaurant_id", restaurant_id)
            .eq("item_id", item_id)
            .execute()
        )

        if result.data:
            return result.data[0]
        else:
            raise HTTPException(status_code=404, detail="Menu item not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching menu item: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch menu item")


@menu_router.put("/restaurants/{restaurant_id}/menu/{item_id}")
async def update_menu_item(restaurant_id: int, item_id: int, menu_item: MenuItemCreate):
    """Update a menu item"""
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
        update_data = {
            "item_name": menu_item.item_name,
            "description": menu_item.description,
            "is_available": menu_item.is_available,
            "image": menu_item.image,
            "price": menu_item.price,
            "quantity": menu_item.quantity or 0,
        }

        result = (
            supabase.from_("menu_items")
            .update(update_data)
            .eq("restaurant_id", restaurant_id)
            .eq("item_id", item_id)
            .execute()
        )

        if result.data:
            return {
                "success": True,
                "message": "Menu item updated successfully",
                "menu_item": result.data[0],
            }
        else:
            raise HTTPException(status_code=404, detail="Menu item not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating menu item: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to update menu item: {str(e)}"
        )


@menu_router.delete("/restaurants/{restaurant_id}/menu/{item_id}")
async def delete_menu_item(restaurant_id: int, item_id: int):
    """Delete a menu item"""
    try:
        result = (
            supabase.from_("menu_items")
            .delete()
            .eq("restaurant_id", restaurant_id)
            .eq("item_id", item_id)
            .execute()
        )

        if result.data:
            return {"success": True, "message": "Menu item deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Menu item not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting menu item: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete menu item")


@menu_router.patch("/restaurants/{restaurant_id}/menu/{item_id}/availability")
async def toggle_menu_item_availability(restaurant_id: int, item_id: int):
    """Toggle menu item availability"""
    try:
        client = get_supabase_client()
        if client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured.")
        # First get current availability status
        current_item = (
            supabase.from_("menu_items")
            .select("is_available")
            .eq("restaurant_id", restaurant_id)
            .eq("item_id", item_id)
            .execute()
        )

        if not current_item.data:
            raise HTTPException(status_code=404, detail="Menu item not found")

        new_availability = not current_item.data[0]["is_available"]

        result = (
            supabase.from_("menu_items")
            .update({"is_available": new_availability})
            .eq("restaurant_id", restaurant_id)
            .eq("item_id", item_id)
            .execute()
        )

        if result.data:
            return {
                "success": True,
                "message": f"Menu item marked as {'available' if new_availability else 'unavailable'}",
                "menu_item": result.data[0],
            }
        else:
            raise HTTPException(status_code=404, detail="Menu item not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error toggling menu item availability: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to update menu item availability"
        )
