import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  CheckCircle2,
  Code,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Image as ImageIcon,
  Layout,
  Menu,
  PencilLine,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
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
import { getStorefrontState, TEMPLATES_BY_ID } from "@/lib/storefront/data"
import { kvJson } from "@/lib/storage/kv"
import { cn } from "@/lib/utils"

// Storefront pages — list every page in the active template, let the
// owner edit content, toggle visibility, add custom pages. Mimics
// Shopify's Pages + Navigation area in scope; the actual block
// editor is mocked here (real editor ships with the backend).

type PageStatus = "live" | "draft" | "hidden"
type PageKind = "essential" | "policy" | "custom"

type StorefrontPage = {
  path: string
  name: string
  kind: PageKind
  status: PageStatus
  description: string
  visits30d: number
  lastEdited: string
  inMenu: boolean
}

const PAGES_OVERRIDES_KEY = "pallio:storefront:pages-overrides"
type PageOverrides = Record<string, { status?: PageStatus }>

const SEED_PAGES: StorefrontPage[] = [
  { path: "/",          name: "Home",         kind: "essential", status: "live", description: "Hero + featured products + newsletter signup.", visits30d: 8_240, lastEdited: "2d ago",  inMenu: false },
  { path: "/shop",      name: "Shop",         kind: "essential", status: "live", description: "Filterable catalog with category drilldown.",      visits30d: 5_120, lastEdited: "1w ago",  inMenu: true },
  { path: "/lookbook",  name: "Lookbook",     kind: "custom",    status: "live", description: "Editorial photoshoot with shoppable hotspots.",     visits30d: 1_840, lastEdited: "3d ago",  inMenu: true },
  { path: "/journal",   name: "Journal",      kind: "custom",    status: "draft", description: "Long-form blog for styling tips + drops.",         visits30d:     0, lastEdited: "just now", inMenu: false },
  { path: "/about",     name: "About",        kind: "essential", status: "live", description: "Story + values + stats + founder photo.",          visits30d:   620, lastEdited: "2w ago",  inMenu: true },
  { path: "/contact",   name: "Contact",      kind: "essential", status: "live", description: "Form + WhatsApp link + map.",                       visits30d:   480, lastEdited: "1mo ago", inMenu: true },
  { path: "/faq",       name: "FAQ",          kind: "custom",    status: "live", description: "20 most-asked-questions.",                          visits30d:   240, lastEdited: "1mo ago", inMenu: true },
  { path: "/sizing",    name: "Sizing guide", kind: "custom",    status: "live", description: "Fit measurements per piece.",                       visits30d:   320, lastEdited: "1mo ago", inMenu: false },
  { path: "/privacy",   name: "Privacy",      kind: "policy",    status: "live", description: "NDPR-compliant data + cookie policy.",              visits30d:    14, lastEdited: "3mo ago", inMenu: false },
  { path: "/terms",     name: "Terms",        kind: "policy",    status: "live", description: "Sale terms, return policy, shipping promise.",     visits30d:    18, lastEdited: "3mo ago", inMenu: false },
  { path: "/refunds",   name: "Returns",      kind: "policy",    status: "live", description: "Auto-syncs from Storefront → Settings.",            visits30d:    62, lastEdited: "1w ago",  inMenu: false },
  { path: "/shipping",  name: "Shipping",     kind: "policy",    status: "live", description: "Zones + flat rates + free-shipping thresholds.",   visits30d:    48, lastEdited: "1w ago",  inMenu: false },
  { path: "/cart",      name: "Cart",         kind: "essential", status: "live", description: "Line items, promo code, shipping estimate.",         visits30d: 2_240, lastEdited: "—",        inMenu: false },
  { path: "/checkout",  name: "Checkout",     kind: "essential", status: "live", description: "Address, delivery, payment — single page.",         visits30d: 1_620, lastEdited: "—",        inMenu: false },
  { path: "/account",   name: "Account",      kind: "essential", status: "live", description: "Order history, addresses, saved cards.",            visits30d:   840, lastEdited: "—",        inMenu: false },
]

const STATUS_TONE: Record<PageStatus, StatusTone> = {
  live:   "success",
  draft:  "neutral",
  hidden: "danger",
}

const KIND_LABEL: Record<PageKind, string> = {
  essential: "Built-in",
  policy:    "Policy",
  custom:    "Custom",
}

type Filter = "all" | PageStatus | "in-menu" | "custom"

