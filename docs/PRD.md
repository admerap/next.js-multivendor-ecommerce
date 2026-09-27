# Sundry — Product Requirements Document (PRD)

| | |
|---|---|
| Product | Sundry — multi-vendor e-commerce marketplace |
| Version | 1.0 (MVP) |
| Status | Draft for approval |
| Date | September 27, 2026 |
| Companion docs | `DESIGN_SYSTEM.md` (visual source of truth) · `CLAUDE.md` (engineering rules) · `design/*.dc.html` (approved screens) |

---

## 1. Summary

Sundry is a premium multi-vendor marketplace: thousands of independent sellers, one storefront, one checkout. Shoppers discover products from many stores and pay once. Each seller manages their own store, catalog, orders and payouts. Marketplace staff operate the whole platform from an admin dashboard.

The MVP delivers four connected areas, each already designed:

1. **Storefront**: browse, search, product detail, cart, checkout.
2. **Customer account**: orders, tracking, wishlist, addresses, inbox, support.
3. **Vendor dashboard**: store profile, products, orders, coupons, reviews, reports.
4. **Admin dashboard**: vendors, customers, products and approvals, orders, stock, reports.

---

## 2. Problem & opportunity

- **Shoppers** want the breadth of a big marketplace with the trust and feel of a curated boutique. Most multi-vendor platforms look dated and cluttered, and they hide who the seller is.
- **Independent sellers** want a storefront, order tools and payouts without building their own e-commerce stack.
- **Operators** need one place to approve sellers and products, monitor orders and earnings, and keep catalog quality high.

**Opportunity:** a marketplace whose premium, fast and transparent experience ("always know who you're buying from") increases conversion and repeat purchase. It also gives sellers professional tools from day one.

---

## 3. Goals & non-goals

### 3.1 Goals (MVP)

| # | Goal | Measure |
|---|---|---|
| G1 | Shoppers can find, buy and track products from multiple sellers in one checkout | Checkout completion ≥ 60% of sessions that start checkout |
| G2 | Sellers can onboard and start selling without staff help (after approval) | Median time from registration to first approved product < 48h |
| G3 | Admins can control quality: approve vendors and products, monitor orders | 100% of new vendors and vendor products pass an approval state |
| G4 | Premium, accessible, responsive experience on every device | Lighthouse ≥ 90 (Perf, A11y, Best Practices) on key pages; zero horizontal overflow at 360–1440px |
| G5 | Trustworthy payments and payouts | Stripe-only; 0 payment-status mismatches (webhook is the source of truth) |

### 3.2 Non-goals (explicitly out of scope)

- Auctions / auction products.
- Publication House / Authors / Creators filters.
- Direct **Chat With Vendor**. Customer questions go to **Sundry AI Support**.
- **Cash on Delivery.** Stripe is the only payment processor.
- Google Maps address picker. Addresses are entered through a structured form.
- Currency and language switchers. MVP is USD, English.
- Native mobile apps. Responsive web only.
- Delivery-man app. Deliverymen appear only as assigned contacts in customer chat and order views.

---

## 4. Users & personas

| Persona | Description | Top jobs to be done |
|---|---|---|
| **Maya, the shopper** | 28–45, buys online weekly on mobile and desktop, values trust and speed | Find products fast · compare sellers · pay once · track delivery · return easily |
| **Guest shopper** | Not logged in | Browse, add to cart, sign up or log in at checkout |
| **James, the vendor** | Owner of "Hanover Electronics", 50–500 SKUs | List products · fulfil orders · run coupons · answer reviews · see earnings and payouts |
| **Aisha, the admin** | Marketplace operations staff | Approve vendors and products · monitor orders · manage customers · read earnings reports |

### Roles & permissions

