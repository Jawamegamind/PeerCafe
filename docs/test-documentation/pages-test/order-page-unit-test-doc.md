# Order Page Unit Tests

Location:

- `frontend/__tests__/pages/order-page.unit.test.tsx`

Purpose:

- Focuses on small, isolated units of the Order page logic (helpers, pure functions, and small components) rather than full integration flows.

Test setup & mocks:

- Tests run without rendering the entire page when possible; use shallow renders or pure function tests.
- Mocks data inputs and asserts outputs for formatting, calculation, and utility functions.

Key areas:

- Price/total calculation helpers
- Formatting helpers (currency, quantity display)
- Small presentational components (line items, subtotal rows)

Run:

```powershell
npm test -- frontend/__tests__/pages/order-page.unit.test.tsx
```
