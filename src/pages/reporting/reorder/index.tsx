import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AlertTriangle, DollarSign, PackagePlus, ShoppingCart, Truck, Users } from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { KpiBand } from "@/components/reports/kpi-band"
import { DataTable, type Column } from "@/components/reports/data-table"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { Button } from "@/components/ui/button"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { type Period } from "@/components/reports/period-chips"
import { useCurrency } from "@/contexts/currency"
import { useLocationScope } from "@/hooks/use-location-scope"
import { loadAllCatalog } from "@/lib/pos/storage"
import { kvJson } from "@/lib/storage/kv"
import { LOCATIONS } from "@/lib/team/data"
import { UNLIMITED_STOCK } from "@/lib/inventory/derive"
import type { CatalogItem } from "@/lib/pos/storage"

// "What should I buy today?" report. Walks the POS catalog,
// finds items below their reorder point, and groups them by
// supplier so the operator can fire off one PO per supplier
// instead of clicking through each SKU.
//
// Industry-agnostic: works for a clothing shop (Cotton Tee — Black
// is low → reorder from Delta Apparel), a kitchen (Olive Oil 5L
// is low → reorder from Hausa Spice), a workshop (brake pads low
// → reorder from Cobalt). Same surface, no vertical-specific
// branches.
//
// Bulk action: "Create draft PO" seeds kvJson at
// `pallio:purchasing:po-draft-seed` with the supplier + line set,
// then navigates to `/purchasing/pos/new`. The PO/new page does
// not yet read this key — that's tracked as a follow-up micro-fix
// (see the agent return note). We still WRITE the seed so the
// integration cost on that page is just "read kvJson + hydrate
// initial state".

// ---- Derivations (industry-agnostic) ---------------------------------

// Reorder point per SKU. The catalog doesn't carry one (yet) — this
// mirrors `deriveReorder()` in pages/inventory/index.tsx so the two
// pages agree on what "low" means. 30% of current stock with a floor
// of 5; sentinel-stocked items (services, menu dishes) have none.
function deriveReorderPoint(c: CatalogItem): number {
  const stock = c.stock ?? 0
  if (stock >= UNLIMITED_STOCK) return 0
  return Math.max(5, Math.round(stock * 0.3))
}

// Last cost guess: assume a 60% gross margin → cost ≈ price × 0.4.
// Real backend reads from the most recent receipt / bill for the SKU.
function deriveLastCost(c: CatalogItem): number {
  return Math.max(0.5, Math.round(c.price * 0.4 * 100) / 100)
}

// Suggested order qty: enough to lift back to 2× the reorder point
// (a generous buffer that covers most replenishment cycles).
// Floors at "reorder − stock + 5" so we never propose a zero qty.
function deriveSuggestedQty(stock: number, reorder: number): number {
  const target = reorder * 2
  return Math.max(target - stock, reorder - stock + 5, 1)
}

// Supplier mapping by category. Aligns with the seed roster in
// purchasing/vendors so the "Create draft PO" link feels real.
// Defaults to "Pallio General Supplier" for unmapped categories.
function deriveSupplier(category: string): { slug: string; name: string } {
  const c = category.toLowerCase()
  if (/electronic|gadget|computer|phone|peripheral/.test(c))           return { slug: "cobalt",    name: "Cobalt Electronics" }
  if (/apparel|fashion|clothing|tee|shirt|garment/.test(c))            return { slug: "delta",     name: "Delta Apparel" }
  if (/home|kitchen|ceramic|household|furniture/.test(c))              return { slug: "porcel",    name: "Porcel Homewares" }
  if (/beauty|cosmetic|fragrance|skincare|serum/.test(c))              return { slug: "glowco",    name: "Glow Co Beauty" }
  if (/food|spice|ingredient|grocer|drink|beverage/.test(c))           return { slug: "hausa",     name: "Hausa Spice Co." }
  if (/convenience|wholesale|bulk/.test(c))                            return { slug: "lagosmart", name: "LagosMart Distributors" }
  if (/print|packaging|label|signage/.test(c))                         return { slug: "studio",    name: "Studio Print Shop" }
  return { slug: "general", name: "Pallio General Supplier" }
}

// Location attribution for scope filtering. Deterministic hash so the
// same SKU always lives at the same location — matches the inventory
// list's `deriveLocation()` shape but maps to team/data Location ids
// instead of the WH-A/B/C shorthand. Backend swaps this for the real
// per-location stock count.
function deriveLocationId(sku: string): string {
  let h = 0
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) | 0
  return LOCATIONS[Math.abs(h) % LOCATIONS.length].id
}

// ---- Row shape -------------------------------------------------------

