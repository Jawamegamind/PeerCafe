# PeerCafe Testing Overview

**Generated:** November 3, 2025

This document provides a comprehensive overview of all test cases in the PeerCafe project, organized by domain and marked with importance flags.

---

## Table of Contents

1. [Backend Tests](#backend-tests)
   - [Authentication Routes](#authentication-routes)
   - [Restaurant Routes](#restaurant-routes)
   - [Menu Routes](#menu-routes)
   - [Order Routes](#order-routes)
   - [Database](#database)
   - [Models](#models)
   - [Main Application](#main-application)
2. [Frontend Tests](#frontend-tests)
   - [Pages](#pages)
   - [Components](#components)
   - [Actions](#actions)
3. [Test Execution Summary](#test-execution-summary)
4. [Critical Test Cases](#critical-test-cases-flag)

---

## Backend Tests

### Authentication Routes
**File:** `backend/tests/test_auth_routes.py`

#### ⭐ CRITICAL Tests

| Test Name | Purpose | Importance |
|-----------|---------|-----------|
| `test_register_new_user_success` | Verifies successful user registration with valid data | **CRITICAL** |
| `test_login_success` | Validates user login functionality with correct credentials | **CRITICAL** |
| `test_register_existing_user` | Ensures duplicate email registration is properly handled | **HIGH** |
| `test_login_invalid_password` | Validates rejection of incorrect password during login | **HIGH** |

#### Description

**Registration Tests:**
- **`test_register_new_user_success`** ⭐ CRITICAL
  - Confirms a new user can register successfully with complete valid data
  - Mocks Supabase to verify user doesn't already exist, then confirms insertion
  - Expected: HTTP 200 with success message "User created successfully"

- **`test_register_existing_user`** ⭐ HIGH
  - Tests behavior when attempting to register with an email that already exists
  - Prevents duplicate account creation
  - Expected: HTTP 200 with message "User already exists"

- **`test_register_invalid_data`**
  - Validates input validation by submitting incomplete form data
  - Expected: HTTP 422 (Unprocessable Entity) due to missing required fields

- **`test_register_database_error`** ⭐ HIGH
  - Simulates database failure during user insertion
  - Ensures graceful error handling rather than crashes
  - Expected: HTTP 200 with error message "User creation failed"

**Login Tests:**
- **`test_login_success`** ⭐ CRITICAL
  - Validates complete login flow with correct email and password
  - Mocks bcrypt password verification to return true
  - Expected: HTTP 200 with success message and user data in response

- **`test_login_user_not_found`** ⭐ HIGH
  - Tests login attempt with non-existent user email
  - Expected: HTTP 200 with message "User not found"

- **`test_login_invalid_password`** ⭐ HIGH
  - Tests login attempt with correct email but wrong password
  - Mocks bcrypt to return false for password check
  - Expected: HTTP 200 with message "Invalid password"

---

### Restaurant Routes
**File:** `backend/tests/test_restaurant_routes.py`

#### ⭐ CRITICAL Tests

| Test Name | Purpose | Importance |
|-----------|---------|-----------|
| `test_create_restaurant_success` | Validates restaurant creation functionality | **CRITICAL** |
| `test_get_all_restaurants_success` | Verifies retrieval of all restaurants | **CRITICAL** |
| `test_get_restaurant_by_id_success` | Tests individual restaurant lookup | **HIGH** |

#### Description

**Create Restaurant:**
- **`test_create_restaurant_success`** ⭐ CRITICAL
  - Creates new restaurant with valid data (name, address, phone, email, cuisine type)
  - Verifies restaurant_id is auto-generated with default is_active=True and rating=0.0
  - Expected: HTTP 200 with success message and restaurant data

- **`test_create_restaurant_invalid_data`**
  - Validates input validation with empty or missing required fields
  - Expected: HTTP 422 (Unprocessable Entity)

- **`test_create_restaurant_database_error`** ⭐ HIGH
  - Simulates database failure during insert operation
  - Expected: HTTP 500 (Internal Server Error)

- **`test_create_restaurant_failed_insert`** ⭐ HIGH
  - Tests handling when database insert returns null data
  - Expected: HTTP 400 (Bad Request)

**Retrieve Restaurants:**
- **`test_get_all_restaurants_success`** ⭐ CRITICAL
  - Retrieves complete list of all restaurants
  - Expected: HTTP 200 with list of restaurant objects (including IDs, names, ratings, active status)

- **`test_get_all_restaurants_empty`**
  - Handles case when no restaurants exist in database
  - Expected: HTTP 200 with empty list

- **`test_get_all_restaurants_database_error`** ⭐ HIGH
  - Simulates database connection failure during retrieval
  - Expected: HTTP 500 (Internal Server Error)

**Get Single Restaurant:**
- **`test_get_restaurant_by_id_success`** ⭐ HIGH
  - Retrieves specific restaurant by ID with complete details
  - Expected: HTTP 200 with restaurant data including ID, name, address, phone, rating

---

### Menu Routes
**File:** `backend/tests/test_menu_routes.py`

#### ⭐ CRITICAL Tests

| Test Name | Purpose | Importance |
|-----------|---------|-----------|
| `test_get_menu_items_success` | Retrieves menu items for a restaurant | **CRITICAL** |
| `test_create_menu_item_success` | Creates new menu item for restaurant | **HIGH** |

#### Description

**Get Menu Items:**
- **`test_get_menu_items_success`** ⭐ CRITICAL
  - Retrieves all menu items for a specific restaurant ID
  - Verifies multiple items are returned with correct item_id and names
  - Expected: HTTP 200 with list of menu items containing item_id, item_name, price, description, availability

- **`test_get_menu_items_empty`**
  - Handles case when restaurant has no menu items
  - Expected: HTTP 200 with empty list

- **`test_get_menu_items_none_data`**
  - Tests null result handling from database
  - Expected: HTTP 200 with empty list (defensive programming)

- **`test_get_menu_items_database_error`** ⭐ HIGH
  - Simulates database error during menu retrieval
  - Expected: HTTP 500 (Internal Server Error)

**Create Menu Item:**
- **`test_create_menu_item_success`** ⭐ HIGH
  - Creates new menu item for existing restaurant
  - Validates restaurant exists before allowing item creation
  - Expected: HTTP 200 with success message and created menu_item object

- **`test_create_menu_item_restaurant_not_found`** ⭐ HIGH
  - Prevents menu item creation for non-existent restaurant
  - Expected: HTTP 404 (Not Found)

- **`test_create_menu_item_failed_insert`**
  - Handles failed database insert operation
  - Expected: HTTP 400 (Bad Request)

- **`test_create_menu_item_invalid_data`**
  - Validates required fields (empty item_name should fail)
  - Expected: HTTP 422 (Unprocessable Entity)

- **`test_create_menu_item_database_error`** ⭐ HIGH
  - Simulates database connection error during creation
  - Expected: HTTP 500 (Internal Server Error)

---

### Order Routes
**File:** `backend/tests/test_order_routes.py`, `test_order_routes_endpoints.py`, `test_order_routes_helpers.py`, `test_order_sanitization.py`

#### ⭐ CRITICAL Tests

| Test Name | Purpose | Importance |
|-----------|---------|-----------|
| `test_place_order_success` | Validates complete order placement | **CRITICAL** |
| `test_place_order_invalid_data` | Ensures order data validation | **CRITICAL** |

#### Description

**Order Placement:**
- **`test_place_order_success`** ⭐ CRITICAL
  - Places complete order with all required fields (user_id, restaurant_id, order_items, delivery_address, totals)
  - Validates order_items structure with item details (price, quantity, subtotal)
  - Expects proper calculation of total with tax, delivery fee, and tip
  - Expected: HTTP 201 (Created) with order_id, user_id, restaurant_id, status="pending"

- **`test_place_order_invalid_data`** ⭐ CRITICAL
  - Validates that empty order_items list is rejected
  - Missing required fields should fail validation
  - Expected: HTTP 422 (Unprocessable Entity)

**Order Retrieval:**
- **`test_get_user_orders`**
  - Retrieves all orders for a specific user
  - Expected: HTTP 200 with list of user's orders

- **`test_list_orders`**
  - Lists orders with pagination support (limit, offset parameters)
  - Expected: HTTP 200 with paginated order list

**Order Helpers and Sanitization:** ⭐ IMPORTANT
- **`test_compute_item_subtotal_with_subtotal_key`**
  - Validates calculation of individual item subtotal
  - Tests fallback to price × quantity when subtotal not available

- **`test_compute_subtotal_sums_items`**
  - Ensures all order items are summed correctly
  - Handles malformed items gracefully (returns 0.0 instead of crashing)
  - Expected: Sum of all valid item subtotals

- **`test_recompute_total_detects_change_and_computes_correctly`** ⭐ HIGH
  - Detects when stored total doesn't match component calculation (subtotal + tax + delivery - discount)
  - Recalculates correct total from components
  - Expected: detected change=true, new total calculated correctly

- **`test_subtotal_and_total_correction`** ⭐ CRITICAL
  - Core sanitization test: corrects miscalculated subtotals and totals
  - Tracks sanitization metrics (records_sanitized counter)
  - Expected: Corrected subtotal from items, corrected total from components

- **`test_malformed_items_do_not_raise`** ⭐ CRITICAL
  - Tests robustness: order with null items, empty items, or bad data values should not crash
  - Expected: Returns sanitized dict, subtotal becomes numeric (0.0 or preserved)

---

### Database
**File:** `backend/tests/test_database.py`

#### Description

**Supabase Client Connection:**
- **`test_create_supabase_client_success`**
  - Validates successful Supabase client initialization with valid PROJECT_URL and API_KEY
  - Mocks create_client function to verify proper parameters passed
  - Expected: Returns initialized client object

- **`test_create_supabase_client_missing_env_vars`**
  - Tests handling when environment variables are not set
  - Should still call create_client but with None values
  - Expected: Client creation attempted with None parameters

- **`test_create_supabase_client_empty_env_vars`**
  - Tests handling when environment variables are empty strings
  - Expected: Client creation with empty string parameters

- **`test_dotenv_loading`** ⭐ HIGH
  - Validates that load_dotenv is called to load environment variables
  - Essential for configuration management

- **`test_client_creation_exception`**
  - Ensures exceptions during client creation are properly propagated
  - Expected: Raises exception with "Connection failed" message

- **`test_environment_variable_types`**
  - Validates that environment variables are treated as strings
  - Expected: Both PROJECT_URL and API_KEY are string type

- **`test_multiple_client_creation`**
  - Tests that multiple create_supabase_client calls create separate instances
  - Expected: create_client called twice for each invocation

- **`test_getenv_calls`** ⭐ HIGH
  - Ensures both PROJECT_URL and API_KEY environment variables are read
  - Expected: os.getenv called at least twice

---

### Models (Pydantic Validation)
**File:** `backend/tests/test_models.py`

#### ⭐ CRITICAL Tests

| Test Name | Purpose | Importance |
|-----------|---------|-----------|
| `test_valid_user_creation` | Validates User model with all required fields | **HIGH** |
| `test_valid_restaurant_creation` | Validates Restaurant model creation | **HIGH** |

#### Description

**User Model:**
- **`test_valid_user_creation`**
  - Creates User with all required fields: user_id, first_name, last_name, email, phone, password, is_admin, is_active
  - Expected: All fields properly assigned and validated

- **`test_user_missing_required_fields`**
  - Tests validation error when required fields are omitted
  - Expected: Raises ValidationError

- **`test_user_invalid_email_format`**
  - Tests email validation (note: current model doesn't enforce email format)
  - Shows model behavior with invalid email format

- **`test_user_empty_strings`**
  - Tests that empty strings are accepted (no min length validation currently)
  - Shows potential area for stricter validation

- **`test_user_boolean_fields`**
  - Validates is_admin and is_active boolean field handling
  - Expected: Boolean values correctly assigned

- **`test_user_model_dict_conversion`**
  - Tests model_dump() method for serialization
  - Expected: Returns dict with all fields properly converted

**Restaurant Model:**
- **`test_valid_restaurant_creation`**
  - Creates Restaurant with required fields: name, address, phone, email, cuisine_type
  - Verifies default values: is_active=True, rating=0.0
  - Expected: All fields properly assigned with defaults applied

- **`test_restaurant_with_optional_fields`**
  - Tests that optional fields (description) can be None
  - Expected: description=None when not provided

- **`test_restaurant_missing_required_fields`**
  - Tests validation error when required fields missing
  - Expected: Raises ValidationError

- **`test_restaurant_invalid_email`** ⭐ HIGH
  - Tests email format validation (model enforces email validation)
  - Expected: Raises ValidationError for invalid email format

- **`test_restaurant_negative_values`**
  - Tests that negative rating/delivery_fee are currently accepted
  - Highlights area where validation could be stricter
  - Expected: Negative values assigned without error

- **`test_restaurant_id_auto_generated`**
  - Tests that restaurant_id can be None (database auto-generates on insert)
  - Expected: restaurant_id=None when not provided, can be set explicitly if provided

---

### Main Application
**File:** `backend/tests/test_main.py`

#### Description

**Endpoints:**
- **`test_root_endpoint`** ⭐ CRITICAL
  - Validates GET / returns success message
  - Expected: HTTP 200 with message "PeerCafe Backend is running!"

- **`test_test_supabase_endpoint_success`**
  - Tests /test-supabase endpoint returns database data
  - Expected: HTTP 200 with data from database query

- **`test_test_supabase_endpoint_empty_data`**
  - Tests /test-supabase with no data in database
  - Expected: HTTP 200 with empty data array

- **`test_test_supabase_endpoint_error`** ⭐ HIGH
  - Tests /test-supabase when database connection fails
  - Expected: HTTP 500 (Internal Server Error)

**Configuration:**
- **`test_cors_configuration`**
  - Tests CORS middleware is properly configured
  - Makes OPTIONS (preflight) request to verify CORS headers
  - Expected: Not 405 (Method Not Allowed) if CORS enabled

- **`test_invalid_endpoint`**
  - Tests accessing non-existent endpoint
  - Expected: HTTP 404 (Not Found)

- **`test_api_prefix_routes_registered`** ⭐ CRITICAL
  - Validates that /api prefix routes are properly included
  - Tests both auth and restaurant route prefixes
  - Expected: Routes return validation errors (422), not 404

- **`test_content_type_handling`**
  - Tests invalid JSON handling with correct Content-Type header
  - Expected: HTTP 422 (Unprocessable Entity)

- **`test_method_not_allowed`**
  - Tests POST to GET-only endpoint
  - Expected: HTTP 405 (Method Not Allowed)

- **`test_application_startup`** ⭐ CRITICAL
  - Validates FastAPI app initializes correctly
  - Checks routes are registered
  - Expected: App is FastAPI instance with routes

- **`test_supabase_client_initialization`** ⭐ HIGH
  - Tests Supabase client is available on app startup
  - Expected: main.supabase attribute exists

---

## Frontend Tests

### Pages

#### Home Page (`__tests__/page.test.tsx`)

- **`renders without crashing`** ⭐ CRITICAL
  - Basic smoke test ensuring component renders
  - Expected: Document body is truthy

- **`should display the main heading and welcome content`**
  - Verifies main heading "Welcome to PeerCafe" appears
  - Checks for subtitle and description text
  - Expected: All welcome content visible

- **`should display all three feature cards`** ⭐ HIGH
  - Tests three feature cards: Discover Restaurants, User Dashboard, Admin Portal
  - Verifies card titles and descriptions
  - Expected: All three cards visible with correct text

- **`should have navigation buttons to register and login`** ⭐ HIGH
  - Verifies "Get Started" button links to /register
  - Verifies "Sign In" button links to /login
  - Expected: Both navigation buttons present with correct links

#### Admin Orders Page (`__tests__/admin-orders.test.tsx`)

- **`renders orders and restaurant names`**
  - Tests Order Management page loads
  - Verifies orders display with restaurant names
  - Expected: "Order Management" heading visible, restaurant names shown, order IDs visible

#### User Restaurants Page (`__tests__/pages/user-restaurants.test.tsx`)

**Rendering and Loading:**
- **`renders loading skeletons initially`**
  - Tests loading state before data loads
  - Expected: Skeleton loaders visible, navbar present

- **`renders restaurants after loading`**
  - Tests restaurants display after data loads
  - Expected: Restaurant names and details visible

- **`filters out inactive restaurants`** ⭐ HIGH
  - Validates inactive restaurants (is_active=false) are not displayed
  - Expected: Only active restaurants shown

**Search and Filtering:** ⭐ HIGH
- **`filters restaurants by search term`**
  - Tests search functionality filters by restaurant name
  - Expected: Only matching restaurants displayed

- **`filters restaurants by cuisine type`**
  - Tests cuisine type filter
  - Expected: Restaurants filtered to selected cuisine only

- **`shows clear filters button when filters are applied`**
  - Tests UI feedback when filters active
  - Expected: "Clear Filters" button appears

- **`clears filters when clear button is clicked`**
  - Tests filter reset functionality
  - Expected: All filters removed, full list shown

**Restaurant Cards:** ⭐ HIGH
- **`navigates to restaurant detail page when View Menu is clicked`**
  - Tests navigation to individual restaurant page
  - Expected: Router navigated to restaurant detail page

- **`displays restaurant information correctly`**
  - Verifies restaurant name, address, phone, rating display correctly
  - Expected: All restaurant info visible

- **`handles missing or null rating values`**
  - Tests rendering with null/undefined rating
  - Expected: No crash, graceful display

**Empty and Error States:** ⭐ HIGH
- **`shows empty state when no restaurants are available`**
  - Tests display when restaurant list is empty
  - Expected: Empty state message shown

- **`shows search empty state when no results match filters`**
  - Tests display when filters match no restaurants
  - Expected: "No restaurants match filters" message

- **`handles API errors gracefully`** ⭐ CRITICAL
  - Tests handling of failed API calls
  - Expected: Error message displayed without crashing

**Accessibility:** ⭐ HIGH
- **`has proper heading structure`**
  - Tests semantic HTML heading hierarchy
  - Expected: h1, h2 tags properly used

- **`has accessible form controls`**
  - Tests filter inputs are accessible
  - Expected: Inputs have proper labels

- **`has accessible buttons`**
  - Tests buttons are focusable and labeled
  - Expected: All buttons accessible to screen readers

#### User Dashboard Page (`__tests__/pages/user-dashboard.test.tsx`)

**Rendering:**
- **`renders the user dashboard with welcome message`**
  - Tests dashboard loads with welcome text
  - Expected: Navbar and welcome message visible

- **`displays the current route information`**
  - Verifies current page info shown
  - Expected: Route info displayed

- **`renders all quick action cards`** ⭐ HIGH
  - Tests all action cards: Browse Restaurants, View Orders, etc.
  - Expected: All cards visible with correct text

**Navigation:** ⭐ HIGH
- **`navigates to restaurants page when Browse Restaurants is clicked`**
  - Tests navigation functionality
  - Expected: Router navigates to /restaurants

**Access Control:** ⭐ HIGH
- **`does not show error message when no error parameter`**
  - Tests normal state without errors
  - Expected: No error message displayed

- **`shows access denied message when error parameter is insufficient_permissions`**
  - Tests permission error display
  - Expected: Access denied message shown

- **`does not show error message for other error types`**
  - Tests error handling for non-permission errors
  - Expected: No error message shown

**Accessibility and Responsive:**
- **`has proper heading structure`**
  - Tests heading hierarchy
  - Expected: Semantic heading tags

- **`has interactive elements that are clickable`**
  - Tests button/card clickability
  - Expected: Elements are interactive

- **`applies responsive grid layout`**
  - Tests responsive design
  - Expected: Grid layout adapts to screen size

#### Restaurant Detail Page (`__tests__/pages/restaurant-detail.test.tsx`)

**Rendering:**
- **`renders loading state initially`** ⭐ CRITICAL
  - Tests skeleton loading before data
  - Expected: Loading skeletons visible

- **`displays restaurant information and menu items after loading`** ⭐ CRITICAL
  - Tests restaurant name, address, and menu items display
  - Expected: Restaurant details and menu items visible

- **`displays empty state when no menu items are available`**
  - Tests handling of empty menu
  - Expected: Empty state message shown

- **`handles unavailable menu items correctly`**
  - Tests display of unavailable (is_available=false) items
  - Expected: Unavailable items shown with disabled state

**API and Error Handling:** ⭐ CRITICAL
- **`handles API error gracefully`** ⭐ CRITICAL
  - Tests failed restaurant API call
  - Expected: Error message displayed without crashing

- **`handles restaurant API failure gracefully`**
  - Tests failed restaurant details API
  - Expected: Menu items still display, error shown for restaurant

- **`makes correct API calls with restaurant ID`** ⭐ HIGH
  - Tests correct API endpoints called with restaurant ID
  - Expected: Both restaurant and menu APIs called with correct ID

**Interactions:**
- **`calls handleAddToCart when Add to Cart button is clicked`** ⭐ HIGH
  - Tests cart functionality
  - Expected: addToCart handler called with item details

- **`has proper hover effects on menu item cards`**
  - Tests visual feedback on hover
  - Expected: Hover styles applied

**Display Details:**
- **`displays restaurant header when restaurant data is loaded`**
  - Tests restaurant name, address display
  - Expected: Restaurant info visible in header

- **`displays menu count in the header`**
  - Tests menu item count displayed
  - Expected: Item count shown (e.g., "Items: 2")

#### Register Page (`__tests__/pages/register.test.tsx`)

**Form Display:**
- **`renders register form with all required elements`** ⭐ CRITICAL
  - Tests form renders with lock icon and all fields
  - Expected: Form elements visible

- **`displays all form fields with correct attributes`**
  - Verifies first name, last name, email, password fields present
  - Tests field types and placeholders
  - Expected: All fields with correct input types

**User Interaction:**
- **`allows users to input data in all fields`** ⭐ HIGH
  - Tests user can type in all form fields
  - Expected: Values entered in each field

**Validation:**
- **`shows error snackbar when required fields are empty`** ⭐ CRITICAL
  - Tests validation on submit with empty fields
  - Expected: Error message shown

- **`shows error snackbar when name is missing`** ⭐ HIGH
  - Tests validation when name fields empty
  - Expected: Error message displayed

- **`shows error snackbar when email is missing`** ⭐ HIGH
  - Tests validation when email empty
  - Expected: Error message displayed

### Components

Tests exist for:
- **CartDropdown** - Shopping cart dropdown display and functionality
- **Navbar** - Navigation bar rendering and links
- **CartContext** - Cart state context (noted as "CartContext.text.tsx" - likely typo in filename)

### Actions

Tests exist for:
- **Login Actions** - User login form submission and validation
- **Register Actions** - User registration form submission and validation  
- **Restaurants** - Restaurant data fetching and filtering actions

---

## Test Execution Summary

### Backend Test Files
- `test_auth_routes.py` - 7 test cases (authentication)
- `test_restaurant_routes.py` - 15+ test cases (CRUD operations)
- `test_menu_routes.py` - 12+ test cases (menu management)
- `test_order_routes.py` - 4+ test cases (order placement)
- `test_order_routes_endpoints.py` - 6+ test cases (endpoint integration)
- `test_order_routes_helpers.py` - 7+ test cases (helper functions)
- `test_order_sanitization.py` - 2 test cases (data sanitization)
- `test_database.py` - 9 test cases (database connection)
- `test_models.py` - 20+ test cases (data validation)
- `test_main.py` - 10+ test cases (application configuration)
- `test_basic.py` - 1 test case (root endpoint)

**Backend Total:** ~93+ test cases

### Frontend Test Files
- `page.test.tsx` - 4 test cases (home page)
- `admin-orders.test.tsx` - 1 test case (admin orders)
- `admin-orders.empty.test.tsx` - Empty orders page test
- `admin-orders.actions.test.tsx` - Order actions
- `pages/user-restaurants.test.tsx` - 18 test cases (restaurant listing)
- `pages/user-dashboard.test.tsx` - 12 test cases (user dashboard)
- `pages/restaurant-detail.test.tsx` - 14 test cases (restaurant details)
- `pages/register.test.tsx` - 6+ test cases (registration)
- `pages/login.test.tsx` - Login page tests
- Component tests (CartDropdown, Navbar, etc.)
- Action tests (login, register, restaurants)

**Frontend Total:** ~70+ test cases

**Overall Total:** ~163+ test cases

---

## Critical Test Cases 🚨

These tests are essential for the application's core functionality and should ALWAYS pass before deployment:

### Backend - CRITICAL (Must Pass)
1. **`test_register_new_user_success`** - User registration is core functionality
2. **`test_login_success`** - Login is core functionality
3. **`test_create_restaurant_success`** - Restaurant creation is core functionality
4. **`test_get_all_restaurants_success`** - Restaurant retrieval is core functionality
5. **`test_get_menu_items_success`** - Menu display is core functionality
6. **`test_place_order_success`** - Order placement is core functionality
7. **`test_place_order_invalid_data`** - Order validation is critical
8. **`test_subtotal_and_total_correction`** - Financial accuracy is critical
9. **`test_malformed_items_do_not_raise`** - Robustness against malformed data
10. **`test_root_endpoint`** - Application health check
11. **`test_api_prefix_routes_registered`** - Route configuration validation
12. **`test_application_startup`** - Application initialization

### Frontend - CRITICAL (Must Pass)
1. **`renders without crashing`** (home page) - Basic functionality
2. **`should display all three feature cards`** (home page) - UI completeness
3. **`should have navigation buttons to register and login`** (home page) - Navigation
4. **`handles API errors gracefully`** (restaurants page) - Error handling
5. **`renders loading state initially`** (restaurant detail) - UX feedback
6. **`displays restaurant information and menu items after loading`** (restaurant detail) - Core display
7. **`handles API error gracefully`** (restaurant detail) - Error handling
8. **`renders register form with all required elements`** (register page) - Registration UI
9. **`shows error snackbar when required fields are empty`** (register page) - Input validation

### High Priority Tests (Should Pass)
**Backend:**
- Login and registration with edge cases (existing user, invalid password, wrong email)
- Database error handling for all major operations
- Order sanitization and correction tests
- Environment variable loading and configuration

**Frontend:**
- Restaurant filtering and search functionality
- Restaurant card interactions and navigation
- Accessibility requirements
- Form validation and error display
- Empty states and loading states

---

## Notes

- **Mock vs Integration:** Most tests use mocking to avoid external dependencies (Supabase)
- **Test Framework:** Python backend uses pytest, Frontend uses Jest and React Testing Library
- **Code Coverage:** Ensure coverage for success paths, error paths, and edge cases
- **Data Validation:** Pydantic models validate data integrity on backend; React components handle frontend validation
- **Database:** All database tests mock the Supabase client to ensure tests run without external dependencies

---

**End of Testing Overview**
