# Register Page Tests

Location:

- `frontend/__tests__/pages/register.test.tsx`

Purpose:

- Tests the user registration page and flows: form rendering, input validation, submission, and handling server-side errors.

Test setup & mocks:

- Mocks authentication/signup API (Supabase or backend), router navigation, and any client-side validation utilities.
- Uses `@testing-library/react` and `user-event`.

Key test areas:

- Input validation (email format, password rules, matching passwords)
- Successful registration flow and post-register navigation (router.push)
- Server-side errors (email taken, validation errors) and network error states
- Accessibility checks for form labels and error references

Run:

```powershell
npm test -- frontend/__tests__/pages/register.test.tsx
```