| Capability | Guest | Customer | Vendor | Admin |
|---|:-:|:-:|:-:|:-:|
| Browse, search, product detail | ✓ | ✓ | ✓ | ✓ |
| Cart | ✓ (session) | ✓ (persisted) | — | — |
| Checkout, orders, wishlist, addresses, inbox, tickets | — | ✓ own | — | — |
| Manage own store, products, orders, coupons, reports | — | — | ✓ **own store only** | — |
| Approve vendors and products; manage all orders, customers and reports | — | — | — | ✓ all |

---

## 5. Core principles (apply to every feature)

1. **Marketplace transparency.** Every product shows its seller. Carts group items by seller. Orders split into one sub-order per seller. Sellers only ever see their own data.
2. **Stripe-only payments:** card, and Stripe Wallet (Apple Pay, Google Pay, Link).
3. **Four states everywhere:** Default · Loading skeleton · Empty · Error with Retry.
4. **Responsive by default:** 360px → 1440px+. Tables become cards at ≤1200px. Touch-friendly (≥44px targets).
5. **Design-system fidelity:** only the tokens and components in `DESIGN_SYSTEM.md`.
6. **Accessible:** WCAG 2.2 AA.

---

## 6. Functional requirements — Storefront

Priority: **P0** = MVP must-have · **P1** = MVP should-have · **P2** = post-MVP.

### 6.1 Global header, navigation & footer (P0)
- **FR-S1** Utility bar: support phone, Track order, Help Center, Become a Seller.
- **FR-S2** Header: logo, pill search with an **All Categories** scope dropdown, wishlist (with count), account (menu), cart chip (item count and total).
- **FR-S3** Category nav: **All Categories** button opens a two-pane mega-menu (categories → sub-category groups), with links Home, Brands, Offers, All Vendors, Vendor Zone and the promo message.
- **FR-S4** Mega-menu opens on hover (desktop pointer) and on tap (touch), with no dead zone between trigger and panel.
- **FR-S5** ≤1024px: compact header (☰ · search icon · wishlist · cart), a floating category panel, and a drawer with Shop / My Account / More. Logo hidden ≤720px.
- **FR-S6** **MiniCart** from the cart chip: items **grouped by seller**, qty stepper, remove, free-shipping progress (turns green at the threshold), subtotal, Expand cart, Proceed to checkout.
- **FR-S7** Footer: brand, quick links, policies, newsletter signup, app badges, socials.
- **FR-S8** Only one overlay open at a time. Escape closes all. Body scroll is locked under modals and drawers.

### 6.2 Home (P0)
Sections in approved order:
- Hero with category sidebar and image
- Flash Deal with live countdown
- Featured Products
- Category tiles
- Featured Deals
- Wide promo
- Top Sellers
- Deal of the Day + Latest Products
- New Arrivals
- Popular (Best Selling / Top Rated / Trending tabs)
- Brands
- 7 category rails
- Trust badges
- **FR-S9** All product sections use **ProductCard**: image, discount badge, title, **seller**, price + compare-at, rating + count, wishlist, add-to-cart, quick-view eye.
- **FR-S10** **QuickViewModal**: gallery, seller, rating, price, variant, qty, Add to cart, Buy now. Bottom sheet on mobile.
- **FR-S11** Countdown ends gracefully: the section hides, or shows "Deal ended", when the timer reaches zero.

### 6.3 Category / search results (P0)
- **FR-S12** Filters: category tree, brands (searchable, with counts), price range, rating, availability, seller. Sort: relevance, newest, price ↑/↓, top rated.
- **FR-S13** Results grid with pagination (or infinite scroll, P1), result count, active-filter chips, clear all.
- **FR-S14** On mobile, filters open in a sheet (P1).
- **FR-S15** Search matches product name, brand, category, seller. Search scope follows the header "All Categories" dropdown.

### 6.4 Product detail (P0)
- **FR-S16** Gallery with thumbnails, zoom on hover (desktop).
- **FR-S17** Seller block: name, verified badge, rating, "Visit store".
- **FR-S18** Price, compare-at, discount, stock state, variants (e.g. color), qty, Add to cart, Buy now, wishlist, share.
- **FR-S19** Tabs: Overview/Description, Specifications, Reviews (with rating distribution).
- **FR-S20** Related products and more from this store.
- **FR-S21** Trust row: delivery, safe payment, returns, authenticity.

