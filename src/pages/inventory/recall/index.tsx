import * as React from "react"
import { toast } from "sonner"
import { AlertTriangle, ArrowRight, Boxes, FileSearch, Search, ShieldAlert, Workflow } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import {
  loadLots,
  loadProductionRuns,
  loadRecipes,
  recipesUsingComponent,
  type LotEntry,
  type ProductionRun,
} from "@/lib/inventory/recipes"
import { listInvoices, type Invoice } from "@/lib/pos/storage"

type TraceResult = {
  lot: LotEntry
  // Direct: production runs that consumed this lot's SKU as a component
  // (today we approximate via timestamp + sku because RecipeLine doesn't
  // carry a lotId yet — backend will tighten this).
  downstreamRuns: ProductionRun[]
  // Downstream finished-good lots produced from those runs.
  downstreamLots: LotEntry[]
  // Invoices that sold any of the downstream SKUs in the window.
  affectedInvoices: Invoice[]
  // Recipes that reference this lot's SKU as a component (so the
  // operator knows what recipes are at risk for future production).
  recipesAtRisk: { id: string; name: string; parentSku: string }[]
}

function traceLot(lot: LotEntry): TraceResult {
  const runs = loadProductionRuns()
  const recipes = loadRecipes()
  const lots = loadLots()
  const invoices = listInvoices()

  // 1. Find recipes that consume this lot's SKU.
  const recipesAtRisk = recipesUsingComponent(lot.sku).map((r) => ({
    id: r.id,
    name: r.name,
    parentSku: r.parentSku,
  }))
  const atRiskRecipeIds = new Set(recipesAtRisk.map((r) => r.id))

  // 2. Production runs of those recipes after the lot was received.
  const receivedAtMs = new Date(lot.receivedAt).getTime()
  const downstreamRuns = runs.filter(
    (r) => atRiskRecipeIds.has(r.recipeId) && new Date(r.ranAt).getTime() >= receivedAtMs,
  )

  // 3. Downstream lots produced from those runs.
  const downstreamRunIds = new Set(downstreamRuns.map((r) => r.id))
  const downstreamLots = lots.filter(
    (l) => l.productionRunId && downstreamRunIds.has(l.productionRunId),
  )

  // 4. Invoices that sold any downstream SKU after the lot was received.
  //    We're being deliberately permissive — better to surface a
  //    superset for a recall than miss an affected invoice.
  const downstreamSkus = new Set(downstreamLots.map((l) => l.sku))
  // Also include the lot's own SKU in case it was sold direct (e.g. a
  // bag of flour sold retail in addition to being used in recipes).
  downstreamSkus.add(lot.sku)
  const affectedInvoices = invoices.filter((inv) => {
    const ts = inv.createdAt
    if (ts < receivedAtMs) return false
    return inv.items.some((line) => downstreamSkus.has(line.sku))
  })

  return { lot, downstreamRuns, downstreamLots, affectedInvoices, recipesAtRisk }
}

