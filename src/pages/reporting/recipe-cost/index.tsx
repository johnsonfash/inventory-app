import * as React from "react"
import { AlertTriangle, ArrowDown, ArrowUp, Calculator, Workflow, TrendingUp } from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { KpiBand } from "@/components/reports/kpi-band"
import { DataTable, type Column } from "@/components/reports/data-table"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { type Period } from "@/components/reports/period-chips"
import { loadRecipes, rollupRecipeCost } from "@/lib/inventory/recipes"
import { loadCatalog, type CatalogItem } from "@/lib/pos/storage"
import { Link } from "react-router-dom"

function buildPriceLookup(): {
  byCurrentPrice: (sku: string) => number | null
  byMockPriorPrice: (sku: string) => number | null
} {
  const map = new Map<string, number>()
  for (const mode of ["retail", "restaurant", "services", "auto"] as const) {
    for (const item of loadCatalog(mode) as CatalogItem[]) {
      if (!map.has(item.sku)) map.set(item.sku, item.price)
    }
  }
  // Mock "prior period" snapshot — when backend lands, store snapshots
  // in a price_history table. For now: simulate a 4-12% drift on most
  // items so the report has something interesting to display. Stable
  // per SKU so re-renders don't shuffle the diff.
  const drift = (sku: string): number => {
    let h = 0
    for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) | 0
    // -0.12 .. +0.12 based on SKU hash
    return ((Math.abs(h) % 24) - 12) / 100
  }
  return {
    byCurrentPrice: (sku) => map.get(sku) ?? null,
    byMockPriorPrice: (sku) => {
      const v = map.get(sku)
      if (v == null) return null
      return v * (1 - drift(sku))
    },
  }
}

type Row = {
  id: string
  name: string
  parentSku: string
  yield: number
  yieldUnit: string
  currentCost: number
  priorCost: number
  delta: number
  deltaPct: number
  missing: number
  tags?: string[]
}

function tone(pct: number): StatusTone {
  const abs = Math.abs(pct)
  if (abs >= 0.15) return "danger"
  if (abs >= 0.05) return "warning"
  return "success"
}

