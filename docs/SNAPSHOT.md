# Pallio snapshot — `mock-frontend/`

This document is a tracked copy of the parent-dir `SNAPSHOT.md`. The actual snapshot lives at `/Users/johnfash/Work/inventory-app/mock-frontend/` (sibling of `frontend/`, not nested inside this repo).

## What this is

`mock-frontend/` is a snapshot of `frontend/` taken at v0.5 MVP completion (2026-05-31). It serves as the **public forever-demo at `demo.pallio.app`**:

- Same UI, same data shapes, same flows as the real app
- Backed entirely by in-memory mocks (kv/kvJson) — no backend
- Always reachable; never goes down because the backend is down
- Visitors can click around without signing up

## Why two trees

The real app (`frontend/`) is the one we replumb to the actual backend in Phase D. As mocks get replaced by `api.*` calls one wave at a time, the original mocks disappear from `frontend/`. The snapshot lets us keep a working mock build forever — so the demo stays a demo even when the production frontend has zero mock fallbacks left.

## Phase D drift rule

Every Phase D (W1–W14) wave that changes a data shape **must back-port** the same shape change to `mock-frontend/`. Add this to the PR checklist:

- [ ] If this PR changes a shared type, lib data structure, or visible flow that lives in both trees, port the change to `mock-frontend/` in the same PR.
- [ ] Run `cd mock-frontend && npx tsc --noEmit` to confirm parity.

Without this, the demo decays (types drift, flows break in subtle ways, and visitors hit dead ends).

## Deploy plan

- `frontend/` → `app.pallio.app` (production app, vercel project A)
- `mock-frontend/` → `demo.pallio.app` (forever-demo, vercel project B)

Decision deferred until we actually wire `demo.pallio.app` DNS: separate repo vs same-monorepo sub-deploy.

## Differences from `frontend/`

Intentional:
- `package.json` name = `pallio-demo`, version = `1.2.0-demo`
- `index.html` title = "Pallio · Live Demo"
- OG meta tweaked to indicate the demo nature

Everything else is identical. Any other delta is a drift bug.

## Created by

S1 (Phase B of the master plan). Run on 2026-05-31 after the v0.5 MVP cut completed
(F0a + F0b + F0c + F1 + F2 + F3 + F4 + F6 + F7 all shipped to `main`).
