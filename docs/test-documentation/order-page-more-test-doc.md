# Order Page (More) Tests

Location:

- `frontend/__tests__/pages/order-page.more.test.tsx`

Purpose:

- Exercises advanced or "more" scenarios for the Order page (`app/(main)/order/page.tsx`), such as edge-case order contents, discounts, complex UI states, or multi-step interactions.

Test setup & mocks:

- Mocks router/navigation, API calls for fetching orders and menu items, and any payment or third-party interactions.
- Uses React Testing Library and user-event for user flows that include complex sequences.

High-level categories:

- Complex order compositions (many items, special options)
- Discount/coupon application and price recalculation
- Multi-step interactions (quantity changes, add/remove items)
- Edge-case UX states (very long lists, overflow handling, responsiveness)

How to run:

```powershell
npm test -- frontend/__tests__/pages/order-page.more.test.tsx
```
