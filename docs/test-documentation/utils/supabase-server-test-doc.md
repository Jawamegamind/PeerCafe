# Supabase Server Tests

Location

- `frontend/__tests__/utils/supabase-server.test.ts`

Overview

- Tests for server-side Supabase helper utilities used in Next.js server components or API routes. These cover server client creation, request-bound client injection, token handling, and any server-only helper behavior.

Contract

- Inputs: server request/response objects (or simplified stubs), server environment variables, and session cookies or headers.
- Outputs: a server-bound Supabase client instance, correct handling of server-only authentication flows, and normalized error handling.

Representative test cases

- Server client creation: factory returns a client configured with server-only options and environment variables.
- Request-scoped client: when provided a request with cookies or headers, the helper attaches cookies/tokens correctly to the client.
- Token refresh and cookie setting: if refresh is implemented server-side, ensure cookies are set on response when refresh succeeds.
- Error handling: server helper surfaces distinct errors for missing credentials vs network issues.

Mocks & setup

- Mock the Supabase server client library to avoid network calls and to assert initialization params.
- Provide stub request/response objects for tests that exercise request-scoped behavior (e.g., `req.headers`, `res.setHeader`).

Edge cases

- Missing or malformed cookies: helpers should return a clear error or a null client instead of throwing raw exceptions.

How to run

```powershell
npm test -- frontend/__tests__/utils/supabase-server.test.ts
```

Maintenance notes

- Keep server and client helpers clearly separated in the codebase; tests should reflect server-only behavior and not be reused for client-side expectations.
