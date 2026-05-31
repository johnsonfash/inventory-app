import * as React from "react"
import { Link } from "react-router-dom"
import { Box, ChevronRight, FileCheck, Plus, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"

type Status = "draft" | "partial" | "complete"
type Row = { id: string; po: string; vendor: string; items: number; receivedItems: number; date: string; status: Status }

const rows: Row[] = [
  { id: "GR-3041", po: "PO-1042", vendor: "Cobalt Distributors", items: 8, receivedItems: 8, date: "2026-05-19", status: "complete" },
  { id: "GR-3040", po: "PO-1041", vendor: "Glow Co", items: 4, receivedItems: 2, date: "2026-05-18", status: "partial" },
  { id: "GR-3039", po: "PO-1040", vendor: "Acme Supplies", items: 6, receivedItems: 0, date: "2026-05-17", status: "draft" },
  { id: "GR-3038", po: "PO-1038", vendor: "Delta Apparel", items: 24, receivedItems: 24, date: "2026-05-15", status: "complete" },
]

const statusTone: Record<Status, StatusTone> = {
  draft: "neutral",
  partial: "warning",
  complete: "success",
}

export default function Receipts() {
  const [query, setQuery] = React.useState("")
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) => r.id.toLowerCase().includes(q) || r.po.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q),
    )
  }, [query])

  const complete = rows.filter((r) => r.status === "complete").length
  const partial = rows.filter((r) => r.status === "partial").length
  const totalReceived = rows.reduce((s, r) => s + r.receivedItems, 0)

  return (
    <PageShell
      title="Goods receipts"
      withToolbar
      titleTooltip={
        <>
          A <strong>goods receipt</strong> is the moment stock physically
          arrives at your shop or warehouse from a supplier. Recording
          one tells Pallio "this PO showed up — add the new units to my
          on-hand count and start the return-window clock."
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Receipts", value: String(rows.length), tone: "brand", hint: "total" },
            { label: "Complete", value: String(complete), tone: "success", hint: "closed" },
            { label: "Partial", value: String(partial), tone: "warning", hint: "in progress" },
            { label: "Units received", value: String(totalReceived), tone: "info", hint: "this period" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipt, PO, or vendor…" className="pl-9" />
          </div>
          <Link to="/purchasing/receipts/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> New receipt</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={FileCheck} title="No receipts match" description="Try a different filter." />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => {
              const pct = Math.round((r.receivedItems / Math.max(1, r.items)) * 100)
              return (
                <li key={r.id}>
                  <Link to={`/purchasing/receipts/${r.id.toLowerCase()}`} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Box className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{r.vendor}</p>
                        <StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{r.id}</span> · {r.po} · {r.date}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {r.receivedItems}/{r.items}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
