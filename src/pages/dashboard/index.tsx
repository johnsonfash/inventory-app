import * as React from "react"
import { DollarSign, Layers, Package, ShoppingCart, Sparkles } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryBreakdownChart, SalesVsPurchaseChart, StockLevelsChart } from "@/components/charts/inventory-charts"
import { TopMovers } from "@/components/top-movers"
import { TopSelling } from "@/components/top-selling"
import { KpiCarousel } from "@/components/dashboard/kpi-carousel"
import { LowStockCard } from "@/components/dashboard/low-stock-card"
import { OpenPosCard } from "@/components/dashboard/open-pos-card"
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card"
import { RecentSalesCard } from "@/components/dashboard/recent-sales-card"
import { SectionHeader } from "@/components/dashboard/section-header"
import { InsightCard } from "@/components/insights/insight-card"
import { ForecastCard } from "@/components/insights/forecast-card"
import { StorefrontSnapshot } from "@/components/dashboard/storefront-snapshot"
import { RestockCard } from "@/components/insights/restock-card"
import { ActivityFeedCard } from "@/components/insights/activity-feed"
import { InfoTooltip } from "@/components/info-tooltip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { generateInsights } from "@/lib/insights/engine"
import { GettingStarted } from "@/components/onboarding/getting-started"
import { FirstRunModal } from "@/components/onboarding/first-run-modal"
import { useCurrency } from "@/contexts/currency"
import { useTerm } from "@/hooks/use-industry"

// Spark series — tiny mock data per KPI. Replace with real series
// from the analytics endpoint once the backend lands.
const sparkRevenue = [
  { x: "M", y: 220 }, { x: "T", y: 280 }, { x: "W", y: 240 },
  { x: "T", y: 310 }, { x: "F", y: 380 }, { x: "S", y: 350 }, { x: "S", y: 420 },
]
const sparkUnits = [
  { x: "M", y: 14 }, { x: "T", y: 22 }, { x: "W", y: 18 },
  { x: "T", y: 24 }, { x: "F", y: 31 }, { x: "S", y: 28 }, { x: "S", y: 36 },
]
const sparkOrders = [
  { x: "M", y: 8 }, { x: "T", y: 12 }, { x: "W", y: 10 },
  { x: "T", y: 14 }, { x: "F", y: 16 }, { x: "S", y: 13 }, { x: "S", y: 19 },
]
const sparkOOS = [
  { x: "M", y: 18 }, { x: "T", y: 16 }, { x: "W", y: 19 },
  { x: "T", y: 15 }, { x: "F", y: 14 }, { x: "S", y: 13 }, { x: "S", y: 12 },
]

