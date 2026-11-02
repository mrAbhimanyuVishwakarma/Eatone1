# eat.one1

Production-ready foundation for the **eat.one1** snack storefront and its protected owner dashboard.

The application includes a responsive React storefront, ten high-resolution catalog products, customer accounts, wishlist and ordering flows, product administration, Supabase PostgreSQL persistence, sales insights, service-health monitoring, and a Razorpay-ready checkout integration.

## Links and contact

| Item         | Details                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| Live website | [https://eatone1.vercel.app/](https://eatone1.vercel.app/) — temporary domain |
| Admin        | [https://eatone1.vercel.app/admin](https://eatone1.vercel.app/admin)          |
| Instagram    | [@eat.one1](https://www.instagram.com/eat.one1/)                              |
| WhatsApp     | [+91 861 840 1072](https://wa.me/918618401072)                                |
| Email        | [eatonebusiness@gmail.com](mailto:eatonebusiness@gmail.com)                   |

Ownership migration instructions are in the [Account Transfer Guide](docs/ACCOUNT_TRANSFER_GUIDE.md).

## Current production status

| Service                           | State          | Notes                                                                    |
| --------------------------------- | -------------- | ------------------------------------------------------------------------ |
| Vercel website and API            | Running        | Production deployment is live                                            |
| Supabase PostgreSQL               | Running        | Mumbai region; migrations applied                                        |
| Product catalog                   | Running        | Ten products with 1254×1254 images                                       |
| Customer and admin authentication | Running        | Server-managed sessions and role checks                                  |
| Product image uploads             | Setup required | Connect Vercel Blob for durable admin uploads                            |
| Razorpay checkout                 | Setup required | Checkout remains disabled until merchant keys and webhook are configured |

The admin dashboard displays these services using green, orange, and red status cards. Orange means configuration or attention is required; red means an error or incomplete live configuration.

## Features

### Storefront

- Responsive homepage, shop, category and occasion filters, search and sorting.
- Product pages with price, MRP, pack size, stock, ingredients, allergens, nutrition, storage and shelf life.
- Ten high-resolution eat.one1 catalog images plus the supplied customer-review highlight.
- Customer registration, sign-in, password changes and secure sign-out.
- Wishlist, persistent shopping bag, saved delivery address and order history.
- Server-calculated prices, shipping and stock validation.
- Story, snack journal, newsletter signup, policies and official contact links.

### Owner dashboard

- Protected `/admin` access; there is no public administrator registration.
- Add, edit, publish, draft, archive or delete products.
- Products used in historical orders are archived instead of permanently deleted.
- Upload product images, update stock and control homepage features.
- Manage orders, fulfilment status and tracking information.
- Edit business details, delivery fees, contact information and policies.
- View subscribers and product-level performance.
- Review 30-day views, units sold, product revenue, conversion indicators and sales trends.
- Receive cautious price-test, merchandising and restocking suggestions based on real store data.
- Monitor API, Supabase, image storage and Razorpay status.

Test orders are excluded from paid revenue and sales recommendations.

## Technology

| Layer               | Technology                                            |
| ------------------- | ----------------------------------------------------- |
| Frontend            | React 19, Vite 7, Lucide icons                        |
| API                 | Express 5 running as a Vercel Function                |
| Production database | Supabase PostgreSQL                                   |
| Local database      | Node SQLite                                           |
| Image uploads       | Vercel Blob integration; bundled images remain static |
| Payments            | Razorpay-ready server integration                     |
| Hosting             | Vercel                                                |
| Tests               | Node test runner and Playwright Core                  |

## Project structure

```text
eat-one/
├── api/                    Vercel serverless entry point
├── docs/                   Operational and ownership documentation
├── public/                 Fonts, product photos and static assets
├── scripts/                Build orchestration
├── server/                 Express API, auth, database and catalog import
├── src/                    React storefront and admin dashboard
├── supabase/migrations/    Versioned production database schema
├── tests/                  API and browser journey tests
├── .env.example            Environment-variable template
├── vercel.json             Hosting and API rewrite configuration
└── README.md
```

The repository root also tracks installed agent instructions and the design-skills reference as a Git submodule. Clone with `--recurse-submodules` if those references are needed.

## Local setup

Requirements:

- Node.js `22.13` or newer; Node 26 is currently tested.
- npm.
- Git submodules are optional for running the application.

```powershell
git clone --recurse-submodules https://github.com/mrAbhimanyuVishwakarma/Eatone1.git
cd Eatone1\eat-one
npm ci
node server/local-setup.mjs
npm run admin
npm run dev
```

Open:

- Store: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

`local-setup.mjs` creates or preserves an ignored `.env` file. Set a unique administrator email and a password of at least 12 characters before running `npm run admin`:

```dotenv
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=replace-with-a-unique-long-password
```

Never commit `.env`, `.env.local`, database passwords, Razorpay secrets, recovery codes or administrator passwords.

## Environment variables

Copy [.env.example](.env.example) when configuring another environment.

| Variable                           | Purpose                                                   |
| ---------------------------------- | --------------------------------------------------------- |
| `NODE_ENV`                         | Use `production` only in the deployed environment         |
| `PORT`, `HOST`                     | Local/server bind configuration                           |
| `SITE_ORIGIN`                      | Exact public HTTPS origin used for mutation checks        |
| `DATABASE_URL`                     | Pooled PostgreSQL connection; empty uses SQLite locally   |
| `DATABASE_SSL`                     | Enables encrypted PostgreSQL transport                    |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Controls certificate-chain verification                   |
| `DATABASE_POOL_MAX`                | Per-instance database connection limit; use `1` on Vercel |
| `TRUST_PROXY_HOPS`                 | Trusted reverse-proxy count; Vercel uses `1`              |
| `PAYMENTS_MODE`                    | `disabled`, local-only `test`, or `razorpay`              |
| `RAZORPAY_KEY_ID`                  | Razorpay public merchant key ID                           |
| `RAZORPAY_KEY_SECRET`              | Razorpay server secret                                    |
| `RAZORPAY_WEBHOOK_SECRET`          | Independent webhook-signing secret                        |
| `BLOB_READ_WRITE_TOKEN`            | Durable Vercel Blob image uploads                         |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`    | Used only by `npm run admin`                              |

Production refuses to start with SQLite, a non-HTTPS `SITE_ORIGIN`, or test payments.

## Database and Supabase

Production uses the **eat.one1** Supabase project in Mumbai:

- Project reference: `qprmatfkdczqiziudfxp`
- Schema: [supabase/migrations](supabase/migrations)
- Public Supabase Data API access to application tables is blocked with row-level security.
- The application connects only through its protected server-side PostgreSQL connection.

Apply future migrations from `eat-one/`:

```powershell
npx supabase link --project-ref qprmatfkdczqiziudfxp
npx supabase db push --remote
npx supabase db advisors --remote --type security
```

Local development uses `data/eat-one.sqlite` unless `DATABASE_URL` is supplied.

Important: `npm run build` executes `postbuild`, which runs `server/import-eatone-products.mjs`. If `DATABASE_URL` is present, the catalog import targets that database. Verify the selected environment before building.

## Product administration

1. Sign in at `/admin`.
2. Choose **Add a product**.
3. Enter verified product descriptions, ingredients, allergens, nutrition, price, stock, shelf life and storage instructions.
4. Upload JPG, PNG or WebP up to 5 MB.
5. Save as **Draft** or choose **Live** to publish.
6. Use **Feature this snack** for homepage promotion.

Avoid unverified medical, weight-loss, hair-growth or disease-treatment promises. Customer-facing nutrition and health information must match the current product label.

## Image storage

Bundled catalog images work without an external service. New images uploaded through the production admin dashboard require `BLOB_READ_WRITE_TOKEN` so they survive serverless restarts.

Until Vercel Blob is connected, the dashboard correctly reports image storage as orange. Do not rely on temporary serverless filesystem uploads in production.

## Razorpay setup

Local test mode never moves funds:

```dotenv
PAYMENTS_MODE=test
```

Production configuration:

```dotenv
PAYMENTS_MODE=razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_independent_webhook_secret
```

Configure Razorpay automatic capture and register:

```text
https://eatone1.vercel.app/api/payments/webhook
```

Subscribe it to `payment.captured` and use the same independent webhook secret in Vercel. Validate the complete flow with Razorpay test credentials before enabling live keys.

The server:

- Calculates totals from database prices.
- Reserves inventory transactionally.
- Uses checkout idempotency keys.
- Verifies amount, currency, provider order, payment status and signatures.
- Supports signed webhooks and payment reconciliation.

Pending payment orders retain their stock reservation. Automated expiry, automatic restocking, refunds, disputes and shipping-provider integration are not yet implemented.

The experimental YouPI-PG payment project is intentionally not integrated because it is not appropriate for production merchant settlement verification.

## Vercel deployment

The Vercel project uses `eat-one/` as its Root Directory. Required production configuration currently includes:

```dotenv
NODE_ENV=production
SITE_ORIGIN=https://eatone1.vercel.app
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DATABASE_POOL_MAX=1
TRUST_PROXY_HOPS=1
PAYMENTS_MODE=disabled
```

Add Vercel Blob and Razorpay variables when those services are activated. Each push to `main` triggers a production deployment.

## Commands

| Command                           | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `npm run dev`                     | Start the local storefront and API                   |
| `npm run admin`                   | Create or reset the configured administrator         |
| `npm run build`                   | Build the frontend and run the catalog import        |
| `npm start`                       | Start the application server                         |
| `npm test`                        | Run API, authorization, inventory and checkout tests |
| `node tests/browser-smoke.mjs`    | Run the browser smoke journey                        |
| `node tests/browser-purchase.mjs` | Run the browser purchase journey                     |

Browser tests use Playwright Core and an installed Chromium. Set `CHROME_PATH` when Chromium is installed in a non-standard location. Test screenshots are written to the ignored `test-results/` directory.

## Security model

- Scrypt password hashing with unique salts.
- Random session tokens stored as hashes in the database.
- HttpOnly, SameSite cookies and Secure cookies in production.
- Customer/admin role enforcement on the server.
- Request-origin validation for mutations.
- Login, checkout and API rate limits.
- File size and image-signature checks.
- Helmet production security headers and content security policy.
- Server-side price, inventory and payment verification.
- Customer ownership checks for addresses, wishlists and orders.

## Launch checklist

Before accepting real orders:

- [ ] Connect Vercel Blob and test an admin image upload.
- [ ] Complete Razorpay merchant KYC, keys, webhook and controlled test payment.
- [ ] Add and verify FSSAI, tax and legal business details.
- [ ] Confirm every label, ingredient, allergen, nutrition and shelf-life value.
- [ ] Finalize shipping, cancellation, return, refund, privacy and terms policies.
- [ ] Configure database backups and perform a restore drill.
- [ ] Define how pending payments, refunds, disputes and stock releases are reconciled.
- [ ] Test email, WhatsApp support and delivery operations.
- [ ] Load-test browsing and checkout with realistic concurrency before a large campaign.
- [ ] Replace the temporary Vercel address with the permanent business domain.

## Design and source evidence

The visual system is an original eat.one1 implementation informed by the warm, playful direction of Chak Now and the catalog hierarchy of Anand Sweets. It does not copy their code, logos or checkout implementation.

Reference captures and source research are stored under the repository-level `research/` directory. Public Instagram material was used only as brand/product evidence. Product claims were not inferred beyond supplied catalog information. The current website uses high-resolution catalog assets rather than low-resolution Instagram screenshots.

DM Sans and DM Serif Display are self-hosted under the SIL Open Font License.

## Ownership and maintenance

- Account-transfer procedure: [docs/ACCOUNT_TRANSFER_GUIDE.md](docs/ACCOUNT_TRANSFER_GUIDE.md)
- Production code: GitHub `main`
- Hosting: Vercel project `eatone1`
- Database: Supabase project `qprmatfkdczqiziudfxp`
- Primary contact: [eatonebusiness@gmail.com](mailto:eatonebusiness@gmail.com)

Keep infrastructure under an eat.one1-controlled business email and enable two-factor authentication for GitHub, Vercel, Supabase, Razorpay and the domain registrar.
