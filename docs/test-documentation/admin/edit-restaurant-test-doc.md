# Edit Restaurant Tests

Location:


Purpose:


How to run:

```powershell
npm test -- frontend/__tests__/admin/edit-restaurant.test.tsx
```

Overview

- Tests for the Edit Restaurant page used by admins to update restaurant details. These tests cover form rendering, client-side validation, API submission, and navigation after save/cancel.

Contract (inputs / outputs)

- Inputs: initial restaurant object (id, name, cuisine, address, phone, delivery fee, status), and any available lookup lists (cuisine options).
- Outputs / side-effects: PUT/PATCH request to the restaurant API, navigation on success (router.push to admin list or restaurant page), and display of validation or server error messages.

Representative test cases

- Form fields render with existing restaurant values pre-filled.
- Client-side validation prevents submission with invalid inputs (empty required fields, invalid phone/price formats) and shows inline errors.
- Submitting valid data issues a PATCH/PUT request with properly serialized payload and shows a success snackbar on 200 response.
- Server-side validation errors (422) are surfaced inline or as a summary error message.
- Network failure displays a non-blocking error state and does not crash the page.
- Cancel button navigates back without calling the API.

Mocks & setup

- Mock `next/navigation`'s `useRouter` (push/back) and any `useSearchParams` used for the restaurant id.
- Mock network requests (fetch/axios/Supabase) to simulate success, validation errors, and network errors.
- Mock shared components (Navbar, Toasts) to keep tests focused on the edit form logic.
- Use `@testing-library/react` + `user-event` to assert form fill, validation, and submission behavior.

Edge cases

- Large text fields (long restaurant names or addresses) and their layout behaviour.
- Partial updates: ensure that only changed fields are sent if the implementation expects that.

Maintenance notes

- If the API contract changes (route or payload format), update the tests' request assertions accordingly.
- Favor asserting network calls (URL, method, body) rather than exact UI copy to reduce brittleness.
