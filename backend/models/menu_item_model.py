from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MenuItemCreate(BaseModel):
    """Model for creating a new menu item"""
    item_name: str = Field(..., min_length=1, max_length=100, description="Name of the menu item")
    description: Optional[str] = Field(None, max_length=500, description="Description of the menu item")
    is_available: bool = Field(True, description="Whether the item is available for ordering")
    image: Optional[str] = Field(None, description="URL to item image")
    price: float = Field(..., gt=0, description="Price of the item")
    quantity: Optional[int] = Field(0, ge=0, description="Available quantity")

    class Config:
        json_schema_extra = {
            "example": {
                "item_name": "Margherita Pizza",
                "description": "Classic pizza with tomato sauce, mozzarella, and fresh basil",
                "is_available": True,
                "image": "https://example.com/margherita.jpg",
                "price": 12.99,
                "quantity": 50
            }
        }

class MenuItem(MenuItemCreate):
    """Complete menu item model with database fields"""
    item_id: int = Field(..., description="Unique identifier for the menu item")
    restaurant_id: int = Field(..., description="ID of the restaurant this item belongs to")
    created_at: Optional[datetime] = Field(None, description="When the item was created")
    updated_at: Optional[datetime] = Field(None, description="When the item was last updated")

    class Config:
        json_schema_extra = {
            "example": {
                "item_id": 1,
                "restaurant_id": 1,
                "item_name": "Margherita Pizza",
                "description": "Classic pizza with tomato sauce, mozzarella, and fresh basil",
                "is_available": True,
                "image": "https://example.com/margherita.jpg",
                "price": 12.99,
                "quantity": 50,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z"
            }
        }