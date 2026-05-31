import * as React from "react"
import { Link } from "react-router-dom"
import { Plus, Search, Sparkles } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useCurrency } from "@/contexts/currency"
import { loadAllCatalog } from "@/lib/pos/storage"

type Row = { name: string; category: string; skus: number; revenue: number }

// Derived from the POS catalog (single source of truth) — grouped by
// brand. "Revenue" here is on-hand stock value (price × tracked stock).
function deriveBrands(): Row[] {
  const map = new Map<string, { skus: number; revenue: number; cats: Record<string, number> }>()
  for (const c of loadAllCatalog()) {
    const name = c.brand?.trim() || "Unbranded"
    const rec = map.get(name) || { skus: 0, revenue: 0, cats: {} }
    rec.skus += 1
    const stock = typeof c.stock === "number" && c.stock < 9999 ? c.stock : 0
    rec.revenue += c.price * stock
    if (c.category) rec.cats[c.category] = (rec.cats[c.category] ?? 0) + 1
    map.set(name, rec)
  }
  return Array.from(map.entries())
    .map(([name, r]) => ({
      name,
      skus: r.skus,
      revenue: Math.round(r.revenue * 100) / 100,
      category: Object.entries(r.cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
    }))
    .sort((a, b) => b.skus - a.skus)
}

function initialsOf(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("")
}

function avatarTint(name: string) {
  const palette = [
    "bg-brand/15 text-brand dark:bg-primary/20 dark:text-primary",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palette[h % palette.length]!
}

export default function Brands() {
  const [query, setQuery] = React.useState("")
  const { formatPrice } = useCurrency()
  const [rows, setRows] = React.useState<Row[]>(() => deriveBrands())
  const [active, setActive] = React.useState<Row | null>(null)

  useRegisterPageRefresh(React.useCallback(async () => { setRows(deriveBrands()); await new Promise((r) => setTimeout(r, 300)) }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
  }, [query, rows])

  const totalSkus = rows.reduce((s, r) => s + r.skus, 0)
  const top = [...rows].sort((a, b) => b.revenue - a.revenue)[0] ?? { name: "—", revenue: 0 }

  return (
    <PageShell
      title="Brands"
      withToolbar
      titleTooltip={
        <>
          Manufacturer or label badges attached to items — Apple,
          Adidas, your own house brand. Filtering by brand on the
          storefront helps customers shop the names they trust;
          reports show you which brands actually move stock.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Brands", value: String(rows.length), tone: "brand", hint: "tracked" },
            { label: "SKUs", value: totalSkus.toLocaleString(), tone: "info", hint: "all brands" },
            { label: "Top brand", value: top.name, tone: "success", hint: formatPrice(top.revenue) },
            { label: "Categories", value: String(new Set(rows.map((r) => r.category)).size), tone: "warning", hint: "represented" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brand or supplier…" className="pl-9" />
          </div>
          <Link to="/inventory/brands/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> Add brand</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={Sparkles} title="No brands match" description="Try a different name." />
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => setActive(r)}
                className="group rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-brand/40 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarTint(r.name)}`}>
                    {initialsOf(r.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.category}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <p className="text-lg font-bold tabular-nums">{formatPrice(r.revenue)}</p>
                  <p className="text-[11px] text-muted-foreground">{r.skus} SKUs</p>
                </div>
              </button>
            ))}
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
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold ${avatarTint(active.name)}`}>
                    {initialsOf(active.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Top category</p>
                    <p className="font-medium">{active.category}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div><dt className="text-muted-foreground">SKUs</dt><dd className="font-medium tabular-nums">{active.skus.toLocaleString()}</dd></div>
                  <div><dt className="text-muted-foreground">Stock value</dt><dd className="font-medium tabular-nums">{formatPrice(active.revenue)}</dd></div>
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
