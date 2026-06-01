# Backend coverage — exhaustive sweep findings (2026-06-01)

Produced by a 26-agent deep-read sweep that walked every page in the sidebar, opened every modal/sheet/drawer, and catalogued every backend endpoint each feature would need. Synthesized by a 27th agent.

## Headline numbers

- **309 pages** walked (across 26 area buckets)
- **115 modals** documented (file + primitive + inputs + actions)
- **507 backend endpoints** proposed (incl. duplicates across areas)
- **239 gap notes** — features the master plan had not yet captured

## Coverage status vs locked plan (B1–B14)

| Wave | Surfaced | Status | Notes |
|---|---:|---|---|
| **B1** Foundation | (infra) | ✅ shipped | e8e6e74 |
| **B2** Auth & identity | 27 | ✅ shipped (20 ep) | de6560a — extensions (WebAuthn verify finalize, OAuth handoff) deferred |
| **B3** Org/team/RBAC + industry-profile read | 39 | ✅ shipped (37 ep) | cdb70c7 |
| **B4** Catalog + inventory + sync | 79 | ✅ shipped (31 ep) | ee7e27c — Brands/Categories/Units/Warranties CRUD + labels TBD |
| **B5** POS (socket prep queue) | 34 | 🟡 next | sweep adds: invoices/returns/drafts CRUD, gift cards POS-side, manager PIN verify, loyalty integration, WebSocket for prep queue + venue |
| **B6** Payments + webhooks | 26 | queued | virtual accounts, Paystack/Flutterwave/Opay/PalmPay webhooks, transfers/payouts, marketing credits top-up |
| **B7** Accounting | 16 | queued | ledger posting, P&L/BS/CF derive, reconciliation, period lock |
| **B8** Sales + purchasing + tickets | 83 | queued | **biggest wave** — customers/orders/invoices/shipments/returns/discounts/team/vendors/POs/receipts/bills/vendor-credits + F4 tickets backend + resolution fan-out (refund/replacement/credit/replan) |
| **B9** Reporting | 49 | queued | 18 report endpoints + journal entries + trial balance |
| **B10** Storefront | 41 | queued | template/products/orders/customers/discounts/domain/DNS/pages CMS/analytics/billing |
| **B11** Marketing + integrations + comms | 56 | queued | channels/campaigns/listings/marketplace + 40-integration catalog + comms send + team chat |
| **B12** AI + push + notifications + misc | 18 | queued | (largely now subsumed into new B17) |
| **B13** Customer portal | (separate surface) | queued | |
| **B14** Compliance | (FIRS/NDPR/audit) | queued | |

## Recommended NEW waves (B15–B18)

The sweep surfaced 39 endpoints with no home in B1–B14, plus structural gaps that warrant their own waves rather than scattered ad-hoc work.

### B15 — Settings Surfaces & Locations
Bundles eight settings sub-domains + the public Locations entity (structurally distinct from internal Warehouses). All share CRUD pattern, org scope, and admin permission model.

Endpoints (30): `/v1/locations` CRUD, `/v1/settings/notifications`, `/v1/settings/invoice-template`, `/v1/settings/loyalty` (rules), `/v1/settings/barcodes`, `/v1/settings/preferences`, `/v1/settings/export` (data export jobs), `/v1/settings/import` (CSV import — same surface as F13 migration wave).

**Estimate:** 2 weeks.

### B16 — Real-time Event Bus (WebSocket/SSE)
Six features need real-time push: KDS prep queue (4s polling today), team chat live messages, activity feed / dashboard KPIs, notification bell badge, venue spot status updates, SLA-overdue ticket alerts.

Building each ad-hoc fragments transport. One wave establishes the event bus (WebSocket auth via session token, channel subscription, fan-out from domain events) and migrates polling clients.

Endpoints (9): WS `/v1/realtime/connect`, channels `pos.prep_queue.{org}`, `pos.venue.{org}`, `chat.{org}.{channel}`, `notifications.{user}`, `activity.{org}`, `tickets.{org}`, + health.

**Estimate:** 3 weeks. Must land before B5's prep queue UI feels live.

### B17 — AI Generation, Credits, Assistant
AI ad generation (text/flier/carousel/video job + poll), credit metering, Pallio AI assistant context-scoped chat, AI insights (anomaly detection, ROAS swings, vendor lateness, margin drift).

Currently scattered between B11 and B12 with no home for assistant or insights. F6 frontend already wires the assistant; B17 is its backend.

Endpoints (10): `/v1/ai/generate/start`, `/v1/ai/generate/:jobId`, `/v1/ai/assistant/chat`, `/v1/ai/credits/{balance,topup,history}`, `/v1/ai/insights[/:type]`.

**Estimate:** 3 weeks.

### B18 — Offline Sync Worker & Conflict Resolution
Tauri client has SQLite `sync_outbox` table ready. No backend endpoint defines the sync protocol (sequence numbers, conflict resolution, dedup, replay window). Must land before Tauri desktop POS ships.

Endpoints (5): `POST /v1/sync/push` (batched outbox + client_seq + idempotency), `GET /v1/sync/pull?since=cursor`, `GET /v1/sync/cursor`, `POST /v1/sync/resolve-conflict`, `GET /v1/sync/health`.

**Estimate:** 2 weeks. B4 ships single-record `POST /v1/pos/sync`; B18 is the durable streaming protocol.

## Critical consolidation candidates (20)

Same entity proposed by multiple areas → pick canonical path:

