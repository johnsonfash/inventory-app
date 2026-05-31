import * as React from "react"
import { toast } from "sonner"
import { Banknote, Building2, ClipboardList, CreditCard, Scale, TrendingUp, Wallet } from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { KpiBand } from "@/components/reports/kpi-band"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { type Period } from "@/components/reports/period-chips"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { useCurrency } from "@/contexts/currency"
import { balanceSheet, seedExampleLedger } from "@/lib/accounting/ledger"

type Line = { name: string; amount: number; sub: string }
const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0)

export default function BalanceSheet() {
  const [period, setPeriod] = React.useState<Period>("ytd")
  const { formatPrice } = useCurrency()
  const [version, setVersion] = React.useState(0)
  useRegisterPageRefresh(React.useCallback(async () => { setVersion((v) => v + 1); await new Promise((r) => setTimeout(r, 300)) }, []))

  // Real balance sheet derived from the ledger. Current-period earnings
  // sit in equity (income/expense haven't been closed). ACCT-3.
  const { assets, liabilities, equity } = React.useMemo(() => {
    seedExampleLedger()
    const bs = balanceSheet()
    return {
      assets: bs.assets.map((l): Line => ({ name: l.account.name, amount: l.amount, sub: l.account.code })),
      liabilities: bs.liabilities.map((l): Line => ({ name: l.account.name, amount: l.amount, sub: l.account.code })),
      equity: [
        ...bs.equity.map((l): Line => ({ name: l.account.name, amount: l.amount, sub: l.account.code })),
        { name: "Retained earnings (this period)", amount: bs.retainedEarningsThisPeriod, sub: "Income − expenses, not yet closed" } as Line,
      ],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const totalAssets = sum(assets)
  const totalLiab = sum(liabilities)
  const totalEquity = sum(equity)
  const totalLE = totalLiab + totalEquity
  const balanced = Math.abs(totalAssets - totalLE) < 1
  const ratio = (totalAssets / Math.max(1, totalLiab)).toFixed(2)

  const exportRows = [
    ...assets.map((a) => ({ Section: "Assets", Account: a.name, Amount: a.amount })),
    ...liabilities.map((a) => ({ Section: "Liabilities", Account: a.name, Amount: a.amount })),
    ...equity.map((a) => ({ Section: "Equity", Account: a.name, Amount: a.amount })),
  ]

  return (
    <ReportShell
      title="Balance sheet"
      description="Snapshot of assets, liabilities, and equity"
      titleTooltip={
        <>
          A photo of your business's finances on a single day.
          <ul className="mt-1.5 list-disc pl-4">
            <li><strong>Assets</strong> — what you own (cash, stock, equipment, money customers owe you).</li>
            <li><strong>Liabilities</strong> — what you owe (vendor bills, loans, tax payable).</li>
            <li><strong>Equity</strong> — what's left for the owners after subtracting liabilities from assets.</li>
          </ul>
          They always balance: <em>Assets = Liabilities + Equity</em>.
        </>
      }
      period={period}
      onPeriodChange={setPeriod}
      exportFilename={`pallio-balance-sheet-${period}`}
      exportRows={exportRows}
    >
      <KpiBand
        items={[
          { title: "Total assets", value: formatPrice(totalAssets), Icon: Wallet, tone: "violet" },
          { title: "Total liabilities", value: formatPrice(totalLiab), Icon: CreditCard, tone: "rose" },
          { title: "Total equity", value: formatPrice(totalEquity), Icon: TrendingUp, tone: "emerald" },
          { title: "Assets ÷ liab.", value: `${ratio}×`, caption: balanced ? "balanced" : "off by 1+", Icon: Scale, tone: balanced ? "emerald" : "amber" },
        ]}
      />

      {/* Accounting integrations — sync your books to QuickBooks /
          Xero / Sage so the tax-return prep stops being a December
          fire drill. */}
      <section>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold md:text-base">Bookkeeping sync</h3>
          <span className="text-[11px] text-muted-foreground">Every Pallio entry mirrors into your books in real time.</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <ConnectionCard providerId="quickbooks" reason="Most popular for Nigerian SMBs." />
          <ConnectionCard providerId="xero"        reason="Strong for African + cross-border businesses." />
          <ConnectionCard providerId="sage"        reason="Enterprise-grade for larger merchants." />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="Assets" Icon={Banknote} rows={assets} total={totalAssets} accent="emerald" formatPrice={formatPrice} />
        <Block title="Liabilities" Icon={ClipboardList} rows={liabilities} total={totalLiab} accent="rose" formatPrice={formatPrice} />
        <Block title="Equity" Icon={Building2} rows={equity} total={totalEquity} accent="violet" formatPrice={formatPrice} />

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Check</p>
          <Row label="Total assets" value={totalAssets} bold formatPrice={formatPrice} />
          <Row label="Total liabilities + equity" value={totalLE} bold formatPrice={formatPrice} />
          <div className="mt-1 rounded-xl border border-dashed border-border p-3 text-center text-sm">
            {balanced ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Balanced ✓</span>
            ) : (
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                Difference of {formatPrice(totalAssets - totalLE)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Assets = Liabilities + Equity. Any drift indicates an unposted journal entry.
          </p>
        </div>
      </div>
    </ReportShell>
  )
}

function Block({
  title,
  Icon,
  rows,
  total,
  accent,
  formatPrice,
}: {
  title: string
  Icon: React.ElementType
  rows: { name: string; amount: number; sub: string }[]
  total: number
  accent: "emerald" | "rose" | "violet"
  formatPrice: (n: number | null | undefined) => string
}) {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    violet: "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
  }[accent]
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${cls}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold md:text-base">{title}</p>
          <p className="text-[11px] text-muted-foreground">{rows.length} accounts</p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.name} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm">{r.name}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(r.sub).then(
                    () => toast.success(`Copied account code ${r.sub}`),
                    () => toast.error("Could not copy code"),
                  )
                }}
                title="Copy account code"
                aria-label={`Copy account code ${r.sub}`}
                className="truncate text-left font-mono text-[11px] text-muted-foreground hover:text-brand hover:underline dark:hover:text-primary"
              >
                {r.sub}
              </button>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(r.amount)}</p>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-3">
          <p className="text-sm font-bold">Total</p>
          <p className="text-base font-bold tabular-nums">{formatPrice(total)}</p>
        </li>
      </ul>
    </div>
  )
}

function Row({ label, value, bold, formatPrice }: { label: string; value: number; bold?: boolean; formatPrice: (n: number | null | undefined) => string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "text-sm font-semibold" : "text-xs text-muted-foreground"}>{label}</span>
      <span className={bold ? "text-base font-bold tabular-nums" : "text-sm tabular-nums"}>{formatPrice(value)}</span>
    </div>
  )
}