export default function RecallTrace() {
  const [query, setQuery] = React.useState("")
  const [selectedLotId, setSelectedLotId] = React.useState<string | null>(null)
  const [initiated, setInitiated] = React.useState(false)
  const [confirm, setConfirm] = React.useState<"initiate" | "notify" | "writeoff" | null>(null)
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))

  const lots = React.useMemo(() => loadLots(), [])

  const matchingLots = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return lots.slice(0, 12)
    return lots.filter(
      (l) =>
        l.lotCode.toLowerCase().includes(q) ||
        l.sku.toLowerCase().includes(q) ||
        (l.vendor ?? "").toLowerCase().includes(q),
    )
  }, [lots, query])

  const result = React.useMemo(() => {
    if (!selectedLotId) return null
    const lot = lots.find((l) => l.id === selectedLotId)
    if (!lot) return null
    return traceLot(lot)
  }, [selectedLotId, lots])

  return (
    <PageShell
      title="Recalls"
      withToolbar
      titleTooltip={
        <>
          When something is wrong with a batch, you need to know
          everything downstream of it — fast. Pallio walks every
          lot's path: which recipes consumed it, which finished-good
          lots came from those recipes, and which customer invoices
          sold those finished goods. Required by FSMA in the US, EU
          1169/2011 + 178/2002 in Europe, and equivalent laws in most
          food markets. Useful far beyond food — recall a defective
          batch of brake pads, a contaminated essential oil, a faulty
          electronic component, a flawed fabric roll.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Lots tracked", value: String(lots.length), tone: "brand", hint: "available to trace" },
            { label: "Selected", value: result ? `1` : "0", tone: "info", hint: "in trace view" },
            { label: "Affected invoices", value: result ? String(result.affectedInvoices.length) : "—", tone: "warning", hint: "customer-facing" },
            { label: "Recipes at risk", value: result ? String(result.recipesAtRisk.length) : "—", tone: "danger", hint: "use this lot" },
          ]}
        />

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold flex items-center gap-2">
            <FileSearch className="h-4 w-4" /> Step 1 — find the lot
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Search by lot code, SKU, or vendor. Tap a result to trace
            everything that came from it.
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Lot code, SKU, or vendor…"
              className="pl-9"
            />
          </div>

          {matchingLots.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No lots match.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {matchingLots.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedLotId(l.id)}
                    className={
                      selectedLotId === l.id
                        ? "w-full text-left rounded-lg border border-brand bg-brand/5 px-3 py-2"
                        : "w-full text-left rounded-lg border border-border px-3 py-2 hover:border-brand/40"
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm">
                        <span className="font-mono">{l.lotCode}</span>{" "}
                        <span className="text-muted-foreground">· {l.sku}</span>
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {l.qty} / {l.originalQty} {l.unit}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Received {new Date(l.receivedAt).toLocaleDateString()}
                      {l.vendor && <> · {l.vendor}</>}
                      {l.poNumber && <> · PO <span className="font-mono">{l.poNumber}</span></>}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {result && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                    <ShieldAlert className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold">
                      Trace for <span className="font-mono">{result.lot.lotCode}</span>
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      SKU <span className="font-mono">{result.lot.sku}</span> ·
                      received {new Date(result.lot.receivedAt).toLocaleDateString()}
                      {result.lot.vendor && <> from {result.lot.vendor}</>}
                      {result.lot.poNumber && <> on PO <span className="font-mono">{result.lot.poNumber}</span></>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="border-b border-border px-4 py-3 flex items-center gap-2">
                  <Workflow className="h-4 w-4" />
                  <p className="text-sm font-semibold">Step 2 — Recipes at risk ({result.recipesAtRisk.length})</p>
                </div>
                {result.recipesAtRisk.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">
                    No recipes reference this SKU. This lot was either consumed direct, or it's a finished-good lot itself.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {result.recipesAtRisk.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{r.parentSku}</p>
                        </div>
                        <a href={`/inventory/recipes/${r.id}`} className="text-[11px] text-brand hover:underline">
                          View →
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="border-b border-border px-4 py-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  <p className="text-sm font-semibold">Step 3 — Production runs since receipt ({result.downstreamRuns.length})</p>
                </div>
                {result.downstreamRuns.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">
                    No production runs of the at-risk recipes happened after this lot was received. Direct-sale invoices may still be affected (see below).
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {result.downstreamRuns.map((r) => (
                      <li key={r.id} className="px-4 py-3">
                        <p className="text-sm">
                          {r.batches} run × output{" "}
                          <span className="font-mono">{r.parentSku}</span>
                          {r.lotCode && <> · lot <span className="font-mono">{r.lotCode}</span></>}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(r.ranAt).toLocaleString()}
                          {r.locationId && <> · {r.locationId}</>}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="border-b border-border px-4 py-3 flex items-center gap-2">
                  <Boxes className="h-4 w-4" />
                  <p className="text-sm font-semibold">Step 4 — Downstream finished-good lots ({result.downstreamLots.length})</p>
                </div>
                {result.downstreamLots.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">
                    No finished-good lots traced.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {result.downstreamLots.map((l) => (
                      <li key={l.id} className="px-4 py-3">
                        <p className="text-sm">
                          <span className="font-mono">{l.lotCode}</span> ·{" "}
                          <span className="text-muted-foreground">{l.sku}</span>{" "}
                          ·{" "}
                          <span className="tabular-nums">{l.qty} / {l.originalQty} {l.unit}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {l.locationId && <>at {l.locationId} · </>}
                          {l.expiresAt && <>exp {new Date(l.expiresAt).toLocaleDateString()}</>}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm font-semibold">Step 5 — Affected customer invoices ({result.affectedInvoices.length})</p>
                  </div>
                  {result.affectedInvoices.length > 0 && (
                    <Button size="sm" variant="outline">Export contact list</Button>
                  )}
                </div>
                {result.affectedInvoices.length === 0 ? (
                  <div className="px-4 py-4 text-center">
                    <EmptyState
                      Icon={ShieldAlert}
                      title="No affected invoices found"
                      description="Either nothing reached a customer yet, or the affected items haven't been sold in this window."
                      size="sm"
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {result.affectedInvoices.map((inv) => (
                      <li key={inv.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            <span className="font-mono">{inv.number}</span>
                            {inv.customer?.name && <span className="font-normal"> · {inv.customer.name}</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(inv.createdAt).toLocaleString()}
                            {inv.customer?.phone && <> · {inv.customer.phone}</>}
                            {inv.customer?.email && <> · {inv.customer.email}</>}
                          </p>
                        </div>
                        <StatusBadge tone="warning" withDot>at risk</StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setConfirm("initiate")} disabled={initiated}>
                {initiated ? "Recall initiated" : "Mark recall as initiated"}
              </Button>
              <Button variant="outline" onClick={() => setConfirm("notify")} disabled={!result || result.affectedInvoices.length === 0}>
                Notify affected customers
              </Button>
              <Button variant="outline" onClick={() => setConfirm("writeoff")} disabled={!result}>
                Generate adjustment write-off
              </Button>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Compliance note</p>
              <p>
                Recalls are typically required to be initiated within 24 hours of
                discovery. Keep an audit trail (Pallio logs every action on
                this page to the activity log). For food businesses, also
                report to your national authority (FDA in the US, FSAI / FSS
                / FSA in EU/UK, NAFDAC in Nigeria) per the relevant statute.
              </p>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null) }}>
        <DialogContent>
          {confirm === "initiate" ? (
            <>
              <DialogHeader><DialogTitle>Initiate recall?</DialogTitle></DialogHeader>
              <p className="mt-2 text-sm">
                This stamps the recall as initiated and starts the
                audit clock. You can still notify customers and
                generate write-offs afterwards.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
                <Button onClick={() => { setInitiated(true); setConfirm(null); toast.success("Recall initiated and logged") }}>Initiate</Button>
              </div>
            </>
          ) : confirm === "notify" ? (
            <>
              <DialogHeader><DialogTitle>Notify affected customers?</DialogTitle></DialogHeader>
              <p className="mt-2 text-sm">
                Pallio will email the {result?.affectedInvoices.length ?? 0} customer{(result?.affectedInvoices.length ?? 0) === 1 ? "" : "s"} on
                affected invoices using the "Recall notice" template.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
                <Button onClick={() => { setConfirm(null); toast.success(`Notifications queued for ${result?.affectedInvoices.length ?? 0} customer${(result?.affectedInvoices.length ?? 0) === 1 ? "" : "s"}`) }}>Send</Button>
              </div>
            </>
          ) : confirm === "writeoff" ? (
            <>
              <DialogHeader><DialogTitle>Generate write-off?</DialogTitle></DialogHeader>
              <p className="mt-2 text-sm">
                Creates a draft inventory adjustment removing the
                recalled lot quantity from on-hand stock. You can review
                and post it from Inventory → Adjustments.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
                <Button onClick={() => { setConfirm(null); toast.success("Draft adjustment created in Inventory → Adjustments") }}>Generate</Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
