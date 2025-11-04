# Login Actions Tests

Location:

- `frontend/__tests__/actions/login-actions.test.ts`

Purpose:

- Test the action-level login helpers and side-effect functions used by the frontend (for example: API calls, client auth helpers, and small adapters that call Supabase or axios). These tests are focused on business logic and error handling outside of rendered components.

Common test setup & mocks:

- Mocks network clients (axios/fetch) to return expected resolved/rejected values.
- Mocks Supabase client creation if used by the login actions.
- Stubs console output (console.log / console.error) to keep test output clean and to assert logging where appropriate.

High-level test categories:

- Successful authentication flow: ensures the login action resolves with user data or the expected shape when the network call succeeds.
- API error handling: verifies the action returns safe defaults or throws expected errors when API returns non-OK responses.
- Network failures / timeouts: asserts retry or fallback behavior (if implemented) and that errors are surfaced in a controlled manner.
- Side-effects: ensures any side effects (localStorage, router navigation calls triggered by the action) are called when appropriate (these are typically mocked).

How to run:

```powershell
npm test -- frontend/__tests__/actions/login-actions.test.ts
```

Notes:

- These are unit-level action tests — keep them fast by mocking external dependencies. Prefer asserting behavior (calls made, values returned) rather than internal implementation details.
