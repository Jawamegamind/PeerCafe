# Supabase Client Tests

Location

- `frontend/__tests__/utils/supabase-client.test.ts`

Overview

- Tests for the Supabase client wrapper used by the frontend. These tests ensure the wrapper initializes correctly, proxies calls to the underlying client, and surface errors in a predictable way.

Contract

- Inputs: environment variables or config passed during client initialization; method calls (select, insert, update, auth) proxied through the wrapper.
- Outputs: correct delegation to the underlying Supabase client and normalized error shapes for caller code.

Representative test cases

- Initialization: client factory uses the expected environment/config values and returns an object with expected methods.
- Method delegation: calling wrapper methods triggers underlying client's methods with correct arguments and returns results to the caller.
- Error normalization: if the underlying client rejects/throws, the wrapper returns or throws a normalized error object the app expects.

Mocks & setup

- Mock the Supabase client module (jest.mock) to provide fake implementations of select/insert/update/auth methods and to stub returned values and rejections.
- Use spies to assert wrapper calls correct methods with expected params.

Edge cases & notes

- Ensure authentication token handling and environment-specific config are covered.
- Keep tests focused on the wrapper's contract; integration with actual Supabase should be covered in separate integration tests if required.

How to run

```powershell
npm test -- frontend/__tests__/utils/supabase-client.test.ts
```