| Duplicate | Canonical | Wave |
|---|---|---|
| `GET /v1/team/members` claimed by 5 areas | single B3 endpoint with `?active=`, `?role=`, `?location=` | B3 |
| `GET /customers` (Sales/Tickets/Comms/POS) | single B8 endpoint | B8 |
| `GET /v1/integrations/:providerId/status` | one location | B11 |
| `POST /communications/send` (Comms/Recall/Tickets) | one endpoint, template_id + context | B11 |
| `/api/v1/catalog` vs `/v1/catalog` | standardize on `/v1/catalog` | B4 |
| Gift cards: POS issuance vs Sales list | `/v1/gift-cards` canonical; POS issuance is a side-effect | B5+B7 |
| Loyalty: `/v1/pos/loyalty/:id` vs `/customers/:id/loyalty` | `/v1/customers/:id/loyalty` | B7 |
| Pricing tiers vs price lists | `/v1/pricing-tiers` | B4 |
| Receipts vs invoice delivery | invoice = canonical, receipt = delivery artifact | B8 |
| Returns: POS vs Sales | `/v1/returns` with `channel: 'pos'|'backoffice'` | B8 |
| Bank accounts vs virtual accounts | `/v1/business-accounts/:id` with `virtual_accounts[]` | B6 |
| Tax data (rates/filings/computation) | rates=settings(B15), filings=accounting(B7), compute=reporting(B9) | split |
| Commissions (accounting/rules/marketing) | `/v1/commissions/*` under B7 | B7 |
| Notifications feed vs prefs | `/v1/notifications`=feed, `/v1/settings/notifications`=prefs | split |
| Team chat message delete (Comms vs Team) | single endpoint | B11 |
| Vendors vs Suppliers | `/v1/vendors` canonical; `/suppliers` alias view | B8 |
| Production runs (Inventory vs Recipes) | `/v1/production/runs` | B4 |
| Recall actions (Inventory vs Recipes) | `/v1/recalls/:lot_id/*` | B4 |
| Ticket message send → comms | tickets call comms internally | B8→B11 |
| `/v1` vs `/api/v1` path prefix mismatches | standardize on `/v1` everywhere | infra |

## Major gaps now mapped to waves

| Gap | Wave |
|---|---|
| Locations entity (storefront/popup/office, distinct from Warehouses) | **B15 NEW** |
| Settings → notifications prefs / invoice template / loyalty rules / barcodes | **B15 NEW** |
| Real-time KDS prep queue (poll → WebSocket) | **B16 NEW** |
| Team chat live messages | **B16 NEW** |
| Activity feed / dashboard KPIs live | **B16 NEW** |
| Notification bell badge live | **B16 NEW** |
| Venue spot status updates | **B16 NEW** |
| SLA-overdue ticket alerts | **B16 NEW** |
| AI ad gen (text/flier/carousel/video) + credits | **B17 NEW** |
| Pallio assistant backend (context-scoped) | **B17 NEW** |
| AI insights (anomaly/ROAS/margin/vendor-late) | **B17 NEW** |
| Tauri offline sync_outbox protocol | **B18 NEW** |
| Webhook inbound (Gmail/Twilio/WhatsApp → tickets) | **B11** (extended scope) |
| Ticket resolution fan-out (refund/replacement/credit/replan) | **B8** |
| Configurable SLA matrix per org/category/location/priority | **B8** |
| Auto-assignment routing rules | **B8** |
| Bulk ticket operations | **B8** |
| Canned reply templates for tickets | **B8** |
| Affiliate referral attribution (30d click→order) | **B7** (extended scope) |
| Commission rules engine | **B7** (extended scope) |
| Recurring expenses + approval workflow | **B8** (extended scope) |
| Multi-currency FX rate service (bills/P&L/storefront) | **B7** |
| Tauri native: thermal print queue, cash drawer, biometric attestation, FCM | **B18** (rust/swift/kotlin layer beyond TypeScript) |
| Scheduled/recurring report delivery (email digests) | **B9** |
| Forecasting / predictive analytics | **B17** (insights subdomain) |

## Updated v1.0 timeline

| Phase | Old | New | Why |
|---|---|---|---|
| Phase A (frontend completeness) | ~10 wks | ~10 wks | unchanged |
| Phase B (snapshot) | trivial | trivial | done |
| Phase C (backend) | ~9 mo solo, 14 waves | ~12 mo solo, 18 waves | + B15/B16/B17/B18 |
| Phase D (wiring) | ~6 wks, 14 waves | ~8 wks, 18 waves | one wiring wave per backend wave |
| **Total to v1.0** | ~12 months solo | **~15 months solo (~9 with 2 devs)** | |

v0.5 MVP cut unchanged: F0+F1+F2+F3+F4+F6+F7 → S1 → **B1–B6** → W1–W5. The sweep doesn't change MVP, it just makes v1.0 honest.

## How to use this doc

- **When planning a new B-wave:** filter `tmp/sweep_endpoints.json` by `wave` to get the endpoint list for that wave.
- **When designing a new feature:** check `tmp/sweep_synthesis.json` `duplicates_across_areas` to avoid creating yet another path for an existing entity.
- **When estimating effort:** the per-area endpoint counts in `tmp/sweep_summary` give a rough sizing — 30 endpoints ≈ a 2-week wave; 80+ endpoints ≈ a 3–4 week wave that should be split.

## Source

Workflow: `wmy9ex9n6` (26 area agents + 1 synthesis agent, 4.5M tokens, 15 min wall-clock).
Snapshots: `/tmp/sweep_{endpoints,synthesis,gaps}.json`.
