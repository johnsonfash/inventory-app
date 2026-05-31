import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Edit3,
  Filter,
  Package2,
  Plus,
  Search,
  Tag,
  Truck,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { FilterChips, type FilterChip } from "@/components/lists/filter-chips"
import { FilterButton } from "@/components/lists/filter-button"
import {
  FilterPillGroup,
  FilterSection,
  FilterSheet,
} from "@/components/lists/filter-sheet"
import { ProductThumb } from "@/components/product-thumb"
import { SwipeableRow } from "@/components/mobile/swipeable-row"
import { OnboardingNudge } from "@/components/onboarding/onboarding-nudge"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/currency"
import { loadCatalog, type CatalogItem } from "@/lib/pos/storage"
import { deriveUnit, deriveWarranty, UNLIMITED_STOCK } from "@/lib/inventory/derive"

type Item = {
  sku: string
  name: string
  image?: string
  category: string
  brand: string
  unit: string
  warranty: string
  location: string
  stock: number
  reorder: number
  price: number
}

// Adapt a CatalogItem (POS source of truth) to the richer Item shape
// the inventory list expects. The catalog doesn't track unit /
// warranty / location / reorder — derive them from whatever signals
// the catalog DOES carry (category, tags, sku) so the same SKU
// always shows the same metadata, regardless of industry.
//
// Pallio inventory covers every kind of stocked good: clothing,
// food, ingredients, perfume, auto parts, services, manufacturing
// raw materials, books, electronics, anything. The derivation here
// is deliberately broad — when in doubt, default to neutral values
// ("pcs", "—") rather than guess.
const LOCATIONS = ["WH-A", "WH-B", "WH-C"]

function deriveLocation(sku: string): string {
  // Deterministic hash so the same SKU always lives at the same warehouse.
  let h = 0
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) | 0
  return LOCATIONS[Math.abs(h) % LOCATIONS.length]
}

function deriveReorder(stock: number): number {
  // Items with the unlimited-stock sentinel (menu dishes, services)
  // don't need a reorder point — they're not stock-tracked.
  if (stock >= UNLIMITED_STOCK) return 0
  // Otherwise: 30% of current stock with a floor of 5. Gives a
  // sensible reorder threshold without the catalog having to
  // track one. Real backend overrides this per-SKU.
  return Math.max(5, Math.round(stock * 0.3))
}

// Pulls every catalog item across modes (retail + restaurant +
// services + auto). Inventory covers all of them — a single
// operator may run a shop, a kitchen, and a service workshop from
// the same Pallio account.
const items: Item[] = [
  ...loadCatalog("retail"),
  ...loadCatalog("restaurant"),
  ...loadCatalog("services"),
  ...loadCatalog("auto"),
]
  // Dedupe by SKU in case the modes overlap.
  .filter((c, i, arr) => arr.findIndex((x) => x.sku === c.sku) === i)
  .map((c) => ({
    sku: c.sku,
    name: c.name,
    image: c.image,
    category: c.category ?? "Uncategorised",
    brand: c.brand ?? "—",
    unit: deriveUnit(c),
    warranty: deriveWarranty(c),
    location: deriveLocation(c.sku),
    stock: c.stock ?? 0,
    reorder: deriveReorder(c.stock ?? 0),
    price: c.price,
  }))

// Derive the filter options from the actual catalog so the chips
// always match what's on the page. Avoids the "filter has Home but
// no Home items exist" mismatch after switching POS catalog mode.
const CATEGORY_OPTIONS = Array.from(new Set(items.map((it) => it.category)))
  .sort()
  .map((c) => ({ value: c, label: c }))
