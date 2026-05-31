import * as React from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  Calculator,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  Flame,
  HandCoins,
  LineChart,
  Package,
  PackageMinus,
  PackagePlus,
  PiggyBank,
  Receipt,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { PageShell } from "@/components/page-shell"
import { cn } from "@/lib/utils"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { formatPriceFor, formatPriceCompact } from "@/contexts/currency"

type ReportCard = {
  href: string
  title: string
  description: string
  metric: string
  delta?: string
  trend?: "up" | "down"
  Icon: LucideIcon
  tone: "violet" | "emerald" | "amber" | "rose" | "sky" | "fuchsia"
  spark?: number[]
}

const TONES = {
  violet: { ring: "ring-brand/20", iconBg: "bg-brand-soft dark:bg-primary/15", iconFg: "text-brand dark:text-primary", stroke: "var(--chart-1)" },
  emerald: { ring: "ring-emerald-500/20", iconBg: "bg-emerald-50 dark:bg-emerald-500/10", iconFg: "text-emerald-600 dark:text-emerald-300", stroke: "var(--chart-2)" },
  amber: { ring: "ring-amber-500/20", iconBg: "bg-amber-50 dark:bg-amber-500/10", iconFg: "text-amber-600 dark:text-amber-300", stroke: "var(--chart-3)" },
  rose: { ring: "ring-rose-500/20", iconBg: "bg-rose-50 dark:bg-rose-500/10", iconFg: "text-rose-600 dark:text-rose-300", stroke: "var(--chart-4)" },
  sky: { ring: "ring-sky-500/20", iconBg: "bg-sky-50 dark:bg-sky-500/10", iconFg: "text-sky-600 dark:text-sky-300", stroke: "var(--chart-5)" },
  fuchsia: { ring: "ring-fuchsia-500/20", iconBg: "bg-fuchsia-50 dark:bg-fuchsia-500/10", iconFg: "text-fuchsia-600 dark:text-fuchsia-300", stroke: "var(--chart-6)" },
} as const

const GROUPS: { title: string; description: string; cards: ReportCard[] }[] = [
  {
    title: "Sales",
    description: "Revenue, profitability, and trending products",
    cards: [
      { href: "/reporting/profit-loss", title: "Profit & Loss", description: "Net profit trend by period", metric: formatPriceFor(33400), delta: "+12%", trend: "up", Icon: LineChart, tone: "violet", spark: [22, 28, 24, 31, 36, 38, 42] },
      { href: "/reporting/purchase-sale", title: "Purchase & Sale", description: "Inflow vs outflow comparison", metric: `${formatPriceCompact(54000)} / ${formatPriceCompact(38000)}`, delta: "+8%", trend: "up", Icon: BarChart3, tone: "emerald", spark: [18, 21, 19, 24, 27, 28, 32] },
      { href: "/reporting/trending-product", title: "Trending Products", description: "Best-sellers this period", metric: "USB-C Hub", delta: "+42%", trend: "up", Icon: Flame, tone: "amber", spark: [10, 14, 17, 22, 26, 30, 36] },
      { href: "/reporting/product-sell", title: "Product Sell", description: "Per-product sales breakdown", metric: "1,284 SKUs", Icon: Trophy, tone: "fuchsia", spark: [12, 14, 13, 16, 18, 17, 20] },
      { href: "/reporting/sales-representatives", title: "Sales Reps", description: "Team performance ranking", metric: `Mia · ${formatPriceCompact(12400)}`, delta: "+18%", trend: "up", Icon: Users, tone: "sky", spark: [8, 10, 9, 13, 14, 16, 17] },
      { href: "/reporting/sell-payment", title: "Sell Payment", description: "Payment collection status", metric: formatPriceCompact(48200), Icon: HandCoins, tone: "emerald", spark: [22, 24, 22, 26, 27, 28, 30] },
    ],
  },
  {
    title: "Inventory",
    description: "Stock health, expiry, and item movement",
    cards: [
      { href: "/reporting/stock", title: "Stock", description: "On-hand and value by item", metric: formatPriceCompact(182000), delta: "+1.1%", trend: "up", Icon: Boxes, tone: "violet", spark: [42, 44, 43, 46, 47, 49, 50] },
      { href: "/reporting/reorder", title: "Reorder", description: "What to buy today, grouped by supplier", metric: "12 items", delta: "+3", trend: "up", Icon: PackagePlus, tone: "amber", spark: [6, 7, 8, 9, 10, 11, 12] },
      { href: "/reporting/stock-expiry", title: "Stock Expiry", description: "Items expiring soon", metric: "14 items", delta: "−3", trend: "down", Icon: PackageMinus, tone: "rose", spark: [22, 20, 19, 17, 16, 15, 14] },
      { href: "/reporting/stock-adjustment", title: "Stock Adjustments", description: "Manual reconciliations", metric: "23 entries", Icon: Package, tone: "amber", spark: [3, 5, 4, 6, 5, 7, 6] },
      { href: "/reporting/item", title: "Items", description: "Per-item full statistics", metric: "1,284 SKUs", Icon: ClipboardList, tone: "sky", spark: [12, 13, 13, 14, 15, 15, 16] },
      { href: "/reporting/product-purchase", title: "Product Purchase", description: "Item-level inbound history", metric: formatPriceCompact(54000), Icon: Receipt, tone: "fuchsia", spark: [18, 17, 19, 22, 23, 25, 27] },
    ],
  },
  {
    title: "Operations",
    description: "Customers, taxes, registers, and activity",
    cards: [
      { href: "/reporting/customer-group", title: "Customer Group", description: "Aggregated buyer segments", metric: "8 groups", Icon: Users, tone: "violet", spark: [4, 5, 5, 6, 7, 7, 8] },
      { href: "/reporting/supplier-customer", title: "Supplier & Customer", description: "Two-sided ledger", metric: `${formatPriceCompact(92000)} / ${formatPriceCompact(54000)}`, Icon: Wallet, tone: "emerald", spark: [22, 24, 25, 27, 28, 30, 32] },
      { href: "/reporting/tax", title: "Tax", description: "Collected vs payable breakdown", metric: formatPriceFor(8420), delta: "+6%", trend: "up", Icon: Calculator, tone: "amber", spark: [6, 6.5, 7, 7.4, 7.8, 8.1, 8.4] },
      { href: "/reporting/expense", title: "Expenses", description: "Operating cost breakdown", metric: formatPriceCompact(12600), delta: "−4%", trend: "down", Icon: PiggyBank, tone: "rose", spark: [15, 14, 14, 13, 13, 12, 12] },
      { href: "/reporting/purchase-payment", title: "Purchase Payment", description: "Vendor payment status", metric: formatPriceCompact(28400), Icon: CreditCard, tone: "sky", spark: [10, 12, 13, 14, 15, 16, 17] },
      { href: "/reporting/register", title: "Register", description: "Cash register sessions", metric: "12 sessions", Icon: DollarSign, tone: "emerald", spark: [3, 4, 3, 5, 4, 5, 6] },
      { href: "/reporting/activity-log", title: "Activity Log", description: "Audit trail of user actions", metric: "284 events", Icon: Activity, tone: "fuchsia", spark: [22, 26, 30, 34, 36, 40, 42] },
    ],
  },
]

