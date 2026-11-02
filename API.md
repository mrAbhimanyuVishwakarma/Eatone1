# API reference

All APIs use JSON. Monetary amounts are **integer paise**, not rupees. The browser converts UI rupee inputs to paise. Authentication is an HTTP-only cookie; session metadata and a CSRF token are available through `GET /api/session`.

Authenticated mutations require `X-CSRF-Token`. All write requests require `Content-Type: application/json`. Requests carrying a browser Origin must match `APP_ORIGIN`. Admin APIs enforce the role on the server.

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | /api/session | Public | Current account and CSRF token |
| POST | /api/register | Public | Create customer account only |
| POST | /api/login | Public | Sign in customer/admin |
| POST | /api/logout | Signed in + CSRF | Revoke current session |
| GET | /api/settings | Public | Delivery, announcement, checkout availability |
| GET | /api/products | Public | Visible catalogue |
| POST | /api/orders | Guest or account | Place COD order |
| GET | /api/orders | Signed in | Own recent orders |
| POST | /api/track | Private access code | Retrieve one order |
| GET/POST | /api/admin/products | Admin | List/create products |
| PUT | /api/admin/products/:id | Admin | Edit product using current version |
| POST | /api/admin/upload | Admin | Upload base64 JPG/PNG/WebP |
| GET | /api/admin/orders | Admin | Latest 1,000 orders |
| PATCH | /api/admin/orders/:id | Admin | Transition status, update courier and COD collection |
| PUT | /api/admin/settings | Admin | Update store settings |
| GET | /api/admin/audit | Admin | Latest 100 change events |

## Product body

```json
{
  "name": "Your product",
  "description": "Accurate description",
  "category": "Ladoos",
  "pack": "250 g",
  "price": 35000,
  "stock": 20,
  "image": "",
  "active": true,
  "ingredients": "Verified ingredients",
  "allergens": "Verified allergens",
  "shelf_life": "Verified storage guidance"
}
```

An edit must also include the current integer `version`. Photo upload returns a path such as `/uploads/<random-id>.png`; use that as `image`. Arbitrary external image URLs are not accepted. `price` above is an illustrative API example, not catalogue data.

## Checkout body

```json
{
  "name": "Customer name",
  "phone": "9876543210",
  "email": "customer@example.com",
  "address": "Full address, city, state",
  "pincode": "560001",
  "items": [{"id": 1, "quantity": 2}],
  "requestKey": "a-unique-random-uuid-per-checkout",
  "trackingToken": "64-lowercase-hex-characters-from-32-cryptographic-random-bytes"
}
```

The frontend generates the key/token. Retry the same request with the same key and identical content if the response is lost. Reusing the key with different details returns 409. The server looks up current prices and inventory and updates stock inside a transaction. Client-supplied totals are ignored. The private token is hashed in storage and is not returned by order reads.

## Order transition body

```json
{"status":"SHIPPED","payment_status":"UNPAID","tracking":"Courier name / reference"}
```

Allowed transitions: `PLACED → CONFIRMED → PACKED → SHIPPED → DELIVERED`. `PLACED`, `CONFIRMED`, and `PACKED` may also transition to `CANCELLED`. Cancellation restores stock once. `PAID` is accepted only for delivered COD orders. Repeating the same status is allowed so courier references can be corrected.

## Errors

Errors have shape `{"error":"Human-readable message"}`. Common status codes: 400 invalid input, 401 sign-in required, 403 forbidden/CSRF/origin failure, 404 missing resource, 409 stock/version/state conflict, 413 oversized body, 415 wrong content type, 429 rate limit. Unexpected server errors do not expose database internals to the client.
