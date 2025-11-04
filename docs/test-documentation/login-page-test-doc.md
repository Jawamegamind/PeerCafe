# Login Page Tests

Location:

- `frontend/__tests__/pages/login.test.tsx`

Purpose:

- Tests the Login page and its behavior (the page that renders the authentication form used by users to sign in).
- Focuses on safe rendering under the Next.js App Router, form inputs and validation, authentication call handling (success and failure), and navigation/redirect behavior after login.

Common test setup & mocks

- Mocks `next/navigation` (or the router used in the app) so `useRouter`/`router.push` don't cause runtime errors during tests.
- Mocks authentication client calls (for example Supabase, fetch, or axios) so tests do not call external services.
- Mocks any shared UI components (Navbar, Footer, toasts/snackbars) to keep tests focused on login logic.
- Uses `@testing-library/react` and `@testing-library/user-event` for rendering and interaction, and `jest` for mocks and assertions.

High-level test categories

- Rendering
  - Renders login page without crashing when router and external dependencies are mocked.
  - Snapshot test to guard against accidental structural regressions.

- Form structure & accessibility
  - Ensures essential inputs exist: email/username, password, and optionally "remember me" checkbox.
  - Ensures a submit button is present with accessible role/labels.

- Input behaviour
  - Inputs accept typed values and reflect user input.
  - Form validation errors appear for empty or invalid inputs (e.g., invalid email format) when applicable.

- Authentication flows
  - Successful login: mocks auth success and verifies navigation/redirect (router.push) or presence of success UI.
  - Failed login: mocks server/auth errors and verifies error messages or toast/snackbar appear and no navigation occurs.
  - Network error: simulates network failure and asserts graceful handling (error text/snackbar, no crash).

- Edge cases & robustness
  - Submitting without fields does not crash the page; validation prevents or shows errors.
  - Ensures test doesn't depend on exact copy strings to reduce brittleness — prefer roles, labels and testids where available.

Guidance for selectors and assertions

- Prefer queries by role (`getByRole('button', { name: /sign in/i })`) and label text for inputs to improve accessibility alignment.
- Use `waitFor` for async assertions that depend on mocked network calls completing.

How to run these tests

From the `frontend` folder:

```powershell
npm test -- frontend/__tests__/pages/login.test.tsx
# or run the entire frontend test suite
npm test
```

Recommended filename

- `docs/login-page-tests.md` — descriptive and consistent with other per-page docs in `docs/`.

Maintenance notes

- If the app migrates from direct `window.location` to Next's router or vice versa, update router mocks accordingly.
- If the login UI switches to an OAuth popup/redirect, add tests or mocks for the OAuth flow (simulate success callback/redirect). 
- Keep tests focused on behavior (navigation called, correct error state) rather than exact text to lower fragility when UI copy changes.

Summary

This document describes the tests for the Login page. They exercise rendering, input handling, authentication success/failure flows, and navigation behavior with minimal, safe mocks so tests are stable and fast.
