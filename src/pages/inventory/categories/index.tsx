import * as React from "react"
import { Link } from "react-router-dom"
import { Layers, Plus, Search, Tag } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/currency"
import { loadCatalog, listInvoices, type CatalogItem } from "@/lib/pos/storage"

type Row = { name: string; skus: number; value: number; revenue: number; tone: number }

const TINTS = [
  "bg-brand/15 text-brand dark:bg-primary/20 dark:text-primary",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
]

const UNLIMITED_STOCK = 9999  // catalog sentinel for non-tracked items
                              // (services, menu dishes consumed via recipes)

// Pull every catalog item across modes — Pallio supports running
// shop + kitchen + workshop from a single account, so categories
// must reflect every industry the operator stocks for.
function loadAllItems(): CatalogItem[] {
  const items = [
    ...loadCatalog("retail"),
    ...loadCatalog("restaurant"),
    ...loadCatalog("services"),
    ...loadCatalog("auto"),
  ]
  return items.filter((c, i, arr) => arr.findIndex((x) => x.sku === c.sku) === i)
}

function buildRows(): Row[] {
  const items = loadAllItems()
  const invoices = listInvoices()

  // Map sku → category once so invoice attribution stays O(n).
  const skuToCategory = new Map<string, string>()
  for (const it of items) skuToCategory.set(it.sku, it.category ?? "Uncategorised")

  const byCat = new Map<string, { skus: number; value: number; revenue: number }>()
  for (const it of items) {
    const cat = it.category ?? "Uncategorised"
    const e = byCat.get(cat) ?? { skus: 0, value: 0, revenue: 0 }
    e.skus += 1
    // Stock value = on-hand × price. Skip unlimited-stock sentinel
    // items (services / menu dishes) — they'd swamp the totals.
    const stock = it.stock ?? 0
    if (stock < UNLIMITED_STOCK) e.value += stock * it.price
    byCat.set(cat, e)
  }
  for (const inv of invoices) {
    for (const line of inv.items) {
      const cat = skuToCategory.get(line.sku) ?? "Uncategorised"
      const e = byCat.get(cat) ?? { skus: 0, value: 0, revenue: 0 }
      e.revenue += line.price * line.qty
      byCat.set(cat, e)
    }
  }

  return Array.from(byCat.entries())
    .map(([name, e], i) => ({ name, ...e, tone: i % TINTS.length }))
    .sort((a, b) => b.skus - a.skus)
}

export default function Categories() {
  const [query, setQuery] = React.useState("")
  const { formatPrice } = useCurrency()
  const [active, setActive] = React.useState<Row | null>(null)

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const rows = React.useMemo(buildRows, [])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q))
  }, [query, rows])

  const totalSkus = rows.reduce((s, r) => s + r.skus, 0)
  const totalValue = rows.reduce((s, r) => s + r.value, 0)
  // "Top" by stock value — works even before any sales exist.
  const top = rows.length > 0
    ? [...rows].sort((a, b) => b.value - a.value)[0]!
    : null

  return (
    <PageShell
      title="Categories"
      withToolbar
      titleTooltip={
        <>
          Groupings that bucket similar items together — Apparel,
          Electronics, Beauty, Food, etc. Categories drive reports
          ("revenue by category"), tax overrides, and the storefront
          menu structure. Every item belongs to exactly one category.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Categories", value: String(rows.length), tone: "brand", hint: "tracked" },
            { label: "Total SKUs", value: totalSkus.toLocaleString(), tone: "info", hint: "classified" },
            { label: "Stock value", value: formatPrice(totalValue), tone: "success", hint: "on-hand × price" },
            top
              ? { label: "Top", value: top.name, tone: "warning", hint: formatPrice(top.value) }
              : { label: "Top", value: "—", tone: "warning", hint: "no categories yet" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories…" className="pl-9" />
          </div>
          <Link to="/inventory/categories/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> Add category</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={Tag} title="No categories match" description="Try a different name or add a new category." />
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => {
              // Progress = this category's stock value share of total
              // — always meaningful regardless of sales history.
              const pct = totalValue > 0 ? Math.round((r.value / totalValue) * 100) : 0
              return (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => setActive(r)}
                  className="group rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-brand/40 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TINTS[r.tone] ?? TINTS[0])}>
                      <Layers className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.skus.toLocaleString()} SKUs</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg font-bold tabular-nums">{formatPrice(r.value)}</p>
                    {r.revenue > 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        {formatPrice(r.revenue)} sold
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-1 rounded-full bg-gradient-to-r from-brand to-fuchsia-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) setActive(null) }}>
        <DialogContent>
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle>{active.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-3 grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", TINTS[active.tone] ?? TINTS[0])}>
                    <Layers className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-medium">{active.name}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div><dt className="text-muted-foreground">SKUs</dt><dd className="font-medium tabular-nums">{active.skus.toLocaleString()}</dd></div>
                  <div><dt className="text-muted-foreground">Stock value</dt><dd className="font-medium tabular-nums">{formatPrice(active.value)}</dd></div>
                  {active.revenue > 0 ? (
                    <div className="col-span-2"><dt className="text-muted-foreground">Revenue</dt><dd className="font-medium tabular-nums">{formatPrice(active.revenue)}</dd></div>
                  ) : null}
                </dl>
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
