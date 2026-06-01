# Pallio — Master Plan (Mock completion → Snapshot → Backend → Wiring)

Created 2026-05-30 from a post-meeting alignment + a backend-reference audit (s-backend, jaxtechnology/backend, bigbite/backend).

This is the single roadmap to v1.0 — supersedes the "next-step" framing of `COMPLETENESS_WAVES.md` (which remains the source for W1–W16 detail). Master plan groups every remaining wave under one of four phases:

```
Phase A — Complete mock frontend (industry-aware, all gaps closed)
        ↓
Phase B — Snapshot: copy frontend/ → mock-frontend/ (preserve display app)
        ↓
Phase C — Build backend (forge-orm + hyper-express + mandatory fixes)
        ↓
Phase D — Wire frontend/ to real backend module-by-module
```

**Resume rule:** when continuing tomorrow / later, start by re-reading this file, then `COMPLETENESS_WAVES.md` for W1–W16 detail, then `BACKEND_PLAN.md` for the backend audit deltas. Memory pointer: `project_master_plan.md`.

---

## Decision on the backend pattern (locked in)

Use **forge-orm v1.2.0+** (your own MIT package, used in bigbite). Better than the s-backend fluent builder on every axis that matters: multi-DB ready (Mongo/Postgres/MySQL/SQLite from one schema), strings-only ids in JS (no ObjectId coercion at call sites), first-class relations + embeds, **built-in `npx forge` CLI** (`push`, `diff`, `diff apply`, `rollback`, `doctor`), **drift detection + auto-generated reconciliation migrations** with timestamped `migrations/*.sql` + `_forge_migrations` history table, **materialised views** (`.asView({ materialised: true })` + scheduled `refresh`), **soft delete** (`.softDeleteAt()`), **full-text search** (`.searchable()`), **OpenTelemetry helper** (`wireOtel()`), `strict` mode for typo-safety, native `decimal`/`uuid`/`bigint`/`.dbgenerated()`.

Lift bigbite's `core/database/forge.ts` wrapper pattern as-is (singleton + proxy + `rawDb` escape hatch). Add forge config to `package.json`: `"forge": { "schema": "src/core/database/schema.ts" }` (1.2.0 zero-config resolution).

**Seven mandatory deviations from the reference repos** (their gaps, not strengths to copy) — note: the migrations-runner deviation from the original list is **dropped** because forge 1.2.0 ships its own with rollback + drift detection, which is better than what we would have built:

1. **Vitest test suite from day one** — money-touching paths (ledger, refunds, sync ingest, period-lock, scope leakage) ship with tests or they don't merge.
2. **Module-augmented `Request` typing** — `declare module 'hyper-express' { interface Request { userId, orgId, locationId, role, ... } }` — kill the `(req as any)` casts.
3. **Tight JWT payload** — only `{ sub, orgId, locationId, role, tv }`. No profile fields in the token.
4. **`scopedDb(orgId)` wrapper** baked into the data layer. Auto-injects `orgId` into every filter. The single biggest correctness risk in multi-tenant SaaS is a missing scope. Pairs with forge's `strict: true` so any unscoped query throws.
5. **pino structured logging** with request-id correlator middleware + `wireOtel()` for forge query traces. The response envelope already has the `requestId` slot — populate it.
6. **zod-to-openapi pipeline** — single source of truth: zod DTOs → OpenAPI spec → generated TS client. Frontend stops hand-maintaining shapes.
7. **Crypto-safe randomness audit** — replace every `Math.random()` used for OTP/token/nonce with `crypto.randomInt`/`crypto.randomBytes`.

**Data-backfill migrations** (the one thing forge's runner doesn't do — it generates DDL diffs, not data transforms): keep a separate `migrations/data/<ts>_*.ts` folder run by a tiny `npm run migrate:data` script (just sequenced `for await` over a glob, recording in a `_data_migrations` collection). One file under 60 lines, ships in B1.

---

# Phase A — Mock-frontend completeness (F0 → F15)

