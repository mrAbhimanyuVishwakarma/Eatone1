# eat.one1 local QA

Reviewed 2 November 2026 using Playwright Chromium, desktop 1440 × 1000 and mobile 390 × 844.

## Result

Local storefront and core commerce journey passed. This is an original eat.one1 adaptation, not a pixel-for-pixel copy of either reference.

- Desktop/mobile homepage, empty pantry, category filters, account login, wishlist, story, journal, policy and admin-entry pages rendered.
- Mobile viewport has no document-level horizontal overflow. Category cards intentionally scroll horizontally inside their row.
- Mobile navigation opens, navigates and closes. Bag opens and closes with Escape. Reduced-motion preference disables decorative animation.
- Self-hosted fonts and local food assets load. No runtime page errors in final smoke and built-app purchase runs.
- A separate browser test uploaded an image, published a product, created a customer, saved a wishlist item, added to the bag, completed mobile test checkout, viewed the customer order, and moved it to packing as admin.
- API tests passed role enforcement, customer-only registration, draft visibility, publication, wishlist persistence, address storage, server-calculated pricing, checkout retry idempotency, order ownership, oversell prevention under concurrent requests, fulfilment transitions, newsletter consent, sign-out and cross-origin rejection.
- Production React build passes; main JavaScript bundle approximately 293 kB before gzip / 90 kB gzip.

## Visual review

Clear food-first hero; cream/green base with restrained peach and yellow accents; consistent serif display and sans-serif utility type. Empty product shelf has an intentional message and Instagram destination. Published products populate the homepage, shop and account journey without a redesign.

Corrected a mobile heading line-break spacing issue and adjusted social-photo crops. Switched the Windows development watcher to polling after an observed file-lock error. Built-app browser tests avoid development HMR sockets.

Screenshots: `test-results/home-desktop.png`, `home-mobile.png`, `admin-products.png`, `checkout-mobile.png`, and `orders-mobile.png` (ignored generated files).

## Limits and remaining launch work

Social reel thumbnails are low-resolution. Replace them with original product photography when supplied. No invented reviews, real catalog items, FSSAI licence number or product health outcomes are displayed.

Live payment processing, production PostgreSQL, public deployment, automated refunds, courier integration, email delivery, reservation-expiry operations, and thousands-of-buyers load testing have not been verified. See README for production requirements. Passing local QA is not a public-launch certification.

final result: passed (local scope)
