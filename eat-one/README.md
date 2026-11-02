# eat.one1

A complete local snack storefront and admin application, with an intentionally empty product catalog. React + Vite, Express, SQLite for local use, and a PostgreSQL adapter for deployment.

Ownership and account migration instructions are documented in [docs/ACCOUNT_TRANSFER_GUIDE.md](docs/ACCOUNT_TRANSFER_GUIDE.md).

## Official contact details

- Brand: **eat.one1**
- Instagram: <https://www.instagram.com/eat.one1/>
- WhatsApp: [+91 861 840 1072](https://wa.me/918618401072)
- Email: [eatonebusiness@gmail.com](mailto:eatonebusiness@gmail.com)
- Temporary website: <https://eatone1.vercel.app/>

## Open the running app

- Store: http://localhost:3000
- Admin: http://localhost:3000/admin
- Local administrator email: `admin@eatone.local`
- The uniquely generated local password is `ADMIN_PASSWORD` in the ignored `.env` file. Do not share or commit that file.

The development server is bound to loopback. Local checkout is clearly labelled **test mode**: no funds move and no physical order should be dispatched. The catalog starts empty; the test suites use separate temporary databases.

## Start again

Requires Node 22.13+ with `node:sqlite` support (developed and tested on Node 26).

```powershell
cd D:\Projects\Eatone1\eat-one
npm ci
node server/local-setup.mjs
npm run admin
npm run dev
```

`local-setup.mjs` preserves any existing `.env`. To create or reset an administrator, set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of 12+ characters in `.env`, then run `npm run admin`. There is no public admin registration. Customer registration always assigns the customer role, regardless of submitted fields.

## Included

- Responsive homepage, category navigation, occasion/genre filters, search, sorting, journal, story, contact links, editable policies, newsletter opt-in storage.
- Empty and small-catalog layouts. No fake products, orders, reviews, certifications, or customer counts.
- Product details, photos, prices, MRP, pack size, ingredients, allergens, nutrition, product highlights, storage and shelf life.
- Customer registration/sign-in/sign-out, password changes, saved address, server-backed wishlist, persistent browser bag, checkout, account overview and order history.
- Protected admin dashboard; add/update/delete-or-archive products; image upload; inventory; order fulfilment states; tracking text; subscriber list; store settings.
- Product-view and paid-sales insights with 30-day trends, cautious price experiments, stock recommendations, and green/orange/red health cards for the API, Supabase, image storage, and Razorpay.
- Server-calculated prices/shipping, transactional inventory, immutable order item snapshots, checkout idempotency, payment HMAC verification, signed payment webhooks, customer order ownership checks.
- Password scrypt hashing; hashed, expiring session tokens in HttpOnly/SameSite cookies; role enforcement; request-origin checks; rate limits; image type checks; production security headers.

## Add your first snack

1. Sign in at `/admin`.
2. Choose **Add a product**. Complete the description, category, occasion, pack size, prices in rupees, stock, ingredients, allergens, shelf life and storage instructions.
3. Upload a JPG, PNG or WebP (up to 5 MB). Include verified nutrition values and units when available.
4. Select **Draft** to save privately, or **Live** to publish. Choose **Feature this snack** to show it on the homepage.
5. Products become available to other visitors immediately; reload an already-open browser tab to refresh its catalog.

Store settings control the announcement, shipping fee/free-shipping threshold, WhatsApp, support email, business address, FSSAI number, shipping/refund/privacy policies and terms. Review the initial policy copy before public launch: it is a starting point, not your final business policy.

## Payments

### Local tests

`PAYMENTS_MODE=test` is allowed only outside production. Test orders are marked `test_paid`, excluded from paid revenue, and prominently labelled. Test mode never calls a payment provider.

### Razorpay

Set these **on the server**:

```dotenv
PAYMENTS_MODE=razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_separate_webhook_secret
```

Enable automatic capture in your Razorpay account. Register the public HTTPS webhook `https://YOUR_DOMAIN/api/payments/webhook` for `payment.captured`, with the same webhook secret. Use Razorpay test credentials to validate the full provider flow before using live credentials. Customers can resume an interrupted payment from My orders, reusing the provider order and its original inventory reservation.

The server creates provider orders using its own prices and validates captured status, amount, currency, order association and signatures. The browser callback cannot mark an arbitrary order paid. Use **Check payment status** in order history if the browser was closed during payment. Signed webhooks can confirm payments independently of the browser.

Stock is reserved when checkout creates an order, preventing overselling. Pending provider orders conservatively retain their reservation; they are **not automatically cancelled or restocked** because an outstanding payment can still settle. Reconcile outstanding provider orders against the provider before operationally releasing stock. Automated expiration/cancellation, refunds, disputes and shipping-provider integration remain launch-stage operational work. The app does not offer automated refund processing.

No live Razorpay transaction has been executed here: merchant credentials and webhook hosting were not supplied. The tested local checkout uses test orders.

### YouPI-PG assessment

Reviewed https://github.com/youpi-pg/YouPI-PG at commit `405327c27d78ae9d0dccdb1e2d2426cefc359477` on 2 November 2026. Its README describes it as an experimental research project, explicitly not production-ready, and warns against high-volume/business-critical payments. It relies on bank SMS/Gmail observations, which the project says are not conclusive settlement evidence. It is **not integrated or enabled** in this storefront. It does not meet the stated requirement for thousands of simultaneous buyers. If evaluated separately, use isolated test data and independent bank reconciliation.

## Database & deployment

SQLite at `data/eat-one.sqlite` makes localhost easy to run. Production uses the eat.one1 Supabase PostgreSQL project in Mumbai (`qprmatfkdczqiziudfxp`). The schema is versioned under `supabase/migrations/`; apply future migrations with `npx supabase db push --remote`.

For this project, a managed PostgreSQL service such as Supabase is a practical starting point, with a pooled server connection, a small application connection pool, backups, and a region close to customers. As checked on 2 November 2026, [Supabase Pro](https://supabase.com/pricing) starts at USD 25/month; usage and compute upgrades cost extra. The free tier is useful for evaluation but may pause after inactivity. This is not a guarantee that the cheapest plan can handle thousands of simultaneous checkouts.

Production configuration:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
SITE_ORIGIN=https://YOUR_DOMAIN
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
DATABASE_POOL_MAX=1
PAYMENTS_MODE=razorpay
```

`DATABASE_SSL=true` keeps the database connection encrypted. Certificate-chain validation is enabled by default; the deployed Supabase pooler currently requires `DATABASE_SSL_REJECT_UNAUTHORIZED=false` while retaining TLS encryption. `DATABASE_POOL_MAX=1` prevents each serverless instance from opening an excessive number of connections. The app refuses production startup with SQLite, test payments, or a non-HTTPS site origin. Complete payment variables separately.

```sh
npm ci
npm run build
npm run admin
npm start
```

Deploy the Node service behind HTTPS with the correct `SITE_ORIGIN`. Set `TRUST_PROXY_HOPS=1` only when there is exactly one trusted reverse proxy. If your platform has a different topology, configure that value for its actual trusted proxy chain; never expose the origin server around that proxy. Secure cookies require HTTPS.

Vercel deployments require `BLOB_READ_WRITE_TOKEN` before new admin image uploads can persist; bundled product images continue to work without it. Use a pooled PostgreSQL URL with the provider's documented TLS configuration. The production PostgreSQL schema, product import, live catalog API, and protected administrator login have been exercised end to end. Live Razorpay payments still require separate merchant credentials and webhook validation.

Before accepting real purchases: finish business/FSSAI/tax details, confirm product labels and nutrition, define actual delivery coverage and service levels, finalize policies, set up backups and restoration, configure monitoring and payment reconciliation, test provider webhooks and refund operations, and load-test the deployed application with realistic browsing/checkout traffic. Capacity depends on infrastructure, query load, provider limits and concurrent checkout behaviour.

## Verification

```sh
npm run build
npm test
node tests/browser-smoke.mjs
node tests/browser-purchase.mjs
```

Browser tests use Playwright Core and an installed Chromium. Set `CHROME_PATH` to your browser executable on another machine. The smoke test expects the main store running on port 3000. The purchase test starts its own server on port 3100 with a temporary database; API tests use port 3099. Browser screenshots are saved under ignored `test-results/`.

## Design & evidence

The reference research used Playwright and REA's `capture-browser-scenario`; screenshots, accessible Instagram profile metadata and the REA evidence record are in `../research`. eat.one1's public profile supplied Bangalore, pan-India delivery and WhatsApp contact details. Photos are downloaded from the brand's public Instagram feed; original pack shots should replace reel thumbnails when available. Product-level health claims are not inferred from social captions.

Visual direction: Chak Now's cream/green warmth, playful motion and prominent food imagery, with Anand Sweets' category browsing adapted to an original eat.one1 storefront. The supplied design-skills repository's design-principles guidance informed hierarchy and restraint. Fonts are self-hosted Google Fonts: DM Sans and DM Serif Display, distributed under the SIL Open Font License. No third-party website scripts, brand logos, video or checkout code are copied into the app.

This local project was added in `eat-one/` to preserve the workspace's existing deletions and reference folder. The unrelated REA repository was not modified.
