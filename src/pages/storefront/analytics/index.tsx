import * as React from "react"
import { Link } from "react-router-dom"
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Download,
  Eye,
  Globe,
  Layers,
  MousePointerClick,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { EmptyState } from "@/components/lists/empty-state"
import { toast } from "sonner"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { getStorefrontState, TEMPLATES_BY_ID } from "@/lib/storefront/data"
import { cn } from "@/lib/utils"

// Storefront analytics. Mock data with realistic shapes so the charts
// look alive. Real backend will swap the source — every shape here
// maps to a single endpoint per chart.

type Period = "7d" | "30d" | "90d"

// 30-day daily series for the hero chart.
function makeRevenueSeries(period: Period) {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
  const out: { day: string; revenue: number; visitors: number; orders: number }[] = []
  let rev = 220_000
  let vis = 480
  for (let i = days; i > 0; i--) {
    rev = Math.max(80_000, Math.round(rev + (Math.sin(i * 0.7) * 30_000) + (i % 7 === 0 ? 50_000 : 0) - 12_000 + Math.random() * 24_000))
    vis = Math.max(150, Math.round(vis + (Math.sin(i * 0.5) * 60) + (i % 7 === 0 ? 80 : 0) + Math.random() * 30))
    const orders = Math.round(vis * (0.045 + Math.random() * 0.02))
    out.push({
      day: new Date(Date.now() - i * 86_400_000).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
      revenue: rev,
      visitors: vis,
      orders,
    })
  }
  return out
}

const TRAFFIC_SOURCES = [
  { source: "Direct",       sessions: 5_840, share: 38, trend: "+12%", tone: "brand" as const },
  { source: "Instagram",    sessions: 3_120, share: 20, trend: "+24%", tone: "info" as const },
  { source: "Google search",sessions: 2_410, share: 16, trend: "+6%",  tone: "success" as const },
  { source: "Facebook",     sessions: 1_540, share: 10, trend: "-3%",  tone: "warning" as const },
  { source: "WhatsApp",     sessions: 1_120, share:  7, trend: "+18%", tone: "info" as const },
  { source: "TikTok",       sessions:    920, share:  6, trend: "+42%", tone: "brand" as const },
  { source: "Other",        sessions:    410, share:  3, trend: "—",   tone: "neutral" as const },
]

const DEVICE_SPLIT = [
  { device: "Mobile",  pct: 78 },
  { device: "Desktop", pct: 17 },
  { device: "Tablet",  pct: 5 },
]

