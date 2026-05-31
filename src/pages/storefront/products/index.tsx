import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { EmptyState } from "@/components/lists/empty-state"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { getStorefrontState, TEMPLATES_BY_ID } from "@/lib/storefront/data"
import { kvJson } from "@/lib/storage/kv"
import { cn } from "@/lib/utils"

// Storefront catalog — which items from your master Inventory are
// published to the hosted shop. Lets the owner toggle visibility
// per-product without removing the item from POS / wholesale.

type ProductStatus = "live" | "draft" | "out-of-stock" | "hidden"

type StorefrontProduct = {
  sku: string
  name: string
  price: number
  compareAt?: number
  image: string
  category: string
  brand?: string
  stock: number
  status: ProductStatus
  featured: boolean
  views30d: number
  sold30d: number
}

const PRODUCT_OVERRIDES_KEY = "pallio:storefront:product-overrides"
type ProductOverrides = Record<string, { status?: ProductStatus }>

const SEED_PRODUCTS: StorefrontProduct[] = [
  { sku: "AP-4012", name: "Cotton Tee — Black",         price: 12_500, compareAt: 16_000, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=320&h=320&fit=crop&auto=format&q=80", category: "Apparel",      brand: "BasicCo", stock: 120, status: "live",         featured: true,  views30d: 2_410, sold30d: 142 },
  { sku: "BT-9091", name: "Hydrating Serum",            price: 18_000,                     image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=320&h=320&fit=crop&auto=format&q=80", category: "Beauty",       brand: "Glow",    stock:  34, status: "live",         featured: true,  views30d: 1_840, sold30d:  98 },
  { sku: "EL-2109", name: "USB-C Hub 6-in-1",           price: 25_000,                     image: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=320&h=320&fit=crop&auto=format&q=80", category: "Electronics",  brand: "Gizmo",   stock:  48, status: "live",         featured: true,  views30d: 1_620, sold30d:  74 },
  { sku: "HM-2205", name: "Ceramic Mug 12oz",            price:  8_000, compareAt: 10_000, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=320&h=320&fit=crop&auto=format&q=80", category: "Gifts",        brand: "Homey",   stock: 200, status: "live",         featured: false, views30d: 1_420, sold30d: 156 },
  { sku: "EL-1001", name: "Wireless Mouse",              price: 19_990,                     image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=320&h=320&fit=crop&auto=format&q=80", category: "Electronics",  brand: "Gizmo",   stock:  64, status: "live",         featured: false, views30d:   980, sold30d:  62 },
  { sku: "AP-4015", name: "Linen Shirt — Stone",         price: 28_000,                     image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=320&h=320&fit=crop&auto=format&q=80", category: "Apparel",      brand: "BasicCo", stock:   0, status: "out-of-stock", featured: false, views30d:   620, sold30d:  18 },
  { sku: "BT-9095", name: "Bakuchiol Cream",             price: 15_000,                     image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=320&h=320&fit=crop&auto=format&q=80", category: "Beauty",       brand: "Glow",    stock:  22, status: "draft",        featured: false, views30d:     0, sold30d:   0 },
  { sku: "HM-2240", name: "Tea Towel Set",                price:  6_000,                     image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=320&h=320&fit=crop&auto=format&q=80", category: "Home",         brand: "Homey",   stock:  36, status: "live",         featured: false, views30d:   480, sold30d:  28 },
  { sku: "AC-1102", name: "Canvas Tote",                  price:  9_500,                     image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=320&h=320&fit=crop&auto=format&q=80", category: "Accessories",  stock:  88, status: "hidden",        featured: false, views30d:     0, sold30d:   0 },
  { sku: "BT-9099", name: "Black-Soap Mask",              price:  7_200,                     image: "https://images.unsplash.com/photo-1556228852-6d35a585d566?w=320&h=320&fit=crop&auto=format&q=80", category: "Beauty",       brand: "Glow",    stock:  58, status: "live",         featured: false, views30d:   320, sold30d:  14 },
]

const STATUS_TONE: Record<ProductStatus, StatusTone> = {
  "live":         "success",
  "draft":        "neutral",
  "out-of-stock": "warning",
  "hidden":       "danger",
}

type Filter = "all" | "live" | "draft" | "out-of-stock" | "hidden" | "featured"

export default function StorefrontProducts() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")

  // Apply persisted overrides on top of the seed list so visibility
  // toggles survive reload. Backend will replace the seed with real
  // catalog data — overrides shape (sku → status) won't change.
  const [products, setProducts] = React.useState<StorefrontProduct[]>(() => {
    const overrides = kvJson.get<ProductOverrides>(PRODUCT_OVERRIDES_KEY) ?? {}
    return SEED_PRODUCTS.map((p) => overrides[p.sku] ? { ...p, ...overrides[p.sku] } : p)
  })

  const toggleProductVisibility = React.useCallback(async (sku: string) => {
    let nextStatus: ProductStatus = "live"
    let productName = "Product"
    setProducts((prev) => prev.map((p) => {
      if (p.sku !== sku) return p
      productName = p.name
      // Out-of-stock items always go hidden; everything else flips live ↔ hidden.
      nextStatus = p.status === "live" ? "hidden" : "live"
      return { ...p, status: nextStatus }
    }))
    try {
      const overrides = kvJson.get<ProductOverrides>(PRODUCT_OVERRIDES_KEY) ?? {}
      overrides[sku] = { status: nextStatus }
      await kvJson.set(PRODUCT_OVERRIDES_KEY, overrides)
      toast.success(nextStatus === "live" ? `${productName} published.` : `${productName} hidden from storefront.`)
    } catch {
      toast.error("Couldn't save change.")
    }
  }, [])

  const state = React.useMemo(() => getStorefrontState(), [])
  const template = state.templateId ? TEMPLATES_BY_ID[state.templateId] : null

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (filter === "featured" && !p.featured) return false
      if (filter !== "all" && filter !== "featured" && p.status !== filter) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.brand?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [query, filter, products])

  const counts: Record<Filter, number> = {
    all:           products.length,
    live:          products.filter((p) => p.status === "live").length,
    draft:         products.filter((p) => p.status === "draft").length,
    "out-of-stock":products.filter((p) => p.status === "out-of-stock").length,
    hidden:        products.filter((p) => p.status === "hidden").length,
    featured:      products.filter((p) => p.featured).length,
  }

  if (!template) {
    return (
      <PageShell title="Storefront products" withToolbar={false} titleTooltip="Items published to your hosted storefront.">
        <Card>
          <CardContent className="p-0">
            <EmptyState
              Icon={Globe}
              title="No storefront yet"
              description="Pick a template before publishing products."
              action={<Link to="/storefront/templates"><Button>Pick a template</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Storefront products"
      withToolbar={false}
      titleTooltip={
        <>
          Which products show on your hosted storefront. Different
          from the master <strong>Inventory</strong> — an item can be
          stocked but hidden from the storefront (e.g. while you
          shoot photos). Toggle visibility per product without losing
          POS / wholesale availability.
        </>
      }
      mobileTrailing={
        <Link to="/inventory/new" aria-label="Add product">
          <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Published", value: String(counts.live), tone: "success", hint: "live on shop" },
            { label: "Drafts",    value: String(counts.draft), tone: "neutral", hint: "not yet visible" },
            { label: "Out of stock", value: String(counts["out-of-stock"]), tone: "warning", hint: "auto-hidden" },
            { label: "Featured",  value: String(counts.featured), tone: "brand", hint: "on home hero" },
          ]}
        />

        {/* Filter chips + search + add CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
            {(["all", "live", "draft", "out-of-stock", "hidden", "featured"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === f
                    ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {f === "all" ? "All" : f.replace("-", " ")}
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", filter === f ? "bg-white/20" : "bg-muted")}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by SKU, name, brand…"
                className="pl-9"
              />
            </div>
            <Link to="/inventory/new" className="hidden sm:inline-flex">
              <Button><Plus className="h-3.5 w-3.5" /> Add product</Button>
            </Link>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                Icon={ImageIcon}
                title="No products match"
                description="Try a different filter or clear search."
                action={<Button variant="outline" onClick={() => { setQuery(""); setFilter("all") }}>Clear filters</Button>}
              />
            </CardContent>
          </Card>
        ) : isMobile ? (
          <ul className="grid grid-cols-2 gap-3">
            {filtered.map((p) => <ProductCard key={p.sku} product={p} formatPrice={formatPrice} />)}
          </ul>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Product</th>
                      <th className="px-3 py-2.5 font-medium">Category</th>
                      <th className="px-3 py-2.5 text-right font-medium">Price</th>
                      <th className="px-3 py-2.5 text-right font-medium">Stock</th>
                      <th className="px-3 py-2.5 text-right font-medium">Views (30d)</th>
                      <th className="px-3 py-2.5 text-right font-medium">Sold (30d)</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((p) => (
                      <tr key={p.sku} className="transition-colors hover:bg-accent/30">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <img src={p.image} alt={p.name} crossOrigin="anonymous" loading="lazy" referrerPolicy="no-referrer" className="h-10 w-10 rounded-lg object-cover" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-semibold">{p.name}</p>
                                {p.featured && <Star className="h-3 w-3 fill-amber-400 text-amber-500" aria-label="Featured" />}
                              </div>
                              <p className="truncate text-[10px] text-muted-foreground">{p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs">{p.category}</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="text-xs font-bold tabular-nums">{formatPrice(p.price)}</div>
                          {p.compareAt && (
                            <div className="text-[10px] text-muted-foreground line-through">{formatPrice(p.compareAt)}</div>
                          )}
                        </td>
                        <td className={cn("px-3 py-2.5 text-right text-xs tabular-nums", p.stock === 0 && "text-rose-600 dark:text-rose-400 font-bold")}>{p.stock}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums">{p.views30d.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums">{p.sold30d}</td>
                        <td className="px-3 py-2.5"><StatusBadge tone={STATUS_TONE[p.status]} withDot>{p.status.replace("-", " ")}</StatusBadge></td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={p.status === "live" ? "Hide from storefront" : "Show on storefront"}
                            onClick={() => toggleProductVisibility(p.sku)}
                          >
                            {p.status === "live" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Smart bins — bulk actions */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { Icon: Sparkles, title: "Set this week's featured", body: "Rotate the top 4 hero products.", href: "/storefront" },
            { Icon: AlertTriangle, title: "Hide out-of-stock items", body: `${counts["out-of-stock"]} SKUs auto-hidden — review.`, href: "/inventory" },
            { Icon: TrendingUp, title: "Boost a trending product", body: "Push your best-sellers via paid ads.", href: "/marketing" },
          ].map((q) => (
            <Link
              key={q.title}
              to={q.href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <q.Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{q.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{q.body}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  )
}

function ProductCard({ product: p, formatPrice }: { product: StorefrontProduct; formatPrice: (n: number) => string }) {
  return (
    <li>
      <Link to="/inventory" className="block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-brand/40">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img src={p.image} alt={p.name} crossOrigin="anonymous" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
          {p.featured && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-950 shadow-sm">
              <Star className="h-2.5 w-2.5 fill-current" /> Featured
            </span>
          )}
          <span className="absolute bottom-2 right-2">
            <StatusBadge tone={STATUS_TONE[p.status]} withDot>{p.status.replace("-", " ")}</StatusBadge>
          </span>
        </div>
        <div className="p-3">
          <p className="truncate text-xs font-semibold">{p.name}</p>
          <p className="text-[10px] text-muted-foreground">{p.sku} · {p.category}</p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <p className="text-sm font-bold tabular-nums">{formatPrice(p.price)}</p>
            <p className={cn("text-[10px] tabular-nums", p.stock === 0 ? "font-bold text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
              {p.stock} in stock
            </p>
          </div>
        </div>
      </Link>
    </li>
  )
}

void Boxes; void Tag; void ChevronRight
