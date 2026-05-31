import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Workflow, Layers, Plus, Search, Sparkles } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { FilterChips, type FilterChip } from "@/components/lists/filter-chips"
import { useCurrency } from "@/contexts/currency"
import { useCapability } from "@/hooks/use-industry"
import { loadRecipes, rollupRecipeCost, ALLERGEN_LABELS } from "@/lib/inventory/recipes"
import { loadCatalog, type CatalogItem } from "@/lib/pos/storage"

const statusTone: Record<"active" | "draft", StatusTone> = { active: "success", draft: "neutral" }

// Build a sku → unitPrice lookup once at module load — used for
// recipe cost rollups. Catalog items are the cost basis (their
// `price` field is the per-unit cost the operator set, or the
// retail price in mock data; backend will swap to actual cost).
function buildPriceLookup(): (sku: string) => number | null {
  const map = new Map<string, number>()
  for (const mode of ["retail", "restaurant", "services", "auto"] as const) {
    for (const item of loadCatalog(mode) as CatalogItem[]) {
      if (!map.has(item.sku)) map.set(item.sku, item.price)
    }
  }
  return (sku) => map.get(sku) ?? null
}

export default function RecipesIndex() {
  const [query, setQuery] = React.useState("")
  const [tagFilter, setTagFilter] = React.useState<string[]>([])
  const { formatPrice } = useCurrency()
  // Soft capability — heavy use in kitchens, labs, perfume,
  // manufacturing. Other industries get a hint that the page exists
  // but might not need it.
  const usesRecipes = useCapability("usesRecipes")
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const recipes = React.useMemo(() => loadRecipes(), [])
  const priceLookup = React.useMemo(() => buildPriceLookup(), [])

  // Tag chips derived from data — same agnostic pattern as
  // inventory/categories.
  const allTags = React.useMemo(() => {
    const set = new Set<string>()
    for (const r of recipes) for (const t of r.tags ?? []) set.add(t)
    return Array.from(set).sort()
  }, [recipes])

  const filtered = React.useMemo(() => {
    let list = recipes
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.parentSku.toLowerCase().includes(q),
      )
    }
    if (tagFilter.length > 0) {
      list = list.filter((r) => tagFilter.every((t) => r.tags?.includes(t)))
    }
    return list
  }, [recipes, query, tagFilter])

  // Pre-compute costs once per render so cost-band stats + cards
  // don't repeat the rollup.
  const enriched = React.useMemo(
    () =>
      filtered.map((r) => {
        const cost = rollupRecipeCost(r, priceLookup)
        return { recipe: r, cost: cost.perUnit, missing: cost.missing }
      }),
    [filtered, priceLookup],
  )

  const active = recipes.filter((r) => r.status === "active").length
  const withSubRecipes = recipes.filter((r) =>
    r.lines.some((l) => recipes.some((sub) => sub.parentSku === l.componentSku)),
  ).length
  const avgCost =
    enriched.length > 0
      ? enriched.reduce((s, e) => s + e.cost, 0) / enriched.length
      : 0

  // One-shot warning toast on mount if any recipe has unmatched
  // components — operators otherwise miss the "—" cost cells.
  const warnedRef = React.useRef(false)
  React.useEffect(() => {
    if (warnedRef.current) return
    const recipesWithMissing = enriched.filter((e) => e.missing.length > 0)
    if (recipesWithMissing.length === 0) return
    warnedRef.current = true
    toast.warning(
      `${recipesWithMissing.length} recipe${recipesWithMissing.length === 1 ? "" : "s"} reference SKUs not in the catalog`,
      {
        description: "Cost / unit shows “—” until the missing components are added.",
        action: { label: "Add item", onClick: () => { window.location.href = "/inventory/new" } },
      },
    )
  }, [enriched])

  const chips: FilterChip[] = tagFilter.map((t) => ({
    key: `tag:${t}`,
    label: t,
    onRemove: () => setTagFilter((p) => p.filter((x) => x !== t)),
  }))

  return (
    <PageShell
      title="Recipes"
      withToolbar
      titleTooltip={
        <>
          A <strong>recipe</strong> (or <strong>BOM</strong> — bill of
          materials) defines how one made thing is built from its parts.
          One model, every industry: bread loaf, smoothie, perfume
          blend, brake-pad service, tailored suit, soap bar, candle,
          phone repair, custom cake, framed print, brewed beer, panel
          assembly — anything where a parent SKU consumes child SKUs in
          defined quantities. When you sell or produce the parent,
          Pallio deducts each component (including nested sub-recipes).
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!usesRecipes && (
          <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            Recipes (or BOMs) are most useful for kitchens, labs, and
            assembly. You can still use them — many shops keep a couple
            for assembled bundles.
          </div>
        )}
        <SummaryStrip
          tiles={[
            { label: "Recipes", value: String(recipes.length), tone: "brand", hint: "defined" },
            { label: "Active", value: String(active), tone: "success", hint: "live" },
            { label: "With sub-recipes", value: String(withSubRecipes), tone: "info", hint: "nested" },
            { label: "Avg cost / unit", value: formatPrice(avgCost), tone: "warning", hint: "rolled up" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipes…" className="pl-9" />
          </div>
          <Link to="/inventory/recipes/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> New recipe</Button>
          </Link>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => {
              const on = tagFilter.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setTagFilter((p) => (on ? p.filter((x) => x !== t) : [...p, t]))
                  }
                  className={
                    on
                      ? "rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white"
                      : "rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  }
                >
                  {t}
                </button>
              )
            })}
          </div>
        )}

        <FilterChips chips={chips} />

        {enriched.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={Workflow} title="No recipes match" description="Adjust filters or build a new one." />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {enriched.map(({ recipe: r, cost, missing }) => (
              <li key={r.id}>
                <Link
                  to={`/inventory/recipes/${r.id}`}
                  className="block rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                      <Workflow className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {r.parentSku} · yields {r.yield} {r.yieldUnit}
                        {r.durationMinutes ? ` · ${formatDuration(r.durationMinutes)}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.lines.slice(0, 4).map((l, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium"
                          >
                            <Layers className="h-3 w-3 text-muted-foreground" />
                            <span>{l.componentName ?? l.componentSku}</span>
                            <span className="text-muted-foreground">{l.qty}{l.unit}</span>
                          </span>
                        ))}
                        {r.lines.length > 4 && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            +{r.lines.length - 4} more
                          </span>
                        )}
                      </div>
                      {r.allergens.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.allergens.map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                            >
                              <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
                              {ALLERGEN_LABELS[a]}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-border pt-2 text-[11px]">
                        <span className="text-muted-foreground">
                          Cost / unit:{" "}
                          <span className="font-bold tabular-nums text-foreground">
                            {missing.length > 0 ? "—" : formatPrice(cost)}
                          </span>
                        </span>
                        {missing.length > 0 && (
                          <StatusBadge tone="warning">{missing.length} unmatched component(s)</StatusBadge>
                        )}
                        {r.tags && r.tags.length > 0 && (
                          <span className="hidden md:flex flex-wrap gap-1 justify-end">
                            {r.tags.slice(0, 3).map((t) => (
                              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{t}</span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = minutes / 60
  if (hours < 24) return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`
  const days = hours / 24
  if (days < 7) return `${days.toFixed(days >= 10 ? 0 : 1)}d`
  const weeks = days / 7
  return `${weeks.toFixed(weeks >= 10 ? 0 : 1)}w`
}
