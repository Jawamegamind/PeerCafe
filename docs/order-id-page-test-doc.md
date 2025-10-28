# Checkout Page — __tests__/checkout.test.tsx

**Component:** `app/(main)/user/checkout/page.tsx`  
**Context Provider:** `CartProvider`  
**Authentication:** Supabase Client

## Purpose

The CheckoutPage test suite validates:

- User authentication flow and redirection for unauthenticated users.
- Correct rendering of cart items, restaurant information, and pricing calculations.
- Delivery address form functionality and validation.
- Order placement flow with API integration.
- Error handling for failed API calls and invalid form submissions.
- Cart clearing and navigation after successful order placement.

## Mocked Dependencies

| Mock                     | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| **next/navigation**      | Mocks `useRouter()` for navigation testing (`push`, `back`).           |
| **Navbar**               | Mocked with `<nav data-testid="navbar">` to isolate rendering.         |
| **CartProvider**         | Provides cart state (items, restaurant, totals, `clearCart()`).        |
| **Supabase Client**      | Mocks authentication (`auth.getUser()`) and database queries.           |
| **fetch**                | Simulates API responses for order placement (`POST /api/orders/`).      |

## Mock Data

**Cart Items:**
```javascript
[
  {
    id: 1,
    ItemName: 'Margherita Pizza',
    Price: 12.99,
    quantity: 2,
  },
  {
    id: 2,
    ItemName: 'Caesar Salad',
    Price: 8.99,
    quantity: 1,
  }
]
| #  | Test                                                               | Description                                       | Expected Outcome                                        |
| -- | ------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------- |
| 1  | **renders navbar component**                                       | Verifies navbar is present on page.               | Navbar with `data-testid="navbar"` visible.             |
| 2  | **shows loading state while verifying authentication**             | Loading spinner appears during auth check.        | "Verifying your account..." message shown.              |
| 3  | **redirects to login if user is not authenticated**                | Tests auth failure scenario.                      | `router.push('/login')` called.                         |
| 4  | **displays empty cart message when cart is empty**                 | Checks empty cart UI state.                       | "Your cart is empty" message shown.                     |
| 5  | **navigates to restaurants page from empty cart**                  | Tests navigation from empty state.                | Clicking "Browse Restaurants" calls `router.push()`.    |
| 6  | **renders checkout page heading**                                  | Verifies main page heading.                       | "Checkout" heading visible.                             |
| 7  | **displays restaurant name in order summary**                      | Shows restaurant info in order details.           | "From: Mario's Italian Restaurant" chip displayed.      |
| 8  | **displays all cart items with correct details**                   | Renders all items with name, price, and quantity. | "Margherita Pizza", "$12.99 × 2", "Caesar Salad" shown. |
| 9  | **calculates and displays correct pricing breakdown**              | Validates all pricing components.                 | Subtotal ($34.97), Tax ($2.80), Delivery ($3.99) shown. |
| 10 | **displays correct final total**                                   | Ensures accurate total calculation.               | Total of $46.76 displayed.                              |
| 11 | **renders delivery address form fields**                           | Checks all required form inputs exist.            | Street, City, State, ZIP code fields present.           |
| 12 | **updates delivery address fields when user types**                | Tests form input functionality.                   | Typing updates field value correctly.                   |
| 13 | **displays tip amount selector with options**                      | Verifies tip selection dropdown.                  | Tip amount selector present.                            |
| 14 | **updates tip amount when user selects different option**          | Tests tip selection interaction.                  | Clicking shows tip options ($2, $3, $5, $7, $10).       |
| 15 | **displays special instructions text field**                       | Checks optional notes field.                      | "Special Instructions" textarea visible.                |
| 16 | **displays cash on delivery payment method**                       | Shows payment method information.                 | "Payment Method: Cash on Delivery" alert shown.         |
| 17 | **disables place order button when form is invalid**               | Validates button state with incomplete form.      | "Place Order" button disabled when fields empty.        |
| 18 | **enables place order button when all required fields are filled** | Tests form validation success.                    | Button enabled after filling required fields.           |
| 19 | **validates required fields and shows error message**              | Ensures partial form submission blocked.          | Button remains disabled with incomplete data.           |
| 20 | **submits order with correct data when place order is clicked**    | Validates API call structure.                     | `POST /api/orders/` called with proper JSON payload.    |
| 21 | **clears cart after successful order placement**                   | Tests cart clearing on success.                   | `clearCart()` called after successful response.         |
| 22 | **displays success message after order is placed**                 | Shows success feedback to user.                   | "Order placed successfully!" snackbar appears.          |
| 23 | **redirects to order details page after successful order**         | Tests post-order navigation.                      | Redirects to `/user/orders/order-456` after 2 seconds.  |
| 24 | **displays error message when order placement fails**              | Handles API errors gracefully.                    | Error alert shows "Invalid order data".                 |
| 25 | **navigates back when back button is clicked**                     | Tests back navigation functionality.              | `router.back()` called on "Back" button click.          |
| 26 | **displays total item count correctly**                            | Shows accurate cart item count.                   | "3 items" displayed in summary.                         |
| 27 | **displays continue shopping button**                              | Verifies secondary navigation option.             | "Continue Shopping" button present.                     |
| 28 | **navigates to restaurants when continue shopping is clicked**     | Tests continue shopping flow.                     | `router.push('/user/restaurants')` called.              |
| 29 | **shows placing order text while submitting**                      | Validates loading state during submission.        | Button shows "Placing Order..." with spinner.           |
| 30 | **displays estimated delivery time**                               | Shows delivery time information.                  | "Estimated delivery time: 30-45 minutes" visible.       |
