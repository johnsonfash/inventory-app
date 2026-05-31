import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Search, Truck } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { SHIPMENTS as rows, SHIPMENT_TONE as tone } from "./data"

export default function SalesShipments() {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.order.toLowerCase().includes(q) ||
        r.tracking.toLowerCase().includes(q) ||
        r.carrier.toLowerCase().includes(q),
    )
  }, [query])

  const inTransit = rows.filter((r) => r.status === "in-transit").length
  const delivered = rows.filter((r) => r.status === "delivered").length
  const awaiting = rows.filter((r) => r.status === "label").length
  const returned = rows.filter((r) => r.status === "returned").length

  return (
    <PageShell
      title="Shipments"
      withToolbar
      titleTooltip={
        <>
          Outbound parcels — labels you've bought + dispatched to
          customers, each tied to a sales order. Track status from
          <em> printed → in-transit → delivered</em>, and email the
          customer when a courier hands back an exception.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "In transit", value: String(inTransit), tone: "info", hint: "moving" },
            { label: "Awaiting pickup", value: String(awaiting), tone: "warning", hint: "label printed" },
            { label: "Delivered", value: String(delivered), tone: "success", hint: "this period" },
            { label: "Returned", value: String(returned), tone: "danger", hint: "needs attention" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by order, tracking, or carrier…" className="pl-9" />
          </div>
          <Link to="/sales/shipments/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> New shipment</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={Truck} title="No shipments match" description="Adjust search to broaden the view." />
          </CardContent></Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link to={`/sales/shipments/${r.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{r.carrier} · <span className="font-mono">{r.tracking}</span></p>
                      <StatusBadge tone={tone[r.status]}>{r.status}</StatusBadge>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{r.id}</span> · {r.order}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{r.eta}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Shipment</th>
                  <th className="px-3 py-2.5 font-medium">Order</th>
                  <th className="px-3 py-2.5 font-medium">Carrier</th>
                  <th className="px-3 py-2.5 font-medium">Tracking</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">ETA</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5 font-mono text-xs">{r.id}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.order}</td>
                    <td className="px-3 py-2.5 font-medium">{r.carrier}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.tracking}</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={tone[r.status]} withDot>{r.status}</StatusBadge></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.eta}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild><Link to={`/sales/shipments/${r.id}`}>Open</Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  )
}
