import * as React from "react"
import { Link } from "react-router-dom"
import {
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Plus,
  Printer,
  Search,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { FilterChips, type FilterChip } from "@/components/lists/filter-chips"
import { FilterButton } from "@/components/lists/filter-button"
import { FilterPillGroup, FilterSection, FilterSheet } from "@/components/lists/filter-sheet"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { SwipeableRow } from "@/components/mobile/swipeable-row"
import { useCurrency } from "@/contexts/currency"

type Status = "paid" | "unpaid" | "partial" | "overdue"
type Row = { id: string; order: string; customer: string; amount: number; status: Status; date: string; due: string }

const rows: Row[] = [
  { id: "INV-3301", order: "SO-7842", customer: "NovaApps", amount: 420.0, status: "paid", date: "2026-05-19", due: "May 19" },
  { id: "INV-3307", order: "SO-7849", customer: "BrightLane", amount: 120.0, status: "unpaid", date: "2026-05-20", due: "Jun 3" },
  { id: "INV-3306", order: "SO-7846", customer: "Daniel K.", amount: 1284.0, status: "paid", date: "2026-05-18", due: "May 18" },
  { id: "INV-3305", order: "SO-7841", customer: "Acme Co", amount: 3210.0, status: "partial", date: "2026-05-16", due: "May 30" },
  { id: "INV-3302", order: "SO-7822", customer: "Linda M.", amount: 92.15, status: "overdue", date: "2026-04-29", due: "May 13" },
  { id: "INV-3300", order: "SO-7818", customer: "Zenith Ltd", amount: 1860.0, status: "overdue", date: "2026-04-22", due: "May 6" },
]

const STATUS_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "unpaid", label: "Unpaid" },
  { value: "overdue", label: "Overdue" },
] as const

const statusTone: Record<Status, StatusTone> = {
  paid: "success",
  partial: "info",
  unpaid: "warning",
  overdue: "danger",
}

export default function Invoices() {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")
  const { formatPrice } = useCurrency()
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [statuses, setStatuses] = React.useState<Status[]>([])
  const [stagedStatuses, setStagedStatuses] = React.useState<Status[]>([])

  React.useEffect(() => {
    if (filterOpen) setStagedStatuses(statuses)
  }, [filterOpen, statuses])

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    let list = rows
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        r.id.toLowerCase().includes(q) ||
        r.order.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q),
      )
    }
    if (statuses.length > 0) list = list.filter((r) => statuses.includes(r.status))
    return list
  }, [query, statuses])

  const chips: FilterChip[] = statuses.map((s) => ({
    key: `s:${s}`,
    label: STATUS_OPTIONS.find((o) => o.value === s)!.label,
    onRemove: () => setStatuses((p) => p.filter((x) => x !== s)),
  }))

  const totalOutstanding = rows.filter((r) => r.status !== "paid").reduce((s, r) => s + r.amount, 0)
  const overdue = rows.filter((r) => r.status === "overdue")
  const paidThis = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0)

  return (
    <PageShell
      title="Invoices"
      withToolbar
      mobileTrailing={<FilterButton onClick={() => setFilterOpen(true)} count={chips.length} />}
      titleTooltip={
        <>
          Invoices <em>you've sent</em> to <em>your customers</em> —
          money they owe you. Each one tracks its status (unpaid,
          partial, paid, overdue) and the running total of what's still
          out there. Different from <strong>Bills</strong>, which are
          invoices suppliers have sent to <em>you</em>.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Outstanding", value: formatPrice(totalOutstanding), tone: "warning", hint: "owed" },
            { label: "Overdue", value: String(overdue.length), tone: "danger", hint: formatPrice(overdue.reduce((s, r) => s + r.amount, 0)) },
            { label: "Paid", value: formatPrice(paidThis), tone: "success", hint: "this period" },
            { label: "Invoices", value: String(rows.length), tone: "brand", hint: "total" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice, order, or customer…" className="pl-9" />
          </div>
          <Button variant="outline" className="hidden md:inline-flex" onClick={() => setFilterOpen(true)}>
            <Filter className="h-4 w-4" /> Filters {chips.length ? `(${chips.length})` : ""}
          </Button>
          <Link to="/sales/invoices/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> New invoice</Button>
          </Link>
        </div>

        <FilterChips chips={chips} onClearAll={chips.length > 0 ? () => setStatuses([]) : undefined} />

        {overdue.length > 0 && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-200">
            <span className="font-semibold">{overdue.length} overdue {overdue.length === 1 ? "invoice" : "invoices"}</span> — {formatPrice(overdue.reduce((s, r) => s + r.amount, 0))} aged past due. Consider sending reminders.
          </div>
        )}

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={FileText} title="No invoices match" description="Adjust filters or clear search to broaden the view." />
          </CardContent></Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <SwipeableRow
                  rightActions={[
                    { label: "Print", tone: "neutral", icon: <Printer className="h-4 w-4" />, onPress: () => {} },
                    { label: "Pay", tone: "primary", icon: <CreditCard className="h-4 w-4" />, onPress: () => {} },
                  ]}
                >
                  <Link to={`/sales/invoices/${r.id}`} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{r.customer}</p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(r.amount)}</p>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate"><span className="font-mono">{r.id}</span> · {r.order}</span>
                        <StatusBadge tone={statusTone[r.status]}>{r.status}</StatusBadge>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> Due {r.due}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </SwipeableRow>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Invoice</th>
                  <th className="px-3 py-2.5 font-medium">Order</th>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
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
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.order}</td>
                    <td className="px-3 py-2.5 font-medium">{r.customer}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(r.amount)}</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.due}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild><Link to={`/sales/invoices/${r.id}`}>Open</Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={() => setStatuses(stagedStatuses)}
        onReset={() => setStagedStatuses([])}
        appliedCount={chips.length}
        title="Filter invoices"
      >
        <FilterSection title="Status">
          <FilterPillGroup
            multi
            options={STATUS_OPTIONS as unknown as { value: Status; label: string }[]}
            value={stagedStatuses}
            onChange={(v) => setStagedStatuses(Array.isArray(v) ? v : v ? [v] : [])}
          />
        </FilterSection>
      </FilterSheet>
    </PageShell>
  )
}
