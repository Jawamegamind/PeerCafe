# Helpers Tests

Location

- `frontend/__tests__/utils/helpers.test.ts`

Overview

- Unit tests for small helper functions used across the frontend (formatters, calculators, sanitizers). These tests aim to keep pure utility logic fully tested so UI tests can remain focused on rendering and interactions.

Contract (what to expect)

- Inputs: primitive data values passed to helper functions (numbers, strings, objects) and configuration flags.
- Outputs: deterministic return values (formatted strings, calculated totals, sanitized objects) or thrown errors for invalid inputs.

Representative test cases

- Currency formatting: given numeric inputs, helpers return correctly formatted currency strings for locale and cents rounding.
- Total calculation: helpers compute subtotal, tax, and total correctly for a set of line items.
- Sanitization: user-provided strings are sanitized (trimmed, escaped) and invalid inputs are handled gracefully.
- Edge inputs: large numbers, negative values, null/undefined inputs should be handled explicitly (either by returning defaults or throwing clear errors).

Mocks & setup

- These are pure unit tests: no network or router mocks are needed. Use typical jest assertions and `toBeCloseTo` for numeric comparisons involving floating point math.

Edge cases & robustness

- Floating point precision: use `toBeCloseTo` when asserting computed numeric values.
- Locale differences: if formatting depends on locale, add tests for representative locales or mock Intl where necessary.

How to run

```powershell
npm test -- frontend/__tests__/utils/helpers.test.ts
```

Maintenance notes

- Keep helper tests independent and fast — avoid adding DOM rendering here. If a helper becomes complex with side-effects, consider moving logic into an isolated module and adding focused unit tests.
