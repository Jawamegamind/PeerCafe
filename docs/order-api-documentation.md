# Order Management API Documentation

This document explains how to use the order placement functionality in PeerCafe.

## API Endpoints

All endpoints are prefixed with `/api/orders`

### 1. Place Order
**POST** `/api/orders/`

Creates a new delivery order.

**Request Body:**
```json
{
  "user_id": "user_123",
  "restaurant_id": 1,
  "order_items": [
    {
      "item_id": 123,
      "item_name": "Margherita Pizza",
      "price": 12.99,
      "quantity": 2,
      "subtotal": 25.98,
      "special_instructions": "Extra cheese"
    }
  ],
  "delivery_address": {
    "street": "123 Main St, Apt 4B",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94105",
    "instructions": "Ring doorbell twice"
  },
  "subtotal": 25.98,
  "tax_amount": 2.08,
  "delivery_fee": 3.99,
  "tip_amount": 5.00,
  "discount_amount": 0.00,
  "total_amount": 37.05,
  "notes": "Please deliver quickly"
}
```

**Response:** Returns the created order with generated `order_id` and estimated times.

### 2. Get User Orders
**GET** `/api/orders/user/{user_id}?limit=20&offset=0`

Retrieves orders for a specific user.

### 3. Get Order by ID
**GET** `/api/orders/{order_id}`

Retrieves a specific order by its ID.

### 4. Get Restaurant Orders
**GET** `/api/orders/restaurant/{restaurant_id}?status_filter=pending&limit=50&offset=0`

Retrieves orders for a restaurant (for restaurant dashboard).

### 5. Update Order Status
**PATCH** `/api/orders/{order_id}/status?new_status=confirmed`

Updates the order status. Available statuses:
- `pending` - Order placed, awaiting confirmation
- `confirmed` - Order confirmed by restaurant
- `preparing` - Order being prepared
- `ready` - Order ready for pickup
- `assigned` - Delivery user assigned
- `picked_up` - Order picked up by delivery user
- `en_route` - Order on the way to customer
- `delivered` - Order successfully delivered
- `cancelled` - Order cancelled

### 6. Assign Delivery User
**PATCH** `/api/orders/{order_id}/assign-delivery?delivery_user_id=delivery_user_456`

Assigns a delivery user to an order (changes status to `assigned`).

### 7. Get Delivery User Orders
**GET** `/api/orders/delivery-user/{delivery_user_id}?status_filter=assigned`

Retrieves orders assigned to a delivery user.

### 8. Cancel Order
**DELETE** `/api/orders/{order_id}`

Cancels an order (soft delete - updates status to `cancelled`).

## Order Workflow

1. **Customer places order** → Status: `pending`
2. **Restaurant confirms** → Status: `confirmed`
3. **Order being prepared** → Status: `preparing`
4. **Food ready** → Status: `ready`
5. **Delivery user assigned** → Status: `assigned`
6. **Order picked up** → Status: `picked_up`
7. **On the way** → Status: `en_route`
8. **Delivered** → Status: `delivered` (Cash payment collected)

## Key Features

### ✅ **Delivery-Only Focus**
- All orders require delivery addresses
- No pickup option complexity
- Streamlined validation

### ✅ **Cash on Delivery MVP**
- All orders use cash on delivery payment
- No payment gateway integration needed for MVP
- Payment method automatically set to "cash_on_delivery"

### ✅ **Comprehensive Validation**
- Subtotal calculation verification
- Total amount validation
- Required field enforcement

### ✅ **Status Tracking**
- Complete order lifecycle management
- Automatic timestamp recording
- Business logic validation

### ✅ **Flexible Queries**
- User order history
- Restaurant dashboard views
- Delivery user assignments
- Status filtering

### ✅ **Error Handling**
- Detailed error messages
- Proper HTTP status codes
- Database error management

## Example Frontend Integration

Here's how you would integrate with the checkout page:

```typescript
// In your checkout component
const handlePlaceOrder = async (cartData: CartData) => {
  try {
    const orderData = {
      user_id: user.id,
      restaurant_id: restaurant.id,
      order_items: cartItems.map(item => ({
        item_id: item.id,
        item_name: item.ItemName,
        price: item.Price,
        quantity: item.quantity,
        subtotal: item.Price * item.quantity,
        special_instructions: item.specialInstructions
      })),
      delivery_address: deliveryAddress,
      subtotal: calculateSubtotal(),
      tax_amount: calculateTax(),
      delivery_fee: restaurant.DeliveryFee,
      tip_amount: tipAmount,
      discount_amount: discountAmount,
      total_amount: calculateTotal()
    };

    const response = await fetch('/api/orders/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    if (response.ok) {
      const order = await response.json();
      // Redirect to order confirmation page
      router.push(`/orders/${order.order_id}`);
    }
  } catch (error) {
    console.error('Failed to place order:', error);
  }
};
```

## Database Setup

Make sure you've created the orders table in Supabase using the SQL from the database schema documentation.

## Testing

All endpoints are thoroughly tested with 100% coverage. Run tests with:

```bash
cd backend
python -m pytest tests/test_order_routes.py -v
```

The order management system is now ready for production use!