const TOP_PRODUCTS = [
  { sku: "AP-4012", name: "Cotton Tee — Black",     units: 142, revenue:  528_000, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=120&h=120&fit=crop&auto=format&q=80" },
  { sku: "BT-9091", name: "Hydrating Serum",        units:  98, revenue:  392_000, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=120&h=120&fit=crop&auto=format&q=80" },
  { sku: "EL-2109", name: "USB-C Hub 6-in-1",       units:  74, revenue:  364_000, image: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=120&h=120&fit=crop&auto=format&q=80" },
  { sku: "HM-2205", name: "Ceramic Mug 12oz",       units: 156, revenue:  234_000, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=120&h=120&fit=crop&auto=format&q=80" },
  { sku: "EL-1001", name: "Wireless Mouse",         units:  62, revenue:  186_000, image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=120&h=120&fit=crop&auto=format&q=80" },
]

const FUNNEL = [
  { step: "Visited",        count: 15_360, pct: 100,  drop: 0 },
  { step: "Viewed product", count:  9_840, pct: 64.1, drop: 35.9 },
  { step: "Added to cart",  count:  3_280, pct: 21.4, drop: 42.7 },
  { step: "Reached checkout", count: 1_620, pct: 10.5, drop: 50.6 },
  { step: "Purchased",      count:    988, pct:  6.4, drop: 39.0 },
]

export default function StorefrontAnalytics() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))
  const { formatPrice, formatCompact } = useCurrency()
  const [period, setPeriod] = React.useState<Period>("30d")
  const state = React.useMemo(() => getStorefrontState(), [])
  const template = state.templateId ? TEMPLATES_BY_ID[state.templateId] : null
  const revenueSeries = React.useMemo(() => makeRevenueSeries(period), [period])

  // Aggregates from the series
  const totalRevenue = revenueSeries.reduce((s, d) => s + d.revenue, 0)
  const totalVisitors = revenueSeries.reduce((s, d) => s + d.visitors, 0)
  const totalOrders = revenueSeries.reduce((s, d) => s + d.orders, 0)
  const conversion = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Build CSV from the live series + aggregates. Browser-only download
  // via a Blob + anchor click — no backend round-trip needed.
  const exportCsv = React.useCallback(() => {
    try {
      const escape = (v: string | number) => {
        const s = String(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }
      const rows: string[] = []
      rows.push(["day", "visitors", "orders", "revenue"].join(","))
      for (const d of revenueSeries) {
        rows.push([escape(d.day), d.visitors, d.orders, d.revenue].join(","))
      }
      rows.push("")
      rows.push(["metric", "value"].join(","))
      rows.push(["total_visitors", totalVisitors].join(","))
      rows.push(["total_orders", totalOrders].join(","))
      rows.push(["total_revenue", totalRevenue].join(","))
      rows.push(["conversion_pct", conversion.toFixed(2)].join(","))
      rows.push(["avg_order_value", Math.round(aov)].join(","))
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `storefront-analytics-${period}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("Analytics CSV downloaded.")
    } catch {
      toast.error("Couldn't export CSV.")
    }
  }, [revenueSeries, totalVisitors, totalOrders, totalRevenue, conversion, aov, period])

  // No-template short-circuit so the page degrades gracefully.
  if (!template) {
    return (
      <PageShell
        title="Storefront analytics"
        withToolbar={false}
        titleTooltip={
          <>
            Visitor traffic, conversion funnel, top products, revenue
            trend — every metric Pallio captures from your hosted
            storefront. Available once you pick a template + publish.
          </>
        }
      >
        <Card>
          <CardContent className="p-0">
            <EmptyState
              Icon={Globe}
              title="No storefront yet"
              description="Pick a template to start collecting analytics."
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
      title="Storefront analytics"
      withToolbar={false}
      titleTooltip={
        <>
          Visitor traffic, conversion funnel, top products, revenue
          trend — every metric Pallio captures from your hosted
          storefront. Filter by 7 / 30 / 90 days. Export as CSV for
          your accountant.
        </>
      }
      mobileTrailing={
        <Button size="sm" variant="ghost" onClick={exportCsv} aria-label="Export CSV">
          <Download className="h-3.5 w-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Hero strip — domain, template, live status */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-brand/25 via-fuchsia-500/15 to-transparent blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: template.colors.primary }}
              >
                <Globe className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-bold tracking-tight md:text-lg">{state.brand.businessName}</h2>
                  <StatusBadge tone={state.published ? "success" : "neutral"} withDot>
                    {state.published ? "live" : "paused"}
                  </StatusBadge>
                </div>
                <a
                  href={`https://${liveUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-muted-foreground hover:text-brand dark:hover:text-primary"
                >
                  {liveUrl}
                </a>
              </div>
            </div>
            {/* Period chips */}
            <div className="flex gap-1 rounded-full border border-border bg-background p-0.5">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                    period === p
                      ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* KPI tiles */}
        <SummaryStrip
          tiles={[
            { label: "Visitors",     value: formatCompact(totalVisitors),     tone: "brand",   hint: `${revenueSeries.length} days` },
            { label: "Revenue",      value: formatPrice(Math.round(totalRevenue)), tone: "success", hint: "gross" },
            { label: "Orders",       value: String(totalOrders),               tone: "info",    hint: "completed checkouts" },
            { label: "Conversion",   value: `${conversion.toFixed(2)}%`,       tone: conversion >= 4 ? "success" : "warning", hint: "visitor → buyer" },
          ]}
        />

        {/* Revenue chart */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold md:text-base">Revenue + orders</h3>
                <p className="text-[11px] text-muted-foreground">
                  Average order value <strong className="font-bold tabular-nums text-foreground">{formatPrice(Math.round(aov))}</strong> · {period === "7d" ? "Past 7 days" : period === "30d" ? "Past 30 days" : "Past 90 days"}
                </p>
              </div>
              <StatusBadge tone="success" withDot>+18.4% wow</StatusBadge>
            </div>

            <div className="mt-4 h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompact(v as number)}
                    width={48}
                  />
                  <RTooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name) => name === "revenue" ? formatPrice(value) : value}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2.2} fill="url(#rev-grad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Two-col: Funnel + Traffic sources */}
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-sm font-semibold md:text-base">Conversion funnel</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">Each step shows where shoppers drop off. Biggest opportunity: the step with the largest red bar.</p>
              <ul className="mt-3 space-y-2.5">
                {FUNNEL.map((f, i) => (
                  <li key={f.step} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                      <span className="text-[10px] uppercase">Step</span>
                      <span className="text-xs font-bold leading-tight">{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{f.step}</p>
                        <p className="shrink-0 text-xs font-bold tabular-nums">{f.count.toLocaleString()} <span className="text-muted-foreground">· {f.pct.toFixed(1)}%</span></p>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand via-fuchsia-500 to-emerald-500"
                          style={{ width: `${f.pct}%` }}
                        />
                      </div>
                      {f.drop > 0 && (
                        <p className="mt-0.5 text-[10px] text-rose-600 dark:text-rose-400">
                          ↘ {f.drop.toFixed(1)}% dropped from previous step
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground">Pallio AI noticed</p>
                <p className="mt-1">Cart → Checkout has the biggest leak (50.6%). Try removing the email-required field from the cart page — shoppers who haven't decided yet hate giving an email upfront.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold md:text-base">Traffic by source</h3>
              <p className="text-[11px] text-muted-foreground">Where the {totalVisitors.toLocaleString()} visitors came from.</p>
              <ul className="mt-3 space-y-2">
                {TRAFFIC_SOURCES.map((t) => (
                  <li key={t.source} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{t.source}</p>
                        <p className="shrink-0 font-mono text-[11px] tabular-nums">
                          {t.sessions.toLocaleString()} <span className="text-muted-foreground">· {t.share}%</span>
                        </p>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            t.tone === "brand"   && "bg-brand",
                            t.tone === "info"    && "bg-sky-500",
                            t.tone === "success" && "bg-emerald-500",
                            t.tone === "warning" && "bg-amber-500",
                            t.tone === "neutral" && "bg-muted-foreground/40",
                          )}
                          style={{ width: `${t.share}%` }}
                        />
                      </div>
                    </div>
                    <span className={cn(
                      "shrink-0 text-[10px] font-bold tabular-nums",
                      t.trend.startsWith("+") && "text-emerald-700 dark:text-emerald-300",
                      t.trend.startsWith("-") && "text-rose-700 dark:text-rose-300",
                      t.trend === "—"         && "text-muted-foreground",
                    )}>
                      {t.trend}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Top products + Device split */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold md:text-base">Top products</h3>
                <Link to="/reporting/trending-product" className="text-[11px] font-semibold text-brand hover:underline dark:text-primary">
                  Full report →
                </Link>
              </div>
              <p className="text-[11px] text-muted-foreground">Ranked by storefront revenue this period.</p>
              <ul className="mt-3 space-y-2">
                {TOP_PRODUCTS.map((p, idx) => (
                  <li key={p.sku} className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">{idx + 1}</span>
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{p.sku} · {p.units} sold</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(p.revenue)}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold md:text-base">Device split</h3>
              <p className="text-[11px] text-muted-foreground">Mobile-first lives up to its name.</p>

              <div className="mt-4 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEVICE_SPLIT} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid stroke="var(--border)" strokeOpacity={0.35} horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="device" type="category" stroke="var(--muted-foreground)" fontSize={11} width={64} tickLine={false} axisLine={false} />
                    <Bar dataKey="pct" fill="var(--chart-1)" radius={[0, 4, 4, 0]} background={{ fill: "var(--muted)" }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <ul className="mt-2 space-y-1.5 text-xs">
                {DEVICE_SPLIT.map((d) => {
                  const Icon = d.device === "Mobile" ? Smartphone : d.device === "Desktop" ? Layers : Eye
                  return (
                    <li key={d.device} className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {d.device}
                      </span>
                      <span className="font-bold tabular-nums">{d.pct}%</span>
                    </li>
                  )
                })}
              </ul>

              <Link
                to="/storefront"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline dark:text-primary"
              >
                Optimise mobile layout <TrendingUp className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Cross-links */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { Icon: ShoppingBag, label: "View all orders", body: "Drill into each storefront sale.", href: "/storefront/orders" },
            { Icon: MousePointerClick, label: "Run an ad campaign", body: "Pour Marketing into your top traffic source.", href: "/marketing" },
            { Icon: Wallet, label: "Withdraw earnings", body: `${formatPrice(Math.round(totalRevenue * 0.7))} ready to pay out.`, href: "/settings/payments/withdrawals/new" },
          ].map((q) => {
            const Icon = q.Icon
            return (
              <Link
                key={q.label}
                to={q.href}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{q.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{q.body}</p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}

// Kept for the next pass when each tile gets a per-tile trend line.
void Legend; void Calendar; void ArrowDownRight
