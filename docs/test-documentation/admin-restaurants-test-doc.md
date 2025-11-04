# Admin Restaurants Management Page Tests

Location:
- frontend/__tests__/pages/admin-restaurants.test.tsx

Purpose:
- Validate the Admin Restaurants management UI located at `app/(main)/admin/restaurants/page.tsx`.
- Cover data fetching, rendering, filtering, navigation, actions (delete/restore), error handling, empty states, notifications and visual states.

Test setup & mocks:
- Mocks Navbar component to a simple <nav data-testid="navbar">.
- Mocks Next.js app router (`next/navigation` useRouter) with a mockRouter implementing push/back/forward/refresh.
- Mocks global fetch to simulate API responses (success, failure, network error, long-pending).
- Stubs anchor clicks and window.location.assign/replace to avoid jsdom navigation during tests.
- Uses @testing-library/react, user-event and jest-dom.

Test categories (high level)

- Page Rendering
  - Renders page skeleton: navbar, admin heading, breadcrumbs, "Add Restaurant" button.
  - Loading state: displays progress indicator while fetch pending.
  - Displays fetched restaurant list.

- Restaurant Table & Data Formatting
  - Table headers: Name, Cuisine, Address, Phone, Rating, Delivery Fee, Status, Actions.
  - Currency and rating formatting (e.g. "$3.99", "⭐ 4.5").
  - Correct counts display: total restaurants and deleted count.

- Filter Controls
  - "Show deleted restaurants" switch behavior: default state, toggling hides/shows deleted rows.
  - Filtered counts and empty-filter state messaging.

- Navigation
  - "Add Restaurant" button navigates to /admin/restaurants/add via router.push.
  - "Manage Menu" and "Edit Restaurant" actions navigate to appropriate routes.
  - Breadcrumb links include correct href attributes.

- Restaurant Actions (UI & Dialogs)
  - Action buttons presence for active vs deleted restaurants (Manage Menu, Edit, Delete, Restore).
  - Delete confirmation dialog displays and can be cancelled.

- Delete / Restore Flows (network interactions)
  - Successful delete: DELETE request to /api/restaurants/:id, success notification.
  - Server-side delete error: shows returned error message.
  - Network error during delete: shows network error snackbar/message.
  - Loading state during delete (shows "Deleting...").
  - Successful restore: PATCH request to /api/restaurants/:id/restore and success notification.
  - Restore server error and network error handling.

- Error Handling
  - Shows error message when initial fetch rejects or API returns non-OK status.

- Empty States
  - No restaurants: shows primary empty state message.
  - Filtered empty state when all restaurants hidden by filter.

- Snackbar Notifications
  - Error snackbars appear for network/API errors and close when close button clicked.

- Visual & Accessibility States
  - Deleted rows styled with reduced opacity.
  - Status chips for Active/Inactive/Deleted present in correct counts.
  - Accessible roles and attributes checked (progressbar, switch, buttons).

How to run the tests:
- From the frontend folder:
  - npm test -- frontend/__tests__/pages/admin-restaurants.test.tsx
  - or run full test suite: npm test

Notes:
- Many assertions rely on text content, roles and titles — adjust if component markup changes.
- If the app router implementation changes (e.g., using Link vs router.push), update router mocks accordingly.