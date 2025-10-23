# Flow
This document serves as a high level view of the flow for the PeerCafe project. This should be a reference doc that doesn't change a lot. If there are any errors, ping the discord before making any changes!

1. User logs in.
2. User selects restaurant -> item and adds it to cart.
3. User selects checkout. This updates the orders table with the contents of the cart and sets status to pending_accept.
4. Admin logs in.
5. Admin sees all orders tagged with the restaurant name as a label that are ordered by pending_accept > accepted > ready > picked_up > delivered
6. Admin marks order as accepted.
7. Admin marks order as ready.
8. New Delivery Available notification goes to all users.
9. User switches to delivery tab and accepts the delivery order.
10. Delivery User reaches restaurant.
11. Delivery User marks order as picked_up.
12. Delivery Code generated and sent to User.
13. Delivery Update workflow starts.
14. Delivery User reaches Delivery location.
15. Code Exchange.
16. Once code is verified, system marks order as delivered.

Note that the navigation workflow is parallel to this. Mulya can make additions to this as his implementation is solidified.