export default function Reporting() {
  useRegisterPageRefresh(
    React.useCallback(async () => {
      await new Promise((r) => setTimeout(r, 400))
    }, []),
  )

  return (
    <PageShell
      title="Reports"
      withToolbar={false}
      titleTooltip={
        <>
          Every analytical view Pallio offers — sales, stock, tax,
          payments, vendors, team performance, customer groups,
          activity log. Each one is exportable as CSV / PDF and
          period-comparable. Use this index to bookmark the reports
          you check most.
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-emerald-50/50 p-5 dark:from-primary/10 dark:via-card dark:to-emerald-950/15">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/20 blur-3xl dark:bg-primary/20" aria-hidden />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-brand dark:text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Reports
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">
                {GROUPS.reduce((s, g) => s + g.cards.length, 0)} reports across {GROUPS.length} domains
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Each report supports period filters and CSV / PDF export.
              </p>
            </div>
            <Link
              to="/reporting/profit-loss"
              className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:opacity-95 dark:bg-primary dark:text-primary-foreground"
            >
              Open P&L <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {GROUPS.map((g) => (
          <section key={g.title} className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight md:text-lg">{g.title}</h3>
                <p className="text-xs text-muted-foreground md:text-sm">{g.description}</p>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{g.cards.length} reports</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.cards.map((c, i) => (
                <ReportCardItem key={c.href} card={c} index={i} />
              ))}
            </div>
          </section>
        ))}

        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Need a custom report?</p>
            <p className="text-[11px] text-muted-foreground">
              Use the AI assistant to draft a one-off query, or export any report to CSV and slice it your way.
            </p>
          </div>
          <Link
            to="/ai"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Ask Pallio AI <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

function ReportCardItem({ card, index }: { card: ReportCard; index: number }) {
  const t = TONES[card.tone]
  const Icon = card.Icon
  const id = React.useId()
  const sparkData = (card.spark ?? []).map((y, i) => ({ x: i, y }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 240, delay: index * 0.02 }}
    >
      <Link
        to={card.href}
        className={cn(
          "group block overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all",
          "hover:border-transparent hover:shadow-md hover:ring-2",
          t.ring,
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t.iconBg, t.iconFg)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{card.title}</p>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{card.description}</p>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-bold tabular-nums leading-none">{card.metric}</p>
            {card.delta && (
              <p
                className={cn(
                  "mt-1 text-[11px] font-medium tabular-nums",
                  card.trend === "down" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {card.delta} <span className="text-muted-foreground">vs last period</span>
              </p>
            )}
          </div>
          {sparkData.length > 1 && (
            <div className="h-9 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={t.stroke} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={t.stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="y"
                    stroke={t.stroke}
                    strokeWidth={1.6}
                    fill={`url(#sp-${id})`}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
