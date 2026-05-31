import * as React from "react"
import { Link } from "react-router-dom"
import { Boxes, Package, PackageX, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { ProductThumb } from "@/components/product-thumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { loadCatalog, type CatalogItem } from "@/lib/pos/storage"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/currency"

type Mode = "retail" | "restaurant" | "services" | "auto"

function severity(stock: number): { tone: StatusTone; label: string } {
  if (stock <= 0) return { tone: "danger", label: "Out" }
  if (stock <= 5) return { tone: "danger", label: "Critical" }
  if (stock <= 15) return { tone: "warning", label: "Low" }
  return { tone: "success", label: "OK" }
}

export default function SalesInventoryPage() {
  const [mode, setMode] = React.useState<Mode>("retail")
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<"all" | "low" | "out">("all")
  const catalog = React.useMemo(() => loadCatalog(mode), [mode])
  const { formatPrice } = useCurrency()

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    let list: CatalogItem[] = catalog
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q) || (c.category ?? "").toLowerCase().includes(q),
      )
    }
    if (filter === "low") list = list.filter((c) => (c.stock ?? 0) > 0 && (c.stock ?? 0) <= 15)
    if (filter === "out") list = list.filter((c) => (c.stock ?? 0) <= 0)
    return list
  }, [catalog, query, filter])

  const total = catalog.length
  const low = catalog.filter((c) => (c.stock ?? 0) > 0 && (c.stock ?? 0) <= 15).length
  const out = catalog.filter((c) => (c.stock ?? 0) <= 0).length
  const totalValue = catalog.reduce((s, c) => s + (c.stock ?? 0) * c.price, 0)

  return (
    <PageShell
      title="Live inventory"
      withToolbar
      titleTooltip={
        <>
          A sales-rep-friendly read of stock: what's available right
          now, where it is, and the reorder cushion you have left.
          Doesn't allow editing — for that, head to <strong>Inventory
          → Items</strong>.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "SKUs", value: total.toLocaleString(), tone: "brand", hint: "available" },
            { label: "Low stock", value: String(low), tone: "warning", hint: "watch" },
            { label: "Out of stock", value: String(out), tone: "danger", hint: "act now" },
            { label: "Stock value", value: formatPrice(Math.round(totalValue)), tone: "success", hint: "at retail" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items / SKU / category…" className="pl-9" />
          </div>
          <Select value={mode} onValueChange={(v) => v && setMode(v as Mode)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter pills */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:px-0">
          {(["all", "low", "out"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f === "all" ? "All items" : f === "low" ? "Low stock" : "Out of stock"}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            Icon={out > 0 && filter === "out" ? PackageX : Boxes}
            title="No items match"
            description="Try adjusting the search or stock filter — or head to the full inventory page to add and edit items."
            action={
              <Link to="/inventory">
                <Button size="sm" variant="outline"><Boxes className="h-3.5 w-3.5" /> Open full inventory</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((it) => {
              const s = severity(it.stock ?? 0)
              return (
                <div key={it.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <ProductThumb
                      name={it.name}
                      image={it.image}
                      seed={it.sku}
                      className="absolute inset-0 h-full w-full"
                      textClassName="text-3xl"
                    />
                    <span className="absolute right-2 top-2"><StatusBadge tone={s.tone} withDot>{s.label}</StatusBadge></span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{it.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{it.sku}</p>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-bold tabular-nums">{formatPrice(it.price)}</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        <Package className="mr-0.5 inline h-3 w-3" />
                        {it.stock ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageShell>
  )
}