### 6.5 Vendors (P0)
- **FR-S22** All Stores: search, filter (category, rating), store cards (banner, logo, name, rating, reviews, product count, **Closed Now** state).
- **FR-S23** Store page: banner, logo, rating, stats, store search, category filter, product grid.

### 6.6 Cart (P0)
- **FR-S24** Items **grouped under seller headers**. Each item: image, title, variant, unit price, qty stepper, line total, remove.
- **FR-S25** Summary: Sub total, Shipping (per seller), Discount, Tax, Total. Coupon code input. All values recalculate live on every change.
- **FR-S26** Free-shipping threshold message and progress bar.
- **FR-S27** Empty cart state with a CTA back to shopping.

### 6.7 Checkout (P0)
- **FR-S28** Stepper: Cart ✓ → **Shipping & Billing** → **Payment**. Payment unlocks only after Shipping & Billing is valid.
- **FR-S29** Shipping address: saved-address picker or a new form (name, phone, email, country, city, ZIP, address, type **Home / Office / Other**). "Same as shipping address" collapses billing. "Create an account with the above info" option for guests.
- **FR-S30** Payment methods: **Credit/Debit Card (Stripe Payment Element)** and **Stripe Wallet** (Apple Pay / Google Pay / Link). The selected method's details render below the options.
- **FR-S31** Terms checkbox, unchecked by default. **Place Order is disabled until it is checked.**
- **FR-S32** On success: a **Thank-you modal** (Order ID + Copy, Track Order, Continue Shopping) and a confirmation email. The parent order is split into **StoreOrders**.
- **FR-S33** Payment failures show an inline error, keep the form data and allow retry. No duplicate charges (idempotency keys).

### 6.8 Auth (P0)
- **FR-S34** Customer register (Name, Email, Password) and login (Email, Password), with **Continue with Google** and **Continue with Apple** below the primary button.
- **FR-S35** Password reset by email. Email verification (P1).
- **FR-S36** Guest cart merges into the account cart on login.

---

## 7. Functional requirements — Customer account

Shell: storefront header with the "Hello, {name} · Dashboard" chip, and an account sidebar (profile card with photo + email, then navigation). Every page has the 4 states.

- **FR-A1 Profile info (P0):** edit name, phone, email, photo. Change password. Delete account (P1, with confirmation).
- **FR-A2 My Orders (P0):** list of orders (ID, status badge, product count, date, **total amount**). The row menu offers Download invoice and View details. Filter/sort by date and status.
- **FR-A3 Order details (P0):** header with status and verification code. Tabs:
  - **Order summary:** info, addresses, and items **grouped by seller** with totals.
  - **Vendor info:** store card and a link to the store.
  - **Delivery man info:** name, phone, ETA when assigned.
  - **Reviews:** rate delivered items.
  - **Track order:** status timeline.
  - **Actions:** Cancel order while Pending, Download invoice.
- **FR-A4 Track order (P0):** look up by Order ID + phone/email. Status timeline (Placed → Confirmed → Packaging → Out for delivery → Delivered).
- **FR-A5 Wishlist (P0):** item rows with image, title, brand, **seller**, rating, price + compare-at + discount, Add to cart, Remove.
- **FR-A6 Addresses (P0):** list, add, edit and delete addresses. Type **Home / Office / Other**. Set default shipping/billing.
- **FR-A7 Inbox (P0):**
  - **Support** tab: chat with **Sundry AI Support**, which answers order, shipping, return and product questions. It hands off to a human ticket when it cannot resolve the issue.
  - **Deliveryman** tab: chat with the courier assigned to an active order.
