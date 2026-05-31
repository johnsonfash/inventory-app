import * as React from "react"
import { Link } from "react-router-dom"
import { ArrowDownLeft, ArrowUpRight, ChevronRight, FileText, Wallet } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts"
import { ReportShell } from "@/components/reports/report-shell"
import { PeriodChips, type Period } from "@/components/reports/period-chips"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/lists/status-badge"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type Row = { name: string; amount: number; sub?: string }

const OPERATING: Row[] = [
  { name: "Net income",                amount: 4_180_000 },
  { name: "+ Depreciation",            amount:   180_000, sub: "Non-cash" },
  { name: "+ A/R change",              amount:  -240_000, sub: "Customer payments slower" },
  { name: "+ Inventory change",        amount:  -380_000, sub: "Built stock for Q3 push" },
  { name: "+ A/P change",              amount:   320_000, sub: "Stretching payables" },
  { name: "+ Accrued expenses change", amount:    96_000 },
]
const INVESTING: Row[] = [
  { name: "POS hardware purchase",     amount:  -180_000, sub: "3 new tablets · Lekki branch" },
  { name: "Delivery van down-payment", amount:  -640_000, sub: "Mercedes Sprinter" },
  { name: "Software development",      amount:  -120_000, sub: "Custom storefront mods" },
]
const FINANCING: Row[] = [
  { name: "Loan principal received",   amount:   800_000, sub: "Sterling Bank · 24-mo" },
  { name: "Loan repayments",           amount:  -240_000, sub: "Principal + interest" },
  { name: "Owner draw",                amount:  -300_000, sub: "Distribution to founders" },
]

const TREND = [
  { m: "Jun",  inflow: 11_840_000, outflow: 9_120_000 },
  { m: "Jul",  inflow: 12_240_000, outflow: 9_640_000 },
  { m: "Aug",  inflow: 13_180_000, outflow: 9_840_000 },
  { m: "Sep",  inflow: 14_420_000, outflow: 10_840_000 },
  { m: "Oct",  inflow: 15_240_000, outflow: 11_120_000 },
  { m: "Nov",  inflow: 16_120_000, outflow: 11_540_000 },
  { m: "Dec",  inflow: 18_840_000, outflow: 13_240_000 },
  { m: "Jan",  inflow: 14_640_000, outflow: 11_120_000 },
  { m: "Feb",  inflow: 15_440_000, outflow: 11_540_000 },
  { m: "Mar",  inflow: 16_280_000, outflow: 11_860_000 },
  { m: "Apr",  inflow: 17_120_000, outflow: 12_280_000 },
  { m: "May",  inflow: 17_842_000, outflow: 12_980_000 },
]

const sum = (xs: Row[]) => xs.reduce((s, x) => s + x.amount, 0)
const fmtDelta = (n: number) => `${n >= 0 ? "+" : ""}${n.toLocaleString()}`

