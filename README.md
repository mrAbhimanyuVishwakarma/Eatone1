# EatOne — storefront + private admin dashboard

A complete, runnable cash-on-delivery store for EatOne, with a mobile-friendly customer interface and a server-protected admin interface.

**Product details are managed in the admin UI.** Admins log in at `/admin`, then add photos, descriptions, prices, pack sizes, stock, and availability. No code editing is needed for daily store operations.

## Start here — Windows, macOS, or Linux

1. Install Node.js **24 or later** from https://nodejs.org/ if it is not already installed.
2. Extract this ZIP. Open a terminal in the `eatone` folder (the folder containing `package.json`).
3. Run `node --version` to confirm the version starts with `v24` or newer.
4. Create the first admin:

   ```sh
   npm run admin
   ```

   Enter the owner's email, name, and a unique password of at least 12 characters. Password entry is visible in this local setup terminal; use a private terminal. There is no preset admin password. The password is stored as a salted scrypt hash, never as plaintext.

5. Start the app:

   ```sh
   npm start
   ```

6. Open **http://localhost:3000** for the customer shop.
7. Open **http://localhost:3000/admin** and log in with your admin credentials.
8. Select **Add product**. Enter its details, upload a photo, and save.
9. Open **Store settings**. Set your actual delivery charge, delivery estimate/service area, announcement, and optional WhatsApp number. Enable customer orders, then save.
10. Place a test order from the customer shop and manage it from **Orders** in the admin panel.

There are **no npm dependencies to install**, no separate database server, and no frontend compilation step. `npm start` creates the local SQLite database automatically.

Keep the terminal running while using the website locally. This is a server application: double-clicking `index.html` is not sufficient. A phone can use the deployed website in its browser; running this project locally normally requires a computer or a hosting server.

## What is included

### Customer UI

- Responsive shop, category filters, product search, product details, photos, pack sizes, ingredients, allergens and storage information.
- Visible in-stock/sold-out states. Hidden products are excluded from the public API.
- Shopping bag with quantity changes and removal; bag contents persist in that browser.
- Guest checkout or optional email/password customer account.
- India-format mobile number and pincode validation; name, email and complete address collection.
- Cash-on-delivery purchase with server-calculated prices and delivery fee.
- Order confirmation and private order access code. Signed-in customers can view their own order history.
- Guest order tracking using order ID + private access code.
- Shipment reference and order status display.

### Logged-in admin UI

- Admin-only dashboard with active product count, open orders, low-stock count and collected COD total.
- Add/edit product names, categories, pack sizes, prices and descriptions.
- Upload JPG, PNG or WebP images up to 2 MB; remove or replace product photos.
- Set stock quantities, hide/unhide products, and mark products sold out by setting stock to zero.
- Review customer orders and delivery/contact information.
- Move orders through **Placed → Confirmed → Packed → Shipped → Delivered**.
- Cancel before shipment; cancellation restores inventory exactly once.
- Record courier/tracking references and mark COD paid after delivery.
- Edit delivery fee, delivery estimate, announcement, WhatsApp contact and order availability.
- Recent audit log of product, order and settings changes.

### Backend

- HTTP-only, SameSite session cookies. Secure cookies in production. Eight-hour sessions.
- Server-side role checks on **every admin API**, independent of what the UI displays.
- Customer registration always assigns the customer role, regardless of supplied request fields.
- CSRF tokens for authenticated writes, origin checks, CSP and basic authentication/order rate limits.
- Salted scrypt password hashes; random session tokens are hashed before storage.
- Parameterised SQL, input validation and bounded uploads/requests.
- SQLite transactions protect stock updates and prevent overselling.
- Idempotency keys prevent duplicate orders during checkout retries.
- Version checks reject stale admin stock edits instead of overwriting stock decrements.
- Orders retain historical product names, pack sizes and prices after product edits.

## Everyday admin workflow

### Add a product

1. Sign in at `/admin`.
2. Choose **Products & stock → Add product**.
3. Enter name, category, pack size, rupee price and number of available packs.
4. Add description, accurate ingredients, allergens, shelf life/storage and a clear product photo.
5. Leave **Visible in customer shop** checked and select **Save product**.

For multiple pack sizes, create one product per pack size (for example, Seeds Ladoo — 250 g and Seeds Ladoo — 500 g). Each has its own price and stock.

### Change stock or remove a listing

Select **Edit product**. Stock is the total remaining number of packs, not an amount to add. Set `0` for sold out. Uncheck visibility to remove the listing from the shop while retaining order history. Product deletion is intentionally implemented as hiding, so past orders remain intact.

If another order changes stock while a form is open, saving fails with a conflict message. Close and reopen the product to load the current quantity, then retry.

### Fulfil an order

Use **Orders → Manage order**. Move through the available statuses. Add courier name and tracking reference when shipped. After delivery, select `DELIVERED` and `PAID` when the COD amount has actually been collected. These controls record your actions; they do not book a courier or collect a payment automatically.

Cancelling a placed, confirmed, or packed order returns its quantities to stock. Shipped orders cannot be cancelled here. Returns/refunds after delivery need a separate operational process.

### Manage admins

The initial admin must be created by the owner at the server terminal with `npm run admin`. Run that command again to create another admin or reset an admin password. Supplying an existing email explicitly promotes that account to admin and replaces its password; its old sessions are revoked. Do not run the command for a customer who should not have admin access.

There is no public admin registration and no hard-coded admin credential. Customers cannot promote themselves. Multi-admin user management is not exposed to the web UI.

## Defaults and business details

