import * as React from "react"
import { toast } from "sonner"
import { CheckCircle2, Plus, Printer, Search, Trash2, Wifi, WifiOff } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { AddPrinterDialog, type QuickPrinter } from "@/components/dialogs/add-printer-dialog"

type Row = {
  id: string
  name: string
  model: string
  type: "receipt" | "label" | "kitchen"
  location: string
  connection: "wifi" | "usb" | "bluetooth"
  status: "online" | "offline" | "needs-paper"
  isDefault: boolean
}

const SEED_PRINTERS: Row[] = [
  { id: "P-1", name: "Downtown POS-1", model: "Star TSP100III", type: "receipt", location: "Downtown Austin", connection: "wifi", status: "online", isDefault: true },
  { id: "P-2", name: "Downtown POS-2", model: "Epson TM-m30", type: "receipt", location: "Downtown Austin", connection: "wifi", status: "needs-paper", isDefault: false },
  { id: "P-3", name: "Stock labeller", model: "Zebra ZD420", type: "label", location: "WH-A", connection: "usb", status: "online", isDefault: true },
  { id: "P-4", name: "Kitchen", model: "Star SP742", type: "kitchen", location: "Café — Atlanta", connection: "wifi", status: "offline", isDefault: true },
]

const statusTone: Record<Row["status"], StatusTone> = {
  online: "success",
  offline: "danger",
  "needs-paper": "warning",
}

const typeTone: Record<Row["type"], StatusTone> = {
  receipt: "brand",
  label: "info",
  kitchen: "warning",
}

export default function Printers() {
  const [query, setQuery] = React.useState("")
  const [rows, setRows] = React.useState<Row[]>(SEED_PRINTERS)
  const [addOpen, setAddOpen] = React.useState(false)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const detail = detailId ? rows.find((r) => r.id === detailId) ?? null : null

  const handleTestPrint = (r: Row) => {
    toast.success("Test print sent", { description: `${r.name} · ${r.model}` })
  }
  const handleSetDefault = (r: Row) => {
    // Default is per-type — only one receipt printer can be the default at a
    // time, but a label printer can also be default at the same time.
    setRows((prev) => prev.map((x) => x.type === r.type ? { ...x, isDefault: x.id === r.id } : x))
    toast.success("Default printer updated", { description: `${r.name} is now the default ${r.type} printer` })
  }
  const handleRemove = (r: Row) => {
    setRows((prev) => prev.filter((x) => x.id !== r.id))
    toast.success("Printer removed", { description: r.name })
    setDetailId(null)
  }

  const handleCreate = (p: QuickPrinter) => {
    setRows((prev) => [
      { id: `P-${Date.now()}`, isDefault: prev.length === 0, status: "online", ...p },
      ...prev,
    ])
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.model.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q),
    )
  }, [query, rows])

  const online = rows.filter((r) => r.status === "online").length
  const offline = rows.filter((r) => r.status === "offline").length

  return (
    <PageShell
      title="Receipt printers"
      withToolbar={false}
      titleTooltip={
        <>
          Hardware Pallio sends print jobs to — thermal receipt
          printers (the till slip), label printers (barcode stickers
          for stock), and kitchen printers (restaurants). Connect once
          here and every checkout uses the right device.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Printers", value: String(rows.length), tone: "brand", hint: "configured" },
            { label: "Online", value: String(online), tone: "success", hint: "ready" },
            { label: "Offline", value: String(offline), tone: "danger", hint: "investigate" },
            { label: "Locations", value: String(new Set(rows.map((r) => r.location)).size), tone: "info", hint: "covered" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, model, or location…" className="pl-9" />
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add printer</Button>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              Icon={Printer}
              title={query ? "No printers match" : "No printers yet"}
              description={query ? "Try a different name." : "Add a receipt, label, or kitchen printer to route print jobs."}
              action={!query ? <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add printer</Button> : undefined}
            />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setDetailId(r.id)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-brand/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label={`Open ${r.name} details`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <Printer className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {r.name}
                        {r.isDefault && <StatusBadge tone="success" className="ml-2">default</StatusBadge>}
                      </p>
                      <StatusBadge tone={statusTone[r.status]} withDot>
                        {r.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {r.model} · {r.location}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <StatusBadge tone={typeTone[r.type]}>{r.type}</StatusBadge>
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        {r.status === "offline" ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                        {r.connection}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MobileFab onClick={() => setAddOpen(true)} label="Add printer" />
      <AddPrinterDialog open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} />

      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetailId(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <Printer className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <DialogTitle>{detail.name}</DialogTitle>
                    <DialogDescription>
                      {detail.model} · {detail.location}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge tone={statusTone[detail.status]} withDot>{detail.status}</StatusBadge>
                    {detail.isDefault && <StatusBadge tone="success">default</StatusBadge>}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type · Connection</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge tone={typeTone[detail.type]}>{detail.type}</StatusBadge>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      {detail.status === "offline" ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                      {detail.connection}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-wrap">
                <Button variant="outline" size="sm" onClick={() => handleTestPrint(detail)}>
                  <Printer className="h-3.5 w-3.5" /> Test print
                </Button>
                {!detail.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => handleSetDefault(detail)}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Make default
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-500/40 text-rose-600 dark:text-rose-400"
                  onClick={() => handleRemove(detail)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
                <Button size="sm" onClick={() => setDetailId(null)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
