# Cart Context Tests

Location

- `frontend/__tests__/contexts/CartContext.text.tsx`

Overview

- These tests exercise the Cart context/provider used across the frontend to manage a user's shopping cart. The suite focuses on the provider API (add, update, remove, clear), computed values (totals, item counts), persistence (localStorage/sessionStorage or other persistence), and interactions with other consumers (components and hooks). They are unit / integration-style tests that keep business logic well covered and fast by mocking external dependencies.

Contract (inputs / outputs)

- Inputs: actions called by consumers (addItem, removeItem, updateQuantity, clearCart), and initial state overrides used by the provider for testing.
- Outputs: emitted state changes (cart items array), derived values (subtotal, total count), and persistence side-effects (localStorage writes). Also, events that subscribers might receive (callbacks, context consumers re-renders).

Representative test cases

- Initial state: when provider mounts with no persisted cart, the cart is empty and derived values are zero.
- Add item: calling `addItem(item)` adds an item to state, updates totals, and persists the new cart.
- Add duplicate item: adding an item with the same id increments quantity rather than creating a duplicate row (if behavior is intended).
- Update quantity: calling `updateQuantity(itemId, newQty)` changes the item quantity and updates totals; quantity of zero removes the item if that's intended behavior.
- Remove item: `removeItem(itemId)` removes the item from the cart and updates counts/totals and persistence.
- Clear cart: `clearCart()` empties the cart and removes persisted state.
- Persistence: when provider mounts with existing persisted data (mocked localStorage), provider hydrates initial state correctly.
- Derived values: subtotal, tax, delivery fee and total are computed correctly given items and pricing rules.
- Cross-tab / sync (optional): if the app uses storage events for cross-tab sync, simulate storage event to assert provider updates.

Mocks & test setup

- Mock localStorage/sessionStorage (or the persistence interface the app uses) so tests control persisted state. Use `jest.spyOn(window.localStorage, 'getItem')` / `setItem` or a helper mock.
- Provide a test wrapper that mounts the provider with a controlled initial state when rendering consumer components. Example: `renderWithCartProvider(ui, { initialCart })`.
- Use `@testing-library/react` to render small test consumer components that read context values and call actions; assert UI/DOM changes or function calls.
- Use `jest.useFakeTimers()` if actions are debounced/throttled and you need to advance timers to observe outcomes.

Edge cases & robustness

- Floating point arithmetic: assert subtotal formatting and rounding (avoid equality checks on floats — format and assert string output or use toBeCloseTo for numbers).
- Race conditions: fast successive updates (rapid increments/decrements) — ensure state updates deterministically or tests use appropriate waits.
- Large carts: test behavior and performance with a high number of items to ensure provider updates don't cause excessive re-renders; consider snapshotting serialized state.

How to run

From the project root (or `frontend` folder):

```powershell
npm test -- frontend/__tests__/contexts/CartContext.text.tsx
```

Maintenance notes

- Prefer asserting on behavior (calls to persistence API, derived totals, and calls to update callbacks) rather than internal implementation details.
- If the persistence strategy changes (e.g., switching from localStorage to IndexedDB), update mocks accordingly and add migration tests if necessary.
- Keep helper render wrappers (`renderWithCartProvider`) in a shared test-utils file so tests remain concise and consistent.
