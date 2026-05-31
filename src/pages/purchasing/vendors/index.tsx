import * as React from "react"
import { Link } from "react-router-dom"
import {
  Building2,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  Package,
  Phone,
  Plus,
  Search,
  Star,
  TrendingDown,
  Wallet,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SwipeableRow } from "@/components/mobile/swipeable-row"
import { Avatar } from "@/components/avatar"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { OnboardingNudge } from "@/components/onboarding/onboarding-nudge"
import { AddVendorDialog, type QuickVendor } from "@/components/dialogs/add-vendor-dialog"
import { useCurrency } from "@/contexts/currency"
import { toast } from "sonner"

// Vendors / suppliers list. Was a 3-column table — promoted to a
// proper list with KPI summary, search, status filter, mobile + desktop
// layouts. Each row shows the data a buyer actually decides on:
// YTD spend, lead time, payment terms, on-time rate, open POs.

type Tier = "preferred" | "active" | "watch" | "new"

type Vendor = {
  slug: string
  name: string
  email: string
  phone?: string
  category: string
  city?: string
  paymentTerms: string         // e.g. "Net 30", "Net 14", "Prepay"
  leadTimeDays: number          // average lead time in days
  ytdSpend: number              // running total this year
  openPOs: number
  onTimeRate: number            // 0..1
  lastPOAt: string              // human label like "3 days ago"
  tier: Tier
}

// Mocked roster. Realistic Nigerian SMB vendors + a couple of
// international suppliers so the cross-border use case is visible.
const SEED_VENDORS: Vendor[] = [
  { slug: "cobalt",    name: "Cobalt Electronics",     email: "sales@cobalt.com",       phone: "+1 555 0100",          category: "Electronics",   city: "Shenzhen · CN",  paymentTerms: "Net 30", leadTimeDays: 21, ytdSpend: 1840000, openPOs: 3, onTimeRate: 0.78, lastPOAt: "3 days ago",   tier: "active" },
  { slug: "delta",     name: "Delta Apparel",           email: "orders@delta.com",       phone: "+234 803 555 0119",    category: "Fashion",       city: "Aba · NG",       paymentTerms: "Net 14", leadTimeDays: 7,  ytdSpend: 920000,  openPOs: 1, onTimeRate: 0.94, lastPOAt: "yesterday",    tier: "preferred" },
  { slug: "porcel",    name: "Porcel Homewares",        email: "wholesale@porcel.co",    phone: "+234 813 555 0204",    category: "Home goods",    city: "Lagos · NG",     paymentTerms: "Prepay", leadTimeDays: 4,  ytdSpend: 410000,  openPOs: 0, onTimeRate: 0.97, lastPOAt: "12 days ago",  tier: "preferred" },
  { slug: "glowco",    name: "Glow Co Beauty",          email: "trade@glowco.com",       phone: "+234 802 555 0173",    category: "Beauty",        city: "Lagos · NG",     paymentTerms: "Net 30", leadTimeDays: 14, ytdSpend: 680000,  openPOs: 2, onTimeRate: 0.82, lastPOAt: "5 days ago",   tier: "active" },
  { slug: "acme",      name: "Acme Peripherals",        email: "b2b@acme.io",            phone: "+1 415 555 0144",      category: "Electronics",   city: "San Jose · US",  paymentTerms: "Net 60", leadTimeDays: 28, ytdSpend: 215000,  openPOs: 0, onTimeRate: 0.66, lastPOAt: "47 days ago",  tier: "watch" },
  { slug: "hausa",     name: "Hausa Spice Co.",         email: "orders@hausaspice.ng",   phone: "+234 706 555 0227",    category: "Food & spice",  city: "Kano · NG",      paymentTerms: "Net 7",  leadTimeDays: 3,  ytdSpend: 156000,  openPOs: 1, onTimeRate: 0.99, lastPOAt: "2 days ago",   tier: "preferred" },
  { slug: "lagosmart", name: "LagosMart Distributors",  email: "b2b@lagosmart.ng",       phone: "+234 901 555 0312",    category: "Convenience",   city: "Lagos · NG",     paymentTerms: "Net 14", leadTimeDays: 5,  ytdSpend: 290000,  openPOs: 4, onTimeRate: 0.88, lastPOAt: "today",        tier: "active" },
  { slug: "studio",    name: "Studio Print Shop",       email: "print@studio.lagos",     phone: "+234 904 555 0411",    category: "Packaging",     city: "Lagos · NG",     paymentTerms: "Prepay", leadTimeDays: 6,  ytdSpend: 48000,   openPOs: 0, onTimeRate: 0.91, lastPOAt: "2 weeks ago",  tier: "new" },
]

