// F6 — Glossary + nav index for "how do I…" / "where is…" / "what is…"
// questions. Hand-curated to cover the ~20 asks operators repeat the
// most. Each entry carries:
//
//   keywords  — what the intent classifier matches against
//   answer    — short, plain-English response
//   link?     — optional {href,label} the page surfaces as a button
//
// This is NOT a search engine. The classifier ranks by keyword-overlap
// score; the page shows the top hit. Industry-agnostic — phrasing should
// work whether the operator runs a kitchen, a salon, or a workshop.

export type GlossaryKey = string

export type GlossaryEntry = {
  id: GlossaryKey
  keywords: string[]
  answer: string
  link?: { href: string; label: string }
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "refund",
    keywords: ["refund", "return money", "reverse payment"],
    answer:
      "From any paid invoice, tap Refund. Choose the lines and a reason. The original payment is reversed through the same tender (card refunds go back to the card, cash returns from the drawer).",
    link: { href: "/pos/returns/new", label: "Start a return" },
  },
  {
    id: "void-sale",
    keywords: ["void", "cancel sale", "scrap ticket"],
    answer:
      "Void is for sales never collected (mistyped order, walked-out customer). Open the POS invoice and tap Void. Voids need a manager override on cashier accounts.",
    link: { href: "/pos/invoices", label: "POS invoices" },
  },
  {
    id: "cash-drawer",
    keywords: ["cash drawer", "open drawer", "drawer setting"],
    answer:
      "Receipt & hardware lives under Settings → POS. Set the kick-out command for your printer there. The drawer also opens automatically on cash tender.",
    link: { href: "/settings/printers", label: "Receipt & hardware" },
  },
  {
    id: "add-product",
    keywords: ["add product", "new item", "create sku", "new menu item", "add part"],
    answer:
      "Inventory → New item. Set name, price, optional barcode + category. For variants (size/colour) toggle Has variants and define the axes.",
    link: { href: "/inventory/new", label: "New item" },
  },
  {
    id: "recipe",
    keywords: ["recipe", "bom", "bill of materials", "what is a recipe"],
    answer:
      "A Recipe (also called a Bill of Materials) tells Pallio how a parent item is MADE from components. Works for kitchens (jollof rice from rice + tomato), cosmetics labs (serum from oils), furniture makers, soap makers, anyone who turns raw inputs into a finished good. Wastage and sub-recipes are supported.",
    link: { href: "/inventory/recipes", label: "Recipes" },
  },
  {
    id: "composite-vs-recipe",
    keywords: ["composite", "bundle", "gift set", "composite vs recipe"],
    answer:
      "Composite is a SALES bundle (one SKU sold = multiple components deducted: gift sets, meal deals, buy-3-get-1). Recipe is a PRODUCTION BOM (one parent is made from components). Different jobs.",
    link: { href: "/inventory/composite", label: "Composites" },
  },
  {
    id: "low-stock",
    keywords: ["reorder", "restock", "low stock setting", "reorder point"],
    answer:
      "Set a reorder point per item from the inventory detail page. The Reorder report rolls up everything at or below its threshold and proposes a PO.",
    link: { href: "/reporting/reorder", label: "Reorder report" },
  },
  {
    id: "stock-transfer",
    keywords: ["transfer stock", "move stock", "between locations"],
    answer:
      "Inventory → Transfers. Pick the source location, the destination, and the lines. Both sides update on confirm — a transfer-out at source + transfer-in at destination land in the stock movement log.",
    link: { href: "/inventory/transfers", label: "Transfers" },
  },
  {
    id: "lots-expiry",
    keywords: ["lot", "batch", "expiry", "expiry tracking"],
    answer:
      "Lots track a receivable batch's lot code and expiry date. Pallio sells FEFO (first-expired-first-out) by default. View the lots page to see what's expiring soon.",
    link: { href: "/inventory/lots", label: "Lots" },
  },
  {
    id: "tax-rate",
    keywords: ["set tax", "vat rate", "configure tax", "tax setting"],
    answer:
      "Settings → Taxes. Add rate names + percentages and assign them to categories or individual items. The cart picks them up automatically at checkout.",
    link: { href: "/settings/taxes", label: "Tax setup" },
  },
  {
    id: "discount",
    keywords: ["discount", "promo code", "coupon"],
    answer:
      "Two layers: per-line discount (square calls this 'line discount' — applied to one cart row) and order-level discount (applied to the whole sale). Both flat or percent.",
    link: { href: "/sales/discounts", label: "Discounts" },
  },
  {
    id: "invoice-vs-receipt",
    keywords: ["what is an invoice", "invoice vs receipt", "difference invoice receipt"],
    answer:
      "An invoice is a bill — a request for payment. A receipt is the proof of payment, minted automatically when an invoice is fully paid. Refunding a paid invoice voids its receipt and emits a refund record.",
  },
  {
    id: "shift-close",
    keywords: ["close shift", "end of day", "z-report", "end shift"],
    answer:
      "Open the POS shift drawer (top-right on the till) → End shift. Count cash, reconcile card batch, print the X/Z report. The system rolls forward the next shift number automatically.",
    link: { href: "/pos", label: "Open POS" },
  },
  {
    id: "team-invite",
    keywords: ["invite team", "add staff", "new user", "invite cashier"],
    answer:
      "Settings → Users → Invite. Pick a role + locations and send the email. The invite expires after 7 days and surfaces in the Pending tab until accepted.",
    link: { href: "/settings/users", label: "Users" },
  },
  {
    id: "roles",
    keywords: ["roles", "permissions", "what can cashier do", "what is manager role"],
    answer:
      "Pallio ships 7 roles: Owner, Manager, Cashier, Sales rep, Marketer, Affiliate, Viewer — plus a Custom slot. Settings → Roles shows what each can do. Owners and Managers can change permissions per role.",
    link: { href: "/settings/roles", label: "Roles" },
  },
  {
    id: "industry",
    keywords: ["change industry", "switch to restaurant", "switch to retail", "industry setting"],
    answer:
      "Settings → Business. Picking an industry (restaurant, salon, auto, etc.) updates the vocabulary across the app and suggests sensible defaults. Every feature stays reachable — this is curation, not gating.",
    link: { href: "/settings/business", label: "Business profile" },
  },
  {
    id: "currency",
    keywords: ["change currency", "currency setting"],
    answer:
      "Settings → Currency. Eight codes supported: NGN, USD, EUR, GBP, GHS, KES, ZAR, SLL. The selection applies everywhere prices show.",
    link: { href: "/settings/currency", label: "Currency" },
  },
  {
    id: "appointments",
    keywords: ["appointment", "booking", "schedule"],
    answer:
      "Appointments → New. Pick a customer, a service, a staff member, and a slot. The sticky day-rail shows the day's bookings on desktop; mobile uses a list.",
    link: { href: "/appointments", label: "Appointments" },
  },
  {
    id: "marketing-campaign",
    keywords: ["run an ad", "marketing campaign", "facebook ad", "instagram ad"],
    answer:
      "Marketing → Campaigns. Pick a channel (Facebook, Instagram, Marketplace, YouTube), set the budget and creative, and publish. ROAS lands in the dashboard once events flow back.",
    link: { href: "/marketing", label: "Marketing" },
  },
  {
    id: "storefront",
    keywords: ["online store", "storefront", "website"],
    answer:
      "Storefront → Templates lets you pick a theme. Storefront → Settings binds your subdomain (yourshop.pallio.shop) or a custom domain. Publish toggles customer-facing visibility.",
    link: { href: "/storefront", label: "Storefront" },
  },
  {
    id: "ai-credits",
    keywords: ["ai credit", "ai usage", "credit meter"],
    answer:
      "Each AI question costs one credit. Plans include a monthly bucket; the meter pill at the top of this page shows your remaining count. Run out and you'll still get answers — we just nudge you to upgrade.",
  },
  {
    id: "backup-export",
    keywords: ["export", "backup", "csv download"],
    answer:
      "Most reporting pages have an Export button in the top-right (CSV or PDF). Settings → Data has a full account export for bookkeeping handoff.",
    link: { href: "/settings/data", label: "Data export" },
  },
]

// Pre-tokenized for fast scoring.
const TOKENISED = GLOSSARY.map((e) => ({
  ...e,
  // Each keyword is split into lowercase tokens.
  tokens: e.keywords.flatMap((k) => k.toLowerCase().split(/\s+/)),
}))

// Score = number of glossary tokens that appear in the query, weighted
// 3x when an entire keyword phrase appears verbatim. Returns the best
// match or null if no entry has any overlap.
export function findGlossary(query: string): GlossaryEntry | null {
  const lower = query.toLowerCase()
  let best: { entry: GlossaryEntry; score: number } | null = null
  for (const e of TOKENISED) {
    let score = 0
    for (const k of e.keywords) {
      if (lower.includes(k.toLowerCase())) score += 3
    }
    for (const t of e.tokens) {
      if (t.length >= 3 && lower.includes(t)) score += 1
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { entry: e, score }
    }
  }
  return best?.entry ?? null
}
