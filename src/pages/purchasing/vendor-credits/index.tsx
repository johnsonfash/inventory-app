import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronRight, FileMinus, Loader2, Plus, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useCurrency } from "@/contexts/currency"

type Status = "open" | "applied" | "expired"
type Row = { id: string; vendor: string; amount: number; reason: string; date: string; status: Status }

const rows: Row[] = [
  { id: "VC-2001", vendor: "Cobalt Distributors", amount: 120, reason: "Overbilling on PO-1042", date: "2026-05-19", status: "open" },
  { id: "VC-2002", vendor: "Glow Co", amount: 320, reason: "Damaged shipment refund", date: "2026-05-17", status: "applied" },
  { id: "VC-2003", vendor: "Acme Supplies", amount: 84, reason: "Short shipment", date: "2026-05-12", status: "open" },
  { id: "VC-2004", vendor: "Porcel Ceramics", amount: 56, reason: "Holiday promo rebate", date: "2026-04-30", status: "expired" },
]

const statusTone: Record<Status, StatusTone> = {
  open: "warning",
  applied: "success",
  expired: "neutral",
}

export default function VendorCredits() {
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
    return rows.filter(
      (r) => r.vendor.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q),
    )
  }, [query])

  const openTotal = rows.filter((r) => r.status === "open").reduce((s, r) => s + r.amount, 0)
  const applied = rows.filter((r) => r.status === "applied").reduce((s, r) => s + r.amount, 0)

  return (
    <PageShell
      title="Vendor credits"
      withToolbar
      titleTooltip={
        <>
          A <strong>vendor credit</strong> is money the supplier owes
          you back — for over-billing, damaged goods, short shipments,
          or rebates. Pallio applies it to the supplier's next bill so
          you pay less, rather than waiting for an actual refund.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Credits", value: String(rows.length), tone: "brand", hint: "total" },
            { label: "Open balance", value: formatPrice(openTotal), tone: "warning", hint: "to apply" },
            { label: "Applied", value: formatPrice(applied), tone: "success", hint: "this period" },
            { label: "Vendors", value: String(new Set(rows.map((r) => r.vendor)).size), tone: "info", hint: "covered" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vendor or reason…" className="pl-9" />
          </div>
          {refreshing && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refreshing…
            </span>
          )}
          <Link to="/purchasing/vendor-credits/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> New credit</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={FileMinus} title="No credits match" description="Try a different filter." />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link to={`/purchasing/vendor-credits/${r.id.toLowerCase()}`} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                    <FileMinus className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{r.vendor}</p>
                      <p className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(r.amount)}</p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{r.reason}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span><span className="font-mono">{r.id}</span> · {r.date}</span>
                      <StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
