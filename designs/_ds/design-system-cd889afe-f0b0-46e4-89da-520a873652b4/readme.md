# Sundry — Design System

**Sundry** is a premium multi-vendor e-commerce marketplace — thousands of independent sellers, one storefront, one confident checkout (think Amazon/Etsy positioning, 2026 premium execution). This design system defines the foundations, components, and full-screen recreations that every one of Sundry's ~35 pages is built from. The Home Page is the first surface and the reference for everything that follows.

## Sources
- `uploads/Home Page.png` — reference screenshot of the legacy "6Valley" multi-vendor CMS home page. Used **for layout structure only** (same sections, same order, same density). All visual execution — brand, color, type, spacing, elevation, product card — is an intentional upgrade, not a copy. No codebase, Figma file, or brand assets were provided; the brand identity (name, wordmark, palette, type) was created for this system.

## Brand at a glance
- **Name:** Sundry (a word meaning "various items / miscellaneous goods" — apt for a marketplace of many sellers).
- **Primary color:** Iris `#6A2FD6` — a deep grape violet. Deliberately **not** generic e-commerce blue; used sparingly as accent, never a flood.
- **Accent:** Saffron `#EFA524` — warm gold, reserved for deals, countdowns, and highlights.
- **Type:** Bricolage Grotesque (display/headings) + Manrope (UI/body). Both Google Fonts — see Substitutions.

## CONTENT FUNDAMENTALS
- **Voice:** confident, warm, plain-spoken. Second person ("your first order", "sellers you love"). Never corporate or jargon-heavy.
- **Casing:** Title Case for section headings and nav ("Flash Deal", "Top Sellers", "New Arrivals"). Sentence case for body and supporting copy. UPPERCASE only for tiny eyebrows/labels with wide tracking ("HANDPICKED", "JUST LANDED").
- **Headlines** are short and declarative: "One marketplace. Every seller you love." "Dive into a world of crystal-clear sound." Punchy, human, occasional line breaks for rhythm.
- **Product copy** is concrete and real — actual product names, real prices, real seller names ("iPhone 15 Pro Max 256GB · Hanover Electronics · $1,149.00"). Never "Product 1", never lorem ipsum.
- **Numbers** always formatted: `$1,159.00`, tabular figures, compare-at prices struck through, discounts as `−35%` (true minus, not hyphen).
- **Emoji:** none. Iconography carries all glyph meaning.
- **Vibe:** premium but friendly — like a well-run department store staffed by makers, not a discount warehouse.

