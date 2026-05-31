import * as React from "react"
import { toast } from "sonner"
import { ArrowLeftRight, MoveRight, Plus, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { genId, listStockMovements, loadAllCatalog, recordStockMovement } from "@/lib/pos/storage"

type Status = "draft" | "in-transit" | "received" | "cancelled"
type Row = { id: string; from: string; to: string; items: number; status: Status; createdAt: string }

const statusTone: Record<Status, StatusTone> = {
  draft: "neutral",
  "in-transit": "info",
  received: "success",
  cancelled: "danger",
}

// A transfer is two movement legs (out at `from`, in at `to`) sharing a
// ref — net-zero on total on-hand, just relocated. We derive the list
// from the transfer-out legs.
function deriveTransfers(): Row[] {
  return listStockMovements()
    .filter((m) => m.kind === "transfer-out")
    .map((m) => ({
      id: m.ref || m.id,
      from: m.location || "—",
      to: m.toLocation || "—",
      items: Math.abs(m.delta),
      status: "received" as Status,
      createdAt: new Date(m.at).toLocaleDateString(),
    }))
}

export default function Transfers() {
  const [query, setQuery] = React.useState("")
  const [rows, setRows] = React.useState<Row[]>(() => deriveTransfers())
  const [formOpen, setFormOpen] = React.useState(false)
  const reload = React.useCallback(() => setRows(deriveTransfers()), [])
  useRegisterPageRefresh(React.useCallback(async () => { reload(); await new Promise((r) => setTimeout(r, 300)) }, [reload]))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) => r.id.toLowerCase().includes(q) || r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q),
    )
  }, [query, rows])

  const inTransit = rows.filter((r) => r.status === "in-transit").length
  const received = rows.filter((r) => r.status === "received").length

  return (
    <PageShell
      title="Stock transfers"
      withToolbar
      titleTooltip={
        <>
          Moving units between your own locations — e.g. shifting a
          pallet from your Ikeja warehouse to the Lekki shop. Doesn't
          change your total on-hand, just where it sits. Use this
          instead of POs (which order from suppliers).
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Transfers", value: String(rows.length), tone: "brand", hint: "all time" },
            { label: "In transit", value: String(inTransit), tone: "info", hint: "moving" },
            { label: "Received", value: String(received), tone: "success", hint: "closed" },
            { label: "Drafts", value: String(rows.filter((r) => r.status === "draft").length), tone: "warning", hint: "queued" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID or location…" className="pl-9" />
          </div>
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New transfer</Button>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              Icon={ArrowLeftRight}
              title={rows.length === 0 ? "No transfers yet" : "No transfers match"}
              description={rows.length === 0 ? "Move stock between your locations without changing the total on-hand." : "Try a different ID or location."}
              action={rows.length === 0 ? <Button onClick={() => setFormOpen(true)}>New transfer</Button> : undefined}
            />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                  <ArrowLeftRight className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {r.from} <MoveRight className="inline h-3 w-3 text-muted-foreground" /> {r.to}
                    </p>
                    <StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    <span className="font-mono">{r.id}</span> · {r.items} items · {r.createdAt}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <TransferForm onDone={() => { reload(); setFormOpen(false) }} onCancel={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function TransferForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const catalog = React.useMemo(() => loadAllCatalog(), [])
  const [sku, setSku] = React.useState("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [qty, setQty] = React.useState("")

  const match = catalog.find((c) => c.sku.toLowerCase() === sku.trim().toLowerCase())
  const qtyNum = Number(qty) || 0
  const valid = !!match && qtyNum > 0 && from.trim() && to.trim() && from.trim() !== to.trim()
  const [submitting, setSubmitting] = React.useState(false)

  const submit = () => {
    if (!match) { toast.error("Pick a valid SKU from the catalog"); return }
    if (qtyNum <= 0) { toast.error("Quantity must be greater than zero"); return }
    if (!from.trim() || !to.trim()) { toast.error("Pick both From and To locations"); return }
    if (from.trim() === to.trim()) { toast.error("From and To must be different locations"); return }
    setSubmitting(true)
    const ref = `TR-${genId("t").slice(-5).toUpperCase()}`
    try {
      recordStockMovement({ sku: match.sku, name: match.name, delta: -qtyNum, kind: "transfer-out", location: from.trim(), toLocation: to.trim(), ref })
      recordStockMovement({ sku: match.sku, name: match.name, delta: qtyNum, kind: "transfer-in", location: to.trim(), ref })
      toast.success(`Transferred ${qtyNum} ${match.sku} from ${from.trim()} to ${to.trim()}`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record transfer")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-base font-semibold">New stock transfer</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">Relocates stock between locations — total on-hand is unchanged.</p>
      <div className="mt-4 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Item SKU</span>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. AP-4012" list="tr-skus" />
          <datalist id="tr-skus">{catalog.map((c) => <option key={c.id} value={c.sku}>{c.name}</option>)}</datalist>
          {match && <span className="mt-1 block text-[11px] text-muted-foreground">{match.name}</span>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">From</span>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Ikeja City Mall" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">To</span>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Lekki Phase 1" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Quantity</span>
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || submitting}>{submitting ? "Saving…" : "Transfer"}</Button>
      </div>
    </div>
  )
}
