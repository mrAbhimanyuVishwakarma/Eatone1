# Verification

Run `npm test` from the project directory. The suite starts the actual HTTP server on a temporary local port using an isolated temporary SQLite database.

The automated integration suite verifies:

1. Anonymous users cannot read admin APIs.
2. Fresh store is empty and checkout is paused.
3. Admin login succeeds and wrong passwords fail.
4. Customer registration cannot assign an admin role; customer admin reads/writes fail.
5. Admin mutations reject invalid CSRF tokens and foreign origins.
6. Valid product creation works; negative stock fails.
7. Paused checkout cannot reserve stock.
8. Admin can configure delivery and enable ordering.
9. Order prices are calculated server-side, and retries do not duplicate the order.
10. Concurrent purchases cannot oversell the final unit.
11. Order reads require the customer session or correct private tracking code.
12. Stale stock edits fail instead of overwriting order changes.
13. Illegal status transitions fail and repeated cancellation restocks only once.
14. Hiding/editing products preserves historical order line data.
15. Non-admin and executable-file uploads fail.
16. Valid PNG uploads are served with the correct image content type.
17. Audit records are created and logout invalidates the session.

## Manual acceptance checks

- Open the customer shop on desktop and a narrow phone viewport; verify navigation and readable layout.
- Sign in at `/admin`; add a product with photo, description, price, pack size and stock.
- Confirm the product appears in the shop, filter/search it, and open its details.
- Edit the product and verify changes after refreshing the shop.
- Set stock to zero and confirm Sold out appears; hide it and confirm it disappears.
- Configure shipping and enable orders.
- Place a COD order as a guest, save the private access code, and track it.
- Create a customer account, place an order, and confirm it appears under My orders.
- Process the order through the admin status controls; verify customer status updates after reopening/refreshing.
- Cancel an unshipped order and verify inventory is restored.
- Sign in as a customer and visit `/admin`; confirm access is denied.
- Restart the server and verify catalogue, orders, stock and photos persist.

Online payments, shipping API actions, email/SMS sending and production infrastructure are outside this version and are not claimed as tested.

## Delivery verification record

- Automated backend integration tests: 17 passed on Node 24.22.1.
- Browser: visually inspected the desktop storefront and protected admin sign-in screen.
- The authenticated admin UI workflow and narrow mobile viewport were not exercised in the browser during delivery. Their acceptance checks remain listed above for the owner to run. Backend admin operations were exercised by the HTTP integration tests.
- Docker/public hosting were not executed in this environment.
