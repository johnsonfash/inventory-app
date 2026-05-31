# Pallio — Completeness & Polish Wave Plan

Created 2026-05-26 from a full UX review + a grounded codebase audit (communications,
commissions, settings, integrations, marketing, app-shell mechanics). This is the
"finish everything" plan — distinct from the earlier simplification waves
(`project_waves_progress.md`). Principles throughout: **mobile-first, simplicity over
features, industry-agnostic, no hard module gating.** Backend is still mocked; each wave
notes what's frontend-doable now vs backend-blocked.

## Coverage map (every review point → wave)

| # | Review point | Wave |
|---|---|---|
| 1 | "Role-based access, biometric unlock" isn't a selling point | W1 |
| 2 | AI-tell em-dash ("— ") in landing copy | W1 |
| 3 | Face ID is not a selling point (device pills) | W1 |
| 4 | "<3s Opens on 4G" weak — use "works offline" / better | W1 |
| 5 | Splash re-shows when navigating dashboard → /pos | W2 |
| 6 | Desktop workspace switcher is redundant (already an org/location dropdown) | W2 |
| 7 | Shop/location list needs max-height + scroll, keep grow animation | W2 |
| 8 | Select popout in a bottom drawer should flip UP near the bottom | W2 |
| 9 | Business logo upload should show instant local preview | W2 |
| 10 | Dashboard quick-action set — is it the best? | W2 |
| 11 | Extend the customers-style quick-add modal/drawer to more list pages | W3 |
| 12 | Communications/templates "not working"; can't view/edit templates; submenus incomplete | W4 |
| 13 | Commissions page not comprehensive | W5 |
| 14 | Settings not complete (broken sub-pages) | W6 |
| 15 | Integrations not complete (depth/per-provider) | W6 |
| 16 | Appointments: staff block time off → admin notified → approve/reject | W7 |
| 17 | Marketing: new listing/ad builder must be intuitive, simple, mobile-first, images+video | W8 |
| 18 | Start an ad from an inventory item AND support non-inventory subjects (app, service, custom) | W8 |
| 19 | Add TikTok ads (not just Meta/YouTube/Google) | W8 |
| 20 | AI video ad generation (HeyGen-style), chat-to-build, format/style per platform, edit-via-chat, one-click deploy; not all ads are video (fliers/images too) | W9 |
| 21 | Advanced ad analytics + performance monitoring; must work for non-goods subjects | W10 |

## Audit corrections (so the plan is honest)

- **`/communications/templates` does render** — it's a real grid with category filters. The gap: the **"Clone/Edit" button has no handler** and there is **no template editor/create route**, so you can't actually view-in-full or edit a template. That's why it feels broken.
- **Team chat exists** (`src/pages/sales/team/chat/index.tsx`, ~300 lines) — not missing; needs a completeness pass, not a build.
- **Integrations is more complete than it looks** — 24 providers, a working generic connect/test/disconnect flow, and a dynamic `[id]` detail page. The real gap is **per-provider setup guidance + real OAuth/webhook wiring** (mostly backend), not missing pages.
- **Dashboard quick actions already has 6** (New sale, Add item, Receive stock, New customer, Scan label, Add expense) — not 4. We'll still review the set for relevance + role/industry awareness.
- **Settings has 7 genuinely missing pages** reachable from the hub: `team, billing, api, webhooks, automations, export, audit` — routes exist, files don't → broken/empty renders.

---

## W1 — Marketing-site copy & positioning (quick)
**Goal:** Kill the remaining robotic / non-selling-point copy.
**Scope:**
- Replace the **"Role-based access, biometric unlock"** feature card with a real selling point: team accountability + the right access per person (cashier/rep/marketer), multi-cashier, live audit. Biometric becomes a one-line security footnote, not a headline.
- **De-emphasize Face ID** in the device pills (`landing.tsx` DeviceShowcase) — drop "Face ID" from the iOS pill; it's table-stakes, not a reason to buy.
- Replace the **"<3s Opens on 4G"** stat with **"Works offline"** (or "Sells through a power cut") — already true and a stronger hook.
- **Em-dash sweep**: replace " — " AI-tells across `landing.tsx`, `about.tsx`, `pricing.tsx`, `faq.tsx` with periods/commas/parentheticals so copy reads human.
- Final read-through of all marketing-site copy for any remaining generic lines.
**Backend:** none. **Size:** ~1–2 hrs. All frontend.