- **FR-A8 Support tickets (P0):** list (ID, subject, type, priority, status, date). **Add New Ticket** modal: subject, type, priority, description, attachments. Ticket detail with the conversation thread (P1).
- **FR-A9 Notifications (P1):** email for order status changes, and in-app badge counts.

---

## 8. Functional requirements — Vendor dashboard

Shell: 68px top bar (brand, sidebar toggle, breadcrumbs, messages, orders, profile dropdown with Profile Setting / Change Password / Log out). Sidebar is a 64px icon rail plus a 216px section panel, with order-status **counts** next to each item. It collapses with the back arrow and reopens with ☰. On mobile it becomes a drawer. **All data is scoped to the vendor's own store.**

- **FR-V1 Vendor register (P0):** multi-step form with seller info, shop info (name, logo, banner, address), payout setup (**Stripe Connect onboarding**), then submit. The application enters **Pending approval**.
- **FR-V2 Vendor login (P0):** email + password, forgot password, and a link to register.
- **FR-V3 Dashboard (P0):**
  - Order status tiles (Pending, Confirmed, Packaging, Out for delivery, Delivered, Canceled, Returned, Failed).
  - **Vendor Wallet:** withdrawable balance, withdraw request, pending withdraw, total withdrawn, delivery-charge earned, commission given.
  - Earning statistics chart (year/month/week).
  - Top selling products, most popular products and top customers lists.
- **FR-V4 Profile (P0):** shop info (name, contact, address, logo, banner, tagline, open/closed), owner info, payout details (Stripe Connect status).
- **FR-V5 Change password (P0):** current password, new password, confirm. Strength meter and rules.
- **FR-V6 Product list (P0):** table with image, name, SKU, price, stock, **approval status** (Pending / Approved / Denied), active toggle, and actions (view, edit, delete). Search, filters, export CSV. Becomes cards at ≤1200px.
- **FR-V7 Add product / Edit product (P0):**
  - Basic info: name, description, category/sub-category, brand, unit, tags.
  - Pricing: price, compare-at, discount, tax.
  - Stock: quantity, SKU, minimum order.
  - Variants: color, size.
  - Media: thumbnail and gallery.
  - SEO: meta title and description.
  - **Save as draft** or **Submit for review.** An edit to an approved product goes back to review (configurable by admin).
- **FR-V8 Product reviews (P0):** list of reviews on the vendor's products (customer, rating, comment, date, product) with a reply (P1) and a status toggle.
- **FR-V9 Order list (P0):** the vendor's **StoreOrders** only. Filter by status, date, customer. Columns: ID, date, customer, total, payment status, order status, action.
- **FR-V10 Order details (P0):**
  - Items, customer and shipping info, and payment info (Stripe).
  - **Status changer** (Confirmed → Packaging → Out for delivery → Delivered) with timeline.
  - Assign deliveryman, print invoice.
- **FR-V11 Coupons (P0):** create, edit and delete store coupons. Fields: title, code, type (percentage/fixed, free shipping), discount, min purchase, max discount, start/end date, usage limit per user, status toggle. List with search.
- **FR-V12 Reports (P0):**
  - **Product report:** sales by product, stock.
  - **Order report:** totals by status, chart, table.
  - **Transaction report:** Stripe payments, commission, refunds, payouts.
  - All three have date filters and CSV export.

---

## 9. Functional requirements — Admin dashboard

Shell: same frame as Vendor, plus a header search (⌘K / Ctrl K) and a **theme dropdown (Light / Dark / System)**. Switching themes must not flash. Sidebar sections: Home, Orders, Catalog, People, Reports, Promotions (P2), Settings (P2).

- **FR-D1 Dashboard (P0):**
  - Business analytics tiles by order status.
  - **Admin Wallet:** in-house earning, commission, in-house shipping, pending amount.
  - **Order statistics:** in-house vs vendor, by year/month/week.
  - **User overview** doughnut (customers, vendors, deliverymen).
  - Top customers.
  - Most rated and top-selling products (in-house and vendor).
  - Most popular and top-selling stores, top delivery men.
