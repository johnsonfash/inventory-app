import * as React from "react"
import { toast } from "sonner"
import { ChevronRight, Package, PackageCheck, Truck } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { listStockMovements, loadAllCatalog, recordStockMovement, type StockMovement } from "@/lib/pos/storage"

type Row = {
  po: string
  vendor: string
  items: number
  expected: string
  status: "pending" | "partial" | "today"
}

const rows: Row[] = [
  { po: "PO-1042", vendor: "Cobalt Distributors", items: 8, expected: "Today", status: "today" },
  { po: "PO-1041", vendor: "Glow Co", items: 4, expected: "Today", status: "partial" },
  { po: "PO-1040", vendor: "Acme Supplies", items: 6, expected: "May 22", status: "pending" },
  { po: "PO-1038", vendor: "Delta Apparel", items: 24, expected: "May 24", status: "pending" },
]

const statusTone: Record<Row["status"], StatusTone> = {
  today: "warning",
  partial: "info",
  pending: "neutral",
}

export default function ReceiveStock() {
  const [formOpen, setFormOpen] = React.useState(false)
  const [prefillRef, setPrefillRef] = React.useState<string>("")
  const [received, setReceived] = React.useState<StockMovement[]>(() => listStockMovements().filter((m) => m.kind === "receive"))
  const reload = React.useCallback(() => setReceived(listStockMovements().filter((m) => m.kind === "receive")), [])
  useRegisterPageRefresh(React.useCallback(async () => { reload(); await new Promise((r) => setTimeout(r, 300)) }, [reload]))

  const openForPO = (po: string) => { setPrefillRef(po); setFormOpen(true) }

  const today = rows.filter((r) => r.status === "today").length
  const partial = rows.filter((r) => r.status === "partial").length
  const totalItems = rows.reduce((s, r) => s + r.items, 0)

  return (
    <PageShell
      title="Receive stock"
      withToolbar
      toolbarActions={<Button onClick={() => { setPrefillRef(""); setFormOpen(true) }}><PackageCheck className="h-4 w-4" /> Receive stock</Button>}
      titleTooltip={
        <>
          Pending arrivals — purchase orders that have shipped from
          your suppliers but haven't been signed for yet. Tap one when
          the boxes hit the dock and Pallio adds the units to your
          on-hand count.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Due today", value: String(today), tone: "warning", hint: "expected" },
            { label: "Partial", value: String(partial), tone: "info", hint: "in progress" },
            { label: "Open POs", value: String(rows.length), tone: "brand", hint: "to receive" },
            { label: "Units inbound", value: String(totalItems), tone: "success", hint: "across POs" },
          ]}
        />

        <p className="text-sm text-muted-foreground">
          Pick an open PO to begin scanning incoming items into stock.
        </p>

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.po}>
              <button
                type="button"
                onClick={() => openForPO(r.po)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-brand/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                  <Truck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{r.vendor}</p>
                    <StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    <span className="font-mono">{r.po}</span> · {r.items} items · expected {r.expected}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>

        {received.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-foreground/80">Recently received</p>
            <ul className="space-y-2">
              {received.slice(0, 10).map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <PackageCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name || m.sku} <span className="font-mono text-[11px] text-muted-foreground">{m.sku}</span></p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      +{m.delta} received{m.ref ? ` · ${m.ref}` : ""}{m.location ? ` · ${m.location}` : ""} · {new Date(m.at).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Package className="h-4 w-4" />
          New stock without a matching PO? Tap "Receive stock" above, or use Inventory → Adjustments.
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <ReceiveForm initialRef={prefillRef} onDone={() => { reload(); setFormOpen(false) }} onCancel={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function ReceiveForm({ initialRef = "", onDone, onCancel }: { initialRef?: string; onDone: () => void; onCancel: () => void }) {
  const catalog = React.useMemo(() => loadAllCatalog(), [])
  const [sku, setSku] = React.useState("")
  const [qty, setQty] = React.useState("")
  const [ref, setRef] = React.useState(initialRef)
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
        delta: qtyNum,
        kind: "receive",
        ref: ref.trim() || undefined,
        location: location.trim() || undefined,
      })
      toast.success(`Received ${qtyNum} ${match.sku}${ref.trim() ? ` (${ref.trim()})` : ""}`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to receive stock")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-base font-semibold">Receive stock</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">Adds units to on-hand and logs the receipt.</p>
      <div className="mt-4 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Item SKU</span>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. EL-1001" list="rcv-skus" />
          <datalist id="rcv-skus">{catalog.map((c) => <option key={c.id} value={c.sku}>{c.name}</option>)}</datalist>
          {match && <span className="mt-1 block text-[11px] text-muted-foreground">{match.name}</span>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Quantity</span>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">PO / ref (opt)</span>
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="PO-1042" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Location (optional)</span>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Ikeja City Mall" />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || submitting}>{submitting ? "Saving…" : "Receive"}</Button>
      </div>
    </div>
  )
}
