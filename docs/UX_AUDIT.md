# UX Audit — F0a inventory pass

Produced 2026-05-31 by a 15-agent fan-out across every area of the Pallio app, plus a cluster pass. **No fixes** were made; this doc is the inventory. Fix clusters live at the bottom.

**Total findings:** 245 across 20 areas, 240 pages walked.

## Severity mix

| Severity | Count |
|---|---:|
| 🔴 broken | 31 |
| 🟠 weak | 181 |
| 🟡 cosmetic | 33 |

## Category mix

| Category | Count |
|---|---:|
| no-feedback-after-action | 90 |
| broken-link-or-route | 27 |
| missing-error-state | 25 |
| missing-loading-state | 20 |
| dead-button | 18 |
| other | 17 |
| inconsistent-feedback | 13 |
| disabled-without-reason | 10 |
| empty-state-no-cta | 8 |
| fake-clickable | 7 |
| placeholder-leak | 7 |
| broken-flow | 2 |
| broken-modal-close | 1 |

## Area summaries

### pos — 16 findings (walked 22 pages)

The POS section of Pallio is structurally sound with clear modal patterns (Dialog, BottomSheet), proper disabled-state handling on action buttons, and informative empty states. All major flows (add-to-cart, checkout, returns, invoices) have appropriate feedback mechanisms and gating logic. However, several weak spots exist: the scan sheet lacks visible visual feedback when entering codes; the gift-card balance display in checkout doesn't confirm application with a toast; the cart quantity input has no max constraints (allowing unbounded qty); floating cart empty state is muted and easy to miss; several bulk action buttons lack explicit success feedback; search results across returns/invoices/quotes don't show zero-result handling for edge cases; and the manager PIN dialog's auto-submit at 4 digits could accidentally trigger on a phone keypad malfunction without explicit confirmation.

### inventory — 22 findings (walked 24 pages)

The inventory section shows a pattern of unfinished UX flows and dead-button patterns. Broken links are the most critical issue: the Desktop inventory table \"View\" button, brand/category cards, and PO receive cards all route to their parent list instead of detail pages, blocking drill-down navigation. Swipeable row actions on mobile inventory are empty callbacks with no navigation or feedback. Form submission flows across adjustments, transfers, receive, and new-item pages lack error handling and success feedback—users submit without knowing if the action succeeded. The Production page's \"Log Run\" button and Recall page's three action buttons are purely decorative. Recipe cost rollups show warnings for missing components but offer no path to fix them. The new-item form performs a mock 600ms save with no actual mutation and no validation feedback. Overall, the section is structurally sound in terms of layout and empty states, but the action flows are incomplete and many interactive elements are non-functional stubs awaiting backend integration."

### sales — 25 findings (walked 20 pages)

The Sales section shows solid foundational architecture with consistent component patterns, but has widespread missing feedback patterns on form submissions and several broken detail routes. Key issues: (1) all 6 new-entity forms (customer, order, invoice, shipment, return, discount) lack success feedback toasts — users see a spinner end with no confirmation; (2) detail routes are broken or missing across shipments, returns, discounts, and receipts — rows navigate to list pages instead of detail views, making it impossible to inspect individual records; (3) team member detail links recent invoices to /pos/invoices instead of /sales/invoices, breaking navigation; (4) destructive actions (delete customer, clear chat) use placeholder toasts or browser confirms instead of modals; (5) PDF/CSV exports show placeholder toasts, not implemented; (6) empty states often lack CTAs to create first items. The omission of feedback is systematic across forms — this is ready for a coordinated fix. Most broken routes suggest incomplete route structure during development. No showstoppers for MVP, but the experience feels half-complete without toast feedback on create flows and detail view access.

### purchasing — 21 findings (walked 12 pages)

The Purchasing section has critical broken-flow issues: receipts, bills, vendor-credits, and suppliers lists all link to their own root URL instead of specific record detail pages, creating dead links. The POS list has the same issue on mobile. The POS list also has two dead-button swipe actions (Receive, Close) with no-op handlers. All form submissions (new vendor, PO, receipt, bill, credit) lack success/error feedback — no toasts or navigation. Delete and Export buttons show placeholder toasts only. No loading states appear during pull-to-refresh across any list. Overall: 8 broken routes + 2 dead buttons + 5 forms without feedback + 5 lists without loading state = heavy UX debt in the purchasing workflow.

### accounting — 22 findings (walked 9 pages)

The accounting section (9 files, ~2600 lines) exhibits two critical dead-route issues: profit-loss and journal-entries both have links pointing to # (dead anchors). Additionally, the section is heavy with placeholder "arrives with the backend" buttons (add/edit accounts, upload statement, quick fixes) that are clickable but non-functional. Five of nine pages have async operations (approve commissions, export, file taxes, mark reconciled, upload statement) with weak or missing loading states. Disabled buttons lack aria-labels on mobile. The pattern overall is solid for state management and toast feedback, but the absence of actual implementations behind several UI surfaces creates a false sense of functionality. Commissions and reconciliation pages are the most complete; payroll, taxes, chart-of-accounts, and journal-entries have the most placeholder buttons.

### reporting — 11 findings (walked 18 pages)

Reporting section has solid foundational architecture with consistent ReportShell wrapper, KpiBand metrics, DataTable abstraction, and period filtering. Most pages follow safe patterns: mock data, no risky async ops, proper error fallbacks. Main weaknesses: (1) Several card links in the index route to non-existent report pages (/reporting/stock, /reporting/item, /reporting/stock-expiry) which will 404; (2) Empty states lack CTAs to create missing data (allergens, recipe-cost), leaving users stranded; (3) "Save as PDF" export button duplicates Print with no real PDF generation; (4) Period chip changes have no loading indicator despite potential async data re-fetch; (5) Link in recipe-cost table to /inventory/recipes/:id may 404 if detail page not implemented; (6) Empty state messaging inconsistent across reports. No major broken flows, but several weak UX edges that compound friction for users navigating between reports and trying to populate missing data.

### marketing — 19 findings (walked 11 pages)

The marketing section has weak form handling and missing feedback patterns. Most critical issues: form submissions (new campaigns, listings, ads) simulate completion with timeouts but never actually persist data or show success/error toasts (broken-flow); disabled buttons lack tooltips explaining why they're disabled; interactive rows (listings, analytics) have no onClick handlers despite visual suggestion they're clickable; file uploads have no drag-drop affordance. Navigation between pages lacks loading skeletons. Error states are inconsistently handled — API calls swallow errors silently. The generate-with-AI page is well-structured with chat UI and credits system, but the mock generate function has no timeout or error recovery. Overall: functional but user has little confidence that actions stick or that errors are being communicated. Pages wrapped in PageShell follow conventions (pull-to-refresh, useRegisterPageRefresh), but form interactions (submit, channel select, upload) lack the expected sonner toasts and navigation feedback that characterize other Pallio sections.

### Storefront Section (Admin) — 19 findings (walked 12 pages)

The storefront section is partially solid but heavily reliant on incomplete placeholder UI. Core navigation and state management work correctly (template selection, domain/DNS management, analytics visualizations). However, multiple advanced features display UX anti-patterns: feature placeholders with toast() messages indicating "arrives with the backend" (block editor, shipping zones, custom pages), disabled buttons that still execute onClick handlers (add domain), fake feedback without state mutations (product visibility toggles, invoice downloads), and empty onClick handlers (export button). The pattern suggests active scaffold-building — UI hooks exist but backend integration is incomplete. Severity skews toward "weak" (incomplete features) and "cosmetic" (fake toasts) rather than "broken" hard failures, but users attempting these features experience poor feedback patterns.

### comms — 11 findings (walked 6 pages)

