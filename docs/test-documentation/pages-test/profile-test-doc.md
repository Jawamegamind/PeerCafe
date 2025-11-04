# Profile Page Tests

Location:

- `frontend/__tests__/pages/profile.test.tsx`

Purpose:

- Tests the user Profile page: rendering user information, editing profile fields, uploading avatars, and saving changes.

Test setup & mocks:

- Mocks authentication context (current user), API calls for fetching/updating profile data, and file upload endpoints.
- Uses `@testing-library/react` and `user-event` for form interactions.

Key test areas:

- Rendering of user details and default placeholders
- Editing and validation of profile fields (name, email, phone)
- Avatar upload flow and preview handling
- Save/Cancel behaviors and success/error notifications

Run:

```powershell
npm test -- frontend/__tests__/pages/profile.test.tsx
```