The project starts with **no sample products, no invented prices, and checkout disabled**. Admins own all catalogue and stock data. The brand name and Instagram link come from the supplied reference. The hero jar is a labelled CSS packaging illustration, not a real product photo.

No FSSAI certification number, nutritional promise, medicinal effect, sugar claim, delivery promise, contact number or policy has been invented. Add verified business information before launch. The WhatsApp contact starts blank and is optional.

Checkout currently supports India-format addresses with a single flat delivery charge. It does not check courier serviceability. Enter the actual service area in delivery settings and verify orders operationally. Orders outside the intended area should be resolved before dispatch.

## Stack and files

This downloadable version uses **plain HTML/CSS/JavaScript + Node.js 24 + SQLite**, chosen to make local installation simple and avoid a separate database setup. It is not the previously suggested React/Spring Boot/PostgreSQL stack.

```text
eatone/
  public/
    index.html       # shared customer/admin page shell
    style.css        # responsive visual design
    app.js           # customer UI, forms, admin dashboard
    favicon.svg
  server.mjs         # HTTP server, API, auth, orders, stock, images
  db.mjs             # database schema, password helpers, audit
  admin.mjs          # owner-run admin creation/password reset
  test/store.test.mjs
  package.json
  .env.example
  Dockerfile
  compose.yaml
  README.md
  API.md
  TESTING.md
```

On first run, `data/eatone.sqlite` and `data/uploads/` are created. They contain your actual store data and photos. They are excluded from the ZIP, source control and Docker build context.

## Configuration

Copy `.env.example` to `.env` if custom settings are needed. On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```sh
cp .env.example .env
```

| Variable | Local default | Purpose |
|---|---|---|
| PORT | 3000 | HTTP port |
| HOST | 0.0.0.0 | Listen address |
| APP_ORIGIN | http://localhost:3000 | Exact browser origin allowed for writes |
| DATA_DIR | ./data | Database and photo directory |
| NODE_ENV | development | Set production for secure cookies |

Use the exact configured origin in the browser. For example, `http://127.0.0.1:3000` and `http://localhost:3000` are different origins. If testing from another device, set `APP_ORIGIN` to the address that device uses and restart.

## Hosting with Docker

For local Docker use:

```sh
docker compose up -d --build
docker compose exec eatone npm run admin
```

Open http://localhost:3000. The Docker volume persists the database and photos across container restarts.

For a public launch:

1. Use a host with **persistent disk** and Node 24 or Docker. Ephemeral/serverless filesystems are unsuitable for this SQLite setup.
2. Point a domain to the host and terminate HTTPS through a reverse proxy such as Caddy/Nginx or the hosting provider's HTTPS service.
3. Set `NODE_ENV=production` and `APP_ORIGIN=https://your-actual-domain` in `.env`. The origin must be exact, with no trailing slash.
4. Keep the app port private behind that proxy. The supplied Compose port binds to localhost only.
5. Recreate the container after environment changes: `docker compose up -d --force-recreate`.
6. Create the admin using the owner terminal, configure products/settings in the UI, and test ordering end to end.
7. Back up the persistent database and image directory regularly and verify restoration.

Run a single app instance against this SQLite data directory. Multiple replicas require a different shared database design. Rate limits are in-memory, per process; behind a proxy, requests may share an IP bucket. At higher volume, use a dedicated rate-limit layer configured at the proxy.

The project is **not deployed** by this ZIP. Domain, server hosting and HTTPS setup are separate.

## Backup and restore

The simplest consistent backup is taken while the app is stopped:

1. Stop the running Node process or Docker container.
2. Copy the entire `data/` directory (or the complete Docker volume), including SQLite sidecar files if present, and `uploads/` to a secure backup.
3. Restart the app.

To restore, stop the app, replace the full data directory/volume with the backup, and restart with the same configuration. Do not copy only the main SQLite file while writes are in progress. Protect backups because they contain customer delivery details and password hashes.

## Testing

```sh
npm test
```

Tests use a separate temporary database and do not modify your store. See `TESTING.md` for verified cases and UI checks.

## Current boundaries

- **Cash on delivery only.** No live online payment provider, Razorpay integration, refunds, courier API, SMS, email notifications or email verification is included.
- No self-service password reset; admin passwords can be reset through the setup command. Customer password recovery requires a future verified email workflow.
- Guest users must save their private access code; it is intentionally not recoverable from the public website.
- User data is stored in the local database; this is real backend persistence, not a browser-only mockup.
- Product photos use file signature/type checks, upload size limits, random names and static serving. Add malware scanning/image re-encoding for a larger untrusted uploader environment.
- No tax calculation/GST invoicing, discount codes, multi-warehouse stock, returns workflow, subscriptions or per-pincode shipping rates.
- Dashboard totals cover the latest 1,000 orders; customer history shows the latest 200. It is not a full accounting report.
- Add the merchant's verified legal name, contact/address, food licence information where applicable, privacy notice and shipping/cancellation/refund terms before accepting public orders.
- This is a tested starting application, not an independent security certification. Run your own deployment checks before serving customers.

## Troubleshooting

- `node:sqlite` is unavailable: update Node to version 24 or later.
- “Admin access required”: sign out of the customer account and sign in with the owner-created admin account.
- “Origin not allowed”: make `APP_ORIGIN` match the browser address and restart.
- “Session expired”: refresh, sign in again, and retry.
- “Product changed”: reopen its edit form so it uses the current stock version.
- Checkout paused: enable orders under admin Store settings after setting delivery details.
- Photos or orders disappear after redeploy: ensure `DATA_DIR` is on persistent storage and restore the backup if needed.
- SQLite experimental warning on some Node releases: the application uses the bundled Node SQLite API; confirm all tests pass on your chosen supported runtime.
