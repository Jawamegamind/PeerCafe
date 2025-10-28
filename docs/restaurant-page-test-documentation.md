# 🍽️ WolfCafe Frontend Testing Documentation

This document provides detailed test documentation for the **RestaurantsPage** and **RestaurantDetailPage** components of the WolfCafe application.  
It explains what each test covers, which dependencies are mocked, and how to run the test suites locally.

---

## 🧪 1. Restaurants Page — `__tests__/pages/restaurants-page.test.tsx`

### **Component:** `app/(main)/user/restaurants/page.tsx`
### **API Mocked:** `getRestaurants`

---

### 🎯 Purpose

The `RestaurantsPage` test suite verifies:
- Restaurant data is fetched correctly.
- UI displays restaurants, filters, and empty states properly.
- Search and cuisine filters function as expected.
- Loading skeletons appear while data loads.

---

### 🧩 Mocked Dependencies

| Mock | Purpose |
|------|----------|
| **next/navigation** | Mocks Next.js router (specifically `useRouter()`). |
| **getRestaurants** | Replaces API call with controlled mock data. |

---

### 🧠 Mock Data

```ts
[
  {
    restaurant_id: 1,
    name: "Luigi’s Pizza",
    description: "Authentic Italian pizza",
    address: "123 Main St",
    phone: "555-1234",
    email: "luigi@pizza.com",
    cuisine_type: "Italian",
    is_active: true,
    rating: 4.5,
    delivery_fee: 2.99
  },
  {
    restaurant_id: 2,
    name: "Sakura Sushi",
    description: "Fresh Japanese sushi",
    address: "456 Elm St",
    phone: "555-5678",
    email: "info@sakura.com",
    cuisine_type: "Japanese",
    is_active: true,
    rating: 4.8,
    delivery_fee: 3.5
  }
]
| # | Test                                      | Description                                     | Expected Behavior                           |
| - | ----------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| 1 | **renders loading skeletons initially**   | Ensures skeletons render before data loads.     | `progressbar` elements appear.              |
| 2 | **displays restaurants after fetching**   | Confirms restaurant data displays after fetch.  | “Luigi’s Pizza” and “Sakura Sushi” visible. |
| 3 | **filters restaurants by search term**    | Tests live search filtering.                    | Only “Sakura Sushi” remains.                |
| 4 | **filters restaurants by cuisine type**   | Tests dropdown filter behavior.                 | “Japanese” cuisine filters correctly.       |
| 5 | **shows empty state if no matches found** | Tests message display when filters return none. | “No restaurants match” appears.             |
