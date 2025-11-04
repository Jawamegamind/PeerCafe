# Admin Dashboard Page Tests

Location of tests:
- frontend/__tests__/pages/admin-dashboard.test.tsx

Purpose:
- Verify rendering, layout, accessibility, interaction and styling of the Admin Dashboard page at `app/(main)/admin/dashboard/page.tsx`.
- Ensure navigation behavior for the active "Restaurant Management" card.
- Exercise visual/behavioral expectations (styles, hover, responsive grid, icons, breadcrumb and route display).

Test categories and brief descriptions:

- Page Rendering
  - Renders Navbar component.
  - Renders main heading and welcome message.
  - Renders all dashboard cards and their content (Restaurant Management, User Management, Analytics).

- Navigation & Interaction
  - Clicking the Restaurant Management card navigates to `/admin/restaurants` (window.location.href).
  - Back/interactive styling: card cursor, transitions and hover effects (mouseEnter/mouseLeave simulate transform and shadow).

- Accessibility & Structure
  - Ensures accessible card structure and presence of heading roles.
  - Verifies grid layout container and responsive grid CSS properties.

- Styling & Visuals
  - Validates emoji icons and icon styling.
  - Confirms color scheme and font sizes for headings, subtext and card titles/descriptions.
  - Checks consistent card sizing, padding, background, borders and box shadows.

- Disabled/Coming-Soon Cards
  - Verifies that "User Management" and "Analytics" cards are visually disabled (opacity, no pointer cursor).
  - Ensures "coming soon..." text appears as expected.

- Current Route Display
  - Confirms current route text and surrounding styling (route container appearance).

Mocks & Test Setup:
- Navbar component is mocked to a simple <nav data-testid="navbar"> element.
- window.location.assign is mocked and window.location.href is used to assert navigation.
- Tests use @testing-library/react, @testing-library/user-event and jest-dom matchers.

How to run these tests:
- From the frontend folder in the repo:
  - npm test -- frontend/__tests__/pages/admin-dashboard.test.tsx
  - or run the full suite: npm test

Notes and suggestions:
- Tests assert inline styles via toHaveStyle; if styles move to CSS modules or external styles, some assertions may need updates or DOM queries that check class names instead.
- Navigation uses window.location.href in the implementation under test; if replaced by Next.js router in future, update mocks to match useRouter/useRouter().push behavior.