import * as React from "react"
import { toast } from "sonner"
import { ArrowDownRight, ArrowUpRight, ClipboardCheck, Package, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { listStockMovements, recordStockMovement, loadAllCatalog } from "@/lib/pos/storage"

type Row = { id: string; sku: string; qty: number; reason: string; user: string; date: string; location: string }

// Adjustments are read from the real stock-movement log (lib/pos/storage).
function deriveAdjustments(): Row[] {
  return listStockMovements()
    .filter((m) => m.kind === "adjustment")
    .map((m) => ({
      id: m.id,
      sku: m.sku,
      qty: m.delta,
      reason: m.reason || "—",
      user: "You",
      date: new Date(m.at).toLocaleDateString(),
      location: m.location || "—",
    }))
}

export default function Adjustments() {
  const [query, setQuery] = React.useState("")
  const [rows, setRows] = React.useState<Row[]>(() => deriveAdjustments())
  const [formOpen, setFormOpen] = React.useState(false)
  const reload = React.useCallback(() => setRows(deriveAdjustments()), [])
  useRegisterPageRefresh(React.useCallback(async () => { reload(); await new Promise((r) => setTimeout(r, 300)) }, [reload]))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q),
    )
  }, [query, rows])

  const positives = rows.filter((r) => r.qty > 0).reduce((s, r) => s + r.qty, 0)
  const negatives = rows.filter((r) => r.qty < 0).reduce((s, r) => s + r.qty, 0)
  const net = positives + negatives

  return (
    <PageShell
      title="Stock adjustments"
      withToolbar
      titleTooltip={
        <>
          Manual changes to your on-hand count — for shrinkage,
          spoilage, breakage, theft, or just a recount that didn't
          match the system. Logged separately so your auditor can see
          why the count moved without a sale or PO.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Net change", value: `${net > 0 ? "+" : ""}${net}`, tone: net >= 0 ? "success" : "danger", hint: "units" },
            { label: "Write-ons", value: `+${positives}`, tone: "success", hint: "added" },
            { label: "Write-offs", value: String(negatives), tone: "danger", hint: "removed" },
            { label: "Entries", value: String(rows.length), tone: "brand", hint: "logged" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by SKU, reason, or ID…" className="pl-9" />
          </div>
          <Button onClick={() => setFormOpen(true)}><Package className="h-4 w-4" /> New adjustment</Button>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              Icon={ClipboardCheck}
              title={rows.length === 0 ? "No adjustments yet" : "No adjustments match"}
              description={rows.length === 0
                ? "Record a manual stock change — shrinkage, breakage, a recount that didn't match."
                : "Try a different SKU or reason."}
              action={rows.length === 0 ? <Button onClick={() => setFormOpen(true)}>New adjustment</Button> : undefined}
            />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                <span className={
                  r.qty < 0
                    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
                    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                }>
                  {r.qty < 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold"><span className="font-mono">{r.sku}</span></p>
                    <p className={
                      r.qty < 0
                        ? "shrink-0 text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400"
                        : "shrink-0 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
                    }>
                      {r.qty > 0 ? `+${r.qty}` : r.qty}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{r.reason}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    <StatusBadge tone="neutral">{r.location}</StatusBadge>
                    <span><span className="font-mono">{r.id}</span> · by {r.user} · {r.date}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <AdjustmentForm
            onDone={() => { reload(); setFormOpen(false) }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function AdjustmentForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const catalog = React.useMemo(() => loadAllCatalog(), [])
  const [sku, setSku] = React.useState("")
  const [dir, setDir] = React.useState<"add" | "remove">("remove")
  const [qty, setQty] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [location, setLocation] = React.useState("")

  const match = catalog.find((c) => c.sku.toLowerCase() === sku.trim().toLowerCase())
  const qtyNum = Number(qty) || 0
  const valid = !!match && qtyNum > 0
  const [submitting, setSubmitting] = React.useState(false)

  const submit = () => {
    if (!match) { toast.error("Pick a valid SKU from the catalog"); return }
    if (qtyNum <= 0) { toast.error("Quantity must be greater than zero"); return }
    setSubmitting(true)
    try {
      recordStockMovement({
        sku: match.sku,
        name: match.name,
        delta: dir === "add" ? qtyNum : -qtyNum,
        kind: "adjustment",
        reason: reason.trim() || (dir === "add" ? "Recount (added)" : "Recount (removed)"),
        location: location.trim() || undefined,
      })
      toast.success(`Adjusted ${match.sku}: ${dir === "add" ? "+" : "−"}${qtyNum}`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record adjustment")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-base font-semibold">New stock adjustment</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">Records to the audit log and updates on-hand stock.</p>
      <div className="mt-4 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Item SKU</span>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. EL-2109" list="adj-skus" />
          <datalist id="adj-skus">
            {catalog.map((c) => <option key={c.id} value={c.sku}>{c.name}</option>)}
          </datalist>
          {sku.trim() && !match && <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">No item with that SKU.</span>}
          {match && <span className="mt-1 block text-[11px] text-muted-foreground">{match.name}</span>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Direction</span>
            <div className="inline-flex w-full rounded-lg border border-input p-0.5">
              {(["remove", "add"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDir(d)}
                  className={
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition-colors " +
                    (dir === d ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground" : "text-muted-foreground")
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Quantity</span>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Reason</span>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged, theft, recount…" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Location (optional)</span>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lekki Phase 1" />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || submitting}>{submitting ? "Saving…" : "Record"}</Button>
      </div>
    </div>
  )
}