## VISUAL FOUNDATIONS
- **Color use:** neutral warm-grey canvas (`--surface-page` #FAFAFB) and white cards. Iris appears only on primary actions, active states, links, eyebrows, and one or two hero grounds. Saffron only on deals/countdowns. Status colors (success/warning/error/info) are muted, never neon. At most 1–2 saturated background grounds per page.
- **Type scale:** Display 56 / H1 40 / H2 32 / H3 24 / H4 20 / Body-lg 18 / Body 16 / Small 14 / Caption 12. Headings are Bricolage Grotesque 700–800 with tight tracking (−0.02em); body is Manrope 400–600. Prices/counters use tabular-nums.
- **Spacing:** 8px base scale (4·8·12·16·24·32·48·64·80·96). Generous, confident breathing room — sections separated by ~56–64px, cards padded 14–24px. The upgrade from the reference is largely *air*.
- **Borders vs elevation:** minimal hard lines. Structure comes from **soft, layered shadows** (`--shadow-xs`…`--shadow-xl`, low-contrast, warm-black) and subtle surface tints, not grey boxes. Where a border exists it's `--border-subtle` (#E6E6EC), hairline.
- **Radii:** consistent — 10px (md) for buttons/inputs, 14px (lg) for cards, 20–28px (xl/2xl) for hero and promo panels, full for pills/badges/avatars.
- **Cards:** white surface, 14px radius, `--shadow-sm` at rest → `--shadow-lg` + `translateY(-4px)` on hover. Optional hairline border. No colored left-border accents.
- **Product image tiles:** soft category-tinted placeholder grounds with a centered outline glyph (real photography drops in via the `image` prop). Pastel tints per category (tech iris, women rose, beauty pink, home sage, kids amber, men slate).
- **Backgrounds:** flat tints and restrained two-stop gradients on hero/promo panels only (iris-700→iris-900, plus a soft radial glow). No textures, no busy patterns.
- **Animation:** quick and eased. `--dur-fast` 140ms for hovers, `--dur-med` 220ms for cards. Easing `--ease-out` cubic-bezier(.22,1,.36,1). Hover = lift + shadow bloom; buttons lift 1px and gain a colored shadow. Press returns to rest. No bounces, no parallax.
- **Hover states:** cards lift and deepen shadow; primary buttons darken (iris-600→700) and gain `--shadow-primary`; secondary buttons pick up the iris border/text; the add-to-cart button fades in on card hover.
- **Transparency/blur:** used sparingly — the wishlist toggle floats on `rgba(255,255,255,.85)` + 6px backdrop-blur over image tiles; hero glows use low-opacity radial fills.
- **Imagery mood:** clean, bright, premium-neutral. When real photos arrive they should be well-lit and uncluttered on white/tinted grounds.

## ICONOGRAPHY
- **System:** [Lucide](https://lucide.dev) — outline, 1.8–2px stroke, rounded joins. Loaded via CDN in the Home Page (`unpkg.com/lucide`) and referenced with `data-lucide="name"`. This is a **substitution** flag: no icon set was provided with the brief, so Lucide is chosen as the house set (clean, modern, matches the stroke weight of the wordmark). Swap for a licensed set later if desired.
- **Usage:** icons carry category meaning on tiles (smartphone, shirt, sparkles, sofa, headphones, gem…), UI affordances (search, heart, shopping-cart, user-round, chevron-down), and trust badges (truck, shield-check, rotate-ccw, badge-check). React components (ProductCard/SellerCard) inline a few standard glyphs (star, heart, cart, verified) as SVG so they're dependency-free.
- **No emoji, no unicode-symbol icons.** The verified-seller check and rating stars are the only "decorative" glyphs and both are semantic.
- **Logo:** `assets/logo.svg` — Sundry wordmark + shopping-bag logomark in Iris. Created for this system (no brand mark was supplied).

## Substitutions (please confirm / replace)
- **Fonts:** Bricolage Grotesque + Manrope are the nearest premium Google Fonts to the intended voice. If you have licensed display/text faces, drop them in and update `tokens/fonts.css` + `tokens/typography.css`.
- **Icons:** Lucide via CDN (see Iconography).
- **Product imagery:** all product images are tinted placeholder tiles. Supply real photography and pass via the `image` prop / swap the tile markup.

## Foundations (tokens)
CSS custom properties, entry point `styles.css` (imports only). Split by concern:
- `tokens/colors.css` — Iris scale, Saffron accent, warm-grey neutrals, status, semantic aliases.
- `tokens/typography.css` — font families, type scale, weights, tracking.
- `tokens/spacing.css` — 8px scale + section rhythm.
- `tokens/elevation.css` — radius, shadow, motion.
- `tokens/fonts.css` — Google Fonts import.

## Components
React primitives, styled entirely via the design tokens (no CSS-in-JS libs). Namespace `window.DesignSystem_cd889a`. All map cleanly onto shadcn/ui.

**Core** (`components/core/`)
- **Button** — primary / secondary / ghost / accent; sizes sm·md·lg; icon slots, block. (shadcn Button)
- **Badge** — discount / new / hot / accent / neutral pills. (shadcn Badge)
- **Card** — soft-elevation surface, elevation + pad + bordered props. (shadcn Card)
- **Input** — text/search field, leading icon + trailing addon, md/full radius. (shadcn Input)
- **StarRating** — five-star rating + optional review count.
- **Tabs** — pill segmented switcher, controlled or uncontrolled. (shadcn Tabs)

**Commerce** (`components/commerce/`)
- **ProductCard** — THE marketplace card. Image · discount badge · title · **seller name** · price + compare-at · rating + review count · wishlist toggle · add-to-cart. Non-negotiable seller line is what makes Sundry a marketplace.
- **SellerCard** — vendor store card: logo, name, verified check, rating, product count, visit-store CTA.

## UI Kits
- **`ui_kits/marketplace/index.html`** — the full premium Home Page. Standalone (Tailwind CDN + Lucide + Google Fonts + inline token mirror), JS-driven rails (`home.data.js`). Sections in reference order: utility bar → header (logo, search, wishlist, account, cart w/ count+total) → category mega-nav → hero slider → flash deal + live countdown → featured products → category tiles → featured deals → wide promo → top sellers → deal of the day + latest → new arrivals → popular tabs → brands → 7 category rails → trust badges → footer. Includes hover, skeleton-ready, and empty-state patterns.

## File index
- `styles.css` — global entry (import list only)
- `tokens/` — color, type, spacing, elevation, fonts
- `components/core/`, `components/commerce/` — React primitives (`.jsx` + `.d.ts` + `.prompt.md` + card html)
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `ui_kits/marketplace/` — Home Page recreation
- `assets/logo.svg` — wordmark
- `thumbnail.html` — homepage tile
- `SKILL.md` — Agent Skills entry point
