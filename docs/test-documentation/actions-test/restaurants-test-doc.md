# Restaurants Actions Tests

Location:

- `frontend/__tests__/actions/restaurants.test.ts`

Purpose:

- Tests the action-level helpers used to fetch and manage restaurants from the backend. These tests validate API endpoint calls, response parsing, and error handling performed by restaurant-related actions.

Common test setup & mocks:

- Mocks `axios.get` or other network clients to return success, HTTP error responses, and network failures.
- Stubs Supabase or server client creation if used by these helpers.
- Mocks console methods and any local helper utilities used for parsing/transforming restaurant data.

High-level test categories:

- Successful fetch: verifies the action calls the correct backend endpoint and returns parsed restaurant data.
- HTTP response handling: simulates non-200 responses and asserts the action returns safe defaults (e.g., empty array) or throws meaningful errors based on implementation.
- Network errors and timeouts: ensures the action handles rejections gracefully and does not crash the caller.
- Endpoint/URL correctness: asserts that the action uses the expected backend URL and query parameters.

How to run:

```powershell
npm test -- frontend/__tests__/actions/restaurants.test.ts
```

Notes:

- Prefer testing behavior (returned data, calls made) and keep external calls mocked to keep tests fast and deterministic.