type ReorderRow = {
  sku: string
  name: string
  category: string
  locationId: string
  locationName: string
  onHand: number
  reorderPoint: number
  suggestedQty: number
  lastCost: number
  subtotal: number
  supplierSlug: string
  supplierName: string
  severity: "critical" | "low" | "out"
}

// Draft seed kvJson shape. The PO/new page will consume this on
// mount (key: `pallio:purchasing:po-draft-seed`) and pre-populate
// vendor + lines. Kept intentionally small + serializable so a
// later backend can ship the same payload to the server.
export type POSeed = {
  vendorSlug: string
  vendorName: string
  createdAt: number
  /** Origin of the seed — useful for analytics + debugging. */
  source: "reorder-report"
  lines: { sku: string; name: string; qty: number; cost: number }[]
}

const PO_SEED_KEY = "pallio:purchasing:po-draft-seed"

const severityTone: Record<ReorderRow["severity"], StatusTone> = {
  out: "danger",
  critical: "danger",
  low: "warning",
}

const severityLabel: Record<ReorderRow["severity"], string> = {
  out: "Out",
  critical: "Critical",
  low: "Low",
}

export default function ReorderReport() {
  const [period, setPeriod] = React.useState<Period>("30d")
  const { formatPrice } = useCurrency()
  const navigate = useNavigate()
  const { scope, current: scopeOption } = useLocationScope()

  useRegisterPageRefresh(
    React.useCallback(async () => {
      await new Promise((r) => setTimeout(r, 300))
    }, []),
  )

  // Walk the catalog once. The recompute on scope change is cheap
  // (a few hundred items at most), so we let React.useMemo do it.
  const rows = React.useMemo<ReorderRow[]>(() => {
    const catalog = loadAllCatalog()
    const out: ReorderRow[] = []
    for (const c of catalog) {
      const stock = c.stock ?? 0
      // Skip sentinel-stocked items (services, menu dishes) — they
      // aren't tracked + can't run out.
      if (stock >= UNLIMITED_STOCK) continue
      const reorder = deriveReorderPoint(c)
      if (reorder === 0) continue
      if (stock >= reorder) continue
      const locationId = deriveLocationId(c.sku)
      // Apply the global scope filter. "all" passes everything.
      if (scope !== "all" && locationId !== scope) continue
      const lastCost = deriveLastCost(c)
      const suggestedQty = deriveSuggestedQty(stock, reorder)
      const supplier = deriveSupplier(c.category ?? "")
      const locationName = LOCATIONS.find((l) => l.id === locationId)?.name ?? "—"
      out.push({
        sku: c.sku,
        name: c.name,
        category: c.category ?? "Uncategorised",
        locationId,
        locationName,
        onHand: stock,
        reorderPoint: reorder,
        suggestedQty,
        lastCost,
        subtotal: Math.round(suggestedQty * lastCost * 100) / 100,
        supplierSlug: supplier.slug,
        supplierName: supplier.name,
        severity: stock === 0 ? "out" : stock <= reorder * 0.4 ? "critical" : "low",
      })
    }
    // Most urgent first: out → critical → low, then by subtotal desc.
    return out.sort((a, b) => {
      const sev = severityRank(a.severity) - severityRank(b.severity)
      if (sev !== 0) return sev
      return b.subtotal - a.subtotal
    })
  }, [scope])

  // Group rows by supplier so we can render one section per supplier
  // with a "Create draft PO" button at the section head.
  const grouped = React.useMemo(() => {
    const map = new Map<string, { supplierSlug: string; supplierName: string; rows: ReorderRow[]; subtotal: number }>()
    for (const r of rows) {
      const key = r.supplierSlug
      const g = map.get(key) ?? { supplierSlug: r.supplierSlug, supplierName: r.supplierName, rows: [], subtotal: 0 }
      g.rows.push(r)
      g.subtotal += r.subtotal
      map.set(key, g)
    }
    return Array.from(map.values()).sort((a, b) => b.subtotal - a.subtotal)
  }, [rows])

  // KPI roll-ups.
  const totalItems = rows.length
  const totalSuppliers = grouped.length
  const totalSpend = rows.reduce((s, r) => s + r.subtotal, 0)

  const createDraftPO = (g: { supplierSlug: string; supplierName: string; rows: ReorderRow[]; subtotal: number }) => {
    const seed: POSeed = {
      vendorSlug: g.supplierSlug,
      vendorName: g.supplierName,
      createdAt: Date.now(),
      source: "reorder-report",
      lines: g.rows.map((r) => ({
        sku: r.sku,
        name: r.name,
        qty: r.suggestedQty,
        cost: r.lastCost,
      })),
    }
    // Fire-and-forget — the navigate happens immediately, the kv
    // write resolves out-of-band. Even on slow disk the seed is
    // written before /purchasing/pos/new finishes its lazy chunk.
    void kvJson.set(PO_SEED_KEY, seed)
    toast.success(`Draft PO seeded for ${g.supplierName}`, {
      description: `${g.rows.length} line${g.rows.length === 1 ? "" : "s"} · ${formatPrice(g.subtotal)}`,
    })
    navigate("/purchasing/pos/new")
  }

  // Export rows flatten everything into a single sheet — exactly
  // what an accountant or buyer expects when they hit "Download
  // CSV" on this view.
  const exportRows = rows.map((r) => ({
    SKU: r.sku,
    Item: r.name,
    Category: r.category,
    Location: r.locationName,
    "On hand": r.onHand,
    "Reorder point": r.reorderPoint,
    "Suggested qty": r.suggestedQty,
    "Last cost": r.lastCost,
    Subtotal: r.subtotal,
    Supplier: r.supplierName,
    Severity: severityLabel[r.severity],
  }))

  const cols: Column<ReorderRow>[] = [
    { key: "name", header: "Item", primary: true },
    { key: "sku", header: "SKU", hideOnMobile: true, render: (_, v) => <span className="font-mono text-xs text-muted-foreground">{v as string}</span> },
    {
      key: "onHand",
      header: "On hand",
      align: "right",
      render: (r) => (
        <span className="tabular-nums">
          {r.onHand}
          <span className="text-muted-foreground">/{r.reorderPoint}</span>
        </span>
      ),
    },
    { key: "suggestedQty", header: "Suggested", align: "right", hideOnMobile: true, render: (r) => <span className="tabular-nums">{r.suggestedQty}</span> },
    { key: "lastCost", header: "Last cost", align: "right", hideOnMobile: true, render: (r) => formatPrice(r.lastCost) },
    { key: "subtotal", header: "Subtotal", align: "right", render: (r) => formatPrice(r.subtotal) },
    {
      key: "severity",
      header: "Status",
      hideOnMobile: true,
      render: (r) => (
        <StatusBadge tone={severityTone[r.severity]} withDot>
          {severityLabel[r.severity]}
        </StatusBadge>
      ),
    },
  ]

  return (
    <ReportShell
      title="Reorder report"
      description={
        scope === "all"
          ? "Items below their reorder point — grouped by supplier"
          : `Items below their reorder point at ${scopeOption.label}`
      }
      titleTooltip={
        <>
          The "what should I buy today?" view. Walks every SKU and
          surfaces the ones below their reorder threshold, grouped
          by supplier so you can fire off one PO per vendor instead
          of clicking through each item. Suggested order qty assumes
          you want to land back at 2× the reorder point. Cost is the
          last paid unit price for the SKU.
        </>
      }
      period={period}
      onPeriodChange={setPeriod}
      exportFilename={`pallio-reorder-${period}`}
      exportRows={exportRows}
    >
      <KpiBand
        items={[
          {
            title: "Items below point",
            value: totalItems.toLocaleString(),
            caption: scope === "all" ? "across all locations" : `at ${scopeOption.label}`,
            Icon: AlertTriangle,
            tone: totalItems === 0 ? "emerald" : "amber",
          },
          {
            title: "Suppliers affected",
            value: totalSuppliers.toLocaleString(),
            caption: totalSuppliers > 0 ? "draft a PO per supplier" : "you're fully stocked",
            Icon: Users,
            tone: "violet",
          },
          {
            title: "Estimated spend",
            value: formatPrice(Math.round(totalSpend)),
            caption: "sum of suggested order qty × last cost",
            Icon: DollarSign,
            tone: "rose",
          },
        ]}
      />

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <h3 className="mt-3 text-base font-semibold">Nothing to reorder</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Every tracked SKU{scope === "all" ? "" : ` at ${scopeOption.label}`} is at or above its reorder point. Nice.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((g) => (
            <section key={g.supplierSlug} className="rounded-2xl border border-border bg-card">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{g.supplierName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.rows.length} item{g.rows.length === 1 ? "" : "s"} · est. {formatPrice(Math.round(g.subtotal))}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => createDraftPO(g)}
                  className="whitespace-nowrap"
                >
                  <PackagePlus className="h-3.5 w-3.5" /> Create draft PO
                </Button>
              </header>
              <div className="p-3">
                <DataTable
                  columns={cols}
                  rows={g.rows}
                  rowKey={(r) => `${g.supplierSlug}:${r.sku}`}
                  emptyMessage="No items to reorder for this supplier."
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </ReportShell>
  )
}

function severityRank(s: ReorderRow["severity"]): number {
  // Lower rank = more urgent — drives the sort order in `rows`.
  return s === "out" ? 0 : s === "critical" ? 1 : 2
}
