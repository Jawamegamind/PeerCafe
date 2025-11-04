# Error Handling & Edge Case Tests

Location

- `frontend/__tests__/edge-cases/error-handling.test.tsx`

Overview

- This suite targets edge-case and global error handling behaviors across the frontend. Instead of testing a single component, these tests intentionally trigger unexpected conditions (network failures, thrown exceptions inside render paths, malformed responses, and persistence errors) to confirm the app handles them without crashing and provides useful feedback to users and developers.

Contract (what these tests exercise)

- Fail-fast protection: components and hooks should not allow unhandled exceptions to bubble out and crash the test renderer.
- Graceful UI fallbacks: on network or parsing errors, components should display an error message, retry action, or an empty state rather than a broken UI.
- Centralized logging: errors should be surfaced to a logging interface (console or a mocked monitoring client) so developers can diagnose issues.

Representative test cases

- Network failures: simulate fetch/axios rejections for pages and verify the UI shows an error state and retry affordance.
- Malformed responses: mock API responses with missing fields or unexpected types and assert the component either falls back safely or surfaces a clear error.
- Component render exceptions: monkey-patch a child component to throw during render and verify that the parent or an error boundary catches the error and renders a fallback UI.
- Persistence errors: mock `localStorage`/`sessionStorage` to throw and verify providers handle the exception and continue functioning or surface a warning.
- Third-party failures: simulate failures from external libs (e.g., payment SDK, map provider) and assert the app degrades gracefully.

Mocks & setup

- Mock network clients (`global.fetch` or axios) to produce rejected promises, delayed responses, or malformed JSON.
- Spy on `console.error` / `console.warn` and on any monitoring client (Sentry, LogRocket) to assert errors are being reported.
- Provide an ErrorBoundary wrapper component in tests to ensure render-time exceptions are captured and fallback UI is rendered.
- Use `@testing-library/react` to render components/pages and `jest` for mocks and timers.

Best practices & assertions

- Prefer asserting that the UI shows an actionable fallback ("Retry", "Could not load", etc.) or that a safe empty state is present.
- Assert that logging happened (e.g., `expect(console.error).toHaveBeenCalled()`), but avoid coupling to exact log messages.
- Use `waitFor` patterns when testing async failure and retry flows to avoid flakiness.

Edge-case suggestions to add tests for

- Simulate low-memory/long-GC pauses by adding artificial async delays and asserting timeouts are handled.
- Simulate unexpected data types (e.g., string instead of number) returned from the API and assert defensive parsing.
- Test interactions after a failure (e.g., user clicks Retry) to ensure the retry path recovers the UI.

How to run

```powershell
npm test -- frontend/__tests__/edge-cases/error-handling.test.tsx
```

Maintenance notes

- Keep tests fast by mocking heavy third-party SDKs; only add integration tests for these when running dedicated e2e tests.
- When adding error reporting, ensure tests mock the reporter so tests don't send real telemetry.
