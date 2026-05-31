import * as React from "react"
import { Link } from "react-router-dom"
import { ArrowDownRight, ArrowUpRight, ChevronRight, Download, FileText, TrendingDown, TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts"
import { ReportShell } from "@/components/reports/report-shell"
import { PeriodChips, type Period } from "@/components/reports/period-chips"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { balanceSheet, profitAndLoss, seedExampleLedger, trialBalance } from "@/lib/accounting/ledger"

type Row = { name: string; amount: number; sub?: string; prev?: number }

const TREND = [
  { m: "Jun",  rev: 9_840_000, exp: 7_120_000 },
  { m: "Jul",  rev: 10_240_000, exp: 7_640_000 },
  { m: "Aug",  rev: 11_180_000, exp: 8_120_000 },
  { m: "Sep",  rev: 12_420_000, exp: 8_840_000 },
  { m: "Oct",  rev: 13_240_000, exp: 9_120_000 },
  { m: "Nov",  rev: 14_120_000, exp: 9_840_000 },
  { m: "Dec",  rev: 16_840_000, exp: 11_240_000 },
  { m: "Jan",  rev: 12_640_000, exp: 9_120_000 },
  { m: "Feb",  rev: 13_440_000, exp: 9_540_000 },
  { m: "Mar",  rev: 14_280_000, exp: 9_860_000 },
  { m: "Apr",  rev: 15_120_000, exp: 10_280_000 },
  { m: "May",  rev: 15_542_000, exp: 10_980_000 },
]

const sum = (xs: Row[]) => xs.reduce((s, x) => s + x.amount, 0)
const sumPrev = (xs: Row[]) => xs.reduce((s, x) => s + (x.prev ?? 0), 0)

export default function ProfitLoss() {
  const [version, setVersion] = React.useState(0)
  useRegisterPageRefresh(React.useCallback(async () => { setVersion((v) => v + 1); await new Promise((r) => setTimeout(r, 300)) }, []))
  const { formatPrice, formatCompact } = useCurrency()
  const [period, setPeriod] = React.useState<Period>("ytd")

  // Real P&L derived from the ledger (lib/accounting/ledger). COGS is the
  // 5000 account; everything else expense is operating. ACCT-3.
  const { REVENUE, COGS, OPEX, OTHER } = React.useMemo(() => {
    seedExampleLedger()
    const pl = profitAndLoss()
    return {
      REVENUE: pl.income.map((l) => ({ name: l.account.name, amount: l.amount })) as Row[],
      COGS: pl.expense.filter((l) => l.account.code === "5000").map((l) => ({ name: l.account.name, amount: l.amount })) as Row[],
      OPEX: pl.expense.filter((l) => l.account.code !== "5000").map((l) => ({ name: l.account.name, amount: l.amount })) as Row[],
      OTHER: [] as Row[],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const revenue   = sum(REVENUE)
  const cogs      = sum(COGS)
  const opex      = sum(OPEX)
  const other     = sum(OTHER)
  const grossProfit = revenue - cogs
  const operatingProfit = grossProfit - opex
  const netProfit = operatingProfit + other

  const prevRevenue   = sumPrev(REVENUE)
  const prevCogs      = sumPrev(COGS)
  const prevOpex      = sumPrev(OPEX)
  const prevNet       = prevRevenue - prevCogs - prevOpex + sumPrev(OTHER)
  const revGrowth = prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0
  const netGrowth = prevNet ? ((netProfit - prevNet) / Math.abs(prevNet)) * 100 : 0

  const grossMargin = revenue ? (grossProfit / revenue) * 100 : 0
  const netMargin   = revenue ? (netProfit / revenue) * 100 : 0

  const exportRows = [
    ...REVENUE.map((r) => ({ section: "Revenue", line: r.name, amount: r.amount, previous: r.prev ?? null })),
    ...COGS.map((r) => ({ section: "COGS", line: r.name, amount: r.amount, previous: r.prev ?? null })),
    ...OPEX.map((r) => ({ section: "OPEX", line: r.name, amount: r.amount, previous: r.prev ?? null })),
    ...OTHER.map((r) => ({ section: "Other", line: r.name, amount: r.amount, previous: r.prev ?? null })),
  ]

  return (
    <ReportShell
      title="Profit & Loss"
      titleTooltip="Income minus costs over the chosen period. Net profit is the bottom-line cash you keep — what shareholders / the bank look at."
      exportFilename={`pallio-pnl-${period}`}
      exportRows={exportRows}
      period={period}
      onPeriodChange={setPeriod}
    >
      {/* Hero summary */}
      <section className="grid gap-3 lg:grid-cols-4">
        <Tile label="Revenue"      value={formatPrice(revenue)}        delta={revGrowth} formatPercent />
        <Tile label="Gross profit" value={formatPrice(grossProfit)}    sub={`${grossMargin.toFixed(1)}% margin`} tone="success" />
        <Tile label="Operating profit" value={formatPrice(operatingProfit)} sub={`${((operatingProfit / revenue) * 100).toFixed(1)}% margin`} tone="info" />
        <Tile label="Net profit"   value={formatPrice(netProfit)}      delta={netGrowth} formatPercent tone={netProfit > 0 ? "success" : "danger"} sub={`${netMargin.toFixed(1)}% margin`} />
      </section>

      {/* Revenue vs expenses trend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold md:text-base">Revenue vs expenses · 12 months</h3>
            <StatusBadge tone="success" withDot>profit up {revGrowth.toFixed(0)}%</StatusBadge>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v as number)} width={56} />
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => formatPrice(value)} />
                <Area type="monotone" dataKey="rev" stroke="#10b981" strokeWidth={2.2} fill="url(#rev-grad)" name="Revenue" isAnimationActive={false} />
                <Area type="monotone" dataKey="exp" stroke="#f43f5e" strokeWidth={2.2} fill="url(#exp-grad)" name="Expenses" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* P&L lines */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionTable title="Revenue"  rows={REVENUE} total={revenue}  prevTotal={prevRevenue} tone="emerald" formatPrice={formatPrice} />
        <SectionTable title="Cost of goods sold" rows={COGS} total={cogs} prevTotal={prevCogs} tone="rose" formatPrice={formatPrice} />
      </div>
      <SectionTable title="Operating expenses"  rows={OPEX}   total={opex}  prevTotal={prevOpex} tone="amber" formatPrice={formatPrice} />
      <SectionTable title="Other income / expense" rows={OTHER} total={other} tone="violet" formatPrice={formatPrice} />

      {/* Net profit waterfall */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold md:text-base">Bottom line</h3>
          <p className="text-[11px] text-muted-foreground">From revenue down to net profit.</p>
          <ul className="mt-3 divide-y divide-border text-sm">
            <Step label="Revenue"          value={revenue}        formatPrice={formatPrice} />
            <Step label="− COGS"            value={-cogs}          formatPrice={formatPrice} />
            <Step label="= Gross profit"    value={grossProfit}   bold tone="success" formatPrice={formatPrice} />
            <Step label="− OPEX"            value={-opex}          formatPrice={formatPrice} />
            <Step label="= Operating profit" value={operatingProfit} bold tone="info" formatPrice={formatPrice} />
            <Step label="+ Other items"     value={other}          formatPrice={formatPrice} />
            <Step label="= Net profit"      value={netProfit}     bold tone={netProfit >= 0 ? "success" : "danger"} formatPrice={formatPrice} />
          </ul>
        </CardContent>
      </Card>

      <ConnectionCard providerId="quickbooks" reason="Push this P&L straight into QuickBooks every month-end — no manual journal entries." />

      <div className="grid gap-2 sm:grid-cols-3">
        <Link to="/accounting/balance-sheet" className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
          <FileText className="h-4 w-4 text-brand dark:text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Balance sheet</p>
            <p className="truncate text-[11px] text-muted-foreground">Snapshot of assets + liabilities.</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
        <Link to="/accounting/cash-flow" className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
          <ArrowUpRight className="h-4 w-4 text-brand dark:text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Cash flow</p>
            <p className="truncate text-[11px] text-muted-foreground">Where the cash actually moved.</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
        <button
          type="button"
          onClick={() => downloadAccountantPack(period)}
          className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-brand/40 hover:bg-accent/40"
        >
          <Download className="h-4 w-4 text-brand dark:text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Export accountant pack</p>
            <p className="truncate text-[11px] text-muted-foreground">P&amp;L + balance sheet + trial balance as one CSV.</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </ReportShell>
  )
}

function Tile({ label, value, sub, delta, tone, formatPercent }: { label: string; value: string; sub?: string; delta?: number; tone?: "success" | "info" | "danger"; formatPercent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "info"    && "text-sky-600 dark:text-sky-300",
          tone === "danger"  && "text-rose-600 dark:text-rose-400",
        )}>{value}</p>
        {(delta != null || sub) && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            {delta != null && (
              <span className={cn("inline-flex items-center gap-0.5", delta >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPercent ? `${delta.toFixed(1)}% vs prior` : delta.toFixed(0)}
              </span>
            )}
            {sub && <span className="text-muted-foreground">· {sub}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SectionTable({ title, rows, total, prevTotal, tone, formatPrice }: { title: string; rows: Row[]; total: number; prevTotal?: number; tone: "emerald" | "rose" | "amber" | "violet"; formatPrice: (n: number) => string }) {
  const change = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : 0
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold md:text-base">{title}</h3>
          {prevTotal != null && (
            <span className={cn("text-[11px] font-semibold tabular-nums", change >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
              {change >= 0 ? "+" : ""}{change.toFixed(1)}% vs prior
            </span>
          )}
        </div>
        <ul className="mt-3 divide-y divide-border text-sm">
          {rows.map((r) => {
            const rowChange = r.prev ? ((r.amount - r.prev) / r.prev) * 100 : 0
            return (
              <li key={r.name} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{r.name}</p>
                  {r.sub && <p className="truncate text-[10px] text-muted-foreground">{r.sub}</p>}
                </div>
                <div className="flex items-baseline gap-3">
                  {r.prev != null && (
                    <span className={cn("text-[10px] tabular-nums", rowChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      {rowChange >= 0 ? "+" : ""}{rowChange.toFixed(0)}%
                    </span>
                  )}
                  <span className="font-semibold tabular-nums">{formatPrice(r.amount)}</span>
                </div>
              </li>
            )
          })}
          <li className={cn(
            "flex items-center justify-between gap-3 py-2 text-base font-bold tabular-nums",
            tone === "emerald" && "text-emerald-700 dark:text-emerald-300",
            tone === "rose"    && "text-rose-700 dark:text-rose-300",
            tone === "amber"   && "text-amber-700 dark:text-amber-300",
            tone === "violet"  && "text-violet-700 dark:text-violet-300",
          )}>
            <span>Total {title.toLowerCase()}</span>
            <span>{formatPrice(total)}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}

function Step({ label, value, bold, tone, formatPrice }: { label: string; value: number; bold?: boolean; tone?: "success" | "info" | "danger"; formatPrice: (n: number) => string }) {
  return (
    <li className={cn("flex items-center justify-between py-2", bold && "border-t border-border pt-3 mt-1")}>
      <span className={cn(bold ? "font-bold" : "text-muted-foreground")}>{label}</span>
      <span className={cn(
        "tabular-nums",
        bold ? "text-lg font-bold" : "text-sm",
        tone === "success" && "text-emerald-600 dark:text-emerald-400",
        tone === "info"    && "text-sky-600 dark:text-sky-300",
        tone === "danger"  && "text-rose-600 dark:text-rose-400",
        !tone && value < 0 && "text-rose-600 dark:text-rose-400",
      )}>{formatPrice(value)}</span>
    </li>
  )
}

void ArrowDownRight

// Concatenates the three core statements (P&L, balance sheet, trial
// balance) into a single CSV the accountant can drop into Excel.
// A real ZIP would need an extra dep — one CSV with section headers
// is the same information without the bundling overhead.
function downloadAccountantPack(period: Period) {
  seedExampleLedger()
  const pl = profitAndLoss()
  const bs = balanceSheet()
  const tb = trialBalance()

  const lines: string[] = []
  const csvCell = (v: unknown) => {
    if (v == null) return ""
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const section = (title: string) => { lines.push(""); lines.push(`# ${title}`) }
  const header = (...cols: string[]) => lines.push(cols.map(csvCell).join(","))
  const row = (...cols: (string | number)[]) => lines.push(cols.map(csvCell).join(","))

  section("Profit & Loss")
  header("Section", "Account", "Code", "Amount")
  pl.income.forEach((l) => row("Income", l.account.name, l.account.code, l.amount))
  row("Income", "Total income", "", pl.totalIncome)
  pl.expense.forEach((l) => row("Expense", l.account.name, l.account.code, l.amount))
  row("Expense", "Total expense", "", pl.totalExpense)
  row("Net", "Net profit", "", pl.netProfit)

  section("Balance Sheet")
  header("Section", "Account", "Code", "Amount")
  bs.assets.forEach((l) => row("Asset", l.account.name, l.account.code, l.amount))
  row("Asset", "Total assets", "", bs.totalAssets)
  bs.liabilities.forEach((l) => row("Liability", l.account.name, l.account.code, l.amount))
  row("Liability", "Total liabilities", "", bs.totalLiabilities)
  bs.equity.forEach((l) => row("Equity", l.account.name, l.account.code, l.amount))
  row("Equity", "Total equity", "", bs.totalEquity)

  section("Trial Balance")
  header("Code", "Account", "Type", "Debit", "Credit", "Balance")
  tb.rows.forEach((r) => row(r.account.code, r.account.name, r.account.type, r.debit, r.credit, r.balance))
  row("", "Totals", "", tb.totalDebit, tb.totalCredit, "")
  row("", `Balanced: ${tb.balanced ? "yes" : "no"}`, "", "", "", "")

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `pallio-accountant-pack-${period}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast.success("Accountant pack downloaded.")
}