**Principle running through every wave:** industry-driven curation at four levels — **vocabulary** (term swap), **sub-feature visibility** (sub-pages within a module), **button/CTA gating** (within a page), **dashboard surface** (KPIs + quick-actions). Built once in F1, applied everywhere after.

## F0 — UX correctness sweep (NEW, do FIRST)

**Why first:** there are dead buttons, broken modal states, and weak flows in the current mock (notably the POS payment process — doesn't feel like Square/Toast/Lightspeed yet). No point layering industry curation on top of UX that doesn't carry its weight. Fix the floor first.

**Scope — three sub-passes:**

### F0a — Dead-button & broken-flow audit
- Walk every page in `pages/` and identify:
  - Buttons with no `onClick` / no-op handlers
  - Submit buttons that don't show success/error state
  - Modal opens that don't have a close path on mobile
  - "View all" / "See more" links that route to 404 or empty pages
  - Empty states without a CTA
  - List rows that look clickable but aren't
- Output: a markdown checklist at `docs/UX_AUDIT.md` with file:line and severity (broken / weak / cosmetic).
- Fix-in-batches: split the checklist into ~5 PR-sized clusters by area (POS, Inventory, Sales, Accounting, Reporting/Settings).

### F0b — POS payment flow rebuild (Square/Toast-grade)
The current POS payment process is the biggest single UX gap. Compare against Square/Toast/Lightspeed and rebuild:
- **Charge screen:** big total, big "Tender" buttons (Cash / Card / Split / Other), tip prompt for hospitality (percent buttons 10/15/20/custom).
- **Cash flow:** numpad with denomination quick-buttons (₦500, ₦1000, ₦5000, ₦10000, ₦20000, Exact). Tendered amount + change due in giant type. Confirm → done.
- **Card flow:** "Insert/tap on terminal" handoff screen (mock for now), terminal-status simulator (`waiting → approved → done`), graceful "card declined" path with retry/switch-tender.
- **Split tender:** per-method amount entry, running balance, "remaining ₦X" pill, won't close until balance = 0.
- **Receipt-after screen:** Email / SMS / WhatsApp / Print / None — pre-filled from linked customer; one-tap send; auto-clear to new sale after ~3s with cancel.
- **Refund flow** parity with sale flow (same shape, reverse direction; reason picker required; partial refund per line).
- **Modal stacking:** keyboard-trap, ESC to close, focus return to invoking element, no overlay-tap leak.
- **Mobile-first:** every payment surface usable single-handed on phone. Bottom-sheet for the charge surface, not a centered dialog.

### F0c — Modal & overlay sweep across the app
- Apply the overlay-pattern rules (memory `feedback_overlay_pattern`): Dialog = centered modal everywhere; BottomSheet = drawer on mobile + modal on desktop.
- Audit every existing modal/sheet: focus management, ESC, click-outside, mobile keyboard handling, scroll trap, focus return on close.
- Fix the offenders in one pass.

**Size: ~5–7 days.** Audit (1 day) → POS payment rebuild (3–4 days) → modal sweep (1–2 days).

---

## F1 — Industry curation engine
- `lib/industry/profile.ts` — capability matrix per industry.
- Hooks: `useTerm("item.plural")`, `useCapability("inventory.recipes")`, `useNavCuration()`.
- **Industries seeded:** retail, restaurant/QSR, salon/spa, hospital/pharmacy, apparel, manufacturing/workshop, services, auto-workshop, electronics-repair, B2B-wholesale.
- Each industry profile declares: visible sidebar sections, visible sub-pages per module, vocabulary overrides, dashboard tile set, quick-actions set, button-level gates (e.g. `pos.allowSplitTender`, `inventory.allowComposite`).
- Onboarding step picks industry + sub-type → profile selected; admin can hide-from-sidebar individual sections in Settings (soft, never disables data).
- **Size: 2 days.**

## F2 — Industry sweep across existing modules
Apply F1 deeply. The big-touch wave.

- **POS:** hide Tables/Prep for non-hospitality; add Prescription validation step for hospital; add Job-card link for service/auto/repair.
- **Inventory:** hide Recipes/Production/Lots/Recall for retail+services+electronics; loud and front for food+cosmetics+manufacturing. Rename Items→Ingredients (restaurant), →Consumables (hospital), →Parts (auto/repair), →SKUs (wholesale).
- **Sales:** Customer/Guest/Patient/Client vocab; hide Shipments for service-only industries.
- **Reporting:** hide Recipe-cost + Allergens unless food/cosmetics; hide Variance unless inventory-heavy.
- **Dashboard:** per-industry KPI carousel + quick-actions ("Open table" for restaurant, "Book appointment" for salon, "New repair ticket" for auto).
- **Storefront:** sector-aware template defaults already exist; reinforce + connect to industry profile.
- **Marketing:** hide TikTok/Reels prominence for B2B services.

**Spec sheet required** before opening the PR: "before/after per industry per page" — keeps scope from sprawling. **Size: 4–5 days.**

## F3 — Reorder Report + Multi-location scope
- `/reporting/reorder` page with per-supplier "Create PO" grouping (W14).
- Global location scope (All / pick / one) via `useLocationScope()` propagating to every read view (W16). POS stays bound to clocked-in location.
- **Size: 3 days.**

## F4 — Customer tickets & resolution
W12 in full. Lifecycle (new → triaged → assigned → in-progress → awaiting-customer → resolved → closed), routing rules, SLA timers, **resolution actions** (refund / replacement order / replan shipment / store credit / discount), two-way customer messaging composer, queue + detail UX, reporting (`/reporting/tickets`), RBAC.

**Mock inbound channels convincingly** — fake a WhatsApp reply on a 30s timer so the demo loop feels real.

**Size: 5–6 days.**

## F5 — Internal job tickets / work orders
*Distinct from F4.* Multi-stage work-card tracking for auto-workshop, tailor alterations, electronics repair, salon long-form services, B2B repair.

- States: intake → diagnose → quote → parts → work → QC → ready → handover → closed.
- Per-stage: owner, time-in/out, photos, notes, parts consumed (pick from inventory → auto-deducts).
- Link to: customer, vehicle/asset, optional appointment, optional quote, final invoice.
- F1 hides this for retail / restaurant / wholesale industries.
- **Size: 4 days.**

## F6 — AI assistant
W13 in full. One chat at `/ai` auto-routing between **data Q&A** (deterministic JS aggregators with LLM picking the intent) and **app help** (glossary/nav index). Sources visible, credits metered, conversation history.
- **Size: 3 days.**

## F7 — Loyalty + Gift cards (operator UX)
Backend schemas already in `BACKEND_PLAN` (`loyalty_accounts`, `gift_cards`). Build operator surfaces:
- Loyalty: rules config (earn rate, redemption value, tier thresholds, birthday rewards, referral codes), per-customer points ledger view, redemption at POS checkout.
- Gift cards: issue (sell to customer), redeem at POS, balance check, void.
- Public-facing widget on storefront for "Check gift card balance".
- **Size: 4 days.**

## F8 — Customer portal (`/portal/*`)
New route tree distinct from operator app. Per-org branded.
- Customer auth: email/phone OTP, optional passkey.
- Views: own orders, invoices, credits/wallet, open tickets, downloadable receipts, request-reorder one-tap.
- Mobile-first.
- **Size: 3 days.**

## F9 — Quotes + Subscriptions
- `/sales/quotes` — pre-invoice doc with expiry, customer-approval link (signed token), one-click convert-to-invoice. Universal in services + B2B.
- `/sales/subscriptions` — recurring billing schedule per customer (weekly/monthly/custom), auto-generate invoices, auto-charge via virtual account when available.
- **Size: 3 days.**

## F10 — Stocktake + Vendor returns
- `/inventory/stocktake` — blind-count workflow (lock window, count by location, reconcile variance, post adjustments). Distinct from one-off `/inventory/adjustments`.
- `/purchasing/vendor-returns` — RMA-out with vendor-credit posting (inverse of customer returns).
- **Size: 3 days.**

## F11 — Time clock + Driver dispatch + Receipt customization + Bulk ops
- `/team/clock` — clock-in/out + breaks; hours feed `/accounting/payroll`.
- `/sales/dispatch` — driver routes, live status, proof-of-delivery photo + signature.
- `/settings/receipt` — logo, footer, terms, tip prompt copy, per-template (POS / sales / refund).
- **Bulk multi-select-action** across list pages where missing (Inventory, Sales/customers, Sales/orders).
- **Size: 4 days.**

## F12 — Compliance pack
- FIRS VAT return export (XML/CSV per FIRS spec).
- WHT certificate generator.
- NDPR data-subject request flows (export-my-data + delete-me).
- Audit-log viewer with filters (who/when/what/area).
- Period-end closing wizard around the existing period-lock primitive (reconcile bank → review unposted → lock).
- **Size: 3 days.**

## F13 — Migration importer
W15 in full. `/settings/import` with SAP B1 / Odoo / QuickBooks / Zoho / Sage / Generic presets, column mapper, validate-then-commit, 30-min undo. Round-trip with W6 export (same column shape).
- **Size: 3 days.**

## F14 — AI extensions
- Auto-tag on item creation (suggest category/tags/allergens from name).
- Per-SKU per-location forecasting (beyond rule-based heuristic).
- POS fraud signals (unusual refund/void/discount patterns per cashier).
- Mock generators initially; wired to real models in Phase D.
- **Size: 2 days.**

## F15 — Polish pass
- Onboarding tour per industry (interactive page walkthrough on first visit, replayable from Help).
- Empty-state CTAs everywhere ("create your first X").
- Print previews for invoices/receipts (not just OS print dialog).
- Accessibility audit (focus order, ARIA labels, color contrast).
- Dark-mode sweep across new pages.
- No-results states (search returned nothing, filter zeroed out the list).
- **Size: 3 days.**

---

### Phase A totals & order

**Total: ~49 dev-days (~10 weeks solo, ~5–6 weeks with 2 devs).**

**Order:**
1. **F0** (UX correctness — non-negotiable first)
2. **F1 → F2** (foundation + sweep)
3. **F3** (quick wins)
4. **F4 + F5** in parallel (the two ticket systems)
5. **F6 → F7 → F8** (engagement: AI, loyalty, customer portal)
6. **F9 → F10 → F11** (operations pack)
7. **F12 → F13 → F14 → F15** (compliance + migration + AI + polish)

---

# Phase B — Snapshot (S1)

**S1 — `cp -r frontend/ mock-frontend/`** + rename `package.json` name field. The snapshot stays on mocks forever as the always-on demo. Original `frontend/` is the one we replumb to the real backend in Phase D.

Routing:
- `demo.pallio.app` → `mock-frontend` (perpetual demo, always reachable)
- `app.pallio.app` → `frontend` (the real app)

**Drift rule:** every Phase D wave back-ports its data-shape changes to `mock-frontend` so the demo doesn't decay. Add to PR checklist.

**Size: 10 minutes.**

---

# Phase C — Backend build (B1 → B14)

`npm install forge-orm` + hyper-express + the seven mandatory deviations.

| Wave | Title | Size |
|---|---|---|
| **B1** | Foundation & guardrails — server, `npm install forge-orm` + `package.json:forge.schema` pointer + schema file, Redis, BullMQ, response envelope, module-augmented Request, `scopedDb(orgId)` (+ forge `strict:true`), pino + request-id + `wireOtel()` query traces, `npx forge push`/`diff`/`diff apply`/`rollback` wired into CI + npm scripts, data-backfill runner (`migrations/data/*.ts` + `_data_migrations`), Vitest + ESLint + typecheck CI, zod-to-openapi, CORS, rate-limit, idempotency | **3 wks** |
| **B2** | Auth & identity — register/login/refresh/logout, OTP, OAuth (Google + Apple), WebAuthn server ceremony, 2FA TOTP, force-logout via `tv`, password reset. **Crypto randomness audited.** | 2 wks |
| **B3** | Org, settings, team, RBAC — org/locations, members/invites/sessions, custom roles, push tokens, user prefs, onboarding progress. **Includes industry-profile read API (drives F1/F2 from one source).** | 2 wks |
| **B4** | Catalog + Inventory + Offline-sync ingest — catalog CRUD + variants/modifiers, recipes/production/lots/recall, stock movements, idempotent `POST /pos/sync` | 3 wks |
| **B5** | POS — invoices/drafts/returns/shifts/gift-cards/loyalty + venue/KDS + **socket prep queue** | 3 wks |
| **B6** | Payments + webhooks — Paystack/Flutterwave/Opay/PalmPay virtual accounts, signed+idempotent webhooks, transfers/payouts | 3 wks |
| **B7** | Accounting — ledger/auto-post/statements/reconciliation/period-lock/payroll/commissions/tax. **100% Vitest coverage mandatory.** | 4 wks |
| **B8** | Sales + Purchasing — customers/orders/invoices/payments/receipts/shipments/discounts/returns + vendors/POs/GRNs/bills/vendor-credits + quotes + subscriptions | 3 wks |
| **B9** | Reporting — ~26 read aggregations + CSV/PDF export + email-schedule worker | 2 wks |
| **B10** | Storefront (admin + public shop) — per-tenant resolution, products/orders/pages/discounts/analytics, SSL auto-provision | 3 wks |
| **B11** | Marketing + Integrations + Communications — ad-platform APIs, affiliate engine, OAuth flows, secrets server-side, email send/inbox, team chat socket, **inbound email/SMS/WhatsApp webhooks → F4 ticket system** | 4 wks |
| **B12** | AI + Push + Notifications + Misc — `/ai/chat` SSE per `AI_CHAT_BACKEND.md`, deterministic intent layer, FCM + web-push, notifications, expenses, appointments, affiliate dashboard, analytics | 3 wks |
| **B13** | Customer portal endpoints — `/portal/*` surface, customer auth (OTP), customer-scoped JWT, order history, invoices, credits, ticket creation | 1.5 wks |
| **B14** | Compliance endpoints — FIRS VAT/WHT export jobs, NDPR data-export & deletion, period-close orchestration, audit-log query API | 1.5 wks |

**Phase C total: ~38 weeks (~9 months solo, ~5 months with 2 devs) for B1–B14.**

---

## Phase C expansion (added 2026-06-01 after the exhaustive sweep)

The 26-agent sweep surfaced 39 endpoints with no home in B1–B14 plus several structural gaps that warrant their own waves rather than scattered ad-hoc work. Full analysis in `docs/BACKEND_COVERAGE.md`.

| Wave | Title | Size |
|---|---|---|
| **B15** | Settings Surfaces & Locations — Locations CRUD (public-facing entity, distinct from internal Warehouses) + 8 settings sub-domains (notifications prefs / invoice template / loyalty rules / barcodes / preferences / export jobs / import / data jobs). All share org-scope CRUD + admin permission. | **2 wks** |
| **B16** | Real-time Event Bus (WebSocket/SSE) — channel sub layer; fan-out from domain events to KDS prep queue, team chat, activity feed/dashboard KPIs, notification bell, venue spot status, SLA-overdue ticket alerts. Must land BEFORE B5's prep queue UI feels live. | **3 wks** |
| **B17** | AI Generation, Credits, Assistant — AI ad gen (text/flier/carousel/video jobs), credit metering ledger, Pallio assistant context-scoped chat, AI insights (anomaly / ROAS / margin / vendor-late). Pulls AI work out of scattered B11/B12. | **3 wks** |
| **B18** | Offline Sync Worker & Conflict Resolution — durable streaming sync protocol (push/pull/cursor/resolve), beyond B4's single-record `POST /v1/pos/sync`. Required before Tauri desktop POS ships. Includes Tauri native bridge for thermal print queue + cash drawer + barcode scanner + biometric attestation + FCM (Rust + Swift + Kotlin layer). | **3 wks** |

**Phase C revised total: ~47 weeks (~12 months solo, ~7 months with 2 devs) for B1–B18.**

**Phase D wiring expands from W1–W14 to W1–W18** to track the four new backend waves (+2 weeks).

**v0.5 MVP cut unchanged:** F0+F1+F2+F3+F4+F6+F7 → S1 → B1–B6 → W1–W5. The new waves slot in after MVP ships.

**MVP cut for v0.5: B1–B6** (auth → catalog → POS → payments → real money flow). **B7 must come second** (the books must be real). B8–B14 are the long tail.

---

# Phase D — Wire `frontend/` to real backend (W1 → W14)

Each wave swaps one module's mock loaders for `api.*` calls. The `api.isConfigured()` fallback already exists, so cutover is module-by-module and reversible.

| Wave | Replaces mocks for | Pairs with |
|---|---|---|
| **W1** | Auth/identity | B2 |
| **W2** | Org/settings/team | B3 |
| **W3** | Catalog/inventory + offline sync | B4 |
| **W4** | POS (incl. socket prep queue) | B5 |
| **W5** | Payments | B6 |
| **W6** | Accounting | B7 |
| **W7** | Sales/purchasing | B8 |
| **W8** | Reporting | B9 |
| **W9** | Storefront | B10 |
| **W10** | Marketing/integrations/comms + ticket inbound | B11 |
| **W11** | AI/push/notifications/misc | B12 |
| **W12** | Customer portal | B13 |
| **W13** | Compliance | B14 |
| **W14** | **Decommission mocks** — remove `api.isConfigured()` fallbacks, delete `lib/api-mocks/*`, regression-diff against `mock-frontend`, tag v1.0 | — |

**Phase D total: ~6 weeks.** Each wiring wave is ~2–3 days of mostly mechanical type alignment + React Query plumbing.

---

# Totals at a glance

| Phase | Waves | Solo | 2 devs |
|---|---|---|---|
| A — Mock completeness | 16 (F0–F15) | ~10 wks | ~6 wks |
| B — Snapshot | 1 | ~10 min | ~10 min |
| C — Backend | 14 (B1–B14) | ~9 months | ~5 months |
| D — Wiring | 14 (W1–W14) | ~6 wks | ~3 wks |
| **Total to v1.0** | **45 waves** | **~12 months** | **~7 months** |

---

# Open decisions — RESOLVED 2026-05-31

1. **One dev or two?** ⏳ Still open — see "What this means" below.
2. **v0.5 MVP cut?** ✅ Locked: **F0 + F1 + F2 + F3 + F4 + F6 + F7 → S1 → B1–B6 → W1–W5.** ~6 months solo with real POS+payments+catalog+auth backend and a polished mock for everything else.
3. **`mock-frontend` public?** ✅ Locked: yes, deploys to **`demo.pallio.app`** as the forever-demo.
4. **forge-orm tooling?** ✅ Locked: `npm install forge-orm` (currently v1.2.0). It ships its own CLI + drift detection + auto-generated reconciliation migrations + rollback + `_forge_migrations` history table. The original "migration runner" mandatory deviation is dropped. Data-backfill migrations get a tiny separate runner over `migrations/data/*.ts`. Pull the latest on every B-wave kickoff and read its CHANGELOG.

---

# Resume-tomorrow notes

**Start point:** F0a — dead-button & broken-flow audit. Output to `docs/UX_AUDIT.md`. From the audit, split into ~5 PR-sized clusters by area and fix.

**Then:** F0b POS payment rebuild — Square/Toast reference for the charge → tender → receipt flow shape.

**Then:** F0c modal/overlay sweep using `feedback_overlay_pattern` rules.

**Then:** F1 industry curation engine → F2 sweep, the foundation that lets every later wave honour per-industry visibility.

Memory pointer to this doc: `project_master_plan.md`.

Related: `COMPLETENESS_WAVES.md` (W1–W16 detail), `BACKEND_PLAN.md` (backend audit + pattern decisions), `AI_CHAT_BACKEND.md` (AI chat backend spec for B12).
