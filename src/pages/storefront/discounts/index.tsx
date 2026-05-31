import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { kvJson } from "@/lib/storage/kv"
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Gift,
  Globe,
  Percent,
  Plus,
  Search,
  Share2,
  Sparkles,
  Tag,
  Ticket,
  TrendingUp,
  Users,
  X,
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
import { cn } from "@/lib/utils"

type DiscountKind = "percent" | "flat" | "free-shipping" | "bogo"
type Status = "active" | "scheduled" | "expired" | "paused"

type Discount = {
  code: string
  kind: DiscountKind
  value: number
  description: string
  audience: "all" | "new" | "vip" | "wholesale"
  appliesTo: "cart" | "category" | "sku"
  minOrder?: number
  capTotal?: number
  capPerCustomer: number
  redeemed: number
  revenueDriven: number
  starts?: string
  ends?: string
  status: Status
}

const DISCOUNTS: Discount[] = [
  { code: "WELCOME10",   kind: "percent",       value: 10, description: "10% off first order for new customers.",          audience: "new",       appliesTo: "cart",     minOrder:  10_000, capTotal: 1_000, capPerCustomer: 1, redeemed: 248,  revenueDriven:  892_400, starts: "Always-on",                    ends: "—",                 status: "active" },
  { code: "EID2026",      kind: "percent",       value: 15, description: "Eid promotional discount across the catalog.",     audience: "all",       appliesTo: "cart",     minOrder:  5_000,  capTotal: 500,   capPerCustomer: 2, redeemed: 184,  revenueDriven:  642_800, starts: "2026-04-08",                  ends: "2026-04-15",        status: "active" },
  { code: "VIPONLY",      kind: "percent",       value: 20, description: "VIP customers — automatic 20% off cart total.",     audience: "vip",       appliesTo: "cart",     capPerCustomer: 999, redeemed: 92, revenueDriven:  418_200, starts: "Always-on", ends: "—",                                                              status: "active" },
  { code: "SHIP-FREE",    kind: "free-shipping", value: 0,  description: "Free Lagos delivery on orders over ₦20k.",          audience: "all",       appliesTo: "cart",     minOrder: 20_000,                       capPerCustomer: 999, redeemed: 412, revenueDriven: 1_240_500, starts: "Always-on", ends: "—",                                                              status: "active" },
  { code: "BUY3GET1",     kind: "bogo",          value: 1,  description: "Buy 3 tees, get the 4th free (Apparel only).",      audience: "all",       appliesTo: "category", capTotal: 200,   capPerCustomer: 1, redeemed: 68,  revenueDriven:  248_000, starts: "Always-on",                    ends: "—",                 status: "active" },
  { code: "BFRIDAY24",    kind: "percent",       value: 25, description: "Black Friday — sitewide.",                          audience: "all",       appliesTo: "cart",     minOrder:  8_000,  capTotal: 2_000, capPerCustomer: 1, redeemed: 0,    revenueDriven:        0, starts: "2026-11-29",                  ends: "2026-12-02",        status: "scheduled" },
  { code: "STUDENT5K",    kind: "flat",          value: 5_000, description: "₦5,000 off for verified university students.",     audience: "all",       appliesTo: "cart",     minOrder: 25_000,  capTotal: 300,   capPerCustomer: 1, redeemed: 34,  revenueDriven:  124_200, starts: "Always-on",                    ends: "—",                 status: "active" },
  { code: "LAUNCH2025",   kind: "percent",       value: 30, description: "Original launch promo. Now expired.",               audience: "all",       appliesTo: "cart",     minOrder:  5_000,  capTotal: 1_000, capPerCustomer: 1, redeemed: 982, revenueDriven: 2_840_000, starts: "2025-08-01",                  ends: "2025-08-14",        status: "expired" },
  { code: "WHOLESALE12",  kind: "percent",       value: 12, description: "Wholesale tier — auto-applied at checkout.",        audience: "wholesale", appliesTo: "cart",     capPerCustomer: 999, redeemed: 41,  revenueDriven:  482_900, starts: "Always-on", ends: "—",                                                              status: "active" },
  { code: "DEC-PAUSED",   kind: "percent",       value: 18, description: "December promo — paused (cash flow check).",        audience: "all",       appliesTo: "cart",     minOrder: 12_000,  capTotal: 800,   capPerCustomer: 1, redeemed: 21,   revenueDriven:   88_400, starts: "Always-on",                    ends: "—",                 status: "paused" },
]

const STATUS_TONE: Record<Status, StatusTone> = {
  active:    "success",
  scheduled: "info",
  expired:   "neutral",
  paused:    "warning",
}

const AUDIENCE_LABEL: Record<Discount["audience"], string> = {
  all:       "All customers",
  new:       "New only",
  vip:       "VIP",
  wholesale: "Wholesale",
}

type Filter = "all" | Status

