import * as React from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, Plus, ShieldAlert, Sparkles, Tag } from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { KpiBand } from "@/components/reports/kpi-band"
import { DataTable, type Column } from "@/components/reports/data-table"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { type Period } from "@/components/reports/period-chips"
import { ALLERGEN_LABELS, loadRecipes, type Allergen } from "@/lib/inventory/recipes"

type Row = {
  allergen: Allergen
  label: string
  recipeCount: number
  recipes: { id: string; name: string; sku: string }[]
}

export default function AllergensReport() {
  const [period, setPeriod] = React.useState<Period>("30d")
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))

  const recipes = React.useMemo(() => loadRecipes(), [])

  // Roll up recipes per allergen.
  const rows: Row[] = React.useMemo(() => {
    const byAllergen = new Map<Allergen, Row>()
    for (const r of recipes) {
      for (const a of r.allergens) {
        const entry =
          byAllergen.get(a) ?? { allergen: a, label: ALLERGEN_LABELS[a], recipeCount: 0, recipes: [] }
        entry.recipeCount += 1
        entry.recipes.push({ id: r.id, name: r.name, sku: r.parentSku })
        byAllergen.set(a, entry)
      }
    }
    return Array.from(byAllergen.values()).sort((a, b) => b.recipeCount - a.recipeCount)
  }, [recipes])

  const totalAllergenic = recipes.filter((r) => r.allergens.length > 0).length
  const totalNonAllergenic = recipes.length - totalAllergenic
  const distinctAllergens = rows.length
  const recipesWithMultiple = recipes.filter((r) => r.allergens.length >= 2).length

  const cols: Column<Row>[] = [
    {
      key: "label",
      header: "Allergen",
      primary: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          <Sparkles className="h-3 w-3" /> {r.label}
        </span>
      ),
    },
    { key: "recipeCount", header: "Recipes", align: "right" },
    {
      key: "recipes",
      header: "Examples",
      hideOnMobile: true,
      render: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.recipes.slice(0, 5).map((rec) => (
            <span key={rec.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
              {rec.name}
            </span>
          ))}
          {r.recipes.length > 5 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              +{r.recipes.length - 5} more
            </span>
          )}
        </span>
      ),
    },
  ]

  if (recipes.length === 0 || (rows.length === 0 && totalNonAllergenic === 0)) {
    return (
      <ReportShell
        title="Allergens"
        description="Allergen rollup across every recipe"
        period={period}
        onPeriodChange={setPeriod}
        exportFilename={`pallio-allergens-${period}`}
        exportRows={[]}
      >
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No recipes for this period.</p>
          <Link
            to="/inventory/recipes/new"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:opacity-95 dark:bg-primary dark:text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Create a recipe
          </Link>
        </div>
      </ReportShell>
    )
  }

  return (
    <ReportShell
      title="Allergens"
      description="Allergen rollup across every recipe (food + cosmetics relevant; ignore if you don't make consumables)"
      titleTooltip={
        <>
          Required by the EU (Regulation 1169/2011), FDA in the US, and
          most local regulators wherever food is sold. Pallio rolls up
          the union of allergens across every component (including
          nested sub-recipes) and surfaces it here + on the storefront
          menu cards + on printed labels. Non-food operators (apparel,
          electronics, auto parts) leave allergen fields empty on
          recipes and this page simply shows zero rows — no penalty,
          no warning.
        </>
      }
      period={period}
      onPeriodChange={setPeriod}
      exportFilename={`pallio-allergens-${period}`}
      exportRows={rows.map((r) => ({
        Allergen: r.label,
        "Recipe count": r.recipeCount,
        Recipes: r.recipes.map((rec) => rec.name).join("; "),
      }))}
    >
      <KpiBand
        items={[
          { title: "Distinct allergens", value: String(distinctAllergens), Icon: Sparkles, tone: "amber" },
          { title: "Allergenic recipes", value: String(totalAllergenic), Icon: ShieldAlert, tone: "rose" },
          { title: "Non-allergenic", value: String(totalNonAllergenic), Icon: Tag, tone: "emerald" },
          { title: "Multi-allergen recipes", value: String(recipesWithMultiple), Icon: AlertTriangle, tone: "violet" },
        ]}
      />

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Rollup by allergen</p>
          <p className="text-[11px] text-muted-foreground">Ranked by how many recipes carry each allergen.</p>
        </div>
        <div className="p-3">
          <DataTable columns={cols} rows={rows} rowKey={(r) => r.allergen} />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">Cross-contact reminder</p>
        <p>
          Pallio only knows about declared allergens — it can't detect
          shared equipment, dusting between bakes, or the same fryer for
          peanut + non-peanut items. Treat cross-contact warnings as a
          recipe-level override (set them manually in the recipe form
          even when no component formally carries the allergen).
        </p>
      </div>
    </ReportShell>
  )
}
