# Order Page Tests

Location:

- `frontend/__tests__/pages/order-page.test.tsx`

Purpose:

- Tests the main Order page flows: viewing an order, editing quantities, calculating totals, and navigating between order-related screens.

Test setup & mocks:

- Mocks API endpoints for retrieving order and menu data, mocks router navigation, and mocks any payment or cart services.
- Uses `@testing-library/react` and `user-event` for interactions.

Key test areas:

- Rendering of order items and totals
- Quantity adjustments and re-calculation of totals
- Removing items and handling empty-cart state
- Navigation to checkout or menu from the order page
- Error handling for failed API calls

Run:

```powershell
npm test -- frontend/__tests__/pages/order-page.test.tsx
```