// AI suggestion → seed payload picked up by /sales/discounts/new.
type DiscountDraftSeed = {
  code: string
  kind: DiscountKind
  value: number
  description: string
  audience: Discount["audience"]
  minOrder?: number
  source: "ai-suggestion"
}
const DRAFT_SEED_KEY = "pallio:storefront:discount-draft-seed"

export default function StorefrontDiscounts() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const navigate = useNavigate()
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")

  const startDraftFromSuggestion = React.useCallback(async (seed: DiscountDraftSeed) => {
    try {
      await kvJson.set(DRAFT_SEED_KEY, seed)
      toast.success(`Draft "${seed.code}" ready — finish in the editor.`)
      navigate("/sales/discounts/new")
    } catch {
      toast.error("Couldn't start draft.")
    }
  }, [navigate])

  const state = React.useMemo(() => getStorefrontState(), [])
  const template = state.templateId ? TEMPLATES_BY_ID[state.templateId] : null

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return DISCOUNTS.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false
      if (!q) return true
      return (
        d.code.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        AUDIENCE_LABEL[d.audience].toLowerCase().includes(q)
      )
    })
  }, [query, filter])

  const counts: Record<Filter, number> = {
    all:       DISCOUNTS.length,
    active:    DISCOUNTS.filter((d) => d.status === "active").length,
    scheduled: DISCOUNTS.filter((d) => d.status === "scheduled").length,
    paused:    DISCOUNTS.filter((d) => d.status === "paused").length,
    expired:   DISCOUNTS.filter((d) => d.status === "expired").length,
  }

  const totalRevenue = DISCOUNTS.reduce((s, d) => s + d.revenueDriven, 0)
  const totalRedemptions = DISCOUNTS.reduce((s, d) => s + d.redeemed, 0)

  if (!template) {
    return (
      <PageShell title="Storefront discounts" withToolbar={false} titleTooltip="Promo codes for your hosted storefront.">
        <Card>
          <CardContent className="p-0">
            <EmptyState
              Icon={Globe}
              title="No storefront yet"
              description="Pick a template before creating discounts."
              action={<Link to="/storefront/templates"><Button>Pick a template</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const liveUrl = state.customDomain ?? `${state.subdomain}.pallio.shop`

  const copy = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  return (
    <PageShell
      title="Storefront discounts"
      withToolbar={false}
      titleTooltip={
        <>
          Promo codes shoppers can type at checkout on your hosted
          storefront. Scope by audience (all / new / VIP / wholesale),
          set caps + dates, watch redemptions live. POS-only codes
          live under <strong>Sales → Discounts</strong>.
        </>
      }
      mobileTrailing={
        <Link to="/sales/discounts/new" aria-label="New discount">
          <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Active codes",   value: String(counts.active),        tone: "success", hint: "live now" },
            { label: "Total redemptions", value: totalRedemptions.toLocaleString(), tone: "brand",   hint: "all-time" },
            { label: "Revenue driven", value: formatPrice(totalRevenue),    tone: "info",    hint: "via codes" },
            { label: "Scheduled",      value: String(counts.scheduled),     tone: "warning", hint: "go live later" },
          ]}
        />

        {/* Pallio AI suggestions — quick-start templates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-sm font-semibold md:text-base">Pallio AI suggests</h3>
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-600 dark:text-fuchsia-300" />
            </div>
            <p className="text-[11px] text-muted-foreground">Pre-built campaigns based on what's working for similar shops in your sector.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {([
                { Icon: Gift,      title: "Welcome new customers",  body: "10% off first order — converts ~22% better than no code", tone: "brand"   as const, seed: { code: "WELCOME10", kind: "percent",  value: 10,     description: "10% off first order for new customers.", audience: "new", minOrder: 10_000, source: "ai-suggestion" } as DiscountDraftSeed },
                { Icon: Calendar,  title: "Weekend flash",          body: "20% off for 48h — drives 3× normal sales volume",          tone: "warning" as const, seed: { code: "FLASH48",   kind: "percent",  value: 20,     description: "Weekend flash — 48h sitewide.",            audience: "all",                  source: "ai-suggestion" } as DiscountDraftSeed },
                { Icon: Users,     title: "Win back lapsed",        body: "₦5k off for customers inactive > 60d — recovers 18%",      tone: "info"    as const, seed: { code: "WINBACK5K", kind: "flat",     value: 5_000,  description: "Win back — ₦5,000 off for inactive customers.", audience: "all",                source: "ai-suggestion" } as DiscountDraftSeed },
              ]).map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => startDraftFromSuggestion(s.seed)}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-brand/40 hover:bg-accent/40"
                >
                  <span className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    s.tone === "brand"   && "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
                    s.tone === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                    s.tone === "info"    && "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                  )}>
                    <s.Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">{s.body}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filter chips + search + add */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
            {(["all", "active", "scheduled", "paused", "expired"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                  filter === f
                    ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {f === "all" ? "All" : f}
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
                placeholder="Search code or description…"
                className="pl-9"
              />
            </div>
            <Link to="/sales/discounts/new" className="hidden sm:inline-flex">
              <Button><Plus className="h-3.5 w-3.5" /> New code</Button>
            </Link>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                Icon={Ticket}
                title="No codes match"
                description="Try a different filter or clear the search."
                action={<Button variant="outline" onClick={() => { setQuery(""); setFilter("all") }}>Clear filters</Button>}
              />
            </CardContent>
          </Card>
        ) : isMobile ? (
          <ul className="flex flex-col gap-2">
            {filtered.map((d) => <DiscountCard key={d.code} discount={d} liveUrl={liveUrl} formatPrice={formatPrice} onCopy={copy} />)}
          </ul>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Code</th>
                      <th className="px-3 py-2.5 font-medium">Description</th>
                      <th className="px-3 py-2.5 font-medium">Discount</th>
                      <th className="px-3 py-2.5 font-medium">Audience</th>
                      <th className="px-3 py-2.5 text-right font-medium">Used</th>
                      <th className="px-3 py-2.5 text-right font-medium">Revenue</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Window</th>
                      <th className="px-3 py-2.5 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((d) => (
                      <tr key={d.code} className="transition-colors hover:bg-accent/30">
                        <td className="px-3 py-2.5">
                          <button onClick={() => copy(d.code, d.code)} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold tracking-wider hover:bg-accent">
                            {d.code} <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.description}</td>
                        <td className="px-3 py-2.5 text-xs font-semibold">
                          {d.kind === "percent" && `${d.value}% off`}
                          {d.kind === "flat" && `${formatPrice(d.value)} off`}
                          {d.kind === "free-shipping" && "Free shipping"}
                          {d.kind === "bogo" && `Buy 3 + ${d.value} free`}
                        </td>
                        <td className="px-3 py-2.5 text-xs">{AUDIENCE_LABEL[d.audience]}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums">{d.redeemed.toLocaleString()}{d.capTotal && <span className="text-muted-foreground">/{d.capTotal.toLocaleString()}</span>}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">{formatPrice(d.revenueDriven)}</td>
                        <td className="px-3 py-2.5"><StatusBadge tone={STATUS_TONE[d.status]} withDot>{d.status}</StatusBadge></td>
                        <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                          {d.starts === "Always-on" ? "Always-on" : `${d.starts} → ${d.ends}`}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button size="sm" variant="ghost" onClick={() => copy(`https://${liveUrl}?promo=${d.code}`, "Share link")}>
                            <Share2 className="h-3.5 w-3.5" />
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

        {/* CTAs */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { Icon: Tag,         label: "New automatic discount", body: "Triggered at checkout — no code typed.",         href: "/sales/discounts/new"  },
            { Icon: Percent,     label: "Bulk pricing tiers",     body: "Discount per quantity (5+, 10+, 20+).",          href: "/inventory/price-lists" },
            { Icon: TrendingUp,  label: "View commission payouts", body: "Reward your affiliates with code attribution.", href: "/marketing/commissions" },
          ].map((q) => (
            <Link
              key={q.label}
              to={q.href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <q.Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{q.label}</p>
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

function DiscountCard({
  discount: d,
  liveUrl,
  formatPrice,
  onCopy,
}: {
  discount: Discount
  liveUrl: string
  formatPrice: (n: number) => string
  onCopy: (val: string, label: string) => void
}) {
  return (
    <li>
      <article className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
            {d.kind === "percent"        && <Percent className="h-4 w-4" />}
            {d.kind === "flat"           && <Tag className="h-4 w-4" />}
            {d.kind === "free-shipping"  && <Gift className="h-4 w-4" />}
            {d.kind === "bogo"           && <Sparkles className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <button onClick={() => onCopy(d.code, d.code)} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold tracking-wider hover:bg-accent">
                {d.code} <Copy className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
              <StatusBadge tone={STATUS_TONE[d.status]} withDot>{d.status}</StatusBadge>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{d.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                {d.kind === "percent" && `${d.value}% off`}
                {d.kind === "flat" && `${formatPrice(d.value)} off`}
                {d.kind === "free-shipping" && "Free shipping"}
                {d.kind === "bogo" && `Buy 3 + ${d.value} free`}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{AUDIENCE_LABEL[d.audience]}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
              <span>Used <span className="font-bold tabular-nums text-foreground">{d.redeemed}</span>{d.capTotal && `/${d.capTotal}`}</span>
              <span className="text-right">Revenue <span className="font-bold tabular-nums text-foreground">{formatPrice(d.revenueDriven)}</span></span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onCopy(`https://${liveUrl}?promo=${d.code}`, "Share link")}>
                <Share2 className="h-3 w-3" /> Share
              </Button>
            </div>
          </div>
        </div>
      </article>
    </li>
  )
}

void Check; void X