- **FR-D2 All orders (P0):** every order across stores. Filter by status, store, customer, date, payment method. Status tabs with counts. Table: ID, date, customer, **store**, total, payment status, order status, actions. Export.
- **FR-D3 Product list (P0):** in-house and vendor products with search, filters (store, category, brand, status), featured toggle, active toggle, and actions.
- **FR-D4 Add product (P0):** the same form as the vendor form, for in-house products.
- **FR-D5 New product requests (P0):** vendor products in **Pending review**, with Approve / Deny (deny requires a reason, sent to the vendor).
- **FR-D6 Product details (P0):**
  - Full product view: store, stats (sold, reviews, rating), variants, stock.
  - Reviews list.
  - Approve / Deny / Suspend actions.
- **FR-D7 Product stock / limited stock (P0):** products under a threshold, with store, stock and last update. Inline restock request (P1).
- **FR-D8 Vendor list (P0):**
  - Stores with logo, name, owner, status (Pending / Active / Suspended), products, orders.
  - Actions: approve, suspend, view store.
  - Export.
- **FR-D9 Add vendor (P0):** admin-created vendor (owner, shop, payout invite).
- **FR-D10 Customer list (P0):** name, contact, total orders, spend, joined date, status toggle (block). Customer detail (P1).
- **FR-D11 Customer reviews (P0):** all reviews with product, **store**, customer, rating, comment, date, visibility toggle. Filters.
- **FR-D12 Reports (P0):** each has date-range filters, KPIs, animated charts and CSV export.
  - **Earning:** admin earning, commission, in-house, shipping.
  - **Order:** totals by status, trend.
  - **Product:** sales, top products, wish-listed products.
  - **Transaction:** Stripe payment ID, order, customer, store, amount, commission, tax, method, status (Paid / Pending / Refunded).
- **FR-D13 Inbox & Support (P1):** admin views of AI-support escalations and customer tickets (assign, reply, close).
- **FR-D14 Settings (P2):** commission rate (global and per store), shipping rules, free-shipping threshold, tax, approval policy, email templates.

---

## 10. Order & payment lifecycle

1. **Checkout:** customer pays once through a Stripe PaymentIntent (card or wallet). The parent **Order** is created with payment `UNPAID`.
2. **Webhook `payment_intent.succeeded`:** payment becomes `PAID`. The system creates one **StoreOrder** per seller (status `PENDING`), decrements stock, and emails the customer and each seller.
3. **Seller fulfils:** `CONFIRMED → PACKAGING → OUT_FOR_DELIVERY → DELIVERED` (or `CANCELED` / `FAILED` / `RETURNED`). The customer sees each StoreOrder's status independently.
4. **Payouts (Stripe Connect):** each StoreOrder amount minus the **commission** (default 10%, configurable) is transferred to the seller's connected account after delivery plus the holding period (default 7 days).
5. **Refunds:** requested by the customer, approved by the seller or admin. A Stripe refund is issued, the payment becomes `REFUNDED`, and the transfer is reversed if already paid out.
6. **Cancellation:** the customer can cancel while `PENDING`. A full refund is automatic.

Rules:
- Shipping is calculated **per seller**.
- Coupons are store-scoped (vendor coupons) or platform-wide (admin, P1).
- Tax is computed at checkout. Stripe Tax is P1.

