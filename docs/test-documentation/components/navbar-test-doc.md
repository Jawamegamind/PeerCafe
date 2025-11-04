# Navbar Component Tests

Location

- `frontend/__tests__/components/navbar.test.tsx`

Overview

- Tests for the application's global navigation bar. The tests validate rendering of navigation links, brand/logo, cart button and dropdown trigger, profile/auth buttons, responsive toggles (mobile menu), and integration points such as showing cart count from context.

Contract (inputs / outputs)

- Inputs: authentication state (logged in/out), cart state (item count), and responsive viewport width if testing mobile behavior.
- Outputs / side-effects: opening/closing menus, navigation (router.push or Link hrefs), and triggering context actions (open cart dropdown).

Representative test cases

- Renders brand/logo and expected top-level navigation links.
- Shows Sign In / Register when user is not authenticated and shows Profile / Sign Out when authenticated.
- Cart button reflects cart count from context and opens the CartDropdown when clicked.
- Responsive behavior: mobile menu toggle opens/closes the mobile navigation and shows/hides menu items.
- Links: clicking primary nav links triggers router navigation or points to expected hrefs.
- Accessibility checks: header landmarks, ARIA attributes on menu buttons, and keyboard navigation for menu toggles.

Mocks & test setup

- Mock authentication context to test both signed-in and signed-out states.
- Mock Cart context/provider to provide a cart count and to assert cart toggle behavior.
- Mock `next/navigation` router (useRouter) if the component triggers navigation imperatively.
- Use `@testing-library/react` and `user-event` for interactions and `jest` for spies.

Edge cases & robustness

- Very long brand names or many nav links: ensure the layout remains usable and accessible.
- Mobile/responsive viewports: use `window.resizeTo` helper (or test-library utilities) to assert behavior at narrow widths.
- Ensure the CartDropdown open state resets when navigating away or when the user signs out.

How to run

```powershell
npm test -- frontend/__tests__/components/navbar.test.tsx
```

Maintenance notes

- If navigation moves to use different router primitives (link vs router.push), update the router mocks accordingly.
- Prefer queries by role and accessible labels (getByRole, getByLabelText) to keep tests resilient to cosmetic copy changes.
