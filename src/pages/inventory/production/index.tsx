import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Calendar, Factory, Play, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { loadProductionRuns, loadRecipes, recordProductionRun } from "@/lib/inventory/recipes"

export default function ProductionIndex() {
  const [query, setQuery] = React.useState("")
  const [tab, setTab] = React.useState<"runs" | "schedule">("runs")
  const [logOpen, setLogOpen] = React.useState(false)
  const [logRecipeId, setLogRecipeId] = React.useState<string>("")
  const [logBatches, setLogBatches] = React.useState<string>("1")
  const [logLotCode, setLogLotCode] = React.useState<string>("")
  const [logNote, setLogNote] = React.useState<string>("")
  const [runsTick, setRunsTick] = React.useState(0)
  useRegisterPageRefresh(React.useCallback(async () => { setRunsTick((t) => t + 1); await new Promise((r) => setTimeout(r, 400)) }, []))

  const runs = React.useMemo(() => loadProductionRuns(), [runsTick])
  const recipes = React.useMemo(() => loadRecipes(), [])
  const recipeById = React.useMemo(() => {
    const m = new Map(recipes.map((r) => [r.id, r]))
    return m
  }, [recipes])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return runs
    return runs.filter((r) => {
      const recipe = recipeById.get(r.recipeId)
      return (
        r.id.toLowerCase().includes(q) ||
        r.parentSku.toLowerCase().includes(q) ||
        (r.lotCode ?? "").toLowerCase().includes(q) ||
        (recipe?.name ?? "").toLowerCase().includes(q)
      )
    })
  }, [runs, query, recipeById])

  const committed = runs.filter((r) => r.committed).length
  const drafts = runs.filter((r) => !r.committed).length
  const todayRuns = runs.filter((r) => isToday(r.ranAt)).length
  const unitsProducedToday = runs
    .filter((r) => r.committed && isToday(r.ranAt))
    .reduce((s, r) => {
      const rec = recipeById.get(r.recipeId)
      return s + r.batches * (rec?.yield ?? 0)
    }, 0)

  return (
    <PageShell
      title="Production"
      withToolbar
      titleTooltip={
        <>
          A <strong>production run</strong> is a recorded instance of
          someone running a recipe — baking a batch, blending a fragrance,
          completing a service job, assembling a panel. Each committed run
          adds stock of the parent SKU and consumes the components Pallio
          says the recipe needs. Compare these to sales over time and the
          variance report reveals shrinkage or recipe drift.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Total runs", value: String(runs.length), tone: "brand", hint: "all time" },
            { label: "Today", value: String(todayRuns), tone: "info", hint: "logged" },
            { label: "Committed", value: String(committed), tone: "success", hint: "applied to stock" },
            { label: "Units produced today", value: String(unitsProducedToday), tone: "warning", hint: "across all recipes" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {(["runs", "schedule"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  tab === t
                    ? "rounded-md bg-brand px-3 py-1 text-xs font-semibold text-white"
                    : "px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {t === "runs" ? "Logged runs" : "Scheduled"}
              </button>
            ))}
          </div>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by SKU, lot, or recipe name…" className="pl-9" />
          </div>
          <Button className="hidden md:inline-flex" onClick={() => { setLogRecipeId(recipes[0]?.id ?? ""); setLogBatches("1"); setLogLotCode(""); setLogNote(""); setLogOpen(true) }}>
            <Play className="h-4 w-4" /> Log run
          </Button>
        </div>

        {tab === "runs" && (
          filtered.length === 0 ? (
            <Card><CardContent className="p-0">
              <EmptyState
                Icon={Factory}
                title="No production runs match"
                description="Log a run when someone completes a batch, blend, build, or service job."
              />
            </CardContent></Card>
          ) : (
            <ul className="space-y-2">
              {filtered.map((r) => {
                const rec = recipeById.get(r.recipeId)
                const totalProduced = r.batches * (rec?.yield ?? 0)
                return (
                  <li key={r.id} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                        <Factory className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {rec ? (
                              <Link to={`/inventory/recipes/${rec.id}`} className="hover:underline">{rec.name}</Link>
                            ) : (
                              <span>{r.parentSku}</span>
                            )}
                          </p>
                          <StatusBadge tone={r.committed ? "success" : "neutral"} withDot>
                            {r.committed ? "committed" : "draft"}
                          </StatusBadge>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {r.parentSku} · {r.batches} run × {rec?.yield ?? "?"} {rec?.yieldUnit ?? ""} = <span className="font-semibold text-foreground">{totalProduced}</span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{new Date(r.ranAt).toLocaleString()}</span>
                          {r.locationId && <span>· {r.locationId}</span>}
                          {r.lotCode && <span>· lot <span className="font-mono">{r.lotCode}</span></span>}
                          {r.expiresAt && <span>· exp {new Date(r.expiresAt).toLocaleDateString()}</span>}
                        </div>
                        {r.note && <p className="mt-1 text-[11px] italic text-muted-foreground">{r.note}</p>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        )}

        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log production run</DialogTitle>
            </DialogHeader>
            <div className="mt-3 flex flex-col gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Recipe</span>
                <Select value={logRecipeId} onValueChange={setLogRecipeId}>
                  <SelectTrigger><SelectValue placeholder="Pick a recipe" /></SelectTrigger>
                  <SelectContent>
                    {recipes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name} <span className="text-muted-foreground">· {r.parentSku}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Batches</span>
                  <Input type="number" min={1} value={logBatches} onChange={(e) => setLogBatches(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Lot code (opt)</span>
                  <Input value={logLotCode} onChange={(e) => setLogLotCode(e.target.value)} placeholder="auto if blank" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Note (optional)</span>
                <Input value={logNote} onChange={(e) => setLogNote(e.target.value)} placeholder="e.g. substituted X for Y" />
              </label>
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    const rec = recipes.find((r) => r.id === logRecipeId)
                    const batches = Math.max(1, Number(logBatches) || 0)
                    if (!rec) { toast.error("Pick a recipe first"); return }
                    recordProductionRun({
                      recipeId: rec.id,
                      parentSku: rec.parentSku,
                      batches,
                      lotCode: logLotCode.trim() || undefined,
                      runById: "m-1",
                      note: logNote.trim() || undefined,
                      committed: true,
                    })
                    toast.success(`Logged ${batches} batch${batches === 1 ? "" : "es"} of ${rec.name}`)
                    setLogOpen(false)
                    setRunsTick((t) => t + 1)
                  }}
                >
                  Log run
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {tab === "schedule" && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Production scheduling</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-md">
                    Pulls expected sales from forecasts + open orders, subtracts
                    on-hand finished stock, and tells you what to produce today.
                    Wires to oven slots, mixer queues, assembly stations, or
                    technician calendars depending on your business.
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Available once the backend forecasting service is live.
                  </p>
                </div>
                <Link to="/ai">
                  <Button variant="outline" size="sm">Ask AI: "what should I make today?"</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  )
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}
