# Admin Add Restaurant Page Tests Documentation

## Overview
This document details the test cases for the Admin Add Restaurant page component located at `app/(main)/admin/restaurants/add/page.tsx`. The tests verify the functionality of adding new restaurants through the admin interface.

## Test Categories

### Page Rendering Tests
| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| Basic Elements | Checks core page components | Navbar, title, form inputs and submit button present |
| Form Fields | Validates all form input fields | All required fields rendered (5 text inputs, 1 number input) |
| Breadcrumbs | Tests navigation breadcrumbs | Shows correct hierarchy: Admin Dashboard > Restaurants > Add |
| Form Buttons | Verifies button presence | Back, Cancel and Add Restaurant buttons visible |

### Form Validation Tests 
| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| Empty Required Fields | Attempts submission with empty fields | Submission prevented, fetch not called |
| Email Input | Tests email field functionality | Accepts and displays valid email input |

### Form Input Tests
| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| Text Input | Tests text field functionality | Accepts and displays text input correctly |
| Cuisine Selection | Tests dropdown functionality | Displays cuisine options (Italian, Chinese, Mexican) |

### Navigation Tests
| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| Back Button | Tests back navigation | Router.back() called on click |
| Cancel Button | Tests cancel action | Router.back() called on click |

### Form Submission Tests
| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| Valid Data Submission | Tests successful form submission | API call made, success message shown |
| Network Error | Tests failed submission handling | Error message displayed on network failure |

## Test Setup
- Uses React Testing Library and user-event for interactions
- Mocks Next.js router functionality
- Mocks Navbar component
- Mocks fetch API

## Running the Tests
```bash
cd frontend
npm test [admin-add-restaurant.test.tsx](http://_vscodecontentref_/0)