# Supabase Middleware Tests

Location

- `frontend/__tests__/utils/supabase-middleware.test.ts`

Overview

- Tests for middleware or helper functions that adapt requests/responses for Supabase usage, especially around server/client boundaries, header injection, token refresh, and request authorization.

Contract

- Inputs: HTTP request metadata, auth tokens, and server-side request context.
- Outputs: mutated request objects with proper headers or responses handled according to middleware logic.

Representative test cases

- Header injection: middleware attaches the correct Authorization header when a token is present.
- Token refresh path: when an access token is expired, middleware attempts refresh and retries the request (mock refresh success and failure).
- Error propagation: middleware surfaces authentication errors without swallowing actionable details.

Mocks & setup

- Mock fetch/axios and the token provider/refresh mechanism to simulate token expiry and refresh flows.
- Spy on header values and requests sent to assert middleware mutated the request correctly.

Edge cases

- Missing tokens: ensure middleware either proceeds without auth or fails gracefully depending on required behavior.
- Refresh failure: ensure middleware exposes failure so higher-level code can redirect to login.

How to run

```powershell
npm test -- frontend/__tests__/utils/supabase-middleware.test.ts
```

Maintenance notes

- Keep token storage and refresh logic covered by focused unit tests; integration tests can cover end-to-end authentication flows.
