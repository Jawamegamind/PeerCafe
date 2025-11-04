# User Restaurants Page Tests

Location:

- `frontend/__tests__/pages/user-restaurants.test.tsx`

Purpose:

- Tests the Restaurants listing page as seen by users: fetching restaurants, searching/filtering, and navigation to individual restaurant detail pages.

Test setup & mocks:

- Mocks API endpoints for the restaurants list and search, router navigation, and any client-side filtering utilities.
- Uses `@testing-library/react` and `user-event`.

Key test areas:

- Fetch and render list of restaurants
- Search and filter interactions and resulting list updates
- Navigation to restaurant detail pages
- Empty and error states when fetch fails or returns no results

Run:

```powershell
npm test -- frontend/__tests__/pages/user-restaurants.test.tsx
```