The Communications section (inbox, compose, templates) is fundamentally solid with good async handling via sonner toasts and proper loading states. However, there are 10 material UX issues: disabled buttons without explanation (AI draft, coming-soon features), empty template search with no CTA, missing error states on file attachment (upload failures uncaught), incomplete form validation feedback (no inline errors for required fields), orphaned "Coming soon" features that feel dead rather than intentional, inconsistent disabled button styling/labeling across pages, modal footer button logic issues (footer buttons don't close the preview sheet), missing recipient validation error feedback, template editor buttons lack visual hierarchy, and a compose form that can silently reach an invalid state. None are broken (flows complete), but UX polish and error resilience are weak.

### settings_a — 16 findings (walked 15 pages)

The Settings (A) section shows a mixed pattern of UX maturity. Form submissions in business profile and currency settings demonstrate solid feedback patterns with success toasts and proper async handling. However, several critical gaps emerge: destructive actions (revoke, regenerate recovery codes, session sign-out) rely on toast-only feedback without confirmation dialogs, creating risk for accidental irreversible actions. Multiple preference pages (notifications, preferences, invoice) lack explicit success feedback beyond loading spinners, leaving users uncertain if changes were saved. The member detail page has three disabled buttons (Reset password, Suspend, Remove) with no visual indication they are non-functional. Permission edit buttons in the roles section are placeholder toast-only implementations. Overall, the section needs stronger confirmation patterns for destructive actions, consistent success feedback across all form submissions, and clarification of non-functional buttons.

### settings_b — 28 findings (walked 30 pages)

Settings B audit (payments/integrations/printers/barcodes/taxes/webhooks/audit/notifications/currency/billing/invoice) reveals 27 issues. Recurring patterns: (1) Buttons with toast-only feedback instead of proper error handling (onEdit, onDelete, form submits) — no try/catch blocks or real error toasts. (2) Mock placeholders leaking into live UI (Refresh, Add account, Edit buttons firing 'arrives with backend' toasts instead of being hidden or functional). (3) No confirmation dialogs for destructive actions (delete webhook, disconnect integration, make primary). (4) Dead buttons with no onClick (edit/delete on table rows). (5) Form submits lacking error states — all use setState with silent failures if API rejects. (6) Loading states missing on async actions (credit purchase, invoice download, webhook toggle). (7) Empty states without clear CTAs or reset options. One broken link (/contact), one unconfirmed route (/settings/payments/withdrawals/new). The audit covered 30+ pages; these are the load-bearing UX gaps that block real backend integration.

### dashboard_ops — 8 findings (walked 17 pages)

The dashboard and ops pages are predominantly solid with correct pattern usage across widgets and modals. Minor inconsistencies appear: one link pair in StorefrontSnapshot and RecentSalesCard routes to undefined pages without 404 handling (e.g., `/pos/invoices/INV-2041` which may not exist in the page tree); the affiliate dashboard monetizes an unverified calculation without error bounds; expenses and appointments use both Dialog and BottomSheet correctly for their use cases. No dead buttons, missing error states on async operations, or major flow breakages. The overlay patterns are correct: Dialog for focused decisions (reject sheet, add-expense), BottomSheet for action surfaces (settings, time-off request). AI chat, help glossary, analytics, notifications, and onboarding are all well-implemented with proper feedback, empty states, and navigation paths.

### marketing_site — 22 findings (walked 9 pages)

The marketing site is well-structured with consistent design patterns and good accessibility attributes, but has several weak UX patterns around form validation, error handling, and broken/misrouted links. The landing page, pricing, and auth flows have no client-side feedback on validation errors or async operation failures. Footer social links are placeholders pointing to generic social media homepages instead of specific accounts. The contact form and auth modals lack comprehensive error handling for edge cases (passkey/biometric failure, OAuth cancellation). Two pages (privacy & terms) dynamically generate legal "last updated" dates instead of using fixed values. One announcement link (/marketing/generate) appears to route to a non-existent page. Weak points are mostly around missing error feedback and placeholder/temporary URLs, not broken CTAs — all primary actions have targets, though some routes are suboptimal (e.g., "forgot password" → contact form rather than password reset). No dead buttons (all major CTAs are wired), no modal close issues, and no mobile-blocked content problems. The site is functional but inconsistent in async feedback patterns across pages.

### app_shell — 4 findings (walked 8 pages)

The app shell (frame, sidebar, mobile nav, modals, overlays) is robustly built with excellent UX fundamentals. All main buttons have handlers, all modals and sheets have visible close paths (Esc, backdrop tap, swipe-down), and overlay patterns are canonical (BottomSheet for mobile actions, Dialog for focused decisions). No dead buttons or stuck flows. Minor findings: (1) NotificationBell has a hardcoded mock invoice ID in a href that should be parameterized, (2) two async operations (PWAInstaller refresh + UserMenu sign-out) lack loading spinners during their waits, (3) clearAuth() has no error toast fallback if it fails. Command palette, sidebar search, mobile drawer search, and empty states all ship with proper feedback.

### primitives — 1 findings (walked 27 pages)

The primitives section (EmptyState, FilterButton, FilterChips, FilterSheet, StatusBadge, SummaryStrip, FormShell, FormSection, FormFooter, FormGrid, FormAside, FormField, InputAddon, SwitchField, Dialog, BottomSheet, Button) is well-structured with proper overlay patterns, good close mechanisms, and consistent feedback patterns. All modals have Escape key handling and backdrop click dismissal. Form buttons have proper submitting states with "Saving..." feedback. FormFooter properly manages disabled/submitting states. Dialog uses centered modals everywhere (correct for focused decisions); BottomSheet correctly uses drawer-on-mobile + modal-on-desktop pattern for action surfaces. All checked dialogs have proper cancel buttons and close paths. One weak issue found: a disabled button wrapped in a Link still navigates, creating visual/interaction mismatch in the marketing channel shell.

---

# Findings by area

## settings (44)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🔴 broken | dead-button | `src/pages/settings/roles/index.tsx:241` | Edit permission buttons are non-functional toast-only buttons | Either implement a full edit modal for per-permission overrides, or remove the button and clarify that permissions are managed at the role level |
| 2 | 🔴 broken | broken-link-or-route | `src/pages/settings/integrations/index.tsx:219` | Help link to /contact may be unimplemented | Verify /contact exists and is a proper feedback form; or replace with Slack/email link |
| 3 | 🟠 weak | no-feedback-after-action | `src/pages/settings/users/index.tsx:391` | Revoke button has only toast feedback, no confirmation | Add Dialog confirmation before revoke action, similar to password reset patterns |
| 4 | 🟠 weak | no-feedback-after-action | `src/pages/settings/security/index.tsx:487` | Recovery code regeneration has only toast feedback, no confirmation | Add confirmation dialog before regenerating recovery codes (destructive action) |
| 5 | 🟠 weak | no-feedback-after-action | `src/pages/settings/preferences/index.tsx` | No explicit save feedback beyond loading state | Add toast.success() callback after form submission succeeds, like in business profile |
| 6 | 🟠 weak | no-feedback-after-action | `src/pages/settings/notifications/index.tsx` | No explicit save feedback for notification matrix | Add toast.success() after form submission, consistent with other settings pages |
| 7 | 🟠 weak | no-feedback-after-action | `src/pages/settings/invoice/index.tsx` | No explicit save success feedback for invoice settings | Add toast.success() after form submission, matching currency page pattern |
| 8 | 🟠 weak | inconsistent-feedback | `src/pages/settings/users/index.tsx` | Sessions Sign out button has only toast, inconsistent with other patterns | Add confirmation dialog for sign out actions, or document why toast-only is acceptable here |
| 9 | 🟠 weak | broken-link-or-route | `src/pages/settings/warehouses/index.tsx` | Edit warehouse route destination not verified | Verify that /settings/warehouses/[code]/edit route exists and is properly configured in router |
| 10 | 🟠 weak | broken-link-or-route | `src/pages/settings/users/index.tsx` | User detail route destination not verified | No fix needed - route is verified as working |
| 11 | 🟠 weak | dead-button | `src/pages/settings/users/[id]/index.tsx:207` | Member detail Edit, Reset password, Suspend, and Remove buttons are non-functional | Wire onClick handlers to these buttons, or disable them until backend integration is ready |
| 12 | 🟠 weak | no-feedback-after-action | `src/pages/settings/users/[id]/index.tsx:331` | Session Revoke button lacks confirmation and feedback | Add onClick handler with confirmation dialog before revoking session |
| 13 | 🟠 weak | no-feedback-after-action | `src/pages/settings/users/[id]/index.tsx:444` | Commission settings Save button shows only toast, no form validation | Add validation before save: ensure base rate is > 0, no empty category overrides, bonus pool is non-negative |
| 14 | 🟠 weak | no-feedback-after-action | `src/pages/settings/roles/new/index.tsx:95` | New role form lacks success feedback after save | Add toast.success() before navigating back, or show success state in the footer |
| 15 | 🟠 weak | no-feedback-after-action | `src/pages/settings/payments/accounts/index.tsx:42` | Edit button has toast-only feedback instead of navigation | Add either an EditAccountDialog, or route to /settings/payments/accounts/[id]/edit, then navigate there |
| 16 | 🟠 weak | missing-error-state | `src/pages/settings/payments/accounts/new/index.tsx:34` | Form submit has no error handling for failed save | Wrap the async save in try/catch, show error toast on failure |
| 17 | 🟠 weak | fake-clickable | `src/pages/settings/printers/index.tsx:113` | Printer list rows have no click handler and appear clickable | Add onClick to open PrinterDetailsSheet or route to /settings/printers/[id] |
| 18 | 🟠 weak | no-feedback-after-action | `src/pages/settings/barcodes/index.tsx:30` | Form submit on barcode settings has no error handling | Add try/catch around the async save, show error toast on failure |
| 19 | 🟠 weak | dead-button | `src/pages/settings/taxes/index.tsx:200` | Edit and Delete buttons on tax table rows have no handlers | Add onClick handlers to open EditTaxRateDialog or trigger delete confirmation |
| 20 | 🟠 weak | empty-state-no-cta | `src/pages/settings/taxes/index.tsx:123` | Empty state on mobile tax list has no CTA button | Add action button to AddTaxRateDialog trigger in the EmptyState |
| 21 | 🟠 weak | no-feedback-after-action | `src/pages/settings/export/index.tsx:24` | Export buttons show toast but don't actually export (mock until backend) | When backend lands, replace toast with actual file download; consider a loading state |
| 22 | 🟠 weak | missing-error-state | `src/pages/settings/audit/index.tsx:39` | Audit log search/filter has no empty-state error message | Differentiate between 'no results found' vs 'error loading logs' with appropriate messaging |
| 23 | 🟠 weak | no-feedback-after-action | `src/pages/settings/webhooks/index.tsx:79` | Pause/Resume webhook buttons have no loading state or confirmation | Add loading state, error toast on failure, and optional confirmation dialog |
| 24 | 🟠 weak | missing-error-state | `src/pages/settings/webhooks/index.tsx:99` | Add webhook endpoint button disabled but no explanation | Add a hint below the URL input or events section saying 'Enter URL and select at least one event' |
| 25 | 🟠 weak | no-feedback-after-action | `src/pages/settings/webhooks/index.tsx:40` | Delete webhook endpoint has no confirmation dialog | Add a confirmation sheet/dialog before deleting |
| 26 | 🟠 weak | no-feedback-after-action | `src/pages/settings/notifications/index.tsx:88` | Notification settings form has no error handling | Add try/catch, show error toast on failure |
| 27 | 🟠 weak | no-feedback-after-action | `src/pages/settings/currency/index.tsx:27` | Currency save button shows 'Saving...' but no error toast on failure | Ensure error toast has longer duration or add a persistent alert banner |
| 28 | 🟠 weak | no-feedback-after-action | `src/pages/settings/billing/index.tsx:64` | Card button shows placeholder 'Card ··· 4242' but toast just shows placeholder text | Open a PaymentMethodSheet or route to card management page |
| 29 | 🟠 weak | no-feedback-after-action | `src/pages/settings/billing/index.tsx:92` | Credit purchase buttons have no loading state | Add loading state to buttons during purchase, disable them while pending |
| 30 | 🟠 weak | no-feedback-after-action | `src/pages/settings/billing/index.tsx:138` | Invoice download button has no loading state | Add loading spinner while PDF is being fetched/generated |
| 31 | 🟠 weak | no-feedback-after-action | `src/pages/settings/invoice/index.tsx:30` | Invoice settings form has no error handling | Add try/catch, show error toast on failure |
| 32 | 🟠 weak | no-feedback-after-action | `src/pages/settings/payments/business-accounts/index.tsx:225` | Refresh button on primary account is a mock placeholder | Implement actual account balance refresh when backend lands, or hide button in mock |
| 33 | 🟠 weak | no-feedback-after-action | `src/pages/settings/payments/business-accounts/index.tsx:241` | Add account button is a mock placeholder | Route to a real AddAccountDialog or /settings/payments/business-accounts/new when backend ready |
| 34 | 🟠 weak | no-feedback-after-action | `src/pages/settings/payments/business-accounts/index.tsx:285` | Make primary button has no error handling | Add try/catch, show error toast on failure |
| 35 | 🟠 weak | no-feedback-after-action | `src/pages/settings/payments/business-accounts/index.tsx:290` | Verify pending account button has no error handling | Add try/catch, show error toast on failure |
| 36 | 🟠 weak | no-feedback-after-action | `src/pages/settings/payments/business-accounts/index.tsx:294` | Edit account button is a mock placeholder | Route to /settings/payments/business-accounts/[id]/edit or open EditAccountSheet |
| 37 | 🟠 weak | broken-link-or-route | `src/pages/settings/payments/withdrawals/index.tsx:77` | New withdrawal link may route to non-existent page | Confirm route exists in routes.ts; if not, add it |
| 38 | 🟠 weak | no-feedback-after-action | `src/pages/settings/payments/withdrawals/new/index.tsx:33` | Withdrawal form has no error handling | Add try/catch, show error toast on failure |
| 39 | 🟠 weak | no-feedback-after-action | `src/pages/settings/integrations/stripe/index.tsx:24` | Disconnect button has no confirmation and no error handling | Add onClick with confirmation dialog ('This will disable Stripe payments. Continue?') + error handling |
| 40 | 🟠 weak | no-feedback-after-action | `src/pages/settings/integrations/stripe/index.tsx:25` | Save changes button has no error handling | Add try/catch + error toast to the parent IntegrationShell onSubmit |
| 41 | 🟡 cosmetic | no-feedback-after-action | `src/pages/settings/profile/index.tsx:82` | Change photo button announces backend dependency but appears functional | Either disable the button until backend is ready, or remove the toast message to avoid expectation mismatch |
| 42 | 🟡 cosmetic | fake-clickable | `src/pages/settings/invoice/index.tsx:65` | Invoice format preview appears interactive but is static | Either make the preview interactive (copy to clipboard, live update), or add visual cue that it's informational only |
| 43 | 🟡 cosmetic | other | `src/pages/settings/users/new/index.tsx` | Invite member form lacks email validation feedback | Add real-time email format validation or error message below the input |
| 44 | 🟡 cosmetic | inconsistent-feedback | `src/pages/settings/payments/accounts/index.tsx:95` | Empty state messaging is generic ('No accounts match' vs 'No accounts yet') | Show 'No accounts match X' with the search term, and add a 'Clear search' link |

## sales (25)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🔴 broken | broken-link-or-route | `src/pages/sales/invoices/index.tsx:196` | Desktop invoice rows link to non-existent invoice detail route | Change Link target to `/sales/invoices/${r.id}` to match mobile row linking |
| 2 | 🔴 broken | broken-link-or-route | `src/pages/sales/shipments/index.tsx:95` | Mobile shipment rows link to list page instead of detail | Add detail links to both mobile and desktop rows; use `/sales/shipments/${r.id}` |
| 3 | 🔴 broken | missing-loading-state | `src/pages/sales/shipments/index.tsx:116` | Desktop shipment table has no action column or detail navigation | Add action column with detail button/link in table footer or rightmost cell |
| 4 | 🔴 broken | broken-link-or-route | `src/pages/sales/returns/index.tsx:94` | Mobile return rows link to list page instead of detail | Change link targets to `/sales/returns/${r.id}` on both mobile and desktop |
| 5 | 🔴 broken | broken-link-or-route | `src/pages/sales/discounts/index.tsx:104` | Discount rows navigate to list page instead of detail | Implement discount detail page and link rows to `/sales/discounts/${r.code}` or similar |
| 6 | 🔴 broken | broken-link-or-route | `src/pages/sales/team/[member]/index.tsx:100` | Recent invoices link to wrong route (/pos/invoices instead of /sales/invoices) | Change link from `/pos/invoices/${i.id}` to `/sales/invoices/${i.id}` |
| 7 | 🟠 weak | dead-button | `src/pages/sales/invoices/index.tsx:152` | Swipeable row Print/Pay actions have no onPress implementation | Implement onPress handlers for Print and Pay actions or remove buttons if not ready |
| 8 | 🟠 weak | missing-error-state | `src/pages/sales/invoices/new/index.tsx:94` | Subtotal field accepts manual input but may not validate against line items | Add validation to warn when manual subtotal doesn't match calculated subtotal, or disable field when line items are present |
| 9 | 🟠 weak | fake-clickable | `src/pages/sales/receipts/index.tsx:80` | Receipt rows appear clickable but navigate to root receipts page | Change link target to `/sales/receipts/${r.id}` on both mobile and desktop |
| 10 | 🟠 weak | missing-error-state | `src/pages/sales/team/index.tsx:80` | Commission rate input has no validation or bounds feedback | Add min/max attributes to input or validate onChange with toast feedback |
| 11 | 🟠 weak | disabled-without-reason | `src/pages/sales/team/chat/index.tsx:288` | Send button disabled without explicit reason tooltip | Add title/aria-label attribute: `aria-label="Send (message cannot be empty)"` |
| 12 | 🟠 weak | no-feedback-after-action | `src/pages/sales/team/chat/index.tsx:114` | Clear channel confirmation uses browser alert() instead of Sonner toast | Replace confirm() with a custom modal/dialog component and display result as Sonner toast |
| 13 | 🟠 weak | no-feedback-after-action | `src/pages/sales/customers/new/index.tsx:31` | Form submission has no success feedback toast | Add toast.success('Customer saved') or navigate to customer detail on success |
| 14 | 🟠 weak | no-feedback-after-action | `src/pages/sales/orders/new/index.tsx:47` | Form submission has no success feedback toast | Add toast.success('Order created') or navigate to order detail page |
| 15 | 🟠 weak | no-feedback-after-action | `src/pages/sales/invoices/new/index.tsx:31` | Form submission has no success feedback | Add toast.success('Invoice created') or navigate to invoice detail |
| 16 | 🟠 weak | no-feedback-after-action | `src/pages/sales/shipments/new/index.tsx:30` | Form submission has no success feedback | Add toast.success('Label purchased') or equivalent success feedback |
| 17 | 🟠 weak | no-feedback-after-action | `src/pages/sales/returns/new/index.tsx:31` | Form submission has no success feedback | Add toast.success('RMA created') or navigate to return detail |
| 18 | 🟠 weak | no-feedback-after-action | `src/pages/sales/discounts/new/index.tsx:32` | Form submission has no success feedback | Add toast.success('Discount created') or navigate back to list |
| 19 | 🟠 weak | no-feedback-after-action | `src/pages/sales/customers/[id]/index.tsx:152` | Delete customer button has no confirmation and shows placeholder toast | Add confirmation modal before delete; show success/error toast on backend response |
| 20 | 🟠 weak | no-feedback-after-action | `src/pages/sales/customers/[id]/index.tsx:153` | Export CSV button has no implementation, shows placeholder toast | Implement CSV export or remove button if not ready |
| 21 | 🟠 weak | no-feedback-after-action | `src/pages/sales/receipts/[id]/index.tsx:91` | PDF download button shows placeholder toast instead of downloading | Implement PDF export using jspdf/html2canvas or wire to backend endpoint |
| 22 | 🟠 weak | empty-state-no-cta | `src/pages/sales/team/[member]/index.tsx:100` | Empty 'Recent invoices' state has no CTA to create first invoice | Add action button linking to `/sales/invoices/new?customer={member}` or `/pos/invoices/new` |
| 23 | 🟠 weak | empty-state-no-cta | `src/pages/sales/inventory/index.tsx:109` | Empty inventory state has no CTA to go to full inventory page | Add action button linking to `/inventory` or suggesting to check full inventory management |
| 24 | 🟠 weak | missing-loading-state | `src/pages/sales/orders/index.tsx:243` | Invoice from order button may show while loading | Add loading state feedback when invoicing an order; show toast on success/error |
| 25 | 🟡 cosmetic | other | `src/pages/sales/invoices/[id]/index.tsx:198` | PDF download button shows generic toast instead of file download | Implement PDF export logic or remove button stub |

## marketing (25)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🔴 broken | dead-button | `src/pages/marketing/facebook-ads/new-campaign/index.tsx:5` | NewFacebookCampaign delegates to CampaignShell but form submit has no confirmation or navigation | Wire onSubmit to actually save/create the campaign and navigate back or show success toast. |
| 2 | 🔴 broken | no-feedback-after-action | `src/components/marketing/campaign-shell.tsx:47` | Form submit has 500ms mock delay but no success/error feedback | After submit succeeds, show a sonner toast + navigate back to the channel page. |
| 3 | 🔴 broken | dead-button | `src/components/marketing/campaign-shell.tsx:106` | New Listing button is disabled when provider not connected but has same styling as enabled button | Change styling when disabled: add aria-disabled + change opacity/color to clearly show disabled state. |
| 4 | 🔴 broken | broken-flow | `src/pages/marketing/facebook-ads/new-listing/index.tsx:5` | newFacebookListing page delegates entirely to CampaignShell with kind='listing' but CampaignShell form never actually persists the listing | Wire CampaignShell's form to actually call an API endpoint and handle success/error. |
| 5 | 🟠 weak | no-feedback-after-action | `src/pages/marketing/listings/new/index.tsx:131` | Form submit sets submitting state but navigates without toast confirmation | Add a sonner toast after the setTimeout resolves: toast.success('Published to X channels') |
| 6 | 🟠 weak | no-feedback-after-action | `src/pages/marketing/generate/index.tsx:133` | deploy() function only toasts success without actual persistence or error handling | Add error handling with try/catch and an error toast fallback. |
| 7 | 🟠 weak | disabled-without-reason | `src/pages/marketing/generate/index.tsx:250` | Deploy button is disabled when no artifact but has no tooltip explaining why | Add title attribute or use a Tooltip component: title='Generate an ad first' |
| 8 | 🟠 weak | fake-clickable | `src/pages/marketing/facebook-marketplace/index.tsx:159` | Listings table rows have no onClick handler despite hover styles suggesting they're clickable | Either add cursor-pointer + onClick to show details, or wrap in a Link to a listing detail page if it exists. |
| 9 | 🟠 weak | disabled-without-reason | `src/pages/marketing/analytics/index.tsx:250` | Analytics table rows are not interactive but layout suggests they could be (no affordance clarity) | Add cursor-pointer or wrap in Link, or clarify in copy that rows are informational only. |
| 10 | 🟠 weak | disabled-without-reason | `src/pages/marketing/listings/new/index.tsx:137` | Submit button disabled when enabledCount === 0 but has no tooltip explaining 'Select at least one channel' | Add a title attribute: title={enabledCount === 0 ? 'Select at least one channel' : ''} or show inline help text. |
| 11 | 🟠 weak | no-feedback-after-action | `src/pages/marketing/generate/index.tsx:108` | Out-of-credits toast has action link but doesn't verify navigation succeeds | Verify the route exists and test that navigate is called. Consider await-ing navigation if possible. |
| 12 | 🟠 weak | missing-error-state | `src/pages/marketing/generate/index.tsx:101` | generateAd() function has no error handling if inputs are invalid or API fails | Add a timeout mechanism (e.g., 10s max) and error toast if generation doesn't complete. |
| 13 | 🟠 weak | inconsistent-feedback | `src/pages/marketing/analytics/index.tsx:114` | Period toggle buttons use className ternary for styling but no focus/keyboard nav affordance | Add focus-visible ring: focus-visible:ring-2 focus-visible:ring-offset-2 |
| 14 | 🟠 weak | fake-clickable | `src/pages/marketing/listings/new/index.tsx:216` | File input labels styled as clickable buttons but hidden input provides no drag-drop or file preview feedback | Add onDragOver/onDragLeave styling and a 'Drop files here' hint on drag. |
| 15 | 🟠 weak | missing-loading-state | `src/pages/marketing/facebook-ads/index.tsx:138` | Channel cards navigate via Link but have no loading spinner or skeleton on route change | Wrap each Link with a RouteTransition or show a Skeleton loader on mount. |
| 16 | 🟠 weak | missing-loading-state | `src/pages/marketing/index.tsx:103` | Generate with AI button navigates without loading feedback | Add a RouteTransition wrapper or a loading spinner on click. |
| 17 | 🟠 weak | missing-error-state | `src/pages/marketing/commissions/index.tsx:37` | fetchAnalyticsTeams promise catches errors silently with no user feedback | Show an error toast on catch, or display an inline error message in the component. |
| 18 | 🟠 weak | dead-button | `src/components/marketing/sign-in-modal.tsx:136` | SSO buttons in sign-in modal navigate directly without checking OAuth success | Implement proper OAuth handlers that check for success/failure before navigating; show error toast on OAuth failure. |
| 19 | 🟠 weak | no-feedback-after-action | `src/components/marketing/sign-in-modal.tsx:53` | Modal form submit doesn't validate field values before submission | Add client-side validation: check email format, password length >= 8, show inline errors if invalid. |
| 20 | 🟠 weak | missing-loading-state | `src/components/marketing/marketing-frame.tsx:95` | Mobile drawer navigation close doesn't show any visual feedback | Add haptic feedback on backdrop click (haptic.light()) to confirm the action to the user. |
| 21 | 🟠 weak | fake-clickable | `src/components/marketing/channel-shell.tsx:101` | Disabled button inside Link still navigates | Either wrap the conditional navigation in the Link (show different content when disabled) or move the disabled state logic to prevent the Link from rendering entirely when provider is not connected. |
| 22 | 🟡 cosmetic | placeholder-leak | `src/pages/marketing/generate/index.tsx:188` | Empty state placeholder text is somewhat generic ('Describe your ad, or just hit Generate') | Dynamically change the example copy based on the selected subject (product/service/app/custom). |
| 23 | 🟡 cosmetic | placeholder-leak | `src/pages/marketing/index.tsx:62` | Marketing dashboard shows mock data (CHANNELS, CAMPAIGNS, INSIGHTS) with hardcoded 2024 dates | Add a note in code comments that this is mock data, or wire to real API on next phase. |
| 24 | 🟡 cosmetic | other | `src/components/marketing/marketing-frame.tsx:243` | Social media links in footer use placeholder URLs | Replace with real account URLs: twitter.com/[pallio_account], instagram.com/[pallio_account], linkedin.com/company/[pallio_company]. |
| 25 | 🟡 cosmetic | other | `src/components/marketing/sign-in-modal.tsx:186` | "Forgot password?" link in modal routes to contact page, not password-reset flow | Create /forgot-password route or replace with a password-reset flow (email + verification code). |

## inventory (22)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🔴 broken | dead-button | `src/pages/inventory/index.tsx:530` | View button routes to /inventory instead of item detail | Change Link to={`/inventory/${item.sku}`} or implement item detail modal/page route |
| 2 | 🔴 broken | broken-link-or-route | `src/pages/inventory/brands/index.tsx:115` | Brand card link routes to /inventory/brands instead of brand detail | Change to Link to={`/inventory/brands/${r.name}`} or implement brand detail page/modal |
| 3 | 🔴 broken | broken-link-or-route | `src/pages/inventory/categories/index.tsx:144` | Category card link routes to /inventory/categories instead of category detail | Change to Link to={`/inventory/categories/${r.name}`} or implement category detail page |
| 4 | 🔴 broken | dead-button | `src/pages/inventory/units/index.tsx:98` | Edit and Delete buttons have no onClick handler | Add onClick handlers to open edit form or delete confirmation modal |
| 5 | 🔴 broken | broken-link-or-route | `src/pages/inventory/receive/index.tsx:76` | PO card link routes to /purchasing/pos instead of PO detail or receive flow | Change to Link to={`/inventory/receive/${r.po}`} or implement receive-PO detail page |
| 6 | 🔴 broken | dead-button | `src/pages/inventory/labels/index.tsx:86` | Print button has no onClick handler when enabled | Add onClick handler to call print() or route to print preview/queue; provide visual feedback |
| 7 | 🔴 broken | dead-button | `src/pages/inventory/production/index.tsx:96` | Log Run button has no onClick handler | Add onClick to open production run form or route to /inventory/production/new |
| 8 | 🔴 broken | dead-button | `src/pages/inventory/recall/index.tsx:341` | Three action buttons have no onClick handlers | Add onClick handlers to open dialogs or execute mutations; add success/error feedback |
| 9 | 🟠 weak | no-feedback-after-action | `src/pages/inventory/index.tsx:415` | Swipe action handlers are no-op empty callbacks | Implement handlers: Receive → open receive dialog or route to /inventory/receive; Edit → route to item detail/edit |
| 10 | 🟠 weak | missing-error-state | `src/pages/inventory/warranties/index.tsx:64` | Division by zero when calculating average warranty length with no filtered items | Add check: rows.length > 0 before calculating avgLength, display '—' or default if empty |
| 11 | 🟠 weak | missing-loading-state | `src/pages/inventory/price-lists/index.tsx:45` | No loading or error state while deriving price tiers from catalog | Add useQuery or useMemo with error handling; show skeleton during load |
| 12 | 🟠 weak | missing-error-state | `src/pages/inventory/composite/index.tsx:65` | Division by zero in average margin calculation when rows.length is 0 | Add guard: rows.length > 0 ? avgMargin : 0 or '—' |
| 13 | 🟠 weak | no-feedback-after-action | `src/pages/inventory/adjustments/index.tsx:152` | Adjustment form submit has no success or error feedback | Add try/catch; emit toast on success/error; show error inline if recordStockMovement fails |
| 14 | 🟠 weak | no-feedback-after-action | `src/pages/inventory/transfers/index.tsx:142` | Transfer form submit has no success or error feedback | Add try/catch with error toast; emit success toast; show inline validation errors |
| 15 | 🟠 weak | no-feedback-after-action | `src/pages/inventory/receive/index.tsx:144` | Receive form submit has no success or error feedback | Add try/catch; emit success/error toast; validate qty > 0 with error message |
| 16 | 🟠 weak | missing-error-state | `src/pages/inventory/recipes/index.tsx:212` | Recipe cost rollup displays '—' for missing components but no error toast | Show toast warning on page load if recipes have missing components; link to add missing SKUs |
| 17 | 🟠 weak | broken-link-or-route | `src/pages/inventory/production/index.tsx:170` | Schedule tab fallback link to /ai may not be accessible | Verify /ai route is publicly accessible or guard appropriately; consider internal dialog instead |
| 18 | 🟠 weak | missing-loading-state | `src/pages/inventory/lots/index.tsx:33` | No loading or skeleton state while sorting lots into FEFO order | Add useMemo with explicit dependency array; consider async sort with loading state |
| 19 | 🟠 weak | no-feedback-after-action | `src/pages/inventory/new/index.tsx:35` | New item form submit has no actual mutation or redirect on success | Replace with real mutation call (api.post or recordStockMovement); navigate to /inventory on success; show error toast on failure |
| 20 | 🟠 weak | missing-error-state | `src/pages/inventory/new/index.tsx:69` | Form fields have no validation feedback or error messages | Add onBlur validation; show error message below each field; disable submit until valid |
| 21 | 🟠 weak | missing-error-state | `src/pages/inventory/new/index.tsx:153` | No validation to ensure unit cost < retail price or warn on unusual pricing | Add validation: on blur, check cost < retail; show warning if retail <= cost |
| 22 | 🟡 cosmetic | placeholder-leak | `src/pages/inventory/index.tsx:62` | Magic number 9999 appears in code with explanation only in comment | Export UNLIMITED_STOCK constant from lib/inventory/derive; replace all hardcoded 9999 references |

## accounting (22)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🔴 broken | broken-link-or-route | `src/pages/accounting/profit-loss/index.tsx:160` | Export accountant pack link routes to # (dead route) | Replace href="#" with a real route or handler (e.g., onclick={downloadStatements} with ZIP export logic). |
| 2 | 🔴 broken | broken-link-or-route | `src/pages/accounting/journal-entries/index.tsx:397` | Trial balance link routes to # (dead route) | Implement a trial balance page/modal and route the link there, or add a handler that opens a popover showing the balance. |
| 3 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/payroll/index.tsx:148` | Preview payslips button shows toast but doesn't actually preview | Open a modal/sheet showing payslip preview for each employee, or generate a PDF preview document. |
| 4 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/payroll/index.tsx:151` | Approve + run button shows toast but doesn't prevent double-click | Add isLoading state, disable button during processing, and show a spinner in the button. |
| 5 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/payroll/index.tsx:167` | Salary register Export button has no loading state | Show a loading spinner/skeleton while generating XLSX export, then toast success when complete. |
| 6 | 🟠 weak | inconsistent-feedback | `src/pages/accounting/payroll/index.tsx:291` | Download button in pay-run history has no confirmation or loading state | Add loading spinner and use blob download API with proper error handling. |
| 7 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/commissions/index.tsx:243` | Approve bulk button disabled with no tooltip explaining why | Add title="No pending commissions to approve" or aria-label to explain the disabled state. |
| 8 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/commissions/index.tsx:246` | Pay bulk button disabled with no tooltip explaining why | Add title="No approved commissions to pay" or aria-label explaining the disabled state. |
| 9 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/commissions/index.tsx:384` | Approve & Reject action buttons in table rows provide toast but no state change UI | Optimistically update the row UI (skeleton, fade out) immediately on click, then confirm when the toast fires. |
| 10 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/commissions/index.tsx:531` | Rules sheet opens with no save confirmation or error handling | Add explicit Save/Cancel buttons in the sheet footer, and provide toast feedback on save success/error. |
| 11 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/taxes/index.tsx:132` | Export button shows toast immediately, no loading state | Show a loading spinner during export, then toast success only after the file is ready to download. |
| 12 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/taxes/index.tsx:161` | File/Review/Marked filed buttons provide toast but no visual feedback in table | Optimistically update the filing status badge, disable button briefly with spinner, then confirm via toast. |
| 13 | 🟠 weak | dead-button | `src/pages/accounting/chart-of-accounts/index.tsx:226` | Add account button shows toast "arrives with the backend" with no real action | Either implement account creation UI or hide/disable the button with a tooltip explaining it's not yet available. |
| 14 | 🟠 weak | dead-button | `src/pages/accounting/chart-of-accounts/index.tsx:283` | Edit account button shows toast "arrives with the backend" for parent accounts | Implement an edit form/modal for account properties, or hide the button if editing is not yet supported. |
| 15 | 🟠 weak | dead-button | `src/pages/accounting/chart-of-accounts/index.tsx:300` | Edit account button shows toast "arrives with the backend" for child accounts | Implement account edit UI for sub-accounts or hide/disable the button. |
| 16 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/journal-entries/index.tsx:500` | Manual entry form post button disabled without visible reason on mobile | Add aria-label="Cannot post: entry not balanced" or title attribute to explain why the button is disabled. |
| 17 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/reconciliation/index.tsx:177` | Upload statement button shows toast "arrives with the backend" with no actual upload | Implement file upload UI with drag-and-drop support, or hide button and show "Coming soon" badge. |
| 18 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/reconciliation/index.tsx:180` | Mark reconciled button has no loading state or lock-period feedback | Show a loading spinner, then provide a toast confirming reconciliation is complete and when next reconciliation is due. |
| 19 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/reconciliation/index.tsx:310` | Quick fixes buttons show toast "arrives with the backend" without real actions | Either implement the quick fix actions (open forms for each fix type) or hide/disable these buttons with a 'Coming soon' indicator. |
| 20 | 🟠 weak | no-feedback-after-action | `src/pages/accounting/reconciliation/index.tsx:266` | Confirm match button disabled with no tooltip on smaller screens | Add aria-label="Select one bank line and one Pallio entry to confirm match" to explain the disabled state. |
| 21 | 🟡 cosmetic | other | `src/pages/accounting/balance-sheet/index.tsx:156` | Account codes shown as sub-text but no copy-to-clipboard action | Add a hover reveal with copy-to-clipboard button, or make account code clickable to copy. |
| 22 | 🟡 cosmetic | other | `src/pages/accounting/cash-flow/index.tsx:142` | Cross-links to other reports use consistent pattern but may benefit from section header | Keep consistent label across the app: 'Bank Reconciliation' everywhere. |

## purchasing (21)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🔴 broken | broken-link-or-route | `src/pages/purchasing/receipts/index.tsx:88` | Receipt list rows link to root /purchasing/receipts instead of specific receipt detail | Change Link to="/purchasing/receipts" to to={`/purchasing/receipts/${r.id}`} and add a receipts detail page route |
| 2 | 🔴 broken | broken-link-or-route | `src/pages/purchasing/bills/index.tsx:95` | Bill list rows link to root /purchasing/bills instead of bill detail | Change Link to to={`/purchasing/bills/${r.id}`} and create bills detail page |
| 3 | 🔴 broken | broken-link-or-route | `src/pages/purchasing/vendor-credits/index.tsx:87` | Vendor credit list rows link to root instead of credit detail | Change Link to to={`/purchasing/vendor-credits/${r.id}`} and create detail page |
| 4 | 🔴 broken | dead-button | `src/pages/purchasing/pos/index.tsx:216` | SwipeableRow 'Receive' and 'Close' buttons have no-op handlers | Implement actual handlers or remove these buttons entirely until backend is ready |
| 5 | 🔴 broken | broken-link-or-route | `src/pages/purchasing/pos/index.tsx:220` | Mobile PO list rows link to root /purchasing/pos instead of PO detail | Change Link to to={`/purchasing/pos/${p.id.toLowerCase()}`} to match desktop 'Open' button |
| 6 | 🔴 broken | broken-link-or-route | `src/pages/purchasing/suppliers/index.tsx:121` | Supplier list rows link to /purchasing/vendors instead of supplier/vendor detail | Change Link to to={`/purchasing/vendors/${r.name.toLowerCase().replace(/\s+/g, '-')}`} |
| 7 | 🟠 weak | no-feedback-after-action | `src/pages/purchasing/vendors/[id]/index.tsx:143` | Delete vendor button shows toast message but no actual delete flow | Add a confirmation dialog and implement delete flow once backend is ready |
| 8 | 🟠 weak | no-feedback-after-action | `src/pages/purchasing/vendors/[id]/index.tsx:144` | Export PO button shows toast message but no actual export | Implement CSV export using jspdf/html2canvas or trigger actual backend export |
| 9 | 🟠 weak | inconsistent-feedback | `src/pages/purchasing/pos/index.tsx:297` | PO 'Open' link button goes to root instead of detail | Link to specific PO: to={`/purchasing/pos/${p.id.toLowerCase()}`} and create detail page |
| 10 | 🟠 weak | no-feedback-after-action | `src/pages/purchasing/vendors/new/index.tsx:29` | New vendor form has no success/error toast after submission | Add success toast on submit and navigate to /purchasing/vendors on completion |
| 11 | 🟠 weak | no-feedback-after-action | `src/pages/purchasing/pos/new/index.tsx:50` | New PO form has no success/error toast after submission | Add success toast and navigate to /purchasing/pos after creation |
| 12 | 🟠 weak | no-feedback-after-action | `src/pages/purchasing/receipts/new/index.tsx:29` | New receipt form has no success feedback after submission | Add success toast and navigate after submission |
| 13 | 🟠 weak | no-feedback-after-action | `src/pages/purchasing/bills/new/index.tsx:30` | New bill form has no success feedback after submission | Add success toast and redirect to /purchasing/bills |
| 14 | 🟠 weak | no-feedback-after-action | `src/pages/purchasing/vendor-credits/new/index.tsx:33` | New vendor credit form has no success feedback | Add success toast and navigate to /purchasing/vendor-credits |
| 15 | 🟠 weak | missing-loading-state | `src/pages/purchasing/vendors/index.tsx:117` | KPI ribbon lacks loading state on data refresh | Wire useQuery with loading skeleton on KPI tiles |
| 16 | 🟠 weak | missing-loading-state | `src/pages/purchasing/pos/index.tsx:308` | PO list has no skeleton or loading state when pulling to refresh | Show loading spinner or skeleton during the refresh delay |
| 17 | 🟠 weak | missing-loading-state | `src/pages/purchasing/receipts/index.tsx:31` | Receipts list has no loading feedback during pull-to-refresh | Add spinner or skeleton during refresh |
| 18 | 🟠 weak | missing-loading-state | `src/pages/purchasing/bills/index.tsx:33` | Bills list lacks loading state on pull-to-refresh | Show spinner during refresh |
| 19 | 🟠 weak | missing-loading-state | `src/pages/purchasing/vendor-credits/index.tsx:33` | Vendor credits list lacks loading feedback on pull-to-refresh | Add loading indicator |
| 20 | 🟠 weak | missing-loading-state | `src/pages/purchasing/suppliers/index.tsx:58` | Suppliers list lacks loading state during pull-to-refresh | Show spinner or skeleton |
| 21 | 🟡 cosmetic | other | `src/pages/purchasing/pos/index.tsx:132` | KPI tiles show 'in flight' hints but data never refreshes on pull-to-refresh | Add useQuery for live PO summary data with loading skeleton state |

## storefront (19)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | dead-button | `src/pages/storefront/analytics/index.tsx:156` | Export button has empty onClick handler | Either implement export logic or disable button with tooltip explaining it 'arrives with the backend'. |
| 2 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/billing/index.tsx:202` | Upgrade button shows placeholder toast message | Remove toast or disable button with explanation that upgrade flow is pending backend work. |
| 3 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/billing/index.tsx:206` | Pause button shows placeholder toast message | Either implement pause logic or disable button with clear explanation. |
| 4 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/billing/index.tsx:231` | Update card button shows placeholder toast message | Remove toast and disable button until backend card update flow is implemented. |
| 5 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/billing/index.tsx:308` | Invoice download button calls fake success toast | Implement actual PDF download or remove success toast and replace with appropriate messaging. |
| 6 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/billing/index.tsx:351` | Invoice download button calls fake success toast | Either wire to actual PDF download endpoint or show 'Coming soon' state with explanation. |
| 7 | 🟠 weak | inconsistent-feedback | `src/pages/storefront/billing/index.tsx:406` | Plan switcher buttons show success toast without state change | Either implement actual plan change logic with state update or disable buttons with 'Coming soon' state. |
| 8 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/billing/index.tsx:435` | Add-on buttons show fake completion toasts | Implement actual add-on state management or disable buttons with explanation. |
| 9 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/billing/index.tsx:457` | Promo code apply button shows fake success toast | Implement promo code validation and actual discount application or disable button with explanation. |
| 10 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/billing/index.tsx:477` | Cancel subscription button shows fake scheduling toast | Either implement actual subscription cancellation flow or disable button with explanation. |
| 11 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/discounts/index.tsx:191` | AI suggestion buttons show fake draft creation toasts | Either implement actual draft creation and navigation or remove toast and show 'Coming soon' state. |
| 12 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/discounts/index.tsx:394` | Edit button shows placeholder toast message | Remove toast and disable button until discount edit flow is implemented. |
| 13 | 🟠 weak | disabled-without-reason | `src/pages/storefront/domain/index.tsx:224` | Disabled add domain button still executes onClick handler | Either remove onClick handler from disabled button or remove disabled state with validation inside handler. |
| 14 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/pages/index.tsx:257` | Page visibility toggle calls toast without state mutation | Wire visibility toggle to actual state mutation and update UI to reflect new visibility status. |
| 15 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/products/index.tsx:257` | Product visibility toggle calls toast without state mutation | Add state mutation handler to actually toggle product visibility and update visible state. |
| 16 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/settings/index.tsx:281` | Shipping zone edit button shows placeholder toast | Remove toast and disable button until shipping zone editor is implemented. |
| 17 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/settings/index.tsx:294` | Add shipping zone button shows placeholder toast | Remove toast and disable button with explanation until zone editor is ready. |
| 18 | 🟠 weak | no-feedback-after-action | `src/pages/storefront/settings/index.tsx:345` | Block editor button shows placeholder toast | Remove toast and disable button until block editor is implemented. |
| 19 | 🟡 cosmetic | inconsistent-feedback | `src/pages/storefront/billing/index.tsx:298` | Export all button shows success feedback for fake action | Either implement actual export or remove toast and disable button with explanation. |

## marketing-site (17)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | broken-link-or-route | `src/pages/marketing-site/landing.tsx:97` | AI Ad Studio announcement link routes to unbuilt page | Either remove the announcement pill, link to /ai, or ensure /marketing/generate page exists and is routable. |
| 2 | 🟠 weak | inconsistent-feedback | `src/pages/marketing-site/pricing.tsx:309` | Tier CTA button states differ: no loading indicator | Either add loading state to the button with <Link> inside (convert to <button onClick={navigate}>) OR accept that Links don't show loading (document the pattern). |
| 3 | 🟠 weak | no-feedback-after-action | `src/pages/marketing-site/contact.tsx:88` | Contact form submit has no error handling or validation feedback | Add try-catch around submit, validate fields before submit (email regex, message min length), show error toast on API failure, don't reset form on error. |
| 4 | 🟠 weak | missing-error-state | `src/pages/marketing-site/contact.tsx:99` | WhatsApp link has no visual feedback or fallback if mobile browser can't handle wa.me URL | Detect if WhatsApp is available (navigator.userAgentData or user-agent sniff) and only show the button on mobile, OR add a note '(mobile only)' below the button. |
| 5 | 🟠 weak | missing-error-state | `src/pages/marketing-site/login.tsx:149` | Passkey verification failure shows warning haptic but no user-facing error message | Add toast.error('Passkey verification failed. Try again or use email/password.') on verify failure. |
| 6 | 🟠 weak | missing-error-state | `src/pages/marketing-site/login.tsx:154` | Biometric verification failure shows warning haptic but no user-facing error message | Add toast.error('Biometric verification failed. Try again or use email/password.') on verify failure. |
| 7 | 🟠 weak | no-feedback-after-action | `src/pages/marketing-site/register.tsx:81` | Register form submit has no error handling | Wrap finishSignUp in try-catch, show error toast on failure, don't navigate/reset on error. |
| 8 | 🟠 weak | missing-error-state | `src/pages/marketing-site/register.tsx:190` | Google sign-up button doesn't show error on OAuth cancellation | Check OAuth result before calling finishSignUp; show error toast if user cancelled or auth failed. |
| 9 | 🟠 weak | broken-link-or-route | `src/pages/marketing-site/privacy.tsx:68` | Privacy sub-processor list link references itself and doesn't anchor | Add id="sub-processors" to the <section> tag or change the link text to be non-interactive. |
| 10 | 🟡 cosmetic | other | `src/pages/marketing-site/landing.tsx:636` | "Resolve" action text in Insights cards has no affordance | Change to clearly non-interactive styling (smaller, muted, no arrow) or convert to a Button with actual handler. |
| 11 | 🟡 cosmetic | other | `src/pages/marketing-site/pricing.tsx:891` | Link text in footer missing underline affordance on hover | Add font-semibold or text-brand to the link base style for better contrast, OR add a visual indicator like → that appears only on hover. |
| 12 | 🟡 cosmetic | other | `src/pages/marketing-site/contact.tsx:70` | Contact form topic select has no placeholder or label hint | Add placeholder="Choose a topic" to SelectTrigger or show the default value visually. |
| 13 | 🟡 cosmetic | other | `src/pages/marketing-site/login.tsx:237` | Forgot password link routes to /contact instead of /forgot-password | Create /forgot-password route or change link label to 'Contact support' with clearer copy about password recovery. |
| 14 | 🟡 cosmetic | placeholder-leak | `src/pages/marketing-site/register.tsx:248` | Register password field placeholder text is a hint, not a placeholder | Change placeholder to '••••••••' and move 'At least 8 characters' to a help text below the input. |
| 15 | 🟡 cosmetic | other | `src/pages/marketing-site/privacy.tsx:16` | Privacy policy 'Last updated' date is generated at render time, not static | Replace dynamic date with a constant like "Last updated: May 23, 2026" or fetch from config/CMS. |
| 16 | 🟡 cosmetic | other | `src/pages/marketing-site/terms.tsx:16` | Terms of service 'Last updated' date is generated at render time, not static | Replace dynamic date with a constant like "Last updated: May 23, 2026" or fetch from config/CMS. |
| 17 | 🟡 cosmetic | other | `src/pages/marketing-site/about.tsx:259` | Footer quick-link 'Roadmap' is misnamed (actually About > Story) | Create /roadmap page and update the link, OR rename label from 'Roadmap' to 'Our story'. |

## pos (16)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | missing-loading-state | `src/pages/pos/index.tsx:755` | Mobile scan sheet lacks visual feedback during barcode input | Add a brief visual pulse or toast.loading() immediately after onScan is called, dismiss on success/error. |
| 2 | 🟠 weak | missing-error-state | `src/components/pos/cart-content.tsx:146` | Cart quantity input lacks max constraint or validation message | Add a max attribute or validate onChange with Math.min(input, catalogMaxQty \|\| 1000), show a helper text if user hits a cap. |
| 3 | 🟠 weak | no-feedback-after-action | `src/components/pos/checkout-sheet.tsx:450` | Gift card balance lookup shows result but no toast on application | Add toast.success('Gift card applied') in the onChange callback or wrap the apply button with onSuccess toast. |
| 4 | 🟠 weak | no-feedback-after-action | `src/components/pos/checkout-sheet.tsx:301` | Split bill 'Add a share' button lacks feedback confirmation | Add toast.success(`Share of ${formatPrice(amount)} added`) after onAddShare is called. |
| 5 | 🟠 weak | no-feedback-after-action | `src/pages/pos/invoices/index.tsx:197` | Bulk action buttons (Export CSV, Print, Email) lack success/error feedback | Add toast.success() after each bulk action succeeds; for Export CSV, confirm that the file download was initiated. |
| 6 | 🟠 weak | inconsistent-feedback | `src/pages/pos/invoices/[id]/index.tsx:43` | Invoice share action has three outcomes but only two are toasted | Add toast.success('Shared via system dialog') or a third case handler when share dialog opens. |
| 7 | 🟠 weak | missing-error-state | `src/pages/pos/returns/new/index.tsx:92` | Invoice lookup form does not show zero results cue when search yields nothing | When lookupError is set, show inline error text below the search input: 'Invoice not found — check the number and try again.' |
| 8 | 🟠 weak | broken-flow | `src/components/pos/manager-pin-dialog.tsx:53` | Manager PIN auto-submits at 4 digits without explicit confirm step | Remove auto-submit. Require the user to tap OK (already in the grid, line 123-128). Keep the entry limit at 6 digits but wait for explicit action. |
| 9 | 🟠 weak | missing-error-state | `src/components/pos/custom-item-dialog.tsx:51` | Custom item form submit button lacks clarity on why it's disabled when price is 0 | Add min="0.01" to the price input, and add a small helper text below: 'Price must be greater than 0.' |
| 10 | 🟠 weak | missing-loading-state | `src/components/pos/pos-settings-sheet.tsx:312` | Cash drawer open button does not show loading state while waiting | Add disabled and loading spinner while the async call is pending: `const [isOpening, setIsOpening] = useState(false)`. |
| 11 | 🟡 cosmetic | empty-state-no-cta | `src/components/pos/floating-cart.tsx:80` | Empty floating cart state is too muted and passive | Use a slightly bolder color (muted-foreground -> text-foreground) or add a subtle animation (pulse or scale) to the bar to draw the eye. |
| 12 | 🟡 cosmetic | other | `src/pages/pos/returns/index.tsx:1` | Desktop 'New return' button hidden on mobile, only FAB shown (comment clarity issue) | Add a comment in the JSX: '/* Desktop only — mobile uses MobileFab below */' |
| 13 | 🟡 cosmetic | other | `src/pages/pos/transactions/index.tsx:1` | Transaction summary strip totals do not update when filter changes | Refactor the summary calculation to use the filtered transaction list, not the full list. |
| 14 | 🟡 cosmetic | empty-state-no-cta | `src/components/pos/catalog-grid.tsx:263` | Empty catalog search result does not show secondary CTA buttons | Add buttons below the message: 'Clear search' and 'Show all products'. |
| 15 | 🟡 cosmetic | disabled-without-reason | `src/components/pos/item-options-sheet.tsx:94` | Add button disabled state lacks visual cue about why (required options) | Add aria-disabled tooltip or inline text: 'Please choose all required options.' Show it only when disabled. |
| 16 | 🟡 cosmetic | fake-clickable | `src/components/pos/barcode-scanner-input.tsx:54` | Barcode scanner 'Add' button is always clickable despite empty input doing nothing | Add disabled={!value.trim()} and aria-label or title explaining it requires a code. |

## communications (11)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | disabled-without-reason | `src/pages/communications/new/index.tsx:344` | AI draft button disabled with vague label | Add aria-disabled + aria-label='Feature coming in Q3' or a hover tooltip explaining ETA |
| 2 | 🟠 weak | missing-error-state | `src/pages/communications/new/index.tsx:252` | File attachment upload has no error feedback path | Add file validation (size check, type whitelist) + toast.error() on invalid file |
| 3 | 🟠 weak | inconsistent-feedback | `src/pages/communications/new/index.tsx:186` | Recipient field required but no validation error shown | Show an inline error under To field or a toast: 'At least one recipient required' when user attempts send with empty To |
| 4 | 🟠 weak | missing-error-state | `src/pages/communications/new/index.tsx:205` | Email subject required (email channel) but no validation feedback | Add aria-invalid + aria-describedby linking to an error span below the Subject input |
| 5 | 🟠 weak | empty-state-no-cta | `src/pages/communications/templates/index.tsx:137` | Empty template search shows 'no results' without search refinement hint | Add EmptyState component when filtered.length === 0, with 'No templates match' + suggestion to clear search or browse all |
| 6 | 🟠 weak | disabled-without-reason | `src/pages/communications/templates/index.tsx:203` | AI template generator disabled without explanation | Add aria-label='Feature coming when AI backend ships' or a tooltip on hover |
| 7 | 🟠 weak | broken-modal-close | `src/pages/communications/templates/index.tsx:219` | Template preview footer buttons don't visually align with sheet close | Add a labeled Close button in the footer or clarify via tooltip that Use Template closes the preview |
| 8 | 🟠 weak | missing-error-state | `src/pages/communications/templates/template-editor.tsx:112` | Template name field has no min-length or max-length hint | Add maxLength={100} and aria-label='Template name (required)' |
| 9 | 🟠 weak | inconsistent-feedback | `src/pages/communications/index.tsx:162` | Drafts empty state has CTA but inbox/sent don't | Add 'Compose new' action to all empty states, or explain why inbox/sent don't have one |
| 10 | 🟡 cosmetic | disabled-without-reason | `src/pages/communications/new/index.tsx:344` | AI draft button uses same disabled style as form errors | Use a different visual treatment: striped pattern, or a badge overlay 'Coming soon', or move to a separate 'future features' card |
| 11 | 🟡 cosmetic | disabled-without-reason | `src/pages/communications/templates/template-editor.tsx:190` | Save button disabled due to validation but no inline error hints | Add red border or error badge to empty required fields, or show a summary error like 'Fill in all required fields' |

## reporting (9)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🔴 broken | broken-link-or-route | `src/pages/reporting/recipe-cost/index.tsx:106` | Recipe detail link may route to non-existent page | Verify /inventory/recipes/:id exists; if not, remove the Link or make it a tooltip-only view |
| 2 | 🔴 broken | broken-link-or-route | `src/pages/reporting/index.tsx:75` | Inventory reports link to non-existent routes | Remove or verify these routes exist; if they're planned, mark as planned or link to a roadmap |
| 3 | 🔴 broken | broken-link-or-route | `src/pages/reporting/index.tsx:71` | Stock report routes do not exist | Verify routes exist or remove from the cards array; check if these are planned or moved to a different location |
| 4 | 🟠 weak | empty-state-no-cta | `src/pages/reporting/allergens/index.tsx:76` | No action when recipes list is empty | Add a Link button to /inventory/recipes/new in the empty state card |
| 5 | 🟠 weak | inconsistent-feedback | `src/pages/reporting/allergens/index.tsx:86` | Empty state message inconsistent with other reports | Standardize empty messages: use 'No data for this period.' or 'No recipes for this period.' across all reports |
| 6 | 🟠 weak | inconsistent-feedback | `src/pages/reporting/activity-log/index.tsx:165` | Activity log empty state differs from table default | Use DataTable's emptyMessage prop to pass 'No events match these filters.' instead of hardcoding it |
| 7 | 🟠 weak | missing-loading-state | `src/pages/reporting/recipe-cost/index.tsx:76` | useMemo for recipe cost rollup has no error handling | Wrap rollupRecipeCost in try-catch and render error badge for recipes with missing components (already tracked as row.missing but not surfaced in UI) |
| 8 | 🟠 weak | empty-state-no-cta | `src/pages/reporting/allergens/index.tsx:89` | Allergens report second empty check is redundant | Add a Link in the empty state to '/inventory/recipes/new' so users can create recipes and return to this report |
| 9 | 🟡 cosmetic | placeholder-leak | `src/pages/reporting/variance/index.tsx:41` | Commented dev note in variance render function | Add a title or aria-label to the span explaining drift direction, or reference the legend at the top |

## app (3)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | placeholder-leak | `src/components/app/notification-bell.tsx:60` | Hardcoded mock invoice ID in href | Extract href pattern to `n.href` or template it from notification data at runtime |
| 2 | 🟠 weak | missing-loading-state | `src/components/app/user-menu.tsx:91` | Sign-out is async with no loading feedback | Show a loading spinner on the sign-out button during clearAuth(), or disable it with aria-busy=true |
| 3 | 🟠 weak | missing-error-state | `src/components/app/user-menu.tsx:91` | Sign-out has no error toast fallback | Wrap clearAuth() in try/catch and emit a toast on error: toast.error('Failed to sign out') |

## reports (2)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | dead-button | `src/components/reports/export-menu.tsx:91` | Save as PDF button duplicates Print action | Either implement real PDF export using jsPDF, or remove 'Save as PDF' and keep only 'Print' |
| 2 | 🟠 weak | missing-loading-state | `src/components/reports/report-shell.tsx:56` | No loading state when period chips change | Add a loading state in ReportShell that shows a skeleton or spinner when period changes and data is re-fetching |

## dashboard (2)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | broken-link-or-route | `src/components/dashboard/recent-sales-card.tsx:65` | Row links route to potentially nonexistent invoice detail pages | Either pre-load invoices and validate IDs exist before rendering links, or add error boundary + 404 handling in the detail page route. |
| 2 | 🟠 weak | broken-link-or-route | `src/components/dashboard/storefront-snapshot.tsx:117` | Storefront stats tiles route to undefined storefront sub-pages | Verify storefront sub-page routes exist in routes.ts. If missing, either create the pages or replace links with a storefront management CTA. |

## expenses (2)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | no-feedback-after-action | `src/pages/expenses/index.tsx:208` | Add expense FAB button on mobile has no loading or success feedback | Show a brief success toast after onCreate callback, or add a loading state to the FAB during the dialog's submission. |
| 2 | 🟡 cosmetic | placeholder-leak | `src/pages/expenses/new/index.tsx:122` | File input shows browser default 'No file chosen' label with no custom styling | Create a custom file-input component that displays a drag-drop zone with file-size validation and visual feedback (accepted files shown). |

## affiliate (1)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | missing-error-state | `src/pages/affiliate/dashboard/index.tsx:88` | Commission conversion calculation shows no guard against division by zero | Add a guard: if conv === 0 && me.affiliateClicks > 0, show a subtle (i) icon or warning badge explaining the metric may be incomplete. |

## appointments (1)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | missing-error-state | `src/pages/appointments/index.tsx:420` | Reject time-off request sheet has no error handling if submission fails | Wrap the state update in a try-catch; show a toast on error. Or add an async status flag to disable the button during submission. |

## onboarding (1)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟡 cosmetic | other | `src/pages/onboarding/index.tsx:133` | Progress ring SVG uses hardcoded values (42, 50, 264) with no comments | Add inline comments: `r="42" /* inner radius */` and `strokeDasharray={...} /* 2πr * (pct/100) */`. |

## notifications (1)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | missing-loading-state | `src/pages/notifications/index.tsx:135` | Settings panel toggle has no loading state while preferences save | Add a `[disabled]` or `opacity-50` class while a toast promise is pending, or track an async state flag. |

## pwa-installer.tsx (1)

| # | Sev | Category | File:line | Title | Fix hint |
|---:|---|---|---|---|---|
| 1 | 🟠 weak | missing-loading-state | `src/components/pwa-installer.tsx:105` | Service worker refresh has no loading spinner | Add loading state to button during the refresh, disable it, and show a spinner icon |

---

# PR-sized clusters (ship order)

Cluster pass produced **22 clusters**. Priority order: broken-only first, then mixed, then weak/cosmetic. Each cluster is one commit + push.

| # | ID | Title | Area | Severity mix | Size | Findings |
|---:|---|---|---|---|---|---:|
| 1 | `c01-inventory-broken-routes-buttons` | Inventory: fix broken list-to-detail routes and dead buttons | Inventory | 7 broken | M | 8 |
| 2 | `c02-inventory-form-feedback` | Inventory: form submit feedback and validation | Inventory | 14 weak | L | 14 |
| 3 | `c03-sales-broken-detail-routes` | Sales: fix list-to-detail routes across invoices/receipts/shipments/returns/discounts/team | Sales | 7 broken | M | 7 |
| 4 | `c04-sales-new-form-feedback` | Sales: success toasts for new-record forms | Sales | 18 weak | L | 18 |
| 5 | `c05-purchasing-broken-routes-buttons` | Purchasing: fix list-to-detail routes and dead swipe handlers | Purchasing | 6 broken | M | 6 |
| 6 | `c06-purchasing-form-feedback-loading` | Purchasing: form feedback and pull-to-refresh loading states | Purchasing | 14 weak, 1 cosmetic | L | 15 |
| 7 | `c07-pos-broken-and-weak-fixes` | POS: cart, checkout, scanner, settings UX fixes | POS | 1 broken, 11 weak, 4 cosmetic | L | 16 |
| 8 | `c08-accounting-dead-routes-buttons` | Accounting: dead links and placeholder action buttons | Accounting | 2 broken, 10 weak | L | 12 |
| 9 | `c09-accounting-disabled-and-feedback` | Accounting: disabled tooltips, optimistic updates, save confirmations | Accounting | 8 weak, 2 cosmetic | M | 10 |
| 10 | `c10-reporting-fixes` | Reporting: dead routes, empty states, and PDF/export consistency | Reporting | 3 broken, 7 weak, 1 cosmetic | M | 11 |
| 11 | `c11-marketing-app-form-and-buttons` | Marketing app: campaign/listing/generate form persistence and feedback | Marketing | 3 broken, 14 weak, 2 cosmetic | L | 19 |
| 12 | `c12-storefront-billing-fake-toasts` | Storefront billing: remove fake success toasts for unimplemented actions | Storefront | 10 weak, 1 cosmetic | M | 11 |
| 13 | `c13-storefront-other-fake-toggles` | Storefront: analytics/discounts/pages/products/settings placeholder fixes | Storefront | 8 weak | M | 8 |
| 14 | `c14-communications-form-and-empty` | Communications: compose/template validation and empty-state CTAs | Communications | 9 weak, 2 cosmetic | M | 11 |
| 15 | `c15-settings-broken-dead-buttons` | Settings: dead Edit/Delete/Revoke action buttons | Settings | 1 broken, 4 weak | M | 5 |
| 16 | `c16-settings-confirmations-and-tooltips` | Settings: confirmation dialogs and disabled tooltips for destructive actions | Settings | 5 weak | S | 5 |
| 17 | `c17-settings-form-save-feedback` | Settings: missing save success and error handling across forms | Settings | 14 weak, 2 cosmetic | L | 16 |
| 18 | `c18-settings-payments-and-integrations` | Settings payments and integrations: feedback, error handling, placeholder cleanup | Settings | 16 weak, 1 cosmetic | L | 18 |
| 19 | `c19-dashboard-and-misc-app` | Dashboard, expenses, appointments, onboarding, notifications polish | Dashboard & misc | 7 weak, 1 cosmetic | M | 8 |
| 20 | `c20-marketing-site-auth-and-feedback` | Marketing site: login/register/contact/sign-in modal feedback and validation | Marketing site | 10 weak, 4 cosmetic | L | 14 |
| 21 | `c21-marketing-site-content-and-links` | Marketing site: dead links, dynamic-date legal pages, content cleanup | Marketing site | 1 broken, 1 weak, 6 cosmetic | S | 8 |
| 22 | `c22-app-shell-components` | App shell components: notification bell, PWA, user menu, channel shell | App shell | 5 weak | S | 5 |

## Cluster detail

### 1. `c01-inventory-broken-routes-buttons` — Inventory: fix broken list-to-detail routes and dead buttons

**Area:** Inventory · **Severity mix:** 7 broken · **Size:** M

**Rationale:** All inventory-section broken routes and dead buttons — wire detail routes and onClick handlers in one pass.

**Findings in this cluster:**

- View button routes to /inventory instead of item detail
- Brand card link routes to /inventory/brands instead of brand detail
- Category card link routes to /inventory/categories instead of category detail
- Edit and Delete buttons have no onClick handler
- PO card link routes to /purchasing/pos instead of PO detail or receive flow
- Print button has no onClick handler when enabled
- Log Run button has no onClick handler
- Three action buttons have no onClick handlers

### 2. `c02-inventory-form-feedback` — Inventory: form submit feedback and validation

**Area:** Inventory · **Severity mix:** 14 weak · **Size:** L

**Rationale:** Wire toast.success/error around inventory CRUD forms plus guard divisions and small cleanups.

**Findings in this cluster:**

- Swipe action handlers are no-op empty callbacks
- Adjustment form submit has no success or error feedback
- Transfer form submit has no success or error feedback
- Receive form submit has no success or error feedback
- New item form submit has no actual mutation or redirect on success
- Form fields have no validation feedback or error messages
- No validation to ensure unit cost < retail price or warn on unusual pricing
- Division by zero when calculating average warranty length with no filtered items
- Division by zero in average margin calculation when rows.length is 0
- No loading or error state while deriving price tiers from catalog
- Recipe cost rollup displays '—' for missing components but no error toast
- Schedule tab fallback link to /ai may not be accessible
- No loading or skeleton state while sorting lots into FEFO order
- Magic number 9999 appears in code with explanation only in comment

### 3. `c03-sales-broken-detail-routes` — Sales: fix list-to-detail routes across invoices/receipts/shipments/returns/discounts/team

**Area:** Sales · **Severity mix:** 7 broken · **Size:** M

**Rationale:** All broken list-row navigation in sales — fix link targets and add action columns where missing.

**Findings in this cluster:**

- Desktop invoice rows link to non-existent invoice detail route
- Receipt rows appear clickable but navigate to root receipts page
- Mobile shipment rows link to list page instead of detail
- Desktop shipment table has no action column or detail navigation
- Mobile return rows link to list page instead of detail
- Discount rows navigate to list page instead of detail
- Recent invoices link to wrong route (/pos/invoices instead of /sales/invoices)

### 4. `c04-sales-new-form-feedback` — Sales: success toasts for new-record forms

**Area:** Sales · **Severity mix:** 18 weak · **Size:** L

**Rationale:** Sweep all sales 'new' forms and stub actions for consistent toast feedback, CTA empty states, and disabled tooltips.

**Findings in this cluster:**

- Swipeable row Print/Pay actions have no onPress implementation
- Subtotal field accepts manual input but may not validate against line items
- PDF download button shows generic toast instead of file download
- Commission rate input has no validation or bounds feedback
- Send button disabled without explicit reason tooltip
- Clear channel confirmation uses browser alert() instead of Sonner toast
- Form submission has no success feedback toast
- Form submission has no success feedback toast
- Form submission has no success feedback
- Form submission has no success feedback
- Form submission has no success feedback
- Form submission has no success feedback
- Delete customer button has no confirmation and shows placeholder toast
- Export CSV button has no implementation, shows placeholder toast
- PDF download button shows placeholder toast instead of downloading
- Empty 'Recent invoices' state has no CTA to create first invoice
- Empty inventory state has no CTA to go to full inventory page
- Invoice from order button may show while loading

### 5. `c05-purchasing-broken-routes-buttons` — Purchasing: fix list-to-detail routes and dead swipe handlers

**Area:** Purchasing · **Severity mix:** 6 broken · **Size:** M

**Rationale:** All broken navigation in purchasing — fix link targets across PO/receipt/bill/credit/supplier lists.

**Findings in this cluster:**

- Receipt list rows link to root /purchasing/receipts instead of specific receipt detail
- Bill list rows link to root /purchasing/bills instead of bill detail
- Vendor credit list rows link to root instead of credit detail
- SwipeableRow 'Receive' and 'Close' buttons have no-op handlers
- Mobile PO list rows link to root /purchasing/pos instead of PO detail
- Supplier list rows link to /purchasing/vendors instead of supplier/vendor detail

### 6. `c06-purchasing-form-feedback-loading` — Purchasing: form feedback and pull-to-refresh loading states

**Area:** Purchasing · **Severity mix:** 14 weak, 1 cosmetic · **Size:** L

**Rationale:** Add consistent submit toasts and refresh skeletons across all purchasing pages.

**Findings in this cluster:**

- Delete vendor button shows toast message but no actual delete flow
- Export PO button shows toast message but no actual export
- PO 'Open' link button goes to root instead of detail
- New vendor form has no success/error toast after submission
- New PO form has no success/error toast after submission
- New receipt form has no success feedback after submission
- New bill form has no success feedback after submission
- New vendor credit form has no success feedback
- KPI tiles show 'in flight' hints but data never refreshes on pull-to-refresh
- KPI ribbon lacks loading state on data refresh
- PO list has no skeleton or loading state when pulling to refresh
- Receipts list has no loading feedback during pull-to-refresh
- Bills list lacks loading state on pull-to-refresh
- Vendor credits list lacks loading feedback on pull-to-refresh
- Suppliers list lacks loading state during pull-to-refresh

### 7. `c07-pos-broken-and-weak-fixes` — POS: cart, checkout, scanner, settings UX fixes

**Area:** POS · **Severity mix:** 1 broken, 11 weak, 4 cosmetic · **Size:** L

**Rationale:** Polish pass across POS sub-components — feedback, validation, disabled-state hints; all small but related.

**Findings in this cluster:**

- Mobile scan sheet lacks visual feedback during barcode input
- Cart quantity input lacks max constraint or validation message
- Empty floating cart state is too muted and passive
- Gift card balance lookup shows result but no toast on application
- Split bill 'Add a share' button lacks feedback confirmation
- Bulk action buttons (Export CSV, Print, Email) lack success/error feedback
- Invoice share action has three outcomes but only two are toasted
- Invoice lookup form does not show zero results cue when search yields nothing
- Desktop 'New return' button hidden on mobile, only FAB shown (comment clarity issue)
- Transaction summary strip totals do not update when filter changes
- Manager PIN auto-submits at 4 digits without explicit confirm step
- Custom item form submit button lacks clarity on why it's disabled when price is 0
- Empty catalog search result does not show secondary CTA buttons
- Add button disabled state lacks visual cue about why (required options)
- Barcode scanner 'Add' button is always clickable despite empty input doing nothing
- Cash drawer open button does not show loading state while waiting

### 8. `c08-accounting-dead-routes-buttons` — Accounting: dead links and placeholder action buttons

**Area:** Accounting · **Severity mix:** 2 broken, 10 weak · **Size:** L

**Rationale:** Remove or wire placeholder accounting buttons; replace dead # links with real handlers or hide them.

**Findings in this cluster:**

- Export accountant pack link routes to # (dead route)
- Trial balance link routes to # (dead route)
- Add account button shows toast "arrives with the backend" with no real action
- Edit account button shows toast "arrives with the backend" for parent accounts
- Edit account button shows toast "arrives with the backend" for child accounts
- Upload statement button shows toast "arrives with the backend" with no actual upload
- Quick fixes buttons show toast "arrives with the backend" without real actions
- Preview payslips button shows toast but doesn't actually preview
- Approve + run button shows toast but doesn't prevent double-click
- Salary register Export button has no loading state
- Download button in pay-run history has no confirmation or loading state
- Export button shows toast immediately, no loading state

### 9. `c09-accounting-disabled-and-feedback` — Accounting: disabled tooltips, optimistic updates, save confirmations

**Area:** Accounting · **Severity mix:** 8 weak, 2 cosmetic · **Size:** M

**Rationale:** Add tooltips for disabled states and optimistic UI updates across commissions/taxes/reconciliation/balance-sheet.

**Findings in this cluster:**

- Approve bulk button disabled with no tooltip explaining why
- Pay bulk button disabled with no tooltip explaining why
- Approve & Reject action buttons in table rows provide toast but no state change UI
- Rules sheet opens with no save confirmation or error handling
- File/Review/Marked filed buttons provide toast but no visual feedback in table
- Manual entry form post button disabled without visible reason on mobile
- Mark reconciled button has no loading state or lock-period feedback
- Confirm match button disabled with no tooltip on smaller screens
- Account codes shown as sub-text but no copy-to-clipboard action
- Cross-links to other reports use consistent pattern but may benefit from section header

### 10. `c10-reporting-fixes` — Reporting: dead routes, empty states, and PDF/export consistency

**Area:** Reporting · **Severity mix:** 3 broken, 7 weak, 1 cosmetic · **Size:** M

**Rationale:** Reporting hub cleanup — remove dead routes, unify empty messages, fix duplicate PDF/Print action.

**Findings in this cluster:**

- No action when recipes list is empty
- Recipe detail link may route to non-existent page
- Save as PDF button duplicates Print action
- Commented dev note in variance render function
- Inventory reports link to non-existent routes
- No loading state when period chips change
- Empty state message inconsistent with other reports
- Activity log empty state differs from table default
- useMemo for recipe cost rollup has no error handling
- Stock report routes do not exist
- Allergens report second empty check is redundant

### 11. `c11-marketing-app-form-and-buttons` — Marketing app: campaign/listing/generate form persistence and feedback

**Area:** Marketing · **Severity mix:** 3 broken, 14 weak, 2 cosmetic · **Size:** L

**Rationale:** Wire campaign/listing form submit, add disabled tooltips and route-change loaders across marketing app pages.

**Findings in this cluster:**

- NewFacebookCampaign delegates to CampaignShell but form submit has no confirmation or navigation
- Form submit has 500ms mock delay but no success/error feedback
- Form submit sets submitting state but navigates without toast confirmation
- deploy() function only toasts success without actual persistence or error handling
- Deploy button is disabled when no artifact but has no tooltip explaining why
- New Listing button is disabled when provider not connected but has same styling as enabled button
- Listings table rows have no onClick handler despite hover styles suggesting they're clickable
- Analytics table rows are not interactive but layout suggests they could be (no affordance clarity)
- Submit button disabled when enabledCount === 0 but has no tooltip explaining 'Select at least one channel'
- Out-of-credits toast has action link but doesn't verify navigation succeeds
- newFacebookListing page delegates entirely to CampaignShell with kind='listing' but CampaignShell form never actually persists the listing
- generateAd() function has no error handling if inputs are invalid or API fails
- Period toggle buttons use className ternary for styling but no focus/keyboard nav affordance
- File input labels styled as clickable buttons but hidden input provides no drag-drop or file preview feedback
- Channel cards navigate via Link but have no loading spinner or skeleton on route change
- Generate with AI button navigates without loading feedback
- fetchAnalyticsTeams promise catches errors silently with no user feedback
- Empty state placeholder text is somewhat generic ('Describe your ad, or just hit Generate')
- Marketing dashboard shows mock data (CHANNELS, CAMPAIGNS, INSIGHTS) with hardcoded 2024 dates

### 12. `c12-storefront-billing-fake-toasts` — Storefront billing: remove fake success toasts for unimplemented actions

**Area:** Storefront · **Severity mix:** 10 weak, 1 cosmetic · **Size:** M

**Rationale:** Billing page is full of fake-success placeholder toasts — disable or properly mark coming-soon in one focused PR.

**Findings in this cluster:**

- Upgrade button shows placeholder toast message
- Pause button shows placeholder toast message
- Update card button shows placeholder toast message
- Export all button shows success feedback for fake action
- Invoice download button calls fake success toast
- Invoice download button calls fake success toast
- Plan switcher buttons show success toast without state change
- Add-on buttons show fake completion toasts
- Promo code apply button shows fake success toast
- Cancel subscription button shows fake scheduling toast
- Disabled add domain button still executes onClick handler

### 13. `c13-storefront-other-fake-toggles` — Storefront: analytics/discounts/pages/products/settings placeholder fixes

**Area:** Storefront · **Severity mix:** 8 weak · **Size:** M

**Rationale:** Visibility toggles, edit buttons, and AI suggestions all show fake feedback — wire state or hide.

**Findings in this cluster:**

- Export button has empty onClick handler
- AI suggestion buttons show fake draft creation toasts
- Edit button shows placeholder toast message
- Page visibility toggle calls toast without state mutation
- Product visibility toggle calls toast without state mutation
- Shipping zone edit button shows placeholder toast
- Add shipping zone button shows placeholder toast
- Block editor button shows placeholder toast

### 14. `c14-communications-form-and-empty` — Communications: compose/template validation and empty-state CTAs

**Area:** Communications · **Severity mix:** 9 weak, 2 cosmetic · **Size:** M

**Rationale:** All communication form/template polish — inline validation, AI disabled tooltips, consistent empty CTAs.

**Findings in this cluster:**

- AI draft button disabled with vague label
- File attachment upload has no error feedback path
- Recipient field required but no validation error shown
- Email subject required (email channel) but no validation feedback
- AI draft button uses same disabled style as form errors
- Empty template search shows 'no results' without search refinement hint
- AI template generator disabled without explanation
- Template preview footer buttons don't visually align with sheet close
- Save button disabled due to validation but no inline error hints
- Template name field has no min-length or max-length hint
- Drafts empty state has CTA but inbox/sent don't

### 15. `c15-settings-broken-dead-buttons` — Settings: dead Edit/Delete/Revoke action buttons

**Area:** Settings · **Severity mix:** 1 broken, 4 weak · **Size:** M

**Rationale:** Settings has several broken/dead action buttons in roles, taxes, users, printers — wire handlers or remove.

**Findings in this cluster:**

- Edit permission buttons are non-functional toast-only buttons
- Edit and Delete buttons on tax table rows have no handlers
- Member detail Edit, Reset password, Suspend, and Remove buttons are non-functional
- Session Revoke button lacks confirmation and feedback
- Printer list rows have no click handler and appear clickable

### 16. `c16-settings-confirmations-and-tooltips` — Settings: confirmation dialogs and disabled tooltips for destructive actions

**Area:** Settings · **Severity mix:** 5 weak · **Size:** S

**Rationale:** Add confirmation dialogs and tooltips across users/security/webhooks for destructive actions.

**Findings in this cluster:**

- Revoke button has only toast feedback, no confirmation
- Recovery code regeneration has only toast feedback, no confirmation
- Sessions Sign out button has only toast, inconsistent with other patterns
- Add webhook endpoint button disabled but no explanation
- Delete webhook endpoint has no confirmation dialog

### 17. `c17-settings-form-save-feedback` — Settings: missing save success and error handling across forms

**Area:** Settings · **Severity mix:** 14 weak, 2 cosmetic · **Size:** L

**Rationale:** Settings save toasts and error handling sweep across profile/preferences/notifications/invoice/roles/barcodes/currency/audit/taxes.

**Findings in this cluster:**

- Change photo button announces backend dependency but appears functional
- No explicit save feedback beyond loading state
- No explicit save feedback for notification matrix
- Invoice format preview appears interactive but is static
- No explicit save success feedback for invoice settings
- Edit warehouse route destination not verified
- User detail route destination not verified
- Commission settings Save button shows only toast, no form validation
- Invite member form lacks email validation feedback
- New role form lacks success feedback after save
- Form submit on barcode settings has no error handling
- Notification settings form has no error handling
- Currency save button shows 'Saving...' but no error toast on failure
- Invoice settings form has no error handling
- Audit log search/filter has no empty-state error message
- Empty state on mobile tax list has no CTA button

### 18. `c18-settings-payments-and-integrations` — Settings payments and integrations: feedback, error handling, placeholder cleanup

**Area:** Settings · **Severity mix:** 16 weak, 1 cosmetic · **Size:** L

**Rationale:** Settings payments/integrations/billing/webhooks/export sweep — error handling, loading states, route checks.

**Findings in this cluster:**

- Edit button has toast-only feedback instead of navigation
- Form submit has no error handling for failed save
- Help link to /contact may be unimplemented
- Export buttons show toast but don't actually export (mock until backend)
- Pause/Resume webhook buttons have no loading state or confirmation
- Card button shows placeholder 'Card ··· 4242' but toast just shows placeholder text
- Credit purchase buttons have no loading state
- Invoice download button has no loading state
- Refresh button on primary account is a mock placeholder
- Add account button is a mock placeholder
- Make primary button has no error handling
- Verify pending account button has no error handling
- Edit account button is a mock placeholder
- New withdrawal link may route to non-existent page
- Withdrawal form has no error handling
- Disconnect button has no confirmation and no error handling
- Save changes button has no error handling
- Empty state messaging is generic ('No accounts match' vs 'No accounts yet')

### 19. `c19-dashboard-and-misc-app` — Dashboard, expenses, appointments, onboarding, notifications polish

**Area:** Dashboard & misc · **Severity mix:** 7 weak, 1 cosmetic · **Size:** M

**Rationale:** Small touch-ups in dashboard widgets, expenses, appointments, onboarding, notifications.

**Findings in this cluster:**

- Row links route to potentially nonexistent invoice detail pages
- Storefront stats tiles route to undefined storefront sub-pages
- Commission conversion calculation shows no guard against division by zero
- File input shows browser default 'No file chosen' label with no custom styling
- Reject time-off request sheet has no error handling if submission fails
- Progress ring SVG uses hardcoded values (42, 50, 264) with no comments
- Settings panel toggle has no loading state while preferences save
- Add expense FAB button on mobile has no loading or success feedback

### 20. `c20-marketing-site-auth-and-feedback` — Marketing site: login/register/contact/sign-in modal feedback and validation

**Area:** Marketing site · **Severity mix:** 10 weak, 4 cosmetic · **Size:** L

**Rationale:** Marketing-site auth surfaces — login, register, contact, sign-in modal — need consistent validation/feedback.

**Findings in this cluster:**

- Tier CTA button states differ: no loading indicator
- Contact form submit has no error handling or validation feedback
- Contact form topic select has no placeholder or label hint
- WhatsApp link has no visual feedback or fallback if mobile browser can't handle wa.me URL
- Forgot password link routes to /contact instead of /forgot-password
- Passkey verification failure shows warning haptic but no user-facing error message
- Biometric verification failure shows warning haptic but no user-facing error message
- Register form submit has no error handling
- Google sign-up button doesn't show error on OAuth cancellation
- Register password field placeholder text is a hint, not a placeholder
- SSO buttons in sign-in modal navigate directly without checking OAuth success
- Modal form submit doesn't validate field values before submission
- "Forgot password?" link in modal routes to contact page, not password-reset flow
- Mobile drawer navigation close doesn't show any visual feedback

### 21. `c21-marketing-site-content-and-links` — Marketing site: dead links, dynamic-date legal pages, content cleanup

**Area:** Marketing site · **Severity mix:** 1 broken, 1 weak, 6 cosmetic · **Size:** S

**Rationale:** Cosmetic + content fixes to marketing-site landing/legal/footer pages.

**Findings in this cluster:**

- AI Ad Studio announcement link routes to unbuilt page
- "Resolve" action text in Insights cards has no affordance
- Link text in footer missing underline affordance on hover
- Privacy sub-processor list link references itself and doesn't anchor
- Privacy policy 'Last updated' date is generated at render time, not static
- Terms of service 'Last updated' date is generated at render time, not static
- Social media links in footer use placeholder URLs
- Footer quick-link 'Roadmap' is misnamed (actually About > Story)

### 22. `c22-app-shell-components` — App shell components: notification bell, PWA, user menu, channel shell

**Area:** App shell · **Severity mix:** 5 weak · **Size:** S

**Rationale:** Small cross-cutting fixes to shared shell components (notification bell, PWA installer, user menu, channel shell).

**Findings in this cluster:**

- Hardcoded mock invoice ID in href
- Service worker refresh has no loading spinner
- Sign-out is async with no loading feedback
- Sign-out has no error toast fallback
- Disabled button inside Link still navigates
