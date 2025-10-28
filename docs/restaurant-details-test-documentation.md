Restaurant Detail Page — __tests__/restaurant-detail.test.tsx
Component: app/(main)/user/restaurants/[restaurantId]/page.tsx
Context Provider: CartProvider

Purpose

- The RestaurantDetailPage test suite validates:

- Correct API interactions for restaurant and menu data.

- Proper UI rendering and conditional states (loading, empty, unavailable).

- Functionality of Add-to-Cart integration with the CartProvider.

- Handling of API errors gracefully without crashes.

Mocked Dependencies

| Mock                | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| **next/navigation** | Mocks `useParams()` for dynamic route.                         |
| **Navbar**          | Mocked with `<div data-testid="navbar">` to isolate rendering. |
| **localStorage**    | Mocked for persistence testing without browser dependency.     |
| **fetch**           | Simulates API responses for menu and restaurant data.          |
| **CartProvider**    | Wraps component to test Add-to-Cart flow.                      |

Mock Data

Menu Items:
    {
    item_id: 1,
    item_name: "Test Pizza",
    description: "Delicious test pizza with cheese",
    price: 15.99,
    image: "https://example.com/pizza.jpg",
    is_available: true,
    quantity: 10
    }
Restaurant:
    {
    item_id: 1,
    item_name: "Test Pizza",
    description: "Delicious test pizza with cheese",
    price: 15.99,
    image: "https://example.com/pizza.jpg",
    is_available: true,
    quantity: 10
    }

| #  | Test                                                             | Description                                               | Expected Outcome                                          |
| -- | ---------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| 1  | **renders loading state initially**                              | Skeletons appear before data loads.                       | Multiple `.MuiSkeleton-root` elements visible.            |
| 2  | **displays restaurant information and menu items after loading** | Ensures fetched data displays correctly.                  | Pizza details and price visible.                          |
| 3  | **handles API error gracefully**                                 | Tests failure in `fetch` call.                            | Alert displays with error text.                           |
| 4  | **displays empty state when no menu items are available**        | Checks empty menu UI.                                     | “No menu items available.” shown.                         |
| 5  | **handles unavailable menu items correctly**                     | Validates unavailable items’ disabled Add-to-Cart button. | Button disabled and labeled “Unavailable.”                |
| 6  | **calls handleAddToCart when Add to Cart button is clicked**     | Simulates adding item to cart.                            | No error; handler called.                                 |
| 7  | **displays restaurant header when restaurant data is loaded**    | Verifies restaurant header renders fully.                 | “Test Restaurant”, “Italian”, “4.5/5” shown.              |
| 8  | **displays menu count in the header**                            | Confirms dynamic menu item count updates.                 | “2 items” shown.                                          |
| 9  | **makes correct API calls with restaurant ID**                   | Ensures endpoints use `restaurantId`.                     | Calls `/api/restaurants/1/menu` and `/api/restaurants/1`. |
| 10 | **handles restaurant API failure gracefully**                    | Tests partial success with menu still rendered.           | Menu visible, no crash.                                   |
| 11 | **has proper hover effects on menu item cards**                  | Verifies UI elements render for interaction.              | Menu cards exist in DOM.                                  |