export default function Dashboard() {
  // Hook pull-to-refresh on mobile. Refresh on dashboard is a no-op for
  // now (dummy data); when real queries are wired this will call their
  // invalidate function.
  useRegisterPageRefresh(
    React.useCallback(async () => {
      await new Promise((r) => setTimeout(r, 500))
    }, []),
  )

  const insights = React.useMemo(() => generateInsights().slice(0, 6), [])
  const { formatPrice } = useCurrency()
  // Industry vocab so the KPI strip reads naturally for the active
  // business — "Open checks" for a restaurant, "Open work orders"
  // for an auto shop, "Open orders" elsewhere.
  const salePluralRaw = useTerm("sale.plural", "orders")
  const salePlural = salePluralRaw.charAt(0).toUpperCase() + salePluralRaw.slice(1)
  const inventoryWord = useTerm("inventory", "Inventory").toLowerCase()

  return (
    <PageShell
      title="Dashboard"
      withToolbar
      titleTooltip={
        <>
          The cockpit. Every metric, alert, restock suggestion, and
          AI insight Pallio surfaces for the day. Numbers update
          live as sales clear and stock moves. Customise the order +
          which tiles show via Preferences.
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* First-run welcome — shows once for brand-new accounts.
            Self-dismisses after the user clicks through or skips. */}
        <FirstRunModal />

        {/* Getting Started — milestone checklist. Hides itself once
            every step is done OR the user clicks "Hide this".
            Survives reinstalls on native via the kv mirror. */}
        <GettingStarted />

        {/* Welcome / period summary */}
        <div
          data-tour="hero"
          className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-emerald-50/50 p-5 dark:from-primary/10 dark:via-card dark:to-emerald-950/15"
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/20 blur-3xl dark:bg-primary/20" aria-hidden />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-brand dark:text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Today
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">
                Sales are <span className="text-brand dark:text-primary">trending up</span> 12%
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatPrice(2_840_000)} in revenue across 36 orders so far · vs. {formatPrice(2_535_000)} yesterday
              </p>
            </div>
            <div className="flex items-center gap-3 text-right tabular-nums">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Today</div>
                <div className="text-lg font-bold">{formatPrice(2_840_000)}</div>
              </div>
              <div className="h-8 w-px bg-border" aria-hidden />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">MTD</div>
                <div className="text-lg font-bold">{formatPrice(54_210_000)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights — Pallio's "what to pay attention to" strip.
            Mobile: horizontal snap-scroll. Desktop: 3-col grid. */}
        <section className="flex flex-col gap-3" data-tour="insights">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-base font-semibold tracking-tight md:text-lg">Pallio noticed</h3>
              <InfoTooltip label="AI Insights" size="xs">
                Rule-based + ML-style observations Pallio surfaces from
                your live data — low stock with sales velocity,
                margin drift, ROAS swings, vendor lateness, anomalies.
                Each card has a one-tap action to address it.
              </InfoTooltip>
            </div>
            <span className="text-[11px] text-muted-foreground">{insights.length} new</span>
          </div>
          <div
            className={
              // Mobile: -mx negative to bleed edge-to-edge then padded
              // inside; snap-x for one-card-at-a-time swiping.
              "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide " +
              // Desktop: grid, no swipe.
              "md:mx-0 md:grid md:snap-none md:overflow-visible md:px-0 md:pb-0 md:[grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]"
            }
          >
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </section>

        {/* KPI carousel — snap-scroll on mobile, 4-col grid on md+. */}
        <div data-tour="kpis">
          <KpiCarousel
            items={[
              {
                title: "Revenue (7d)",
                value: formatPrice(18_420_000),
                delta: "+12.4%",
                trend: "up",
                caption: "vs last week",
                Icon: DollarSign,
                tone: "violet",
                data: sparkRevenue,
                tooltip: "Total money taken in over the last 7 days from every channel — POS, online, wholesale. Excludes refunds. Comparison is against the previous 7-day window.",
              },
              {
                title: `Units in ${inventoryWord}`,
                value: "15,940",
                delta: "+1.1%",
                trend: "up",
                caption: "across 4 locations",
                Icon: Layers,
                tone: "emerald",
                data: sparkUnits,
                tooltip: `Total quantity on hand across every location. Counts each physical unit once — a unit in Lekki and a unit in Ikeja both count toward this total.`,
              },
              {
                title: `Open ${salePlural.toLowerCase()}`,
                value: "87",
                delta: "+5.6%",
                trend: "up",
                caption: "pending fulfilment",
                Icon: ShoppingCart,
                tone: "sky",
                data: sparkOrders,
                tooltip: `${salePlural} that have been paid for but not yet shipped + delivered. Watch this — high or growing means fulfilment is bottlenecked.`,
              },
              {
                title: "Out of stock",
                value: "12",
                delta: "−4 SKUs",
                trend: "down",
                caption: "improving",
                Icon: Package,
                tone: "rose",
                data: sparkOOS,
                tooltip: "SKUs that are sitting at zero on-hand right now. Each one is a lost sale waiting to happen — clear them by raising a purchase order from the Restock card below.",
              },
            ]}
          />
        </div>

        {/* Storefront pulse — 24h revenue / visitors / orders /
            conversion from the hosted shop. Falls back to a "launch"
            CTA when no template is active. */}
        <StorefrontSnapshot />

        {/* Forecast + Restock — paired on desktop, stacked on mobile. */}
        <section className="grid gap-4 lg:grid-cols-2" data-tour="forecast">
          <ForecastCard />
          <RestockCard />
        </section>

        {/* Charts row */}
        <section className="flex flex-col gap-4">
          <SectionHeader title="Performance" subtitle="Stock movement and sales mix" />

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <CardTitle className="text-base">Stock vs Sold</CardTitle>
                    <InfoTooltip label="Stock vs Sold" size="xs">
                      Tracks how much you held vs how much you sold each
                      month. A widening gap means inventory is growing
                      faster than demand — review reorder points.
                    </InfoTooltip>
                  </div>
                  <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-1)" }} /> Stock
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-2)" }} /> Sold
                    </span>
                  </div>
                </div>
                <CardDescription>Last 6 months</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <StockLevelsChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-baseline gap-1.5">
                  <CardTitle className="text-base">Category mix</CardTitle>
                  <InfoTooltip label="Category mix" size="xs">
                    Revenue share by product category over the current
                    period. Use this to spot dependence on a single
                    category — Pallio flags it as a risk if any single
                    category exceeds 60%.
                  </InfoTooltip>
                </div>
                <CardDescription>Share by category</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <CategoryBreakdownChart />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <CardTitle className="text-base">Sales vs Purchases</CardTitle>
                  <InfoTooltip label="Sales vs Purchases" size="xs">
                    Cash in (sales) vs cash out for inventory (purchases)
                    by week. A healthy retail business runs purchases ~10‑20%
                    below sales — wider negative gaps starve cash; wider
                    positive gaps mean you're stocking ahead of demand.
                  </InfoTooltip>
                </div>
                <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-1)" }} /> Sales
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-2)" }} /> Purchases
                  </span>
                </div>
              </div>
              <CardDescription>Weekly movement</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <SalesVsPurchaseChart />
            </CardContent>
          </Card>
        </section>

        {/* Operations row */}
        <section className="flex flex-col gap-4" data-tour="ops">
          <SectionHeader title="Operations" subtitle="What needs attention right now" />
          <div className="grid gap-4 lg:grid-cols-3">
            <LowStockCard />
            <OpenPosCard />
            <RecentSalesCard />
          </div>
        </section>

        {/* Activity + side cards row */}
        <section className="flex flex-col gap-4">
          <SectionHeader title="Live activity" subtitle="What's happening right now" />
          <div className="grid gap-4 lg:grid-cols-3">
            <ActivityFeedCard className="lg:col-span-2" />
            <div className="flex flex-col gap-4">
              <QuickActionsCard />
              <TopMovers />
            </div>
          </div>
        </section>

        {/* Best sellers row */}
        <section className="flex flex-col gap-4">
          <SectionHeader title="Best sellers" />
          <TopSelling />
        </section>
      </div>
    </PageShell>
  )
}
