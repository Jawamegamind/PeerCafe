# Admin Restaurant Page Tests

Location:


Purpose:


How to run:

```powershell
npm test -- frontend/__tests__/admin/admin-restaurant-page.test.tsx
```

Overview

- These tests exercise the admin-facing single-restaurant page used by admins to view and perform quick actions on a particular restaurant (view details, toggle status, manage menus, etc.). The suite focuses on rendering correctness, action buttons, navigation triggers, and network interactions triggered by UI actions.

Contract (what the page expects / provides)

- Inputs: router params (restaurant id), fetched restaurant object (name, address, cuisine, status, menu count), and app-level context (auth/admin privileges).
- Outputs / side-effects: navigation (router.push/back), API calls for status toggles or deletes, and UI updates (snackbars, dialogs).

Key test cases (representative)

- Renders restaurant metadata: name, cuisine, address, rating and menu count.
- Shows action buttons for admins: Edit, Manage Menu, Toggle Active/Inactive, Delete.
- Clicking "Manage Menu" navigates to the admin menu page for that restaurant (assert router.push called with correct path).
- Edit button opens the edit page (router navigation) and preserves restaurant id in the route.
- Toggle Active/Inactive calls the expected API endpoint and updates the status chip in the UI on success.
- Delete flow: clicking delete shows a confirmation dialog; confirming sends DELETE request and shows success snackbar; errors show error snackbar.
- Loading state: while initial restaurant data is being fetched, the page shows a spinner or skeleton.
- Error state: if initial fetch fails, the page shows an error message and retry affordance.

Mocks & test setup

- Mock `next/navigation`'s `useRouter` and any `useSearchParams` used to provide the restaurant id and to capture `router.push` calls.
- Mock fetch/global network calls or the library used (axios/supabase) to return the restaurant payload, and to simulate API success and failure for toggle/delete endpoints.
- Mock any shared UI components (Navbar, Toast/Snackbar) that are not under test.
- Use `@testing-library/react` + `user-event` for interactions and `jest` for spies and mock implementations.

Edge cases and robustness

- Test with minimal restaurant payloads and with maximal payloads (long names, many menu items) to ensure layout resilience.
- Simulate slow network responses (delays) to test visibility of loading indicators and that actions are idempotent.

Maintenance notes

- Keep route/method assertions in sync with backend API paths.
- Prefer asserting that `fetch/axios` was called with the correct URL and payload rather than asserting raw DOM text when possible to reduce brittleness.