const STOCK_OPTIONS = [
  { value: "all", label: "All" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out" },
  { value: "over", label: "Overstock" },
] as const
const SORT_OPTIONS = [
  { value: "name", label: "Name (A → Z)" },
  { value: "stock-asc", label: "Stock (low first)" },
  { value: "stock-desc", label: "Stock (high first)" },
  { value: "price-desc", label: "Price (high first)" },
] as const

type StockFilter = (typeof STOCK_OPTIONS)[number]["value"]
type SortKey = (typeof SORT_OPTIONS)[number]["value"]

// Overstock heuristic: 2.5× reorder point. Without a per-SKU `max`
// field this is the best general-purpose threshold — operators
// typically reorder when stock dips below the reorder point, so
// >2.5× sitting around suggests slow-mover / over-ordered cash
// tied up. Tighten later once the data model adds a `max_qty`.
function isUnlimited(it: Item): boolean {
  // Items flagged with the catalog's unlimited sentinel — typically
  // menu dishes (consumed via recipes, not SKU), services, or
  // anything else that isn't stock-tracked.
  return it.stock >= UNLIMITED_STOCK
}

function stockStatus(it: Item): { tone: StatusTone; label: string } {
  if (isUnlimited(it))                       return { tone: "info",    label: "Unlimited" }
  if (it.stock === 0)                        return { tone: "danger",  label: "Out" }
  if (it.stock <= it.reorder * 0.4)          return { tone: "danger",  label: "Critical" }
  if (it.stock < it.reorder)                 return { tone: "warning", label: "Low" }
  if (it.stock > it.reorder * 2.5)           return { tone: "info",    label: "Overstock" }
  return { tone: "success", label: "OK" }
}

// Display helper — show "∞" instead of the raw 9999 sentinel.
function formatStock(stock: number): string {
  return stock >= UNLIMITED_STOCK ? "∞" : stock.toLocaleString()
}

export default function InventoryItems() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { formatPrice } = useCurrency()
  const [query, setQuery] = React.useState("")
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [viewItem, setViewItem] = React.useState<Item | null>(null)

  const [stagedCategories, setStagedCategories] = React.useState<string[]>([])
  const [stagedStock, setStagedStock] = React.useState<StockFilter>("all")
  const [stagedSort, setStagedSort] = React.useState<SortKey>("name")

  const [categories, setCategories] = React.useState<string[]>([])
  const [stock, setStock] = React.useState<StockFilter>("all")
  const [sort, setSort] = React.useState<SortKey>("name")

  const applyFilters = () => {
    setCategories(stagedCategories)
    setStock(stagedStock)
    setSort(stagedSort)
  }
  const resetFilters = () => {
    setStagedCategories([])
    setStagedStock("all")
    setStagedSort("name")
  }

  React.useEffect(() => {
    if (filterOpen) {
      setStagedCategories(categories)
      setStagedStock(stock)
      setStagedSort(sort)
    }
  }, [filterOpen, categories, stock, sort])

  useRegisterPageRefresh(
    React.useCallback(async () => {
      await new Promise((r) => setTimeout(r, 400))
    }, []),
  )

  const filtered = React.useMemo(() => {
    let list = items
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          it.brand.toLowerCase().includes(q),
      )
    }
    if (categories.length > 0) list = list.filter((it) => categories.includes(it.category))
    if (stock !== "all") {
      list = list.filter((it) => {
        if (stock === "out")  return it.stock === 0
        if (stock === "low")  return it.stock > 0 && it.stock < it.reorder
        if (stock === "in")   return isUnlimited(it) || (it.stock >= it.reorder && it.stock <= it.reorder * 2.5)
        if (stock === "over") return !isUnlimited(it) && it.stock > it.reorder * 2.5
        return true
      })
    }
    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case "stock-asc": return a.stock - b.stock
        case "stock-desc": return b.stock - a.stock
        case "price-desc": return b.price - a.price
        default: return a.name.localeCompare(b.name)
      }
    })
    return sorted
  }, [query, categories, stock, sort])

  const chips: FilterChip[] = React.useMemo(() => {
    const c: FilterChip[] = []
    for (const cat of categories) {
      c.push({ key: `cat:${cat}`, label: cat, onRemove: () => setCategories((p) => p.filter((x) => x !== cat)) })
    }
    if (stock !== "all") {
      const opt = STOCK_OPTIONS.find((o) => o.value === stock)!
      c.push({ key: `stock:${stock}`, label: `Stock: ${opt.label}`, onRemove: () => setStock("all") })
    }
    if (sort !== "name") {
      const opt = SORT_OPTIONS.find((o) => o.value === sort)!
      c.push({ key: `sort:${sort}`, label: `Sort: ${opt.label}`, onRemove: () => setSort("name") })
    }
    return c
  }, [categories, stock, sort])

  const appliedCount = chips.length

  const total = items.length
  const lowCount = items.filter((it) => !isUnlimited(it) && it.stock > 0 && it.stock < it.reorder).length
  const oosCount = items.filter((it) => it.stock === 0).length
  // Skip unlimited items from total valuation — they're not
  // physical stock you can liquidate.
  const totalValue = items.reduce((s, it) => s + (isUnlimited(it) ? 0 : it.stock * it.price), 0)

  return (
    <PageShell
      title="Inventory"
      withToolbar
      mobileTrailing={<FilterButton onClick={() => setFilterOpen(true)} count={appliedCount} />}
      titleTooltip={
        <>
          Every product you sell — physical or digital. Each row is a
          <strong> SKU</strong> (one unique sellable thing) with its
          live stock count, cost, retail price, and which location
          holds it. The numbers update in real time as you sell,
          receive, transfer, and adjust.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <OnboardingNudge stepKey="first-item" cta="Add first item" />
        <SummaryStrip total={total} lowCount={lowCount} oosCount={oosCount} totalValue={totalValue} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items, SKU, brand…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="hidden md:inline-flex" onClick={() => setFilterOpen(true)}>
            <Filter className="h-4 w-4" /> Filters {appliedCount ? `(${appliedCount})` : ""}
          </Button>
          <Link to="/inventory/new" className="hidden md:inline-flex">
            <Button>
              <Plus className="h-4 w-4" /> New item
            </Button>
          </Link>
        </div>

        <FilterChips
          chips={chips}
          onClearAll={appliedCount > 0 ? () => { setCategories([]); setStock("all"); setSort("name") } : undefined}
        />

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                Icon={Package2}
                title="No items match"
                description="Try adjusting filters or clearing the search box."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("")
                      setCategories([])
                      setStock("all")
                      setSort("name")
                    }}
                  >
                    Reset everything
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : isMobile ? (
          <MobileItemList
            items={filtered}
            formatPrice={formatPrice}
            onView={setViewItem}
            onReceive={() => navigate("/inventory/receive")}
          />
        ) : (
          <DesktopItemTable items={filtered} formatPrice={formatPrice} onView={setViewItem} />
        )}
      </div>

      <Dialog open={!!viewItem} onOpenChange={(o) => { if (!o) setViewItem(null) }}>
        <DialogContent>
          {viewItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewItem.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-3 grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <ProductThumb
                    name={viewItem.name}
                    image={viewItem.image}
                    seed={viewItem.sku}
                    className="h-14 w-14 rounded-lg border border-border"
                    textClassName="text-sm"
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{viewItem.sku}</p>
                    <p className="text-xs text-muted-foreground">{viewItem.brand} · {viewItem.unit}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div><dt className="text-muted-foreground">Category</dt><dd className="font-medium">{viewItem.category}</dd></div>
                  <div><dt className="text-muted-foreground">Location</dt><dd className="font-medium">{viewItem.location}</dd></div>
                  <div><dt className="text-muted-foreground">Stock</dt><dd className="font-medium tabular-nums">{formatStock(viewItem.stock)} / {viewItem.reorder} reorder</dd></div>
                  <div><dt className="text-muted-foreground">Price</dt><dd className="font-medium tabular-nums">{formatPrice(viewItem.price)}</dd></div>
                  <div><dt className="text-muted-foreground">Warranty</dt><dd className="font-medium">{viewItem.warranty}</dd></div>
                  <div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{stockStatus(viewItem).label}</dd></div>
                </dl>
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        appliedCount={appliedCount}
        title="Filter inventory"
        description="Drill down by category, stock state, or sort order."
      >
        <FilterSection title="Categories" hint="Select multiple">
          <FilterPillGroup
            multi
            options={CATEGORY_OPTIONS as unknown as { value: string; label: string }[]}
            value={stagedCategories}
            onChange={(v) => setStagedCategories(Array.isArray(v) ? v : v ? [v] : [])}
          />
        </FilterSection>
        <FilterSection title="Stock state">
          <FilterPillGroup
            options={STOCK_OPTIONS as unknown as { value: StockFilter; label: string }[]}
            value={stagedStock}
            onChange={(v) => setStagedStock((v as StockFilter) ?? "all")}
          />
        </FilterSection>
        <FilterSection title="Sort by">
          <FilterPillGroup
            options={SORT_OPTIONS as unknown as { value: SortKey; label: string }[]}
            value={stagedSort}
            onChange={(v) => setStagedSort((v as SortKey) ?? "name")}
          />
        </FilterSection>
      </FilterSheet>

      <MobileFab href="/inventory/new" label="Add item" />
    </PageShell>
  )
}