## W2 — App-shell mechanics & polish (cross-cutting)
**Goal:** Fix the shell-level papercuts that touch every screen.
**Scope:**
- **Splash re-show fix.** Cause: navigating to a lazily-loaded heavy route (POS) shows the Suspense fallback (`ContentLoader` in `App.tsx`) over a fading `RouteTransition`, which reads like the cold-start splash. Fix: (a) give route-level Suspense an **in-app skeleton** that never resembles the boot splash; (b) keep the previous page painted during chunk load (or render skeleton in the content region only, sidebar/header stay); (c) **prefetch the POS chunk** on idle / on hover of the POS nav item. Ensure the `index.html` splash markup is never reused for route loads.
- **Workspace switcher dedupe.** On desktop both `OrgLocationSwitch` (header) and `WorkspaceSwitcher` (inside user menu) show org+location. Keep the header switcher on desktop; **hide `WorkspaceSwitcher` on desktop**, keep it for mobile (where there's no header switcher).
- **Location/shop list max-height + scroll.** `workspace-switcher.tsx` OptionList animates height but has no cap. Add `max-h-[…] overflow-y-auto` **while preserving the framer-motion grow animation** (animate height to a capped value; inner list scrolls). Same treatment anywhere a long org/location list can appear.
- **Select collision flip-up.** The custom `ui/select.tsx` uses absolute positioning, `max-h-60`, no portal, no flip — so inside a bottom sheet near the screen bottom it opens downward and gets clipped. Add **viewport-aware flip** (measure trigger rect; open upward when near bottom) and ensure it isn't clipped by the sheet's `overflow-y-auto` (portal to body or `position: fixed`). Reference: jaxtechnology's floating select. This unblocks W3.
- **Business logo instant preview.** `settings/business` logo is a bare file input. Add `onChange` → `URL.createObjectURL` → show the chosen logo immediately (with the brand-mark fallback). Upload %/persistence deferred to backend.
- **Dashboard quick-actions review.** Confirm/trim the 6-action set; make it **role- and industry-aware** (e.g. a kitchen sees "New prep", a service business sees "New appointment"); verify mobile 3-col layout. Consider adding "New listing/ad" once W8 lands.
**Backend:** logo upload %, real org list (events already abstracted). **Size:** ~1–1.5 days. Mostly frontend.

## W3 — Quick-add overlay expansion
**Goal:** Extend the well-received customers quick-add (modal on desktop / bottom-drawer on mobile) to every list page where a *simple* create suffices, keeping rich creates as full pages.
**Scope:**
- Audit every list/index page and classify: **quick-add overlay** vs **stays a full page** (rich/multi-step). Likely overlay candidates: discounts, tax rates, warehouses/locations (done some already), vendors, customer segments, expenses, simple appointment, printers, roles-lite. Stays full page: inventory item (rich), recipe/BOM, invoice/order, storefront product, campaign/listing.
- Reuse `BottomSheet` (responsive) + the existing `add-*-dialog` pattern. Each overlay: minimal fields + "More details →" to the full page.
- Depends on **W2 Select flip-up** so selects inside the drawers behave near the bottom.
- Deliver a short matrix in this doc of page → decision.
**Backend:** none (mock-prepend like customers). **Size:** ~1.5–2 days. Frontend.

**Decision matrix (overlay = quick-add modal/drawer; page = keep full /new):**
| Entity | Decision | Status |
|---|---|---|
| Customer | overlay (`add-customer-dialog`) | ✅ done |
| Discount | overlay (`add-discount-dialog`) | ✅ done |
| Expense | overlay (`add-expense-dialog`) | ✅ done |
| Tax rate | overlay (`add-tax-rate-dialog`) | ✅ done |
| Warehouse | overlay (`add-warehouse-dialog`) | ✅ done |
| **Vendor** | overlay (`add-vendor-dialog`, "More details" → /new) | ✅ done (W3) |
| **Printer** | overlay (`add-printer-dialog`, no full page needed) | ✅ done (W3) |
| Inventory item | **page** — rich (variants, recipe, stock, images) | keep |
| Recipe / BOM | **page** — rich builder | keep |
| Sales order / invoice / shipment / return | **page** — multi-line money docs | keep |
| Purchase order / bill / receipt / vendor-credit | **page** — multi-line money docs | keep |
| Team member / role | **page** — invite flow + permission matrix | keep |
| Payment account / withdrawal | **page** — sensitive / KYC | keep |
| Storefront product | **page** — rich (media, variants, SEO) | keep |

## W4 — Communications completeness
**Goal:** Make the whole Communications section real and editable.
**Scope:**
- **Template editor + create.** Add `/communications/templates/new` and `/communications/templates/:id` editor pages (subject + rich body + token manager + category + preview). Wire the dead **Clone/Edit** button: builtin → clone into an editable user copy; user template → edit. Add a **preview modal** and delete-with-confirm. Make "view my templates / edit them" actually work.
- **Message detail/preview** page (or drawer) so inbox rows open; add read/unread, bulk select + bulk actions, and an attachment field on compose.
- **Provider routing** in compose: choose channel (email / WhatsApp / SMS) per the connected integrations, not email-only (UI now, send deferred to backend).
- **Team chat pass**: it exists — verify it works end-to-end (channels, history, presence placeholders), align with the socket plan, fix any dead controls.
- Sweep the Communications nav/submenus for any other dead buttons.
**Backend:** real send (Resend/Mailgun/WhatsApp/Twilio), socket chat, attachment upload. **Size:** ~2–3 days. Frontend now, backend later.

**Progress (2026-05-26):** ✅ DONE — template **create/edit/clone/delete/preview** (kv store `lib/comms/storage.ts`; editor at `/communications/templates/new` + `/:id`; the dead Clone/Edit button now works; builtins clone into editable copies; live preview + token auto-detection; delete-with-undo). ✅ Inbox **message detail drawer** (rows opened nowhere before — now open a read drawer + mark-as-read; drafts still open the composer). ⏳ REMAINING (lower value / backend-gated): provider routing in compose (email/WhatsApp/SMS picker), attachment upload UI, team-chat deep pass.

## W5 — Commissions completeness
**Goal:** Turn the commissions ledger into a comprehensive system.
**Scope:**
- **Commission rule engine** (data layer + config UI): rates/tiers by role (affiliate vs sales-rep), by product/category, by performance threshold (e.g. +1% over ₦X), per-rep overrides, time-boxed rates. Today rates are hardcoded per entry.
- **Per-rep commission statements**: a rep detail view with earned/pending/approved/paid history, breakdown by order, period-over-period compare, dispute/adjustment note. Link from the leaderboard and to `/affiliate/dashboard`.
- **Payout workflow**: approve/reject with reason, batch pay (Paystack), receipts; **WHT** calculation + statement (lifecycle text already promises it); **export** (CSV/PDF); GL posting hook (commission → expense) tying into the accounting auto-post track.
- Clarify affiliate vs sales-rep attribution (which sale earned whose commission).
**Backend:** payouts, GL posting, WHT filing. **Size:** ~3 days. Frontend rules/statements now; payouts backend-blocked.

**Progress (2026-05-26):** ✅ DONE — the ledger is now **functional, not mock**: real approve / **reject** / pay **state machine** (single row, bulk-selected, and hero batch; entries are stateful), **WHT** (5% NG default — `whtOf`/`netOf`, net shown per row + in the payout hero + statement), **per-rep statement drawer** (click any recipient → all their entries + pending/approved/paid/lifetime totals), CSV export now carries gross/WHT/net. Reject is undo-able. ⏳ REMAINING: the **commission rule engine config** (define default + per-role rates, tiers, per-rep overrides) — larger build; rates are still per-entry. Per-rep statement currently read-only (no dispute workflow).

## W6 — Settings & integrations completeness
**Goal:** No broken settings tiles; integrations gain real depth.
**Scope:**
- **Build the 7 missing settings pages** (routes exist, files don't):
  - `billing` — subscription (Starter/Growth/Scale), **AI credits balance + top-up + usage**, add-ons, invoices. Ties to the pricing model + `api/billing` in BACKEND_PLAN.
  - `api` — API keys (create/revoke/scopes, masked).
  - `webhooks` — endpoint registration + event log + secrets.
  - `automations` — simple "when X then Y" rules hub (e.g. low-stock → email).
  - `export` — full data export (CSV/zip), GL export link.
  - `audit` — activity-log viewer (also serves the accounting audit-log gap).
  - `team` — decide: build, or redirect/merge into `/settings/users` (avoid duplicate). Recommendation: redirect to `users`.
- **Integrations depth**: bespoke setup guidance for the NG-first providers that currently fall to the generic page (Paystack, Flutterwave, Opay, PalmPay — webhook/settlement instructions), plus a clearer connect/test state. Real OAuth/webhooks are backend.
- Verify no other settings hub tile is a dead link.
**Backend:** billing/credits, API keys, webhooks, real export, audit feed, OAuth. **Size:** ~3–4 days. Frontend shells now; data backend-blocked.

**Progress (2026-05-26):** ✅ DONE — built all 6 missing pages + routes + settings-hub tiles (new "Developer & data" group): **billing** (plan + AI-credit meter with top-up packs + add-ons + invoices, ties to pricing model), **api** (key create→reveal-once→revoke), **webhooks** (endpoint + event picker, pause/resume/delete), **automations** (when→then rule toggles), **export** (per-dataset + export-everything, format picker), **audit** (filterable activity log). **Team** intentionally folds into the existing Users tile (no duplicate page). NOTE: the earlier audit's claim that these had routes-but-no-files was wrong — they had neither; now built. ⏳ REMAINING: per-provider integration setup guidance (Paystack/Flutterwave/Opay/PalmPay webhook instructions) + real OAuth/connect (backend).

## W7 — Appointments: staff availability & leave
**Goal:** Staff can block time off; admin is notified and approves/rejects.
**Scope:**
- Staff can mark **unavailable blocks / leave requests** on their calendar (date range, reason, all-day or partial).
- Request enters a **pending** state; **admin notification** (notification center + push later) with **approve/reject** (reason on reject).
- Approved leave reflects on the calendar (staff shown unavailable; booking prevented during leave); rejected returns to available.
- Roles: who can request vs approve (RBAC). Mobile-first request flow (quick-add overlay per W3).
**Backend:** persistence, notifications/push, calendar sync. **Size:** ~2 days. Frontend now.

**Progress (2026-05-26):** ✅ DONE — "Time off & leave" on /appointments: staff **request** time off (staff, date range, all-day toggle, reason) via overlay → enters **pending** → admin **approve / reject** (reject takes an optional note shared back) → **approved leave reflects on the calendar** (amber day markers + an "On leave: names" banner on the selected day). Toasts stand in for the admin notification/push (backend wires real notifications + persistence + RBAC gating of request-vs-approve).

## W8 — Marketing builder rework (mobile-first)
**Goal:** A best-in-class, simple ad/listing builder that beats competitors, on mobile first.
**Scope:**
- **Add TikTok ads** as a first-class channel; refactor channels to be **data-driven** (one config array → dashboard cards, listing form toggles, routes, integration provider). Slots: `index.tsx` CHANNELS, `listings/new` Channel union, `lib/integrations/data.ts`, routes. (Also tidy Google/YouTube naming.)
- **Subject types** so ads aren't goods-only: **Product (from inventory) · Service · App · Custom**. Inventory picker uses real catalog search (mocked now); non-inventory subjects take a free-form title/description/media + destination URL.
- **Rework `/marketing/listings/new`**: mobile-first, dead-simple, comprehensive. Multi-image upload + **video** (with thumbnail), per-channel **live preview** (how it looks on Feed/Reels/TikTok/Marketplace), budget/audience/schedule with sane defaults, draft + publish-to-selected-channels.
- Make the per-channel "new-campaign/new-listing" wrappers share the reworked builder.
**Backend:** Meta/TikTok/Google ad APIs, media upload, publish. **Size:** ~3–4 days. Frontend now.

**Progress (2026-05-26):** ✅ DONE — reworked `/marketing/listings/new` into a real ad/listing builder: **subject types** Product / Service / App / Custom (ads no longer goods-only — non-product subjects take a destination link + their own CTA), **real catalogue picker** (loadAllCatalog, pre-fills title+price), **multi-image + video** upload with thumbnail previews + remove, **TikTok** added as a publish channel (data-driven channel list), **live preview** social-post card that updates as you build, ₦-currency via useCurrency, budget section gated to paid channels. Added the **TikTok Ads channel page** (`/marketing/tiktok-ads`) + route + dashboard card. ⏳ REMAINING: per-channel preview variants, dedicated TikTok new-campaign/new-listing wrappers (currently point to the unified builder), real publish/media-upload (backend).

## W9 — AI ad generation (credits-metered)
**Goal:** Generate ads — copy, fliers/images, and video — from a chat-style builder.
**Scope:**
- **Chat-to-build** surface inside the ad builder: describe the ad → generate **copy + image/flier + short video**. Not all ads are video — support image/flier/carousel/text too.
- **Video** via a HeyGen-style provider; **format/style presets per platform** (Reels/TikTok vertical, YouTube, Feed square), pulling product media/price when subject = inventory item.
- **Edit-via-chat** preview loop ("make it shorter", "warmer tone", "swap the hook"), then **one-click deploy** to the selected social channel(s).
- **Credits metering** (debits `org.aiCredits` per BACKEND_PLAN `api/billing`); graceful "top up" prompt at zero.
- Entry point: from the builder after choosing a subject (inventory item or custom).
**Backend:** generation providers (HeyGen/image/LLM) behind a worker, media to S3/B2, publish, credit ledger. **Size:** ~4–5 days. Heavily backend; frontend builds the chat UX + previews against mocks first.

**Progress (2026-05-26):** ✅ DONE (frontend UX, mock generator) — AI ad studio at `/marketing/generate`: pick subject (inventory item / service / app / custom), format (video/flier/carousel/caption, each with a credit cost), platform (Reels/TikTok/Feed/YouTube → drives 9:16 vs 1:1) and tone; **chat-to-build** thread that generates a draft (headline + body + hashtags + media preview) and **refines** on follow-up prompts; **credits metered** (debits per generation, out-of-credits → Billing top-up); **vertical/square live preview**; copy-to-clipboard; **one-click "Deploy to channels"** → the W8 builder. Entry point: "Generate with AI" on the Marketing dashboard. ⏳ REMAINING: real generation provider + media upload + true credit ledger (backend — already specced in BACKEND_PLAN api/marketing + api/billing).

## W10 — Ad analytics & performance monitoring
**Goal:** See and act on ad performance across channels, for any subject.
**Scope:**
- Per-campaign + **cross-channel** analytics: spend, impressions, clicks, conversions, **ROAS**, CPA, with attribution windows.
- **Performance monitoring**: alerts (ROAS below threshold, budget pacing), optimization suggestions, A/B variant comparison, auto-pause rules surfaced.
- Works for **non-goods subjects** too (app installs, service leads — track the relevant conversion event, not just product sales).
- Tie insights into the dashboard AI insight cards.
**Backend:** ad-platform metric sync (cron), conversion events, attribution. **Size:** ~2–3 days frontend; data backend-blocked.

**Progress (2026-05-26):** ✅ DONE — `/marketing/analytics` (linked from the dashboard "Ad performance" card): **goal-aware** (ROAS for sale campaigns, **CPA vs target** for app-install + lead campaigns — so it's not goods-only), KPI band (spend / blended ROAS / conversions / avg CPA), **monitoring alerts** derived from the data (low-ROAS = losing margin, CPA over target, top performer to scale), a per-campaign table with spend bars + per-goal result badges, an **A/B test** card with a winner call, and an **optimization suggestions** list. Mock data; backend wires real metric sync + attribution.

---

## Frontend-doables follow-up (2026-05-26, post-program)
Knocked out the documented remaining items that don't need the backend:
- **W5 commission rule engine config** — `lib/commissions/rules.ts` (default + per-tier + per-rep rates, `resolveSaleRate`) + a "Rules" drawer on `/accounting/commissions` with a live effective-rate preview.
- **W4 composer** — "Send via" channel picker (Email/WhatsApp/SMS; subject hidden for SMS/WhatsApp), real **Attach** (file input → chips with remove), and the template picker now includes the user's own templates.
- **W8 per-channel ad previews** — the builder's live preview now switches chrome per channel (Reels/TikTok vertical, YouTube 16:9, Marketplace listing, Feed square) via a channel tab row.
- **W6 per-provider integration guidance** — numbered setup guides for Paystack / Flutterwave / OPay / PalmPay on the integration detail page (shown pre- and post-connect).
Still backend-gated only: real send/publish/OAuth/credit-ledger/generation/metric-sync, plus minor polish (team-chat deep pass, TikTok campaign/listing wrappers, commission dispute workflow).

## ✅ Program complete (2026-05-26)
All ten waves shipped and pushed (commits 1086728 → this one). Each wave's
remaining items are **backend-gated** (real send/sync/publish/OAuth/credit
ledger/generation providers) and already specced in `BACKEND_PLAN.md`, or
small documented polish (per-channel ad previews, commission rule-engine
config, compose attachments/provider-routing, per-provider integration
guidance). The frontend completeness pass is done.

---

## Suggested order & dependencies
1. **W1** (quick copy) → **W2** (shell mechanics; W2 Select fix unblocks W3) → **W3** (overlays).
2. Content completeness in parallel-ish: **W4** (comms), **W5** (commissions), **W6** (settings/integrations), **W7** (appointments).
3. Marketing program last (biggest): **W8** (builder) → **W9** (AI gen) → **W10** (analytics). W9 depends on the credits/billing backend (`api/billing`) and a generation provider.

MVP-of-this-plan to ship visible value fast: **W1 + W2 + W3**. Then pick the highest-pain content wave (likely **W4** or **W6**).

Related backend spec: `docs/BACKEND_PLAN.md` (`api/billing` credits, `api/marketing` AI gen). Memory: `project_marketing_site_and_pricing.md`, `project_waves_progress.md`.

---

# Round 2 — Post-meeting waves (2026-05-30)

Captured from a customer interview with a business owner running on SAP-style ERPs.
Six gaps surfaced that **W1–W10 do not cover**. Same principles apply:
**mobile-first, simplicity over features, industry-agnostic, no hard module gating.**

## Coverage map (new pain points → wave)

| # | Pain point (his words / paraphrase) | Wave |
|---|---|---|
| 1 | "Why am I seeing restaurant things in a retail business?" — industry-specific terms + default surfaces per industry | W11 |
| 2 | "Customer got 90 of 100 — 10 damaged. Resolution team sees a ticket, routes to handler, handler messages customer, refund or replan delivery" | W12 |
| 3 | "AI to tell me what's selling least / most, and what button to click to add an item" | W13 |
| 4 | "Inventory reorder level report" — the one-page 'what do I need to reorder today' view | W14 |
| 5 | "Port their data — migration from SAP / ERPs should be easy" | W15 |
| 6 | "Admin sees an extended view of every store, or selected, or one" | W16 |

## Observations before the waves

- **`SEP apps` is almost certainly SAP**, transcribed by ear. SAP Business One / S/4HANA. The migration ask (W15) is designed around the SAP / Odoo / QuickBooks ecosystem.
- **"Inventory reorder level report"** is a standard ERP page. We already have the data (per-item `reorderPoint` in the catalog + a "Low stock" KPI on `/inventory`). W14 is mostly **UX surfacing** — promote the existing data to a named page with a 1-click "Create PO" — small build, outsized perception.
- **The "let admins disable modules in settings" request is the right symptom, wrong cure.** Hard module gating creates orphan records, broken deep links, "where did X go?" support burden, and undermines the cross-industry moat (memory: `feedback_no_hard_modules`). **W11 takes the safer route**: per-industry sidebar curation + a per-user "Hide section" preference. Routes and data stay live; only the chrome filters. If you want literal module toggles after seeing this, override here and we'll wire it as data-preserving "soft" toggles only.
- **The customer-relations ask is bigger than `/communications` covers.** Communications today is templates + outbound messaging. The customer wants a **case lifecycle**: open → assigned → in-progress → resolved, **with attached refund/replacement/redelivery records**. That's W12 — built on top of communications, not replacing it.
- **The AI ask is two distinct surfaces stitched onto one chat.** Data Q&A routes to deterministic aggregators ("what sold least?"). App help routes to a glossary/nav index ("how do I add an item?"). Both feel the same to the user; both can live at `/ai`.
- **"Industry-specific terms"** is *not* the same as "industry-specific features". We keep one engine (no vertical modules — memory: `project_recipe_bom_system`) and swap **display vocabulary** at the i18n layer. Restaurant says "Ingredients / Menu items / Recipes"; salon says "Products / Treatments / Packages"; same database, same logic.

---

## W11 — Industry vocabulary & sidebar curation
**Goal:** "This app gets us." Same engine, different language and default surfaces per industry — without hard module gating.

**Scope:**
- **Vocabulary layer.** `src/lib/i18n/industry.ts` — keyed term map per industry. Initial keys: `item.singular/plural`, `composite.title`, `recipe.title`, `production.title`, `lot.title`, `service.title`, `category.title`, `bundle.title`, `customer.title`, `vendor.title`. Industries seeded: retail (default), restaurant/QSR, salon/spa, hospital/pharmacy, apparel, manufacturing, services. Examples:
  - Restaurant → `item="ingredient"`, `composite="menu item"`, `lot="batch"`
  - Salon → `item="product"`, `service="treatment"`, `bundle="package"`
  - Hospital → `item="consumable"`, `service="procedure"`, `vendor="supplier"`
  - Fallback to retail for any unseeded key.
- **Hook:** `useTerm("item.plural")`. Used in page titles, table headers, empty-state copy, nav labels, command-palette labels, glossary, dashboard tiles. Quiet enough that it doesn't change *what* a page does — only how it reads.
- **Default sidebar curation per industry.** Onboarding's industry pick seeds a sidebar profile (e.g. brick-only restaurant hides `Storefront` by default; retail hides `Appointments` by default; services hides `Production/Lots`). Stored in `org.settings.navProfile`. **Routes still live, deep links still work, data still accumulates** — only `NAV`'s render filter changes. Reachable via search/command palette.
- **Per-user "Hide section" preference.** Settings → Personal → Sidebar. Checkboxes per section, persisted via `kvJson`. Doesn't affect other users or data.
- **Glossary follows vocabulary.** `help/glossary` reads `useTerm` so the help docs speak in the same words the user sees in the UI.
- **Onboarding upgrade.** "Pick what your business is closest to" → preview the renamed nav before confirming.

**Backend:** org-settings persistence for the industry profile (kv today); per-user prefs already kv. No new endpoints needed for v1. **Size:** ~2 days. All frontend now.

**Decision needed:** confirm "hide from sidebar" (current direction) vs literal "disable module". Memory: `feedback_no_hard_modules`.

---

## W12 — Customer relations: tickets, resolution, partial fulfillment
**Goal:** When a customer says "I got 90 of 100, 10 damaged" — a ticket exists, the right person sees it, they message the customer back, they resolve it with the right financial/inventory action attached. One screen, one workflow, no swivel-chair.

This is the biggest of the post-meeting waves. Designed to **build on `/communications`**, not replace it — every message in a ticket creates a comms record under the hood.

**Scope:**

**Ticket entity & lifecycle**
- New module: `src/pages/sales/tickets` (queue + detail + new) and a customer-facing entry in `src/pages/storefront/orders/[id]` ("Get help with this order"). Sidebar entry under **Sales** labelled per W11 vocabulary ("Customer issues" / "Guest issues" / "Patient issues").
- States: **new → triaged → assigned → in-progress → awaiting-customer → resolved → closed**, with **reopen** from closed within configurable window (default 14 days).
- Categories: `damaged-in-transit`, `missing-items`, `wrong-items`, `defective`, `late-delivery`, `billing-issue`, `refund-request`, `service-quality`, `other`.
- Priority: `low | normal | high | urgent`. **Auto-urgent rules:** order value > ₦X, or category in {damaged, missing-items, late-delivery} for VIP customers, or > 10% of order value affected.
- Linked entities: **order** (sales or storefront), **customer**, **affected line items + qty** (so "10 of 100 damaged" is a real shape, not just free text), **shipment** (if applicable), **internal owner**, **conversation thread**, **resolution actions** (see below).

**Intake (where tickets come from)**
- **Storefront "Get help" widget** on order-detail pages → guided form (which order, which items, what happened, photo upload). Creates ticket auto-linked to order/customer/items, status = `new`.
- **Manual create from POS / sales / storefront** — staff captures a walk-in or phone complaint. Customer picker + (optional) order picker + line picker. One-tap from a sales-order detail page: "Open ticket about this order."
- **Inbound channels (backend-gated):** WhatsApp / email / SMS — auto-create or auto-attach to ticket when the message references a known order # or customer.

**Routing & ownership**
- **Auto-route rules** in `src/lib/tickets/routing.ts`: category → team (damaged → Operations; billing → Finance; defective → Returns; service-quality → Floor Manager). Location-aware (route to the local team for the relevant warehouse/branch first).
- **Assignment modes (per team):** round-robin, least-loaded, manual. Reassignable mid-flight; reassignment posts a system note in the thread.
- **Notifications:** in-app + push (when FCM is live) for assignee on (new assignment / customer reply / SLA breach approaching). Email digest for managers (backend).
- **SLA timer** per priority (urgent: 2h first response + 24h resolution; high: 6h+48h; normal: 1d+5d; low: 3d+10d). Visible on every queue row and the detail header. Stalled tickets escalate to the team manager.

**Resolution actions (this is the hinge that makes it real)**
A ticket can attach one or more **resolution actions**, each producing a real record in the relevant module so the financial picture stays correct:
- **Refund** (full, or partial by qty / amount) → creates a POS refund or sales refund, posts to the ledger (accounting auto-post is already in place).
- **Replacement order** → creates a new sales order for the affected qty, ships to the same address, flagged `replacement-for: <ticket>` so it **doesn't double-count revenue** in reporting.
- **Replan delivery / new shipment** → creates a new `sales/shipments` record for just the missing/damaged qty. No new revenue, just fulfillment.
- **Store credit** → posts to the customer ledger.
- **Apology + discount code** → generates a single-use discount tied to the customer, expires 30/60/90d.
- **No action** → closed without remedy (with required reason).

Multiple actions can stack: "refund the 10 damaged + send a 5% future-order discount" is two actions on one ticket.

**Customer communication (the "message customer" piece)**
- Every ticket has a **two-way thread**. Outbound channel honours the customer's preferred channel (email / SMS / WhatsApp), with templates from W4.
- **Macro replies** seeded per category: damaged-acknowledgement, late-delivery-update, refund-issued, replacement-on-its-way, awaiting-photo, resolved-thanks.
- "Message customer" composer **inside the ticket detail**. Picks channel + template; can auto-attach a "refund issued for ₦X" or "replacement order #Y created" snippet when a resolution action just fired.
- Customer's reply (when inbound channels are wired) appears in the thread; ticket status auto-flips `awaiting-customer → in-progress`.

**Queue & detail UX**
- **Queue** (`/sales/tickets`): filterable list — status, category, priority, assignee, my-team, SLA-breaching, by-location. Card row shows ticket #, customer, order #, age, SLA chip, last action. Mobile-first layout (swipeable rows reuse `mobile/swipeable-row`).
- **Detail** (`/sales/tickets/[id]`): single-page layout with:
  - Header: ticket #, status pill, SLA chip, assignee
  - Left: timeline (status changes + customer/internal messages + resolution actions interleaved chronologically)
  - Right: affected lines panel (with qty inputs), customer info side panel, order/shipment links
  - Bottom action bar: Resolution drawer ("Issue refund", "Create replacement", "Send message"), internal notes (not customer-visible).
- **Empty state**: "No open issues. Last resolved: ticket #1284, 12m ago."

**Reporting**
- **Tickets dashboard** (`/reporting/tickets`): volume by category, by location, avg time-to-resolve, refund-vs-replacement split, repeat-issue rate per customer, CSAT (1-tap rating sent on close — opt-in).
- Surfaces into dashboard AI insight cards: *"Damaged-in-transit tickets up 40% from Lagos warehouse this week — likely shipment-handler issue."* Insights engine already supports this shape (`category: "system"` or new `"support"`).

**RBAC**
- New permissions: `tickets:view`, `tickets:assign`, `tickets:resolve`, `tickets:refund` (latter gated by `pos:refund` existing perm).
- Default roles: Manager + Owner have full; Sales-rep can create/view their assigned + view own customer's; Marketer no access by default; Custom team roles toggle per area (matches `lib/team/types.ts` shape).

**Backend (what real implementation needs):**
- Ticket CRUD with linked-entity FKs to orders / customers / shipments / refunds.
- Routing engine (rules-eval on ticket create + on category change).
- SLA timers via BullMQ (first-response, resolution, breach-escalation jobs).
- Inbound channel webhooks: WhatsApp Business, Mailgun inbound parse, Twilio SMS inbound.
- Outbound send routing through the same providers (W4 backend territory).
- CSAT follow-up job (e.g. 24h after `closed`).
- Push notifications via pallio-fcm.

**Size:** ~5–6 days frontend (queue + detail + intake + resolution drawer + reporting + dashboard hookup). Backend ~2–3 weeks (worker + provider wiring + SLA scheduler).

**Frontend can ship against mocks first** — every ticket CRUD/transition/action is kv-backed for now (same approach as `lib/sales/data.ts`), with mock customer replies on a timer to demo the inbound side.

---

## W13 — AI assistant (data Q&A + app help)
**Goal:** Replace the `/ai` placeholder with a real assistant that answers two question shapes on one chat: "what's selling least at Lagos last month?" and "how do I add an item?"

**Scope:**
- **One chat surface at `/ai`**. Auto-routes each prompt to one of two handlers behind the scenes — no UI toggle.
- **Data Q&A handler.** A deterministic query layer reading the same in-memory catalog/sales/inventory/orders/tickets state the rest of the app uses. Initial canned intents: top sellers, slowest sellers, dead stock, margin leaderboard, customer top spenders, supplier on-time rate, location compare, **open tickets by category** (W12 hookup). Each maps to a small JS aggregator over our state. The LLM picks the intent and parameterizes it (timeframe, location, category); the aggregator runs deterministically and the LLM only writes the prose around the result. **Important:** the LLM never sees raw rows of customer data — only the aggregated result. This is also a privacy/compliance win.
- **App help handler.** Vector or keyword index over `help/glossary` + page titles + nav labels (using W11 vocabulary so the help speaks the user's terms). Answers "how do I X?" with a short answer + a deep link to the right page + (where applicable) a "do it for me" CTA that opens the matching new-form pre-filled.
- **Sources visible.** Every answer shows what was queried (intent name + filters) or which help page was cited. One-click "show me the data" opens the matching reporting page pre-filtered.
- **Credits metering.** Same `org.aiCredits` ledger as the W9 ad studio. Credits widget in the chat header.
- **Quick suggestions** in the empty state: "What sold least last week?", "How do I issue a refund?", "Reorder list for Lagos", "Open tickets older than 24h", "How do I add a recipe?"
- **Conversation history** persisted per user (kvJson initially), exportable from W6 export module.
- **Existing design reference**: `docs/AI_CHAT_BACKEND.md` already covers the chat backend in depth — prompt assembly, tool registry, multi-provider fallback, SSE contract. W13 implements its frontend half.

**Backend:** LLM provider (Anthropic API per `claude-api` skill), vector index for help pages (or keyword for v1), credit-ledger debit, conversation persistence, tool registry from `AI_CHAT_BACKEND.md`. Data Q&A handlers are app-side, no new endpoints for them. **Size:** ~3 days frontend (chat surface, intent layer, sources panel, history). Backend ~1 week (provider + vectors + credits + SSE).

---

## W14 — Reorder Report & buyer's morning view
**Goal:** The buyer opens the app and sees "here's what to reorder today" — one page, one action.

**Scope:**
- New page **`/reporting/reorder`**. Table of every SKU at or below reorder point: name, location, on-hand, reorder point, average daily sell-through (derived from movements), days-of-cover remaining, preferred supplier, supplier lead time, suggested order qty (default: `reorderPoint * 2 - onHand`, editable inline).
- **Filters:** location, supplier, category, "below safety" (under safety stock) vs "at point" (between safety and reorder point), supplier lead time.
- **Suggested PO grouping**: rows group by supplier with a per-supplier "Create PO" button → opens `/purchasing/pos/new` pre-populated with that supplier's selected lines and qtys.
- **Bulk select** → "Create POs" → splits into N draft POs by supplier in one action.
- Surfaces the same data as a dashboard card ("12 SKUs below reorder — review").
- Honours W11 vocabulary (restaurant sees "Ingredients to reorder", retail sees "Items to reorder", hospital sees "Consumables to reorder").

**Backend:** none beyond existing inventory (sales velocity derivable from `recordStockMovement` log). **Size:** ~1 day. All frontend now.

---

## W15 — Migration: CSV importer + ERP exit ramps
**Goal:** A SAP / Odoo / QuickBooks user can move to Pallio in an afternoon, not a quarter.

**Scope:**
- New page **`/settings/import`** (and a landing-site CTA from pricing: "Coming from SAP, Odoo, or QuickBooks?").
- **Datasets supported (v1):** Customers, Suppliers/Vendors, Items (with units / categories / brands), Item stock-on-hand per location, Chart of Accounts, Open invoices (AR), Open bills (AP).
- **Per-dataset flow:** download template CSV → upload filled CSV → **column mapper** (auto-match known headers from SAP/Odoo/QuickBooks/Generic; manual remap; remember mapping per source) → **preview & validate** (per-row errors inline, "fix and re-upload only failed rows" affordance) → commit → **undo within 30 minutes** (writes a reverse-set to the audit log).
- **Source presets:** SAP B1, Odoo, QuickBooks Online, Zoho Books, Sage 50, Generic CSV. Each preset knows the source's column names so the mapper pre-fills.
- **Export side** (extends W6 export): make sure every importable dataset also has "Download as CSV" using the **same column shape** — so customers can round-trip and don't feel locked in. This is a sales argument as much as an engineering decision.
- **Audit log** entry per import: who, when, dataset, row counts, error counts. Reuses W6 audit module.
- **Landing-site copy hook (W1 follow-up):** "Switch from SAP in an afternoon" tile on `/marketing/pricing` — links to `/settings/import` after trial signup. Real moat against the SAP-tax pain point this customer raised.

**Backend:** import worker (BullMQ), staging tables per dataset (don't write to live tables until validate passes), validation library, undo window (30-min reverse-set). **Size:** ~3 days frontend (per-dataset flow, mapper, presets, error display). Backend ~1 week (workers, validation, undo).

---

## W16 — Multi-location aggregation toggle
**Goal:** Admin chooses **All / pick / one** location once, every page respects it.

**Scope:**
- Global location scope dropdown in the app shell, next to the org switcher (extends existing `OrgLocationSwitch`). Modes: **All locations** (default for HQ admin), **Pick subset** (multi-select), **Single location**. Persists per user.
- A shared hook `useLocationScope()` → returns `{ ids: string[] | "all", names: string[], isAll, isSingle }`. Every data hook (dashboard, reporting, inventory, sales read-views, tickets) reads it and filters.
- **KPI surfaces show per-location breakdown** when scope is `All` or `subset` (mini-bar next to each metric, or expandable rows). Single-location view stays clean.
- **Reporting pages** get a per-location column when scope > 1, with totals row.
- **POS itself stays bound to the cashier's clocked-in location** (sale ops are local; you don't accidentally ring a sale at HQ). Only read-views/reporting respect the global scope.
- **Audit log** entries record the scope at the time of action ("Refund issued — scope: Lekki Phase 1") so it's easy to retrace.
- **Dashboard "compare locations" widget** when scope = All — small chart of top KPI per location.

**Backend:** none for scope plumbing; per-location filtering is already implicit in the data shape. Backend just needs to honour a `?locations=` query param. **Size:** ~2 days. All frontend now (`useOrgLocation` already exists; this layer adds the multi-select + the hook).

---

## Recommendations & priority order (Round 2)

**Ship order:**

1. **W14** (Reorder Report) — 1 day, no backend, immediate "they listened" signal. Do first.
2. **W11** (Vocabulary + sidebar curation) — 2 days, no backend, **highest perceived "this app gets us" lift per hour**. Do second.
3. **W16** (Location scope) — 2 days, no backend, unblocks multi-store admins. Do third — the dashboard becomes meaningfully more useful overnight.
4. **W13** (AI assistant) — 3 days frontend against mocks; ~1 week backend later. Start the frontend now in parallel with backend bootstrapping (already specced in `AI_CHAT_BACKEND.md`).
5. **W12** (Tickets & resolution) — 5–6 days frontend; the biggest build of the six but the **biggest competitive differentiator vs SAP** for SMBs. Do after the quick wins land. Frontend ships against mocks; inbound channels wait for backend.
6. **W15** (Migration importer) — 3 days frontend, 1 week backend. Do alongside or just after the backend bootstrap — the SAP/QuickBooks exit ramp is what gets enterprise-curious SMBs onto the platform.

**Cluster strategy:** W11 + W14 + W16 together is a single "we heard you" release (~5 days). Then W12 is its own release. Then W13 + W15 land with the backend phase.

**MVP-of-Round-2 to ship visible value fast: W11 + W14 + W16.**

Related: `docs/BACKEND_PLAN.md`, `docs/AI_CHAT_BACKEND.md`. Memory: `feedback_industry_agnostic_derivations`, `feedback_no_hard_modules`, `project_recipe_bom_system`, `project_inventory_catalog_source`.
