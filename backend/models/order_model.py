from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    EN_ROUTE = "en_route"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class OrderItem(BaseModel):
    """Individual item within an order"""
    item_id: int = Field(..., description="ID of the menu item")
    item_name: str = Field(..., min_length=1, max_length=100, description="Name of the menu item")
    price: float = Field(..., gt=0, description="Price per unit of the item")
    quantity: int = Field(..., gt=0, description="Quantity ordered")
    subtotal: float = Field(..., gt=0, description="Total price for this item (price * quantity)")
    special_instructions: Optional[str] = Field(None, max_length=500, description="Special instructions for this item")

    @field_validator('subtotal')
    @classmethod
    def validate_subtotal(cls, v, info):
        """Validate that subtotal equals price * quantity"""
        if 'price' in info.data and 'quantity' in info.data:
            expected_subtotal = round(info.data['price'] * info.data['quantity'], 2)
            if abs(v - expected_subtotal) > 0.01:  # Allow for small floating point differences
                raise ValueError(f'Subtotal {v} does not match price * quantity = {expected_subtotal}')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "item_id": 123,
                "item_name": "Margherita Pizza",
                "price": 12.99,
                "quantity": 2,
                "subtotal": 25.98,
                "special_instructions": "Extra cheese"
            }
        }

class DeliveryAddress(BaseModel):
    """Delivery address information"""
    street: str = Field(..., min_length=1, max_length=200, description="Street address")
    city: str = Field(..., min_length=1, max_length=100, description="City")
    state: str = Field(..., min_length=2, max_length=50, description="State or province")
    zip_code: str = Field(..., min_length=5, max_length=10, description="ZIP or postal code")
    instructions: Optional[str] = Field(None, max_length=500, description="Delivery instructions")

    class Config:
        json_schema_extra = {
            "example": {
                "street": "123 Main St, Apt 4B",
                "city": "San Francisco",
                "state": "CA",
                "zip_code": "94105",
                "instructions": "Ring doorbell twice, leave at door if no answer"
            }
        }

class OrderCreate(BaseModel):
    """Model for creating a new order"""
    user_id: str = Field(..., description="ID of the user placing the order")
    restaurant_id: int = Field(..., description="ID of the restaurant")
    order_items: List[OrderItem] = Field(..., min_length=1, description="List of items in the order")
    delivery_address: DeliveryAddress = Field(..., description="Delivery address for the order")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes for the order")
    
    # Pricing fields
    subtotal: float = Field(..., gt=0, description="Subtotal of all items")
    tax_amount: float = Field(0, ge=0, description="Tax amount")
    delivery_fee: float = Field(0, ge=0, description="Delivery fee")
    tip_amount: float = Field(0, ge=0, description="Tip amount")
    discount_amount: float = Field(0, ge=0, description="Discount amount")
    total_amount: float = Field(..., gt=0, description="Total amount to be paid")

    @model_validator(mode='after')
    def validate_order(self):
        """Validate the order data"""
        # Validate subtotal calculation
        calculated_subtotal = sum(item.subtotal for item in self.order_items)
        if abs(self.subtotal - calculated_subtotal) > 0.01:
            raise ValueError(f'Subtotal {self.subtotal} does not match sum of item subtotals {calculated_subtotal}')
        
        # Validate total calculation
        expected_total = self.subtotal + self.tax_amount + self.delivery_fee + self.tip_amount - self.discount_amount
        if abs(self.total_amount - expected_total) > 0.01:
            raise ValueError(f'Total amount {self.total_amount} does not match calculated total {expected_total}')
        
        return self

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "restaurant_id": 1,
                "order_items": [
                    {
                        "item_id": 123,
                        "item_name": "Margherita Pizza",
                        "price": 12.99,
                        "quantity": 2,
                        "subtotal": 25.98
                    }
                ],
                "delivery_address": {
                    "street": "123 Main St",
                    "city": "San Francisco",
                    "state": "CA",
                    "zip_code": "94105"
                },
                "subtotal": 25.98,
                "tax_amount": 2.08,
                "delivery_fee": 3.99,
                "tip_amount": 5.00,
                "discount_amount": 0.00,
                "total_amount": 37.05
            }
        }

class Order(OrderCreate):
    """Complete order model with database fields"""
    order_id: str = Field(..., description="Unique identifier for the order")
    delivery_user_id: Optional[str] = Field(None, description="ID of the delivery user (if assigned)")
    status: OrderStatus = Field(OrderStatus.PENDING, description="Current status of the order")
    
    # Timing fields
    estimated_pickup_time: Optional[datetime] = Field(None, description="Estimated time for pickup")
    estimated_delivery_time: Optional[datetime] = Field(None, description="Estimated time for delivery")
    actual_pickup_time: Optional[datetime] = Field(None, description="Actual time when order was picked up")
    actual_delivery_time: Optional[datetime] = Field(None, description="Actual time when order was delivered")
    
    # Metadata
    created_at: Optional[datetime] = Field(None, description="When the order was created")
    updated_at: Optional[datetime] = Field(None, description="When the order was last updated")
    # Delivery verification fields
    delivery_code: Optional[str] = Field(None, description="Numeric delivery verification code shown to customer")
    delivery_code_used: Optional[bool] = Field(False, description="Whether the delivery code has been used")

    class Config:
        json_schema_extra = {
            "example": {
                "order_id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "user_123",
                "delivery_user_id": None,
                "restaurant_id": 1,
                "order_items": [
                    {
                        "item_id": 123,
                        "item_name": "Margherita Pizza",
                        "price": 12.99,
                        "quantity": 2,
                        "subtotal": 25.98
                    }
                ],
                "status": "pending",
                "delivery_address": {
                    "street": "123 Main St",
                    "city": "San Francisco",
                    "state": "CA",
                    "zip_code": "94105"
                },
                "subtotal": 25.98,
                "tax_amount": 2.08,
                "delivery_fee": 3.99,
                "tip_amount": 5.00,
                "discount_amount": 0.00,
                "total_amount": 37.05,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z"
            }
        }

class OrderUpdate(BaseModel):
    """Model for updating order status and details"""
    status: Optional[OrderStatus] = Field(None, description="New status for the order")
    delivery_user_id: Optional[str] = Field(None, description="ID of the delivery user to assign")
    estimated_pickup_time: Optional[datetime] = Field(None, description="Updated estimated pickup time")
    estimated_delivery_time: Optional[datetime] = Field(None, description="Updated estimated delivery time")
    actual_pickup_time: Optional[datetime] = Field(None, description="Actual pickup time")
    actual_delivery_time: Optional[datetime] = Field(None, description="Actual delivery time")
    notes: Optional[str] = Field(None, max_length=1000, description="Updated notes")