export default function CashFlow() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))
  const { formatPrice, formatCompact } = useCurrency()
  const [period, setPeriod] = React.useState<Period>("ytd")

  const operating = sum(OPERATING)
  const investing = sum(INVESTING)
  const financing = sum(FINANCING)
  const net       = operating + investing + financing

  const openingCash = 6_240_000
  const closingCash = openingCash + net

  const totalInflow = TREND.reduce((s, x) => s + x.inflow, 0)
  const totalOutflow = TREND.reduce((s, x) => s + x.outflow, 0)

  const exportRows = [
    ...OPERATING.map((r) => ({ section: "Operating", line: r.name, amount: r.amount })),
    ...INVESTING.map((r) => ({ section: "Investing", line: r.name, amount: r.amount })),
    ...FINANCING.map((r) => ({ section: "Financing", line: r.name, amount: r.amount })),
  ]

  return (
    <ReportShell
      title="Cash flow"
      titleTooltip="Where money actually moved in and out — separate from profit on paper. A profitable business can still run out of cash if it's tied up in customer-owed invoices or sitting on the shelf as stock."
      exportFilename={`pallio-cash-flow-${period}`}
      exportRows={exportRows}
      period={period}
      onPeriodChange={setPeriod}
    >
      <section className="grid gap-3 lg:grid-cols-4">
        <Tile label="Net cash flow"    value={formatPrice(net)}        tone={net >= 0 ? "success" : "danger"} sub="Operating + investing + financing" />
        <Tile label="Operating"        value={formatPrice(operating)}  tone="info"  sub="from running the business" />
        <Tile label="Investing"        value={formatPrice(investing)}  tone="warning" sub="hardware + capex" />
        <Tile label="Financing"        value={formatPrice(financing)}  tone={financing >= 0 ? "success" : "neutral"} sub="loans + owner draws" />
      </section>

      {/* Inflow/outflow bars */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold md:text-base">Cash in vs cash out · 12 months</h3>
            <StatusBadge tone="success" withDot>net positive</StatusBadge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total in {formatPrice(totalInflow)} · Total out {formatPrice(totalOutflow)} · Balance {formatPrice(totalInflow - totalOutflow)}
          </p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TREND} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v as number)} width={56} />
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => formatPrice(value)} />
                <Bar dataKey="inflow" name="Cash in" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" name="Cash out" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionTable title="Operating activities" rows={OPERATING} total={operating} tone="info"  formatPrice={formatPrice} />
        <SectionTable title="Investing activities" rows={INVESTING} total={investing} tone="amber" formatPrice={formatPrice} />
      </div>
      <SectionTable title="Financing activities" rows={FINANCING} total={financing} tone="violet" formatPrice={formatPrice} />

      {/* Opening → Closing waterfall */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold md:text-base">Cash bridge</h3>
          <ul className="mt-3 divide-y divide-border text-sm">
            <Step label="Opening cash · Jan 1"   value={openingCash}        formatPrice={formatPrice} />
            <Step label="+ Operating"             value={operating}          formatPrice={formatPrice} />
            <Step label="+ Investing"             value={investing}          formatPrice={formatPrice} />
            <Step label="+ Financing"             value={financing}          formatPrice={formatPrice} />
            <Step label="= Closing cash · today"  value={closingCash}        bold tone="success" formatPrice={formatPrice} />
          </ul>
        </CardContent>
      </Card>

      <ConnectionCard providerId="xero" reason="Auto-export this statement to Xero every month-end." />

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { Icon: FileText, label: "Profit & Loss",  body: "Accrual income statement.",        href: "/accounting/profit-loss" },
          { Icon: Wallet,   label: "Balance sheet",  body: "Assets, liabilities, equity.",     href: "/accounting/balance-sheet" },
          { Icon: ArrowUpRight, label: "Bank Reconciliation", body: "Match Pallio to your bank statement.", href: "/accounting/reconciliation" },
        ].map((q) => (
          <Link key={q.label} to={q.href} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
            <q.Icon className="h-4 w-4 text-brand dark:text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{q.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{q.body}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </ReportShell>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "success" | "info" | "warning" | "neutral" | "danger" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "info"    && "text-sky-600 dark:text-sky-300",
          tone === "warning" && "text-amber-600 dark:text-amber-300",
          tone === "danger"  && "text-rose-600 dark:text-rose-400",
        )}>{value}</p>
        {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function SectionTable({ title, rows, total, tone, formatPrice }: { title: string; rows: Row[]; total: number; tone: "info" | "amber" | "violet"; formatPrice: (n: number) => string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold md:text-base">{title}</h3>
        <ul className="mt-3 divide-y divide-border text-sm">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate">{r.name}</p>
                {r.sub && <p className="text-[10px] text-muted-foreground">{r.sub}</p>}
              </div>
              <span className={cn("font-semibold tabular-nums", r.amount < 0 && "text-rose-600 dark:text-rose-400")}>{formatPrice(r.amount)}</span>
            </li>
          ))}
          <li className={cn(
            "flex items-center justify-between gap-3 py-2 text-base font-bold tabular-nums",
            tone === "info"   && "text-sky-700 dark:text-sky-300",
            tone === "amber"  && "text-amber-700 dark:text-amber-300",
            tone === "violet" && "text-violet-700 dark:text-violet-300",
          )}>
            <span>Net {title.toLowerCase().replace(" activities", "")}</span>
            <span>{formatPrice(total)}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}

function Step({ label, value, bold, tone, formatPrice }: { label: string; value: number; bold?: boolean; tone?: "success" | "danger"; formatPrice: (n: number) => string }) {
  return (
    <li className={cn("flex items-center justify-between py-2", bold && "border-t border-border pt-3 mt-1")}>
      <span className={cn(bold ? "font-bold" : "text-muted-foreground")}>{label}</span>
      <span className={cn(
        "tabular-nums",
        bold ? "text-lg font-bold" : "text-sm",
        tone === "success" && "text-emerald-600 dark:text-emerald-400",
        tone === "danger"  && "text-rose-600 dark:text-rose-400",
        !tone && value < 0 && "text-rose-600 dark:text-rose-400",
      )}>{formatPrice(value)}</span>
    </li>
  )
}

void ArrowDownLeft; void fmtDelta
