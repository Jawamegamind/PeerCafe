
##PeerCafe System Tests 7/7 Passing

1. Normal Authentication \- passing  
- Preconditions  
  - User has an account  
- Postconditions  
  - When entering correct conditions, enter the appropriate dashboard (user or admin)  
  - When entering wrong, should be kept in sign-in page with sign-in failed message  
- Alternate Flows  
  - If a field is left empty, the user cannot try to sign-in  
2. Privilege Jumping \- passing  
- Preconditions  
  - User is logged in  
  - User does not have admin privileges  
- Postconditions  
  - A non-admin user is rejected from jumping and a specific error message is shown  
3. Adding food from different restaurants, getting  \- passing  
- Preconditions  
  - User signed in at the non-admin level  
  - Already have item(s) from one restaurant in the cart  
- Postconditions  
  - A message is shown saying that food from different restaurants cannot be added.  
4. User picking up order and getting to delivery location \- passing  
- Preconditions  
  - A non-admin user has made an order and it has been verified by an admin  
  - The order has been marked as ready  
- Postconditions  
  - The deliverer can mark as delivered and gets a prompt to enter delivery code  
5. Adding a restaurant, adding items, deleting the restaurant \- passing  
- Preconditions  
  - User is logged in as an admin  
  - On the Restaurant Management page  
- Postconditions  
  - Restaurant is now in the restaurants table, but marked as inactive  
6. Admin approving order \- passing  
- Preconditions  
  - A non-admin user has populated a cart and ordered the items  
  - An admin user is logged in and on the Order Management page  
- Postconditions  
  - The order can now be seen by users wanting to deliver food  
7. User making handoff with code to deliveree user \- passing  
- Preconditions  
  - A non-admin user has populated a cart with food items and ordered the food  
  - An admin has approved the order  
  - A non-admin user has marked the food as ready, marked it as picked up, and has followed delivery instructions to the orderer’s house  
- Postconditions  
  - When code is accurately entered, the order is marked as complete.  
  - Order is gone from deliverer’s view