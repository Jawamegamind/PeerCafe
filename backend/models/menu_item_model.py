from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MenuItemCreate(BaseModel):
    """Model for creating a new menu item"""
    ItemName: str = Field(..., min_length=1, max_length=100, description="Name of the menu item")
    Description: Optional[str] = Field(None, max_length=500, description="Description of the menu item")
    IsAvailable: bool = Field(True, description="Whether the item is available for ordering")
    Image: Optional[str] = Field(None, description="URL to item image")
    Price: float = Field(..., gt=0, description="Price of the item")
    Quantity: Optional[int] = Field(0, ge=0, description="Available quantity")

    class Config:
        json_schema_extra = {
            "example": {
                "ItemName": "Margherita Pizza",
                "Description": "Classic pizza with tomato sauce, mozzarella, and fresh basil",
                "IsAvailable": True,
                "Image": "https://example.com/margherita.jpg",
                "Price": 12.99,
                "Quantity": 50
            }
        }

class MenuItem(MenuItemCreate):
    """Complete menu item model with database fields"""
    ItemId: int = Field(..., description="Unique identifier for the menu item")
    RestaurantId: int = Field(..., description="ID of the restaurant this item belongs to")
    CreatedAt: Optional[datetime] = Field(None, description="When the item was created")
    UpdatedAt: Optional[datetime] = Field(None, description="When the item was last updated")

    class Config:
        json_schema_extra = {
            "example": {
                "ItemId": 1,
                "RestaurantId": 1,
                "ItemName": "Margherita Pizza",
                "Description": "Classic pizza with tomato sauce, mozzarella, and fresh basil",
                "IsAvailable": True,
                "Image": "https://example.com/margherita.jpg",
                "Price": 12.99,
                "Quantity": 50,
                "CreatedAt": "2024-01-15T10:30:00Z",
                "UpdatedAt": "2024-01-15T10:30:00Z"
            }
        }