export default function StorefrontPages() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")

  // Apply persisted overrides on top of the seed list so visibility
  // toggles survive reload. Backend will replace the seed with real
  // template pages — overrides shape (path → status) won't change.
  const [pages, setPages] = React.useState<StorefrontPage[]>(() => {
    const overrides = kvJson.get<PageOverrides>(PAGES_OVERRIDES_KEY) ?? {}
    return SEED_PAGES.map((p) => overrides[p.path] ? { ...p, ...overrides[p.path] } : p)
  })

  const togglePageStatus = React.useCallback(async (path: string) => {
    let nextStatus: PageStatus = "live"
    setPages((prev) => prev.map((p) => {
      if (p.path !== path) return p
      nextStatus = p.status === "live" ? "hidden" : "live"
      return { ...p, status: nextStatus, lastEdited: "just now" }
    }))
    try {
      const overrides = kvJson.get<PageOverrides>(PAGES_OVERRIDES_KEY) ?? {}
      overrides[path] = { status: nextStatus }
      await kvJson.set(PAGES_OVERRIDES_KEY, overrides)
      const page = pages.find((p) => p.path === path)
      toast.success(nextStatus === "live" ? `${page?.name ?? "Page"} published.` : `${page?.name ?? "Page"} hidden.`)
    } catch {
      toast.error("Couldn't save change.")
    }
  }, [pages])

  const state = React.useMemo(() => getStorefrontState(), [])
  const template = state.templateId ? TEMPLATES_BY_ID[state.templateId] : null

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return pages.filter((p) => {
      if (filter === "in-menu" && !p.inMenu) return false
      if (filter === "custom" && p.kind !== "custom") return false
      if (filter !== "all" && filter !== "in-menu" && filter !== "custom" && p.status !== filter) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    })
  }, [query, filter, pages])

  const counts: Record<Filter, number> = {
    all:      pages.length,
    live:     pages.filter((p) => p.status === "live").length,
    draft:    pages.filter((p) => p.status === "draft").length,
    hidden:   pages.filter((p) => p.status === "hidden").length,
    "in-menu":pages.filter((p) => p.inMenu).length,
    custom:   pages.filter((p) => p.kind === "custom").length,
  }

  if (!template) {
    return (
      <PageShell title="Storefront pages" withToolbar={false} titleTooltip="Edit the pages on your hosted shop.">
        <Card>
          <CardContent className="p-0">
            <EmptyState
              Icon={Globe}
              title="No storefront yet"
              description="Pick a template before editing its pages."
              action={<Link to="/storefront/templates"><Button>Pick a template</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const liveUrl = state.customDomain ?? `${state.subdomain}.pallio.shop`

  return (
    <PageShell
      title="Storefront pages"
      withToolbar={false}
      titleTooltip={
        <>
          Every page on your hosted shop — built-in ones (Home, Shop,
          Cart, Checkout, Account), policy pages (Privacy, Terms,
          Returns, Shipping), and your own custom pages (FAQ, sizing
          guide, lookbook, journal). Tap any page to edit content
          with the block editor.
        </>
      }
      mobileTrailing={
        <Button size="sm" variant="ghost" onClick={() => toast("New custom page arrives with the backend.")} aria-label="New page">
          <Plus className="h-4 w-4" />
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Pages",       value: String(pages.length),         tone: "brand",   hint: `${counts.custom} custom` },
            { label: "Live",        value: String(counts.live),          tone: "success", hint: "visible to shoppers" },
            { label: "In menu",     value: String(counts["in-menu"]),     tone: "info",    hint: "top navigation" },
            { label: "Drafts",      value: String(counts.draft),         tone: "neutral", hint: "not yet visible" },
          ]}
        />

        {/* Filter chips + search + add */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
            {(["all", "live", "draft", "hidden", "in-menu", "custom"] as const).map((f) => (
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
                placeholder="Search pages…"
                className="pl-9"
              />
            </div>
            <Button onClick={() => toast("New custom page arrives with the backend.")} className="hidden sm:inline-flex">
              <Plus className="h-3.5 w-3.5" /> New page
            </Button>
          </div>
        </div>

        {/* Menu builder hint */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold md:text-base">Navigation menu</h3>
                <p className="text-[11px] text-muted-foreground">Pages with the star in the menu appear in the storefront's top nav. Drag to reorder.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast("Drag-to-reorder arrives with the backend.")}>
                <Menu className="h-3.5 w-3.5" /> Edit menu
              </Button>
            </div>
            <ul className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 scrollbar-hide">
              {pages.filter((p) => p.inMenu).map((p) => (
                <li
                  key={p.path}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold"
                >
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  {p.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                Icon={FileText}
                title="No pages match"
                description="Try a different filter or clear search."
                action={<Button variant="outline" onClick={() => { setQuery(""); setFilter("all") }}>Clear filters</Button>}
              />
            </CardContent>
          </Card>
        ) : isMobile ? (
          <ul className="flex flex-col gap-2">
            {filtered.map((p) => <PageCard key={p.path} page={p} liveUrl={liveUrl} />)}
          </ul>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Page</th>
                      <th className="px-3 py-2.5 font-medium">URL</th>
                      <th className="px-3 py-2.5 font-medium">Kind</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">In menu</th>
                      <th className="px-3 py-2.5 text-right font-medium">Visits (30d)</th>
                      <th className="px-3 py-2.5 font-medium">Last edited</th>
                      <th className="px-3 py-2.5 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((p) => (
                      <tr key={p.path} className="transition-colors hover:bg-accent/30">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                              {p.kind === "policy" ? <ShieldAlert className="h-4 w-4" /> : p.kind === "custom" ? <PencilLine className="h-4 w-4" /> : <Layout className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold">{p.name}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{p.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{p.path}</code>
                        </td>
                        <td className="px-3 py-2.5 text-xs">{KIND_LABEL[p.kind]}</td>
                        <td className="px-3 py-2.5"><StatusBadge tone={STATUS_TONE[p.status]} withDot>{p.status}</StatusBadge></td>
                        <td className="px-3 py-2.5">
                          {p.inMenu
                            ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                            : <span className="text-[10px] text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums">{p.visits30d.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{p.lastEdited}</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <a href={`https://${liveUrl}${p.path}`} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost" aria-label="View live"><ExternalLink className="h-3.5 w-3.5" /></Button>
                            </a>
                            <Button size="sm" variant="ghost" onClick={() => toast(`Edit ${p.name} arrives with the backend.`)} aria-label="Edit">
                              <PencilLine className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={p.status === "live" ? "Hide page" : "Publish page"}
                              onClick={() => togglePageStatus(p.path)}
                            >
                              {p.status === "live" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </Button>
                            {p.kind === "custom" && (
                              <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => toast.error(`${p.name} deleted.`)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Block editor preview teaser */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-300" />
                  <h3 className="text-sm font-semibold md:text-base">Block editor</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Drag-and-drop sections — hero, text, image gallery, product grid, FAQ, embed. No code unless you want it.</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    { Icon: Layout,     label: "Hero" },
                    { Icon: ImageIcon,  label: "Image gallery" },
                    { Icon: FileText,   label: "Rich text" },
                    { Icon: Sparkles,   label: "Product grid" },
                    { Icon: CheckCircle2, label: "FAQ accordion" },
                    { Icon: Code,        label: "HTML embed" },
                  ].map((b) => (
                    <span key={b.label} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium">
                      <b.Icon className="h-2.5 w-2.5" />
                      {b.label}
                    </span>
                  ))}
                </ul>
              </div>
              <Button
                size="sm"
                disabled
                title="Block editor is part of the upcoming Storefront backend."
              >
                Open editor <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

function PageCard({ page: p, liveUrl }: { page: StorefrontPage; liveUrl: string }) {
  return (
    <li>
      <article className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
            {p.kind === "policy" ? <ShieldAlert className="h-4 w-4" /> : p.kind === "custom" ? <PencilLine className="h-4 w-4" /> : <Layout className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <StatusBadge tone={STATUS_TONE[p.status]} withDot>{p.status}</StatusBadge>
            </div>
            <code className="text-[10px] font-mono text-muted-foreground">{p.path}</code>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{p.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">{KIND_LABEL[p.kind]}</span>
              {p.inMenu && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
                  <Star className="h-2.5 w-2.5 fill-current" /> in menu
                </span>
              )}
              <span className="text-muted-foreground">{p.visits30d.toLocaleString()} visits · {p.lastEdited}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <a href={`https://${liveUrl}${p.path}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  <ExternalLink className="h-3 w-3" /> View
                </Button>
              </a>
              <Button
                size="sm"
                className="flex-1"
                disabled
                title="Block editor is part of the upcoming Storefront backend."
              >
                <PencilLine className="h-3 w-3" /> Edit
              </Button>
            </div>
          </div>
        </div>
      </article>
    </li>
  )
}