---

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | LCP < 2.5s on 4G mid-range mobile. INP < 200ms. CLS < 0.1. Images via next/image (AVIF/WebP). Server Components and streaming. |
| **Responsive** | Verified at 360 · 390 · 768 · 1024 · 1280 · 1440. No horizontal overflow. Tables become cards at ≤1200px. Hit targets ≥ 44px. Hover-only UI reachable on touch. |
| **Accessibility** | WCAG 2.2 AA. Full keyboard support. Visible focus. Labeled controls. Focus-trapped dialogs. Reduced-motion respected. |
| **Security** | Server-side role and ownership checks on every mutation. Vendor data scoped by `storeId`. zod validation. CSRF-safe Server Actions. Rate limiting on auth, checkout and AI chat. Secrets server-only. PCI handled by Stripe (no card data touches our servers). |
| **Privacy** | GDPR/CCPA-ready: data export and account deletion (P1), cookie consent, minimal PII in logs. |
| **Reliability** | 99.9% uptime target. Idempotent webhooks and payment calls. Retries with backoff. |
| **SEO** | SSR/SSG product, category and store pages. Metadata API. Open Graph images. `sitemap.xml`, `robots.txt`. JSON-LD (Product, Offer, AggregateRating, BreadcrumbList). |
| **Theming** | Admin: Light/Dark/System, with no flash (next-themes, `disableTransitionOnChange`). Other areas: light, dark-ready tokens. |
| **Observability** | Error tracking (e.g. Sentry). Analytics events (§12). Structured server logs. |
| **Browsers** | Latest 2 versions of Chrome, Safari (iOS + macOS), Firefox, Edge. |
| **Quality** | TypeScript strict. ESLint. Unit tests for pricing, split-order and permission logic. E2E (Playwright) for browse → cart → checkout, the vendor fulfilment flow and admin approval. |

---

## 12. Analytics & success metrics

**North-star:** Gross Merchandise Value (GMV) from repeat customers.

| Funnel / area | KPI | MVP target |
|---|---|---|
| Discovery | Search → product view rate | ≥ 35% |
| Conversion | Product view → add to cart | ≥ 8% |
| Checkout | Checkout start → order placed | ≥ 60% |
| Retention | 60-day repeat purchase rate | ≥ 20% |
| Sellers | Registration → first approved product within 48h | ≥ 70% |
| Sellers | Orders confirmed within 24h | ≥ 90% |
| Ops | Product approval turnaround (median) | < 24h |
| Support | AI Support resolution without human ticket | ≥ 60% |
| Quality | Checkout error rate | < 1% |

**Tracked events:** `search` · `view_item` · `quick_view` · `add_to_wishlist` · `add_to_cart` · `view_cart` · `begin_checkout` · `add_shipping_info` · `add_payment_info` · `purchase` · `order_status_changed` · `vendor_registered` · `product_submitted` · `product_approved` · `ticket_created` · `ai_chat_escalated`.

---

## 13. Integrations

| Service | Use |
|---|---|
| **Stripe Payments** | Payment Element (card), Apple Pay / Google Pay / Link, refunds, webhooks |
| **Stripe Connect (Express)** | Vendor onboarding, commission (application fee), payouts |
| **Auth.js** | Email/password, Google, Apple sign-in, role-based sessions |
| **PostgreSQL + Prisma** | Primary data store |
| **Object storage (S3-compatible or Vercel Blob)** | Product images, logos, banners, ticket attachments |
| **Email (Resend / Postmark)** | Order confirmation, status updates, password reset, vendor approval |
| **AI (LLM provider)** | Sundry AI Support: answers grounded in the customer's orders, policies and FAQ; escalates to a ticket |
| **Search** | Postgres full-text for MVP. Meilisearch/Algolia is P2. |
| **Hosting** | Vercel (or equivalent). Preview deployments per PR. |

---

## 14. Release plan

