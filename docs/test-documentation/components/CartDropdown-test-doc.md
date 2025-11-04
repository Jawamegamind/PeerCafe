# CartDropdown Component Tests

Location

- `frontend/__tests__/components/CartDropdown.test.tsx`

Overview

- Tests for the CartDropdown UI (the small cart preview shown in the navbar). The suite verifies rendering, item listing and counts, quantity adjustments, remove-item actions, subtotal calculations, and navigation to the cart/checkout page.

Contract (inputs / outputs)

- Inputs: cart items array (id, name, qty, price, modifiers), currency/formatting utilities, and callbacks for add/remove/update.
- Outputs / side-effects: calls to cart update functions, route navigation to checkout or cart page, and local UI state updates (collapsed/expanded, empty state).

Representative test cases

- Renders correctly with an empty cart: shows empty state message and no checkout button.
- Renders multiple items: displays item names, quantities, per-item total and aggregated subtotal.
- Quantity increment/decrement: clicking + or - updates the quantity and triggers the cart update callback with correct parameters.
- Remove item: clicking remove deletes the item and updates subtotal; if last item removed, empty state is shown.
- Navigation: clicking "View cart" or "Checkout" triggers navigation (router.push or link) with expected route.
- Accessibility: ensures buttons/inputs have accessible labels and roles.

Mocks & test setup

- Mock Cart context/provider if the component reads from context. Alternatively, supply a mocked cart prop and spy on callbacks.
- Mock `next/navigation` (useRouter) if the component triggers navigation via router; otherwise assert the presence of anchor hrefs.
- Mock any currency or formatting utilities to produce stable output for assertions.
- Use `@testing-library/react` and `user-event` for interactions and `jest` for spies/mocks.

Edge cases & robustness

- Long item names and many-line descriptions: ensure layout does not overflow unexpectedly.
- Rapid quantity changes: ensure callbacks are debounced/throttled if the implementation provides that behavior, and tests assert idempotency.
- Floating point totals: assert subtotal formatting to avoid rounding surprises.

How to run

From the project root (or `frontend` folder):

```powershell
npm test -- frontend/__tests__/components/CartDropdown.test.tsx
```

Maintenance notes

- Prefer asserting that the cart update callback was called with the expected arguments rather than checking internal state changes.
- When the UI moves to different markup (e.g., replacing buttons with icons + tooltips), update queries to use roles/testids instead of fragile text selectors.
