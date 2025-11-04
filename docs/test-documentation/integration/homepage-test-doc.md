# Homepage Integration Tests

Location

- `frontend/__tests__/integration/homepage.test.tsx`

Overview

- These are integration-style tests that exercise the homepage end-to-end within a JSDOM environment: server data fetching, rendering of featured restaurants and banners, and core navigation flows that originate from the landing page.

Contract (what is tested)

- Inputs: mocked API responses for featured restaurants, banners and any global configuration consumed by the homepage.
- Outputs: rendered list/grid of restaurants, correct counts/ordering, and navigation triggers (clicking a restaurant card navigates to the detail page).

Representative test cases

- Renders featured restaurants returned by the API, including image, name, cuisine and rating.
- Empty results: when API returns an empty list, the homepage shows a friendly empty state and primary CTAs.
- Navigation: clicking a restaurant card triggers navigation to the restaurant detail page with the correct id in the route.
- Banner/hero: ensures hero CTA buttons navigate to the expected sections or open the correct links.
- Loading state: while mock fetch is pending, a loading indicator (skeleton or spinner) is displayed.

Mocks & test setup

- Mock `global.fetch` (or axios) to return deterministic data for featured restaurants, banners, and other homepage API calls. Use fixtures to keep tests readable.
- Mock `next/navigation` router if the homepage triggers navigation via router.push; otherwise assert anchor hrefs.
- Use `@testing-library/react` and `user-event` to render and interact with the page.

Edge cases & robustness

- Simulate malformed restaurant objects (missing image or rating) and assert the homepage falls back to placeholders and does not crash.
- Simulate slow network responses (delays) to verify loading indicators persist until data is ready.

How to run

From the `frontend` folder:

```powershell
npm test -- frontend/__tests__/integration/homepage.test.tsx
```

Maintenance notes

- Keep fixtures in a shared `__fixtures__` or test-utils file to avoid duplication across tests.
- Prefer asserting on role-based queries and stable attributes (data-testid) to reduce breakage due to UI copy changes.
