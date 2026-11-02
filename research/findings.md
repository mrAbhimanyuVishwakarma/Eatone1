# Reference findings — 2 November 2026

## Tools and scope

Used the local REA 6.5.0 CLI `capture-browser-scenario` on Chak Now. `rea-chaknow.json` is the complete observed evidence record, `chaknow-scenario.json` the declared browser scenario. REA reported a completed capture and terminated its owned temporary browser. Separate Playwright captures recorded the desktop and mobile views of Chak Now, Anand Sweets, and Eat One Instagram, plus DOM text, image URLs, fonts, background colours and public metadata.

A later attempt to repeat REA capture on Anand reported that the local REA compiled runtime was missing. No REA configuration or source was changed to repair it. The successful direct Playwright desktop/mobile Anand captures remain the evidence for that reference.

## Observed

- Chak Now has a cream header/background, a green animated/video hero with prominently presented snack packs, large characterful type, product grid, orange content panels, and home/roaming messaging. This informed the green-and-cream palette, large food imagery and gentle motion. Its logo, packs, copy and scripts were not imported into Eat One.
- Anand Sweets offers category navigation, an account, search, cart, category cards, best sellers, gifting and educational content. This informed the shopping structure, not claims about Eat One's products.
- Eat One public profile: `eat.one1`, brand name EatOne, Bangalore, pan-India delivery, WhatsApp +91 8618401072, FSSAI-registered claim, no sugar/jaggery/preservatives claim. Profile metadata exposed the full WhatsApp number. No registration number was supplied.
- Visible reel thumbnails show nutrition laddoos and granola. Public Instagram access exposes only part of the profile; authentication prompts prevent claiming a complete review of every post, story, recipe or product. No names, prices, health outcomes or product labels were invented for the live catalog.

## Implementation decisions

- Create an original Eat One design using the references' visual cues. Public storefront remains empty until the admin publishes actual product information.
- Include a social-brand description of no added sugar rather than asserting every future product is sugar-free; provide per-product ingredients, allergens and nutrition fields.
- Do not carry over social weight-loss or hair-care claims into product promises. Admins can enter verified product information.
- Use Eat One's own downloaded photos with CSS cropping to remove reel captions from prominent layouts. They are low-resolution social assets, suitable for initial local preview; production pack photography is still needed.
- The provided design-skills repository's `skills/design-principles/SKILL.md` informed hierarchy, restraint and final visual review. The emotional target is a warm, familiar Bangalore snack kitchen, with a deliberate food-first composition.

## Verification limits

- No right to third-party brand assets is inferred; no third-party brand logos or product assets ship in the application.
- Browser research does not establish product efficacy, certification, nutritional composition or delivery guarantees.
- Production PostgreSQL, real Razorpay captures/webhooks, live hosting, real fulfilment, email delivery and high-concurrency capacity remain unverified.