export default function RecipeCostWatch() {
  const [period, setPeriod] = React.useState<Period>("30d")
  const { formatPrice } = useCurrency()
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const recipes = React.useMemo(() => loadRecipes(), [])
  const lookups = React.useMemo(() => buildPriceLookup(), [])

  const rows: Row[] = React.useMemo(() => {
    return recipes.map((r) => {
      // Guard rollup — sub-recipe cycles, missing price lookups, or
      // malformed seed data can throw. Surface a zero-cost row with a
      // missing badge instead of crashing the whole report.
      let current: ReturnType<typeof rollupRecipeCost>
      let prior: ReturnType<typeof rollupRecipeCost>
      try {
        current = rollupRecipeCost(r, lookups.byCurrentPrice)
        prior = rollupRecipeCost(r, lookups.byMockPriorPrice)
      } catch {
        return {
          id: r.id,
          name: r.name,
          parentSku: r.parentSku,
          yield: r.yield,
          yieldUnit: r.yieldUnit,
          currentCost: 0,
          priorCost: 0,
          delta: 0,
          deltaPct: 0,
          missing: -1,
          tags: r.tags,
        }
      }
      const delta = current.perUnit - prior.perUnit
      const deltaPct = prior.perUnit > 0 ? delta / prior.perUnit : 0
      return {
        id: r.id,
        name: r.name,
        parentSku: r.parentSku,
        yield: r.yield,
        yieldUnit: r.yieldUnit,
        currentCost: current.perUnit,
        priorCost: prior.perUnit,
        delta,
        deltaPct,
        missing: current.missing.length,
        tags: r.tags,
      }
    }).sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
  }, [recipes, lookups])

  const upward = rows.filter((r) => r.deltaPct > 0).length
  const downward = rows.filter((r) => r.deltaPct < 0).length
  const critical = rows.filter((r) => Math.abs(r.deltaPct) >= 0.15).length
  const avgDriftPct = rows.length > 0 ? rows.reduce((s, r) => s + r.deltaPct, 0) / rows.length : 0

  const cols: Column<Row>[] = [
    {
      key: "name",
      header: "Recipe",
      primary: true,
      render: (r) => (
        <Link to={`/inventory/recipes/${r.id}`} className="hover:underline">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-sm font-medium">{r.name}</span>
            {r.missing !== 0 && (
              <StatusBadge tone="warning" withDot>
                <AlertTriangle className="h-3 w-3" />
                {r.missing > 0 ? `${r.missing} missing` : "rollup error"}
              </StatusBadge>
            )}
          </span>
          <div className="font-mono text-[10px] text-muted-foreground">{r.parentSku} · {r.yield}{r.yieldUnit}</div>
        </Link>
      ),
    },
    {
      key: "priorCost",
      header: "Prior",
      align: "right",
      hideOnMobile: true,
      render: (r) => <span className="tabular-nums">{formatPrice(r.priorCost)}</span>,
    },
    {
      key: "currentCost",
      header: "Current",
      align: "right",
      render: (r) => <span className="font-semibold tabular-nums">{formatPrice(r.currentCost)}</span>,
    },
    {
      key: "delta",
      header: "Δ",
      align: "right",
      render: (r) => (
        <span className={r.delta > 0 ? "tabular-nums text-rose-600 dark:text-rose-400" : r.delta < 0 ? "tabular-nums text-emerald-600 dark:text-emerald-400" : "tabular-nums"}>
          {r.delta > 0 ? `+${formatPrice(r.delta)}` : r.delta < 0 ? `−${formatPrice(Math.abs(r.delta))}` : "—"}
        </span>
      ),
    },
    {
      key: "deltaPct",
      header: "% drift",
      align: "right",
      render: (r) => (
        <StatusBadge tone={tone(r.deltaPct)} withDot>
          {r.deltaPct > 0 ? "+" : ""}{(r.deltaPct * 100).toFixed(1)}%
        </StatusBadge>
      ),
    },
  ]

  return (
    <ReportShell
      title="Recipe Costs"
      description="How the cost to make each recipe has changed as component prices moved"
      titleTooltip={
        <>
          When any component's cost moves, every recipe containing it
          recomputes. This page surfaces the recipes whose per-unit cost
          shifted most over the selected period — so you can adjust
          your sell price before the margin silently erodes. Works the
          same regardless of what you make: a bakery sees flour drift,
          a workshop sees brake-pad drift, a perfumer sees rose oil
          drift, a manufacturer sees aluminium drift.
        </>
      }
      period={period}
      onPeriodChange={setPeriod}
      exportFilename={`pallio-recipe-cost-${period}`}
      exportRows={rows.map((r) => ({
        Recipe: r.name,
        SKU: r.parentSku,
        Yield: `${r.yield} ${r.yieldUnit}`,
        "Prior cost": r.priorCost,
        "Current cost": r.currentCost,
        Delta: r.delta,
        "% drift": (r.deltaPct * 100).toFixed(2) + "%",
        "Missing components": r.missing,
      }))}
    >
      <KpiBand
        items={[
          { title: "Recipes watched", value: String(rows.length), Icon: Workflow, tone: "violet" },
          { title: "Cost rising", value: String(upward), delta: "vs prior period", trend: "up", Icon: ArrowUp, tone: "rose" },
          { title: "Cost falling", value: String(downward), trend: "down", Icon: ArrowDown, tone: "emerald" },
          { title: "Critical drift (≥15%)", value: String(critical), Icon: TrendingUp, tone: "amber" },
        ]}
      />

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Recipe cost drift</p>
          <p className="text-[11px] text-muted-foreground">Sorted by absolute drift. Avg drift across all recipes: <span className="font-semibold text-foreground">{(avgDriftPct * 100).toFixed(1)}%</span></p>
        </div>
        <div className="p-3">
          <DataTable columns={cols} rows={rows} rowKey={(r) => r.id} />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Calculator className="mr-1 inline h-3 w-3" />
        A 1-point drop in cost-per-unit on a 30% margin product gains
        ~1.4 points of margin. Watch this report every time a supplier
        sends a new price list.
      </div>
    </ReportShell>
  )
}
