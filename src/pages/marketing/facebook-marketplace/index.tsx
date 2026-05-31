import * as React from "react"
import { Link } from "react-router-dom"
import { Eye, MessageCircle, Plus, ShoppingBag } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { ChartTooltipContent } from "@/components/ui/chart"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { ChartCard } from "@/components/reports/chart-card"
import { useCurrency } from "@/contexts/currency"

type Listing = {
  id: string
  title: string
  price: number
  views: number
  msgs: number
  status: "active" | "paused" | "sold"
}

const listings: Listing[] = [
  { id: "MK-101", title: "USB‑C Hub 6‑in‑1", price: 39.99, views: 2400, msgs: 35, status: "active" },
  { id: "MK-102", title: "Wireless Mouse", price: 24.0, views: 1800, msgs: 22, status: "active" },
  { id: "MK-103", title: "4K HDMI Cable", price: 12.5, views: 900, msgs: 6, status: "paused" },
  { id: "MK-104", title: "Hydrating Serum (8oz)", price: 28.0, views: 1320, msgs: 18, status: "active" },
  { id: "MK-105", title: "Ceramic Mug (set of 4)", price: 32.0, views: 660, msgs: 9, status: "sold" },
]

const trend = [
  { day: "Mon", impressions: 7200, clicks: 260 },
  { day: "Tue", impressions: 8600, clicks: 300 },
  { day: "Wed", impressions: 9100, clicks: 315 },
  { day: "Thu", impressions: 10500, clicks: 370 },
  { day: "Fri", impressions: 12000, clicks: 420 },
  { day: "Sat", impressions: 9800, clicks: 340 },
  { day: "Sun", impressions: 8100, clicks: 290 },
]

const axisProps = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const

const statusTone: Record<Listing["status"], StatusTone> = {
  active: "success",
  paused: "warning",
  sold: "neutral",
}

export default function FacebookMarketplace() {
  const { formatPrice } = useCurrency()
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const totalViews = listings.reduce((s, l) => s + l.views, 0)
  const totalMsgs = listings.reduce((s, l) => s + l.msgs, 0)
  const activeCount = listings.filter((l) => l.status === "active").length
  const soldCount = listings.filter((l) => l.status === "sold").length

  return (
    <PageShell
      title="Facebook Marketplace"
      withToolbar
      titleTooltip={
        <>
          Free local listings on Facebook. Unlike paid Ads, Marketplace
          works on barter-style discovery — buyers browse and message
          you directly. Best for high-margin unique items (vintage,
          handmade, one-off bundles) where photo + caption do the
          selling.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-card p-5 dark:from-primary/10">
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">Marketplace listings</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Auto-publish Pallio products to Facebook Marketplace.
                </p>
              </div>
            </div>
            <Link to="/marketing/listings/new">
              <Button>
                <Plus className="h-4 w-4" /> New listing
              </Button>
            </Link>
          </div>
        </div>

        {/* Underlying integration */}
        <ConnectionCard
          providerId="facebook-marketplace"
          reason="Cross-posts your products to Facebook Marketplace classifieds — buyer messages route into Pallio Comms."
        />

        <SummaryStrip
          tiles={[
            { label: "Active listings", value: String(activeCount), tone: "success", hint: "published" },
            { label: "Views (7d)", value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : String(totalViews), tone: "brand", hint: "impressions" },
            { label: "Messages", value: String(totalMsgs), tone: "info", hint: "from buyers" },
            { label: "Sold", value: String(soldCount), tone: "warning", hint: "this period" },
          ]}
        />

        <ChartCard
          title="Impressions vs clicks"
          description="Last 7 days"
          legend={[
            { label: "Impressions", tone: "var(--chart-1)" },
            { label: "Clicks", tone: "var(--chart-2)" },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="clkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<ChartTooltipContent labelKey="day" />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="impressions" stroke="var(--chart-1)" strokeWidth={2} fill="url(#impGrad)" />
              <Area type="monotone" dataKey="clicks" stroke="var(--chart-2)" strokeWidth={2} fill="url(#clkGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold tracking-tight md:text-lg">Listings</h3>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 border-b border-border bg-muted/40 px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground md:grid">
              <span>Listing</span>
              <span className="text-right">Price</span>
              <span className="text-right">Views</span>
              <span className="text-right">Messages</span>
              <span>Status</span>
            </div>
            {/* Rows are read-only — performance snapshot only. We mark
                them with cursor-default so users don't try to tap and
                wonder why nothing happens. Real edit actions live on
                Facebook itself; Pallio just mirrors the analytics. */}
            <ul className="divide-y divide-border">
              {listings.map((l) => (
                <li
                  key={l.id}
                  className="grid cursor-default items-center gap-3 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{l.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground"><span className="font-mono">{l.id}</span></p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatPrice(l.price)}</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 md:justify-end">
                    <Eye className="h-3 w-3 text-muted-foreground md:hidden" />
                    <span className="text-sm tabular-nums">{l.views.toLocaleString()}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 md:justify-end">
                    <MessageCircle className="h-3 w-3 text-muted-foreground md:hidden" />
                    <span className="text-sm tabular-nums">{l.msgs}</span>
                  </div>
                  <div>
                    <StatusBadge tone={statusTone[l.status]} withDot>
                      {l.status}
                    </StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
