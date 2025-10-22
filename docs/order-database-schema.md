# Order Management Database Schema (Delivery-Only)

This document provides the SQL schema for creating the order management table in Supabase for delivery-only orders.

## Main Table: `orders`

```sql
-- Main orders table (delivery-only)
CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(user_id),
    delivery_user_id TEXT REFERENCES users(user_id), -- nullable until delivery user assigned
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(restaurant_id),
    
    -- Order Items as JSONB (efficient for queries and storage)
    order_items JSONB NOT NULL, -- Array of {item_id, item_name, price, quantity, subtotal, special_instructions}
    
    -- Pricing breakdown
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    tip_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Order details (delivery-only, address always required)
    delivery_address JSONB NOT NULL, -- {street, city, state, zip_code, instructions}
    payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery', -- Fixed for MVP (cash on delivery)
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'preparing', 'ready', 
        'assigned', 'picked_up', 'en_route', 'delivered', 'cancelled'
    )),
    
    -- Timing
    estimated_pickup_time TIMESTAMPTZ,
    estimated_delivery_time TIMESTAMPTZ,
    actual_pickup_time TIMESTAMPTZ,
    actual_delivery_time TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Optional: Performance Indexes

Add these later when you have more data and need better performance:

```sql
-- Basic indexes for common queries
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Advanced JSONB indexes (add only if needed)
CREATE INDEX idx_orders_items_gin ON orders USING GIN (order_items);
CREATE INDEX idx_orders_address_gin ON orders USING GIN (delivery_address);
```

## RLS (Row Level Security) Policies

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid()::text = user_id);

-- Users can create orders
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Restaurants can view orders for their restaurant
CREATE POLICY "Restaurants can view their orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM restaurants 
            WHERE restaurants.restaurant_id = orders.restaurant_id 
            AND restaurants.owner_id = auth.uid()::text
        )
    );

-- Restaurants can update orders for their restaurant
CREATE POLICY "Restaurants can update their orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM restaurants 
            WHERE restaurants.restaurant_id = orders.restaurant_id 
            AND restaurants.owner_id = auth.uid()::text
        )
    );

-- Delivery users can view and update assigned orders
CREATE POLICY "Delivery users can view assigned orders" ON orders
    FOR SELECT USING (auth.uid()::text = delivery_user_id);

CREATE POLICY "Delivery users can update assigned orders" ON orders
    FOR UPDATE USING (auth.uid()::text = delivery_user_id);
```

## Example JSONB Data Structures

### order_items Example:
```json
[
  {
    "item_id": 123,
    "item_name": "Margherita Pizza",
    "price": 12.99,
    "quantity": 2,
    "subtotal": 25.98,
    "special_instructions": "Extra cheese"
  },
  {
    "item_id": 456,
    "item_name": "Garlic Bread",
    "price": 5.99,
    "quantity": 1,
    "subtotal": 5.99
  }
]
```

### delivery_address Example:
```json
{
  "street": "123 Main St, Apt 4B",
  "city": "San Francisco",
  "state": "CA",
  "zip_code": "94105",
  "instructions": "Ring doorbell twice, leave at door if no answer"
}
```

## Useful Queries

### Query orders with specific items:
```sql
-- Find orders containing a specific menu item
SELECT * FROM orders 
WHERE order_items @> '[{"item_id": 123}]';

-- Find orders in a specific city
SELECT * FROM orders 
WHERE delivery_address->>'city' = 'San Francisco';

-- Get order totals by restaurant
SELECT 
    restaurant_id,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue
FROM orders 
WHERE status = 'delivered'
GROUP BY restaurant_id;

-- Find orders ready for pickup
SELECT * FROM orders 
WHERE status = 'ready' 
AND delivery_user_id IS NULL;
```

## Key Changes from Original Design

1. **Removed OrderType**: All orders are delivery-only
2. **Required Delivery Address**: `delivery_address` is now `NOT NULL`
3. **Simplified Validation**: No need to check for pickup vs delivery logic
4. **Cleaner Model**: Less complexity in business logic

## Model Classes Created

The following Pydantic model classes have been created in `/backend/models/order_model.py`:

- `OrderItem` - Individual items within an order
- `DeliveryAddress` - Delivery address structure  
- `OrderCreate` - For creating new delivery orders
- `Order` - Complete order with all database fields
- `OrderUpdate` - For updating existing orders
- `OrderStatus` - Enum for order status type safety

All models are delivery-focused with comprehensive validation and full test coverage.

## Step-by-Step Setup

1. **Go to Supabase Dashboard** → SQL Editor
2. **Create the orders table** using the main SQL above
3. **Set up RLS policies** for security
4. **Add indexes later** when you need performance optimization

The system is now streamlined for delivery-only orders, which simplifies both the database schema and application logic!
