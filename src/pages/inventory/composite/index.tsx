import * as React from "react"
import { Link } from "react-router-dom"
import { Boxes, Layers, Package, Plus, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useCurrency } from "@/contexts/currency"
import { loadAllCatalog } from "@/lib/pos/storage"

type Row = {
  sku: string
  name: string
  components: { sku: string; qty: number }[]
  sellPrice: number
  cost: number
  status: "active" | "draft"
}

const statusTone: Record<Row["status"], StatusTone> = { active: "success", draft: "neutral" }

// A bundle's MEMBERS are a business decision (authored), but the price +
// cost are resolved from the live POS catalog so they never drift. We
// keep only bundles whose components actually exist in the catalogue.
const BUNDLE_DEFS: { sku: string; name: string; components: { sku: string; qty: number }[]; status: Row["status"] }[] = [
  { sku: "BUN-1001", name: "Starter Kit (Hub + Mouse)", components: [{ sku: "EL-2109", qty: 1 }, { sku: "EL-1001", qty: 1 }], status: "active" },
  { sku: "BUN-1002", name: "Tee + Cap Combo", components: [{ sku: "AP-4012", qty: 1 }, { sku: "AP-5012", qty: 1 }], status: "active" },
  { sku: "BUN-1003", name: "Coffee & Sandwich", components: [{ sku: "DR-210", qty: 1 }, { sku: "FO-420", qty: 1 }], status: "draft" },
]

function deriveBundles(): Row[] {
  const priceBySku = new Map(loadAllCatalog().map((c) => [c.sku, c.price]))
  return BUNDLE_DEFS
    .filter((b) => b.components.every((c) => priceBySku.has(c.sku)))
    .map((b) => {
      const sum = b.components.reduce((s, c) => s + (priceBySku.get(c.sku) ?? 0) * c.qty, 0)
      return {
        ...b,
        // 10% off the à la carte total as the bundle price; cost ≈ 55%.
        sellPrice: Math.round(sum * 0.9 * 100) / 100,
        cost: Math.round(sum * 0.55 * 100) / 100,
      }
    })
}

export default function CompositeItems() {
  const [query, setQuery] = React.useState("")
  const { formatPrice } = useCurrency()
  const [rows, setRows] = React.useState<Row[]>(() => deriveBundles())
  useRegisterPageRefresh(React.useCallback(async () => { setRows(deriveBundles()); await new Promise((r) => setTimeout(r, 300)) }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q))
  }, [query, rows])

  const active = rows.filter((r) => r.status === "active").length
  const totalRevenue = rows.reduce((s, r) => s + r.sellPrice, 0)
  const marginRows = rows.filter((r) => r.sellPrice > 0)
  const avgMargin = marginRows.length > 0
    ? Math.round((marginRows.reduce((s, r) => s + (r.sellPrice - r.cost) / r.sellPrice, 0) / marginRows.length) * 100)
    : 0
  const avgMarginDisplay = marginRows.length > 0 ? `${avgMargin}%` : "—"

  return (
    <PageShell
      title="Bundles & Kits"
      withToolbar
      titleTooltip={
        <>
          <strong>Composite = sales bundle.</strong> A single SKU made
          up of multiple underlying items, sold as one. Selling the
          bundle deducts each component. Great for gift sets, meal
          deals, "buy 3 get 1" packs.
          <br /><br />
          For <strong>production recipes / BOMs</strong> (a parent SKU
          that's <em>made</em> from components — bread loaf, perfume
          blend, brake-pad service, soap bar, panel assembly), use{" "}
          <Link to="/inventory/recipes" className="font-semibold underline">Recipes & BOMs</Link>{" "}
          instead. Recipes support yield, wastage, sub-recipes,
          allergens, and lot tracking.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Composites", value: String(rows.length), tone: "brand", hint: "kits / bundles" },
            { label: "Active", value: String(active), tone: "success", hint: "sellable" },
            { label: "Avg margin", value: avgMarginDisplay, tone: marginRows.length > 0 && avgMargin >= 50 ? "success" : "warning", hint: "across kits" },
            { label: "Catalog price", value: formatPrice(totalRevenue), tone: "info", hint: "combined" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search composite…" className="pl-9" />
          </div>
          <Link to="/inventory/composite/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> New composite</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={Layers} title="No composites match" description="Build a kit to bundle multiple SKUs into one." />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => {
              const margin = Math.round(((r.sellPrice - r.cost) / r.sellPrice) * 100)
              return (
                <li key={r.sku} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                      <Layers className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground">{r.sku}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.components.map((c) => (
                          <span key={c.sku} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{c.sku}</span>
                            <span className="text-muted-foreground">× {c.qty}</span>
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-border pt-2 text-[11px]">
                        <span className="text-muted-foreground">Sell: <span className="font-bold tabular-nums text-foreground">{formatPrice(r.sellPrice)}</span> · cost: <span className="font-mono tabular-nums">{formatPrice(r.cost)}</span></span>
                        <StatusBadge tone={margin >= 50 ? "success" : "warning"}>{margin}% margin</StatusBadge>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
