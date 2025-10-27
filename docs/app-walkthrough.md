# Flow Testing PeerCafe
---

## 1. Landing Page 

### Possible Actions:
1. Get Started (Make Account)
2. Sign In

### Expected Results:
- Go to corresponding pages

### Actual Results:
- Goes to correct pages respective to the buttons pressed

-----------------------------------------------------------------------------

## 2. Register Page

### Possible Actions:
1. Enter name (required)
2. Enter email address (required + specific rules for correct entry)
3. Enter password (required)
4. Sign up (must have 3 prior fields correctly entered)
5. Sign in button if account already made.

### Expected Results
1. Enter values correctly into 3 fields and make account
2. Enter a value incorrectly and have to change values to be appropriate
3. Direct to sign-in page

### Actual Results:
1. Entering correct values gives erorr -> connect ECONNREFUSED ::1:8000 @ app\(authentication)\register\actions.ts 56
2. Entering incorrect info -> registration failed. GOOD
3. Correctly goes to sign-in page. GOOD

-----------------------------------------------------------------------------

## 3. Log-In Page

### Possible Actions:
1. Enter email address (required + specific rules for correct entry)
2. Enter password (required)
3. Sign in (must have 2 prior fields correctly entered)
4. Sign up button if account not already made.
5. Forgot password button

### Expected Results
1. Enter values correctly into 3 fields and sign-in to account
2. Enter a value incorrectly and have to change values to be appropriate to account
3. Direct to sign-up page
4. Click forgot password button and go to page

### Actual Results:
1. Entering correct values gives -> presses button and nothing happens
2. Entering incorrect info  -> presses button and nothing happens
3. Correctly goes to sign-up page. GOOD
4. Pressing forgot password button -> 404 error.

-----------------------------------------------------------------------------

## 4. Forgot Password Page

-Needs to be added