const tierTone: Record<Tier, StatusTone> = {
  preferred: "success",
  active:    "info",
  watch:     "warning",
  new:       "brand",
}

const STATUS_FILTERS = [
  { value: "all",       label: "All" },
  { value: "preferred", label: "Preferred" },
  { value: "active",    label: "Active" },
  { value: "watch",     label: "Watch" },
  { value: "new",       label: "New" },
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"]

export default function Vendors() {
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const [query, setQuery] = React.useState("")
  const [tab, setTab] = React.useState<StatusFilter>("all")
  const [vendors, setVendors] = React.useState<Vendor[]>(SEED_VENDORS)
  const [addOpen, setAddOpen] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)

  // Quick-add prepends to the roster. Builds a full Vendor row from the
  // minimal overlay fields with sensible "brand-new vendor" defaults
  // (no history yet, nothing in flight).
  const handleCreate = (v: QuickVendor) => {
    const slug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `vendor-${Date.now()}`
    setVendors((prev) => [
      {
        slug,
        name: v.name,
        email: v.email,
        phone: v.phone,
        category: v.category,
        paymentTerms: v.paymentTerms,
        leadTimeDays: 0,
        ytdSpend: 0,
        openPOs: 0,
        onTimeRate: 1,
        lastPOAt: "just now",
        tier: "new",
      },
      ...prev,
    ])
  }

  useRegisterPageRefresh(
    React.useCallback(async () => {
      setRefreshing(true)
      try { await new Promise((r) => setTimeout(r, 350)) } finally { setRefreshing(false) }
    }, []),
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return vendors.filter((v) => {
      if (tab !== "all" && v.tier !== tab) return false
      if (!q) return true
      return [v.name, v.email, v.phone, v.category, v.city]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q))
    })
  }, [query, tab, vendors])

  // KPI ribbon — picks the four numbers a purchasing manager actually
  // looks at every morning.
  const totalVendors = vendors.length
  const ytdSpend = vendors.reduce((s, v) => s + v.ytdSpend, 0)
  const openPOs = vendors.reduce((s, v) => s + v.openPOs, 0)
  const avgLeadTime = Math.round(vendors.reduce((s, v) => s + v.leadTimeDays, 0) / Math.max(1, vendors.length))
  const lateVendors = vendors.filter((v) => v.onTimeRate < 0.8).length

  const onContactEmail = (v: Vendor) => { window.location.href = `mailto:${v.email}` }
  const onContactCall  = (v: Vendor) => {
    if (!v.phone) return toast("No phone number on file.")
    window.location.href = `tel:${v.phone.replace(/\s+/g, "")}`
  }

  return (
    <PageShell
      title="Vendors"
      titleTooltip={
        <>
          Suppliers you buy stock from. Lead times, payment terms, on-time
          rate and YTD spend live with each vendor so the next PO is an
          informed decision.
        </>
      }
    >
      <div className="flex flex-col gap-4 md:gap-5">
        <OnboardingNudge stepKey="connect-payment" />

        {/* KPI ribbon */}
        <div className={`grid grid-cols-2 gap-3 transition-opacity md:grid-cols-4 md:gap-4 ${refreshing ? "opacity-60" : ""}`}>
          <Kpi Icon={Building2} label="Vendors" value={totalVendors.toString()} tone="brand" />
          <Kpi Icon={Wallet} label="YTD spend" value={formatPrice(ytdSpend)} tone="success" />
          <Kpi Icon={Package} label="Open POs" value={openPOs.toString()} tone="info" hint={openPOs > 0 ? "Awaiting receipt" : "Nothing in flight"} />
          <Kpi Icon={Clock} label="Avg. lead time" value={`${avgLeadTime} days`} tone={avgLeadTime > 21 ? "warning" : "neutral"} />
        </div>

        {/* Late-vendor banner */}
        {lateVendors > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 dark:bg-amber-950/15">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <TrendingDown className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{lateVendors} vendor{lateVendors === 1 ? "" : "s"} below 80% on-time delivery</p>
              <p className="text-xs text-muted-foreground">Filter to <button onClick={() => setTab("watch")} className="font-semibold text-brand hover:underline dark:text-primary">Watch</button> to review and renegotiate buffer stock.</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, category, city…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {refreshing && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refreshing…
            </span>
          )}
          <Button className="hidden md:inline-flex" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add vendor
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTab(f.value)}
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                (tab === f.value
                  ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/15 dark:text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                Icon={Building2}
                title="No vendors match."
                description={query ? "Try a different search term, or clear the status filter." : "Add your first supplier to start writing POs against them."}
                action={
                  <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add vendor</Button>
                }
              />
            </CardContent>
          </Card>
        ) : isMobile ? (
          <ul className="flex flex-col gap-2">
            {filtered.map((v) => (
              <li key={v.slug}>
                <SwipeableRow
                  rightActions={[
                    { label: "Email",  tone: "neutral",  icon: <Mail className="h-4 w-4" />,  onPress: () => onContactEmail(v) },
                    ...(v.phone ? [{ label: "Call", tone: "primary" as const, icon: <Phone className="h-4 w-4" />, onPress: () => onContactCall(v) }] : []),
                  ]}
                >
                  <Link to={`/purchasing/vendors/${v.slug}`} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-brand/40">
                    <Avatar seed={v.email} name={v.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{v.name}</p>
                        <StatusBadge tone={tierTone[v.tier]} withDot>{v.tier}</StatusBadge>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{v.category} · {v.city ?? "—"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground/90">{formatPrice(v.ytdSpend)} YTD</span>
                        <span>·</span>
                        <span>{v.leadTimeDays}d lead</span>
                        <span>·</span>
                        <span>{v.paymentTerms}</span>
                        <span>·</span>
                        <span className={v.onTimeRate < 0.8 ? "text-amber-600 dark:text-amber-400" : ""}>
                          {Math.round(v.onTimeRate * 100)}% on-time
                        </span>
                        {v.openPOs > 0 && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-brand dark:text-primary">{v.openPOs} open</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </SwipeableRow>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Vendor</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Terms</th>
                  <th className="px-3 py-2.5 text-right font-medium">Lead</th>
                  <th className="px-3 py-2.5 text-right font-medium">On-time</th>
                  <th className="px-3 py-2.5 text-right font-medium">Open POs</th>
                  <th className="px-3 py-2.5 text-right font-medium">YTD spend</th>
                  <th className="px-3 py-2.5 font-medium">Tier</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((v) => (
                  <tr key={v.slug} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar seed={v.email} name={v.name} size={28} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{v.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{v.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{v.category}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{v.paymentTerms}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{v.leadTimeDays}d</td>
                    <td className={"px-3 py-2.5 text-right tabular-nums " + (v.onTimeRate < 0.8 ? "text-amber-600 dark:text-amber-400" : "")}>
                      {Math.round(v.onTimeRate * 100)}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {v.openPOs > 0 ? (
                        <span className="font-semibold text-brand dark:text-primary">{v.openPOs}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatPrice(v.ytdSpend)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={tierTone[v.tier]} withDot>
                        {v.tier === "preferred" && <Star className="mr-0.5 inline-block h-3 w-3" />}
                        {v.tier}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/purchasing/vendors/${v.slug}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MobileFab onClick={() => setAddOpen(true)} label="Add vendor" />

      <AddVendorDialog open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} />
    </PageShell>
  )
}

function Kpi({
  Icon,
  label,
  value,
  tone,
  hint,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: "brand" | "success" | "info" | "warning" | "neutral"
  hint?: string
}) {
  const TONE: Record<typeof tone, string> = {
    brand:   "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    info:    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    neutral: "bg-muted text-muted-foreground",
  }
  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE[tone]}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className="mt-2 text-lg font-bold tabular-nums md:text-xl">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
