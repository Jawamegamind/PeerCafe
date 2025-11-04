# User Dashboard Page Tests

Location:

- `frontend/__tests__/pages/user-dashboard.test.tsx`

Purpose:

- Tests the user's dashboard page: summary widgets (orders, favorites), navigation to key user areas, and personalized content.

Test setup & mocks:

- Mocks authentication/user context, API endpoints that supply user-specific data (recent orders, saved restaurants), and router navigation.
- Uses `@testing-library/react` and `user-event`.

Key test areas:

- Rendering of widgets and counts (recent orders, favorites)
- Navigation links from dashboard cards to detail pages
- Loading and empty states for user data

Run:

```powershell
npm test -- frontend/__tests__/pages/user-dashboard.test.tsx
```
