# Register Actions Tests

Location:

- `frontend/__tests__/actions/register-actions.test.ts`

Purpose:

- Validate the registration-related action helpers and API call wrappers used by the frontend. Tests focus on payload formation, network interactions, and error handling performed by register action functions.

Common test setup & mocks:

- Mock network client (axios/fetch) to simulate successful and failing registration responses.
- Stub any client libraries (Supabase, auth providers) and mock responses for duplicate email, validation errors, and success.
- Spy on console output and router behavior when registration triggers navigation.

High-level test categories:

- Successful registration: ensures the action calls the correct endpoint with a properly formatted payload and resolves with expected data.
- Server validation errors: simulates server responses (e.g., email already in use) and asserts the action surfaces descriptive error messages.
- Network errors/timeouts: ensures the action either retries, rejects with a helpful error, or returns a fallback shape depending on implementation.
- Side-effects: checks that follow-up behavior (e.g., navigating to a welcome or verification page, setting tokens) is invoked through mocked interfaces.

How to run:

```powershell
npm test -- frontend/__tests__/actions/register-actions.test.ts
```

Notes:

- Keep the tests focused on the action contract (inputs, outputs, side-effects). Avoid coupling to UI text or component structure.