function SummaryStrip({
  total,
  lowCount,
  oosCount,
  totalValue,
}: {
  total: number
  lowCount: number
  oosCount: number
  totalValue: number
}) {
  const { formatPrice } = useCurrency()
  const tiles = [
    { label: "Total SKUs", value: total.toLocaleString(), tone: "brand" as StatusTone, hint: "active" },
    { label: "Low stock", value: lowCount.toLocaleString(), tone: "warning" as StatusTone, hint: "watch" },
    { label: "Out of stock", value: oosCount.toLocaleString(), tone: "danger" as StatusTone, hint: "act now" },
    { label: "Stock value", value: formatPrice(totalValue), tone: "success" as StatusTone, hint: "healthy" },
  ]
  return (
    <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="min-w-[140px] flex-shrink-0 snap-start rounded-2xl border border-border bg-card p-3 md:min-w-0"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{t.value}</p>
          <div className="mt-1.5">
            <StatusBadge tone={t.tone} withDot>{t.hint}</StatusBadge>
          </div>
        </div>
      ))}
    </div>
  )
}

function MobileItemList({ items, formatPrice, onView, onReceive }: { items: Item[]; formatPrice: (n: number | null | undefined) => string; onView: (it: Item) => void; onReceive: (it: Item) => void }) {
  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const s = stockStatus(it)
        const pct = Math.min(100, (it.stock / Math.max(1, it.reorder)) * 100)
        return (
          <li key={it.sku}>
            <SwipeableRow
              rightActions={[
                {
                  label: "Receive",
                  tone: "primary",
                  icon: <Truck className="h-4 w-4" />,
                  onPress: () => onReceive(it),
                },
                {
                  label: "Edit",
                  tone: "neutral",
                  icon: <Edit3 className="h-4 w-4" />,
                  onPress: () => onView(it),
                },
              ]}
            >
              <button
                type="button"
                onClick={() => onView(it)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <ProductThumb
                  name={it.name}
                  image={it.image}
                  seed={it.sku}
                  className="h-12 w-12 shrink-0 rounded-lg border border-border"
                  textClassName="text-sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{it.name}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(it.price)}</p>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">
                      <span className="font-mono">{it.sku}</span> · {it.category} · {it.location}
                    </span>
                    <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-1 rounded-full",
                          s.tone === "danger" && "bg-rose-500",
                          s.tone === "warning" && "bg-amber-500",
                          s.tone === "success" && "bg-emerald-500",
                          s.tone === "info" && "bg-sky-500",
                          s.tone === "neutral" && "bg-muted-foreground",
                          s.tone === "brand" && "bg-brand dark:bg-primary",
                        )}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {it.stock}/{it.reorder} {it.unit}
                    </span>
                  </div>
                </div>
              </button>
            </SwipeableRow>
          </li>
        )
      })}
    </ul>
  )
}

function DesktopItemTable({ items, formatPrice, onView }: { items: Item[]; formatPrice: (n: number | null | undefined) => string; onView: (it: Item) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Item</th>
            <th className="px-3 py-2.5 font-medium">SKU</th>
            <th className="px-3 py-2.5 font-medium">Category</th>
            <th className="px-3 py-2.5 font-medium">Location</th>
            <th className="px-3 py-2.5 text-right font-medium">Stock</th>
            <th className="px-3 py-2.5 text-right font-medium">Price</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 text-right font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((it) => {
            const s = stockStatus(it)
            return (
              <tr key={it.sku} className="transition-colors hover:bg-accent/30">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      name={it.name}
                      image={it.image}
                      seed={it.sku}
                      className="h-9 w-9 rounded-md border border-border"
                      textClassName="text-[11px]"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{it.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {it.brand} · {it.unit}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{it.sku}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    {it.category}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{it.location}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {it.stock}
                  <span className="text-muted-foreground">/{it.reorder}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(it.price)}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge tone={s.tone} withDot>
                    {s.label}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Button size="sm" variant="ghost" onClick={() => onView(it)}>View</Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
