import * as React from "react"
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Scale, TrendingDown } from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { KpiBand } from "@/components/reports/kpi-band"
import { DataTable, type Column } from "@/components/reports/data-table"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { type Period } from "@/components/reports/period-chips"
import { mockVariance, type VarianceEntry } from "@/lib/inventory/recipes"

function tone(pct: number): StatusTone {
  const abs = Math.abs(pct)
  if (abs >= 0.20) return "danger"
  if (abs >= 0.10) return "warning"
  return "success"
}

export default function VarianceReport() {
  const [period, setPeriod] = React.useState<Period>("30d")
  const { formatPrice } = useCurrency()
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const rows: VarianceEntry[] = mockVariance()

  const negativeImpact = rows
    .filter((r) => r.variance < 0)
    .reduce((s, r) => s + (r.costImpactUsd ?? 0), 0)
  const positiveCount = rows.filter((r) => r.variance >= 0).length
  const critical = rows.filter((r) => Math.abs(r.variancePct) >= 0.20).length

  const cols: Column<VarianceEntry>[] = [
    { key: "sku", header: "SKU", render: (_, v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "name", header: "Item", primary: true },
    { key: "theoreticalQty", header: "Theoretical", align: "right", render: (r) => <span className="tabular-nums">{r.theoreticalQty}</span> },
    { key: "actualQty",      header: "Actual",      align: "right", render: (r) => <span className="tabular-nums">{r.actualQty}</span> },
    {
      key: "variance",
      header: "Variance",
      align: "right",
      render: (r) => (
        <span
          className={r.variance < 0 ? "tabular-nums font-semibold text-rose-600 dark:text-rose-400" : "tabular-nums font-semibold text-emerald-600 dark:text-emerald-400"}
          title={r.variance < 0 ? "Unexplained shrinkage — actual count is lower than theoretical" : "Over-counted or recipe over-stated consumption"}
          aria-label={r.variance < 0 ? "Negative variance (shrinkage)" : "Positive variance (over-count)"}
        >
          {r.variance > 0 ? `+${r.variance}` : r.variance}
        </span>
      ),
    },
    {
      key: "variancePct",
      header: "% drift",
      align: "right",
      render: (r) => (
        <StatusBadge tone={tone(r.variancePct)} withDot>
          {(r.variancePct * 100).toFixed(1)}%
        </StatusBadge>
      ),
    },
    {
      key: "costImpactUsd",
      header: "Cost impact",
      align: "right",
      hideOnMobile: true,
      render: (r) => (
        <span className={r.costImpactUsd && r.costImpactUsd < 0 ? "tabular-nums text-rose-600 dark:text-rose-400" : "tabular-nums"}>
          {r.costImpactUsd != null ? formatPrice(r.costImpactUsd) : "—"}
        </span>
      ),
    },
  ]

  return (
    <ReportShell
      title="Stock Variance"
      description="Gap between what your recipes + sales say you should have vs what the count actually found"
      titleTooltip={
        <>
          The single most valuable report in any production-driven
          business. Pallio computes "theoretical stock" from starting
          count + receipts − what the recipes / sales should have
          consumed. Compare to a physical count and the gap reveals
          shrinkage, over-portioning, theft, recipe drift, or just
          miscounts. Tighten variance by 1 point and you usually
          recover the cost of the software many times over. Works the
          same for a bakery counting flour, a workshop counting brake
          fluid, a cosmetics lab counting essential oils, or a factory
          counting raw aluminium.
        </>
      }
      period={period}
      onPeriodChange={setPeriod}
      exportFilename={`pallio-variance-${period}`}
      exportRows={rows.map((r) => ({
        SKU: r.sku,
        Item: r.name,
        Theoretical: r.theoreticalQty,
        Actual: r.actualQty,
        Variance: r.variance,
        "% drift": (r.variancePct * 100).toFixed(2) + "%",
        "Cost impact": r.costImpactUsd ?? "",
        "Period start": r.periodStart,
        "Period end": r.periodEnd,
      }))}
    >
      <KpiBand
        items={[
          { title: "Tracked items", value: String(rows.length), Icon: Scale, tone: "violet" },
          { title: "Critical (≥20% drift)", value: String(critical), Icon: AlertTriangle, tone: "rose" },
          { title: "Cost impact (period)", value: formatPrice(negativeImpact), delta: "negative shrink", trend: "down", Icon: TrendingDown, tone: "rose" },
          { title: "On-target items", value: String(positiveCount), Icon: ArrowUpRight, tone: "emerald" },
        ]}
      />

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold">SKUs with variance</p>
          <p className="text-[11px] text-muted-foreground">Negative = unexplained shrinkage. Positive = over-counted or recipe over-stating consumption.</p>
        </div>
        <div className="p-3">
          <DataTable columns={cols} rows={rows} rowKey={(r) => r.sku} />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">Reading this report</p>
        <p>
          A consistent &gt;10% negative drift on a single SKU usually
          means one of: portioning out of spec, theft, breakage not
          logged in adjustments, or a recipe that under-states real
          consumption (forgot the wastage factor). Open the SKU's lot
          history alongside this report to localize where the loss is
          happening.
        </p>
      </div>
    </ReportShell>
  )
}
