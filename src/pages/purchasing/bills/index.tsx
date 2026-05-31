import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronRight, FileText, Loader2, Plus, Receipt, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useCurrency } from "@/contexts/currency"

type Status = "paid" | "partial" | "unpaid" | "overdue"
type Row = { id: string; po: string; vendor: string; amount: number; status: Status; due: string }

const rows: Row[] = [
  { id: "BILL-9001", po: "PO-1043", vendor: "Cobalt Distributors", amount: 4820.0, status: "paid", due: "May 18" },
  { id: "BILL-9002", po: "PO-1044", vendor: "Glow Co", amount: 1240.0, status: "partial", due: "May 22" },
  { id: "BILL-9003", po: "PO-1045", vendor: "Acme Supplies", amount: 920.0, status: "unpaid", due: "May 25" },
  { id: "BILL-9004", po: "PO-1046", vendor: "Porcel Ceramics", amount: 2110.0, status: "overdue", due: "May 12" },
  { id: "BILL-9005", po: "PO-1047", vendor: "Delta Apparel", amount: 5800.0, status: "paid", due: "May 8" },
]

const tone: Record<Status, StatusTone> = { paid: "success", partial: "info", unpaid: "warning", overdue: "danger" }

export default function Bills() {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")
  const [refreshing, setRefreshing] = React.useState(false)
  const { formatPrice } = useCurrency()

  useRegisterPageRefresh(
    React.useCallback(async () => {
      setRefreshing(true)
      try { await new Promise((r) => setTimeout(r, 400)) } finally { setRefreshing(false) }
    }, []),
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.po.toLowerCase().includes(q) ||
      r.vendor.toLowerCase().includes(q),
    )
  }, [query])

  const unpaid = rows.filter((r) => r.status !== "paid").reduce((s, r) => s + r.amount, 0)
  const overdue = rows.filter((r) => r.status === "overdue")
  const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0)

  return (
    <PageShell
      title="Bills"
      withToolbar
      titleTooltip={
        <>
          Invoices <em>your suppliers</em> have sent <em>you</em> —
          money you owe. Pallio tracks each one's status (unpaid,
          partial, paid) and warns you before they go overdue.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Owed to vendors", value: formatPrice(unpaid), tone: "warning", hint: "outstanding" },
            { label: "Overdue", value: String(overdue.length), tone: "danger", hint: formatPrice(overdue.reduce((s, r) => s + r.amount, 0)) },
            { label: "Settled", value: formatPrice(paid), tone: "success", hint: "this period" },
            { label: "Bills", value: String(rows.length), tone: "brand", hint: "total" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bill, PO, or vendor…" className="pl-9" />
          </div>
          {refreshing && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refreshing…
            </span>
          )}
          <Link to="/purchasing/bills/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> New bill</Button>
          </Link>
        </div>

        {overdue.length > 0 && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-200">
            <span className="font-semibold">{overdue.length} overdue {overdue.length === 1 ? "bill" : "bills"}</span> — {formatPrice(overdue.reduce((s, r) => s + r.amount, 0))} past due. Pay now to maintain vendor terms.
          </div>
        )}

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={Receipt} title="No bills match" description="Adjust search to broaden the view." />
          </CardContent></Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link to={`/purchasing/bills/${r.id.toLowerCase()}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{r.vendor}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(r.amount)}</p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate"><span className="font-mono">{r.id}</span> · {r.po}</span>
                      <StatusBadge tone={tone[r.status]}>{r.status}</StatusBadge>
                    </div>
                    <div className={r.status === "overdue" ? "mt-1 text-[10px] font-medium tabular-nums text-rose-600 dark:text-rose-400" : "mt-1 text-[10px] tabular-nums text-muted-foreground"}>
                      Due {r.due}
                    </div>
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
                  <th className="px-3 py-2.5 font-medium">Bill</th>
                  <th className="px-3 py-2.5 font-medium">PO</th>
                  <th className="px-3 py-2.5 font-medium">Vendor</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Due</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5 font-mono text-xs">{r.id}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.po}</td>
                    <td className="px-3 py-2.5 font-medium">{r.vendor}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(r.amount)}</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={tone[r.status]} withDot>{r.status}</StatusBadge></td>
                    <td className={r.status === "overdue" ? "px-3 py-2.5 font-medium text-rose-600 dark:text-rose-400" : "px-3 py-2.5 text-muted-foreground"}>{r.due}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild><Link to={`/purchasing/bills/${r.id.toLowerCase()}`}>Pay</Link></Button>
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
