import { ORDERS, INVOICES } from "@/lib/sales/data"
import { listInvoices, loadAllCatalog, type Invoice as PosInvoice } from "@/lib/pos/storage"
import { UNLIMITED_STOCK } from "@/lib/inventory/derive"
import { MEMBERS, LOCATIONS } from "@/lib/team/data"
import { formatPriceFor } from "@/contexts/currency"

// F6 — Deterministic aggregators over the live mocks. No LLM in mock —
// the point is REAL numbers from REAL data so the operator can trust
// what they read. Each function returns a structured answer with a
// human label and a citation (which data source it pulled from).

export type Period = "today" | "week" | "month" | "all"

export type AggregatorAnswer = {
  value: string
  label: string
  breakdown?: Array<{ label: string; value: string }>
  citation: string
}

export type AggregatorKey =
  | "ordersCount"
  | "invoicesCount"
  | "topProducts"
  | "lowStock"
  | "salesRevenue"
  | "taxCollected"
  | "customerCount"
  | "avgOrderValue"
  | "cashOnHand"
  | "teamCount"

// ---------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------

function periodStart(period: Period): number {
  const now = new Date()
  switch (period) {
    case "today": {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    case "week": {
      return now.getTime() - 7 * 86_400_000
    }
    case "month": {
      return now.getTime() - 30 * 86_400_000
    }
    case "all":
    default:
      return 0
  }
}

function periodLabel(period: Period): string {
  switch (period) {
    case "today": return "today"
    case "week":  return "this week"
    case "month": return "this month"
    case "all":   return "to date"
  }
}

// POS invoices store createdAt as a number; sales invoices use ISO strings.
function posInPeriod(inv: PosInvoice, p: Period): boolean {
  return inv.createdAt >= periodStart(p)
}
function salesInPeriod(iso: string, p: Period): boolean {
  return new Date(iso).getTime() >= periodStart(p)
}

// ---------------------------------------------------------------------
// 1. Orders count
// ---------------------------------------------------------------------

export function ordersCount(period: Period = "all"): AggregatorAnswer {
  // Combine the back-office sales orders + the POS invoices (which are
  // really tills/checks). Operators don't distinguish — both are "orders".
  const orderHits = ORDERS.filter((o) => salesInPeriod(o.createdAt, period)).length
  const posHits = listInvoices().filter((i) => posInPeriod(i, period)).length
  const total = orderHits + posHits
  return {
    value: String(total),
    label: `Orders ${periodLabel(period)}`,
    breakdown: [
      { label: "Sales orders", value: String(orderHits) },
      { label: "POS checks",   value: String(posHits) },
    ],
    citation: "From your orders + POS checks",
  }
}

// ---------------------------------------------------------------------
// 2. Invoices count (with status filter)
// ---------------------------------------------------------------------

export function invoicesCount(status?: "open" | "paid" | "overdue" | "partial"): AggregatorAnswer {
  const hits = status ? INVOICES.filter((i) => i.status === status) : INVOICES
  return {
    value: String(hits.length),
    label: status ? `${cap(status)} invoices` : "Invoices",
    breakdown: status ? undefined : [
      { label: "Paid",    value: String(INVOICES.filter((i) => i.status === "paid").length) },
      { label: "Open",    value: String(INVOICES.filter((i) => i.status === "open").length) },
      { label: "Partial", value: String(INVOICES.filter((i) => i.status === "partial").length) },
      { label: "Overdue", value: String(INVOICES.filter((i) => i.status === "overdue").length) },
    ],
    citation: "From your sales invoices",
  }
}

// ---------------------------------------------------------------------
// 3. Top products by revenue
// ---------------------------------------------------------------------

export function topProducts(n: number = 5, period: Period = "month"): AggregatorAnswer {
  // Pull from BOTH POS invoices (cart items) and sales-pipeline invoices
  // (line items) so we capture every channel.
  const acc = new Map<string, { name: string; revenue: number; units: number }>()

  for (const inv of listInvoices()) {
    if (!posInPeriod(inv, period)) continue
    for (const it of inv.items) {
      const cur = acc.get(it.sku) ?? { name: it.name, revenue: 0, units: 0 }
      cur.revenue += it.qty * it.price
      cur.units += it.qty
      acc.set(it.sku, cur)
    }
  }
  for (const inv of INVOICES) {
    if (!salesInPeriod(inv.issueDate, period)) continue
    for (const ln of inv.lines) {
      const cur = acc.get(ln.sku) ?? { name: ln.name, revenue: 0, units: 0 }
      cur.revenue += ln.qty * ln.unitPriceUsd
      cur.units += ln.qty
      acc.set(ln.sku, cur)
    }
  }

  const ranked = [...acc.values()].sort((a, b) => b.revenue - a.revenue).slice(0, n)
  return {
    value: ranked[0]?.name ?? "—",
    label: `Top ${ranked.length || n} products ${periodLabel(period)}`,
    breakdown: ranked.map((r) => ({
      label: r.name,
      value: `${formatPriceFor(r.revenue)} · ${r.units} sold`,
    })),
    citation: "From your invoices",
  }
}

// ---------------------------------------------------------------------
// 4. Low stock
// ---------------------------------------------------------------------

export function lowStock(): AggregatorAnswer {
  // Reorder point isn't stored on the mock catalog yet (Wave: reorder
  // report adds it). For now use a soft threshold of 10 for tracked
  // items, skip the UNLIMITED_STOCK sentinel (services + dishes).
  const SOFT_THRESHOLD = 10
  const items = loadAllCatalog().filter((c) => {
    if (typeof c.stock !== "number") return false
    if (c.stock >= UNLIMITED_STOCK) return false
    return c.stock <= SOFT_THRESHOLD
  })
  const sorted = [...items].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
  return {
    value: String(items.length),
    label: `Items at or below ${SOFT_THRESHOLD} units`,
    breakdown: sorted.slice(0, 5).map((c) => ({
      label: c.name,
      value: `${c.stock} left`,
    })),
    citation: "From your inventory",
  }
}

// ---------------------------------------------------------------------
// 5. Sales revenue (by location)
// ---------------------------------------------------------------------

export function salesRevenue(period: Period = "today"): AggregatorAnswer {
  const posByLoc = new Map<string, number>()
  let posTotal = 0
  for (const inv of listInvoices()) {
    if (!posInPeriod(inv, period)) continue
    const loc = inv.meta?.location ?? "Unknown"
    posByLoc.set(loc, (posByLoc.get(loc) ?? 0) + inv.total)
    posTotal += inv.total
  }

  let salesTotal = 0
  for (const inv of INVOICES) {
    if (!salesInPeriod(inv.issueDate, period)) continue
    salesTotal += inv.totalUsd
  }

  const total = posTotal + salesTotal
  const breakdown: Array<{ label: string; value: string }> = []
  for (const [loc, rev] of posByLoc.entries()) {
    breakdown.push({ label: loc, value: formatPriceFor(rev) })
  }
  if (salesTotal > 0) {
    breakdown.push({ label: "Back-office invoices", value: formatPriceFor(salesTotal) })
  }

  return {
    value: formatPriceFor(total),
    label: `Revenue ${periodLabel(period)}`,
    breakdown: breakdown.length ? breakdown : undefined,
    citation: "From your invoices + POS checks",
  }
}

// ---------------------------------------------------------------------
// 6. Tax (VAT) collected
// ---------------------------------------------------------------------

export function taxCollected(period: Period = "month"): AggregatorAnswer {
  let posTax = 0
  for (const inv of listInvoices()) {
    if (!posInPeriod(inv, period)) continue
    posTax += (inv.itemTax ?? 0) + (inv.orderTax ?? 0)
  }
  let salesTax = 0
  for (const inv of INVOICES) {
    if (!salesInPeriod(inv.issueDate, period)) continue
    salesTax += inv.taxUsd
  }
  const total = posTax + salesTax
  return {
    value: formatPriceFor(total),
    label: `Tax collected ${periodLabel(period)}`,
    breakdown: [
      { label: "POS",         value: formatPriceFor(posTax) },
      { label: "Back-office", value: formatPriceFor(salesTax) },
    ],
    citation: "From your invoices",
  }
}

// ---------------------------------------------------------------------
// 7. Customer count
// ---------------------------------------------------------------------

export function customerCount(): AggregatorAnswer {
  // Dedupe across both data sources by email (lowercase) — the back-office
  // mock has canonical customer records; POS invoices may have walk-in
  // contacts with the same email.
  const emails = new Set<string>()
  let walkIns = 0
  for (const o of ORDERS) {
    emails.add(o.customer.email.toLowerCase())
  }
  for (const inv of listInvoices()) {
    const email = inv.customer?.email?.toLowerCase()
    if (email) emails.add(email)
    else walkIns += 1
  }
  return {
    value: String(emails.size),
    label: "Known customers",
    breakdown: walkIns > 0
      ? [{ label: "POS walk-ins (anonymous)", value: String(walkIns) }]
      : undefined,
    citation: "From your customers + POS contacts",
  }
}

// ---------------------------------------------------------------------
// 8. Average order value
// ---------------------------------------------------------------------

export function avgOrderValue(period: Period = "month"): AggregatorAnswer {
  let total = 0
  let count = 0
  for (const inv of listInvoices()) {
    if (!posInPeriod(inv, period)) continue
    total += inv.total
    count += 1
  }
  for (const inv of INVOICES) {
    if (!salesInPeriod(inv.issueDate, period)) continue
    total += inv.totalUsd
    count += 1
  }
  const avg = count > 0 ? total / count : 0
  return {
    value: formatPriceFor(avg),
    label: `Average order value ${periodLabel(period)}`,
    breakdown: [
      { label: "Orders counted", value: String(count) },
      { label: "Total revenue",  value: formatPriceFor(total) },
    ],
    citation: "From your invoices",
  }
}

// ---------------------------------------------------------------------
// 9. Cash on hand (cash + transfer tenders, not yet reconciled)
// ---------------------------------------------------------------------

export function cashOnHand(): AggregatorAnswer {
  // No shift-close data in mock yet — approximate as the sum of cash
  // payments on POS invoices that aren't refunded. Once Accounting's
  // bank reconciliation ledger lands this will pull from there.
  let cash = 0
  let transfer = 0
  for (const inv of listInvoices()) {
    if (inv.status === "refunded" || inv.status === "void") continue
    for (const p of inv.payments) {
      if (p.method === "cash") cash += p.amount
      else if (p.method === "stripe" || p.method === "paypal") transfer += p.amount
    }
  }
  return {
    value: formatPriceFor(cash),
    label: "Cash in drawer (estimated)",
    breakdown: [
      { label: "Cash",     value: formatPriceFor(cash) },
      { label: "Electronic transfers", value: formatPriceFor(transfer) },
    ],
    citation: "From your POS payments",
  }
}

// ---------------------------------------------------------------------
// 10. Team count
// ---------------------------------------------------------------------

export function teamCount(): AggregatorAnswer {
  const active = MEMBERS.filter((m) => m.status === "active")
  return {
    value: String(active.length),
    label: "Active team members",
    breakdown: [
      { label: "Total members",   value: String(MEMBERS.length) },
      { label: "Locations",       value: String(LOCATIONS.length) },
      { label: "Suspended",       value: String(MEMBERS.filter((m) => m.status === "suspended").length) },
    ],
    citation: "From your team roster",
  }
}

// ---------------------------------------------------------------------
// Renderer — turns a structured answer into a chat-ready string
// ---------------------------------------------------------------------

export function renderAnswer(a: AggregatorAnswer): string {
  const lines: string[] = []
  lines.push(`${a.label}: ${a.value}`)
  if (a.breakdown && a.breakdown.length > 0) {
    lines.push("")
    for (const b of a.breakdown) {
      lines.push(`• ${b.label}: ${b.value}`)
    }
  }
  return lines.join("\n")
}

// ---------------------------------------------------------------------
// Dispatcher — given an aggregator key + period hint, return the answer
// ---------------------------------------------------------------------

export function runAggregator(key: AggregatorKey, period?: Period): AggregatorAnswer {
  switch (key) {
    case "ordersCount":    return ordersCount(period ?? "all")
    case "invoicesCount":  return invoicesCount()
    case "topProducts":    return topProducts(5, period ?? "month")
    case "lowStock":       return lowStock()
    case "salesRevenue":   return salesRevenue(period ?? "today")
    case "taxCollected":   return taxCollected(period ?? "month")
    case "customerCount":  return customerCount()
    case "avgOrderValue":  return avgOrderValue(period ?? "month")
    case "cashOnHand":     return cashOnHand()
    case "teamCount":      return teamCount()
  }
}

function cap(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}
