import * as React from "react"
import { toast } from "sonner"
import { Plus, Trash2, Webhook } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge } from "@/components/lists/status-badge"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"

type Endpoint = { id: string; url: string; events: string[]; active: boolean; lastDelivery: string }

const EVENT_OPTIONS = ["order.paid", "invoice.created", "stock.low", "payout.sent", "customer.created", "return.created"]

const SEED: Endpoint[] = [
  { id: "w1", url: "https://hooks.acme.co/pallio", events: ["order.paid", "invoice.created"], active: true, lastDelivery: "2xx · 4m ago" },
  { id: "w2", url: "https://ops.lagosmart.ng/sync", events: ["stock.low"], active: false, lastDelivery: "never" },
]

export default function WebhooksSettings() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))
  const [rows, setRows] = React.useState<Endpoint[]>(SEED)
  const [addOpen, setAddOpen] = React.useState(false)
  const [url, setUrl] = React.useState("")
  const [events, setEvents] = React.useState<string[]>([])
  const [pendingToggle, setPendingToggle] = React.useState<string | null>(null)

  const toggleEvent = (e: string) => setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  const create = () => {
    if (!url.trim() || events.length === 0) return
    setRows((prev) => [{ id: `w-${Date.now()}`, url: url.trim(), events, active: true, lastDelivery: "never" }, ...prev])
    toast.success("Endpoint added", { description: url.trim() })
    setUrl(""); setEvents([]); setAddOpen(false)
  }
  const toggleActive = async (id: string) => {
    setPendingToggle(id)
    const target = rows.find((r) => r.id === id)
    const nextActive = !target?.active
    // Optimistic update — flip first, roll back on failure.
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)))
    try {
      await new Promise((r) => setTimeout(r, 400))
      toast.success(nextActive ? "Endpoint resumed" : "Endpoint paused", { description: target?.url })
    } catch {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)))
      toast.error("Couldn't update endpoint", { description: "Try again in a moment." })
    } finally {
      setPendingToggle(null)
    }
  }
  const remove = (r: Endpoint) => {
    setRows((prev) => prev.filter((x) => x.id !== r.id))
    toast(`Endpoint removed`, { description: r.url, action: { label: "Undo", onClick: () => setRows((prev) => [r, ...prev]) } })
  }

  return (
    <PageShell
      title="Webhooks"
      withToolbar={false}
      titleTooltip="Pallio POSTs an event to your URL the moment something happens — a sale is paid, stock runs low, a payout is sent — so your own systems stay in sync in real time. Each delivery is signed; failures retry with backoff."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Receive signed event callbacks at your own endpoints.</p>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add endpoint</Button>
        </div>

        {rows.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={Webhook} title="No endpoints yet" description="Add a URL to start receiving event callbacks." action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add endpoint</Button>} />
          </CardContent></Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                  <Webhook className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-xs font-semibold">{r.url}</p>
                    <StatusBadge tone={r.active ? "success" : "neutral"} withDot>{r.active ? "active" : "paused"}</StatusBadge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.events.map((e) => (
                      <span key={e} className="rounded-full border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">{e}</span>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Last delivery: {r.lastDelivery}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(r.id)} disabled={pendingToggle === r.id}>{pendingToggle === r.id ? "Saving…" : r.active ? "Pause" : "Resume"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label="Delete endpoint" className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add webhook endpoint"
        description="Where should Pallio POST events, and which ones?"
        maxHeightVh={82}
        footer={
          <div className="flex items-center justify-end gap-2 pb-3">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={!url.trim() || events.length === 0}>Add endpoint</Button>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); create() }} className="flex flex-col gap-3 pb-1">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-foreground/80">Endpoint URL</span>
            <Input autoFocus type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.yoursite.com/pallio" />
          </label>
          <div className="text-xs">
            <span className="font-semibold text-foreground/80">Events</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {EVENT_OPTIONS.map((e) => (
                <button key={e} type="button" onClick={() => toggleEvent(e)}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${events.includes(e) ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/15 dark:text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </BottomSheet>
    </PageShell>
  )
}