| Phase | Scope | Exit criteria |
|---|---|---|
| **M0 — Foundations** (week 1–2) | Next.js setup, tokens, fonts, shadcn restyle, shells (storefront, account, vendor, admin), auth, DB schema, seed data | All shells render responsive with 4 states; lint/typecheck green |
| **M1 — Storefront & checkout** (week 3–6) | Home, category, search, product, vendors, cart, checkout with Stripe, order split, emails | E2E: guest → account → pay → order split per seller |
| **M2 — Customer account** (week 6–7) | Profile, orders, order details, tracking, wishlist, addresses, tickets, inbox (AI Support + Deliveryman) | Customer can self-serve an order end-to-end |
| **M3 — Vendor** (week 7–10) | Register + Stripe Connect, dashboard, products (CRUD + review flow), orders + status, coupons, reviews, reports | A vendor can onboard, list, fulfil and see payouts |
| **M4 — Admin** (week 10–12) | Dashboard, approvals, vendors, customers, reviews, orders, stock, reports, themes | Admin can run daily operations |
| **M5 — Hardening** (week 12–13) | Performance, a11y audit, SEO, security review, load test, analytics | All NFRs in §11 met; launch checklist signed |

---

## 15. Acceptance criteria (global)

A feature is **done** when:
1. It matches the approved `design/*.dc.html` screen in structure, content density and behavior, built only with DESIGN_SYSTEM tokens and components.
2. Default, Loading, Empty and Error states exist.
3. It has no horizontal overflow at 360–1440px, tables become cards at ≤1200px, and it works with touch.
4. It is keyboard and screen-reader accessible (WCAG 2.2 AA).
5. It respects the marketplace rule: seller visible, cart and order split by seller, vendor data scoped.
6. It uses Stripe only and includes none of the non-goals.
7. Server-side permission checks and zod validation are in place, and tests cover the core logic.
8. Lint, typecheck and E2E pass, with no console errors.

---

## 16. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Stripe Connect onboarding friction for vendors | Slow seller supply | Express accounts, clear status in Vendor Profile, reminder emails |
| Split-order edge cases (partial cancel/refund) | Wrong payouts | Model StoreOrder as the unit of fulfilment and refund; unit tests; reconcile with webhooks |
| Catalog quality from many sellers | Brand damage | Mandatory product review, image and field validation, deny with reasons |
| AI Support gives wrong answers | Trust | Ground on order data + policies only, show sources, easy "Talk to a human" escalation, log and review |
| Scope creep from reference screenshots | Delays | Non-goals list (§3.2) is binding; changes go through PRD revision |

---

## 17. Open questions

1. **Cash on Delivery.** The approved Checkout design includes a COD option, but the project rule is Stripe-only. **Decision needed:** remove it from the design (this PRD assumes removal) or re-scope.
2. Commission model: one global rate, per category, or per store? (PRD default: global 10%, overridable per store.)
3. Payout holding period after delivery: 7 days default. Confirm.
4. Return window: 7 days, as shown on the trust badges. Confirm policy and who pays return shipping.
5. Should vendor product *edits* always require re-approval, or only for price, title and images?
6. Deliverymen: internal staff, third-party couriers, or seller-managed? This affects the "Delivery man info" tab and the Deliveryman chat.
7. Launch markets and tax handling (US-only with Stripe Tax?).
8. Admin area sections still without designs: Refund Requests, Wallet, Loyalty Points, Delivery Men, Employees, Withdraws, Promotions, Settings. Schedule them for P1/P2.

---

## 18. Appendix — Screen inventory

**Storefront (10):**
- Home
- Category
- Product Detail
- Cart
- Checkout
- Order Complete
- All Vendors
- Vendor Details
- Login
- Register

**Customer account (8):**
- Profile
- My Orders
- Order Details
- Track Order
- Wishlist
- Addresses
- Inbox
- Support Tickets

**Vendor (15):**
- Login
- Register
- Dashboard
- Profile
- Change Password
- Product List
- Add Product
- Edit Product
- Product Reviews
- Order List
- Order Details
- Coupons
- Product Report
- Order Report
- Transaction Report

**Admin (15):**
- Dashboard
- All Orders
- Product List
- Add Product
- New Product Requests
- Product Details
- Product Stock
- Vendor List
- Add Vendor
- Customer List
- Customer Reviews
- Earning Report
- Order Report
- Product Report
- Transaction Report

Route mapping for every screen is in `CLAUDE.md` §5.
