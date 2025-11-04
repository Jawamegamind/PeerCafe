# Restaurant Detail Page Tests

Location:

- `frontend/__tests__/pages/restaurant-detail.test.tsx`

Purpose:

- Tests the Restaurant Detail page: rendering full restaurant info, menu items, reviews, and actions like "Add to order" or "View menu".

Test setup & mocks:

- Mocks API calls for restaurant data, menu items, and reviews. Mocks router params or search params used to fetch the restaurant id.
- Uses `@testing-library/react` and `user-event`.

Key test areas:

- Rendering of restaurant metadata (name, cuisine, address, rating)
- Menu list rendering and "add to cart" interactions
- Review list and pagination/empty states
- Error handling for failed fetches and loading state

Run:

```powershell
npm test -- frontend/__tests__/pages/restaurant-detail.test.tsx
```
