import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronRight, PackageMinus, Plus, RotateCcw, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useCurrency } from "@/contexts/currency"
import { RETURNS as rows, RETURN_TONE as tone } from "./data"

export default function SalesReturns() {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")
  const { formatPrice } = useCurrency()

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.invoice.toLowerCase().includes(q) ||
      r.customer.toLowerCase().includes(q),
    )
  }, [query])

  const pending = rows.filter((r) => r.status === "pending").length
  const refundedTotal = rows.filter((r) => r.status === "refunded").reduce((s, r) => s + r.amount, 0)
  const approved = rows.filter((r) => r.status === "approved").length

  return (
    <PageShell
      title="Returns"
      withToolbar
      titleTooltip={
        <>
          Customers bringing items back. Each return is also called an
          <strong> RMA</strong> (Return Merchandise Authorisation) —
          Pallio uses it to track refunds, restock decisions, and
          whether to send the customer a prepaid shipping label.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Pending", value: String(pending), tone: "warning", hint: "review" },
            { label: "Approved", value: String(approved), tone: "info", hint: "to refund" },
            { label: "Refunded", value: formatPrice(refundedTotal), tone: "success", hint: "this period" },
            { label: "Returns", value: String(rows.length), tone: "brand", hint: "total" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search return, invoice, or customer…" className="pl-9" />
          </div>
          <Link to="/sales/returns/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> Start return</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={RotateCcw} title="No returns match" description="Adjust search to broaden the view." />
          </CardContent></Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link to={`/sales/returns/${r.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                    <PackageMinus className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{r.customer}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(r.amount)}</p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate"><span className="font-mono">{r.id}</span> · {r.invoice} · {r.reason}</span>
                      <StatusBadge tone={tone[r.status]}>{r.status}</StatusBadge>
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
                  <th className="px-3 py-2.5 font-medium">Return</th>
                  <th className="px-3 py-2.5 font-medium">Invoice</th>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Reason</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5 font-mono text-xs">{r.id}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.invoice}</td>
                    <td className="px-3 py-2.5 font-medium">{r.customer}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(r.amount)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.reason}</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={tone[r.status]} withDot>{r.status}</StatusBadge></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.date}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild><Link to={`/sales/returns/${r.id}`}>Open</Link></Button>
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
