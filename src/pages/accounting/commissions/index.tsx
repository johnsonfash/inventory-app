import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  Award,
  Building2,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Filter,
  Receipt,
  Send,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { type Period } from "@/components/reports/period-chips"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { Avatar } from "@/components/avatar"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { CommissionRulesSheet } from "@/components/commissions/commission-rules-sheet"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type EntryState = "pending" | "approved" | "paid" | "rejected"
type EntryType  = "sales" | "affiliate"

type Entry = {
  id: string
  type: EntryType
  earnedAt: string
  recipient: { id: string; name: string; email: string; role: string }
  source: string
  basis: number
  rate: number
  amount: number
  state: EntryState
  paidDate?: string
  bankShort: string
}

// Withholding tax on commission/professional-service payouts. NG FIRS
// rate is 5% for individuals/most services — held back from the gross
// and remitted, so the recipient nets gross − WHT. Backend will make
// this configurable per jurisdiction.
const WHT_RATE = 0.05
const whtOf = (gross: number) => Math.round(gross * WHT_RATE)
const netOf = (gross: number) => gross - whtOf(gross)

const SEED_ENTRIES: Entry[] = [
  // Pending — earned this month, not yet approved
  { id: "COMM-2026-05-001", type: "affiliate", earnedAt: "May 20, 2026", recipient: { id: "a-1", name: "Tunde Bello",     email: "tunde@ekopro.com",  role: "Affiliate · Lagos" },   source: "12 orders via TUNDE10",     basis: 412_400, rate: 10, amount: 41_240, state: "pending", bankShort: "GTBank ··· 4218" },
  { id: "COMM-2026-05-002", type: "affiliate", earnedAt: "May 19, 2026", recipient: { id: "a-2", name: "Aisha Personal",  email: "aisha@personal.io", role: "Affiliate · Influencer" },source: "8 orders via AISHA15",     basis: 218_800, rate: 15, amount: 32_820, state: "pending", bankShort: "Kuda ··· 3382" },
  { id: "COMM-2026-05-003", type: "sales",     earnedAt: "May 18, 2026", recipient: { id: "m-3", name: "Tunde Bello",     email: "tunde@funkeapparel.com", role: "Sales rep · Ikeja" },    source: "Q2 sales target hit",        basis: 1_360_000, rate: 5,  amount: 68_000, state: "pending", bankShort: "First Bank ··· 1188" },
  { id: "COMM-2026-05-004", type: "sales",     earnedAt: "May 17, 2026", recipient: { id: "m-1", name: "Mia Chen",         email: "mia@funkeapparel.com",  role: "Manager · Lekki" },    source: "Branch overage",              basis: 1_680_000, rate: 5,  amount: 84_000, state: "pending", bankShort: "GTBank ··· 4218" },
  { id: "COMM-2026-05-005", type: "affiliate", earnedAt: "May 14, 2026", recipient: { id: "a-3", name: "Linda Mensah",     email: "linda.m@studio.so",  role: "Affiliate · UGC creator" },source: "6 orders via LINDA12",      basis:  178_000, rate: 12, amount: 21_360, state: "pending", bankShort: "Opay ··· 2204" },

  // Approved — ready to pay
  { id: "COMM-2026-05-006", type: "affiliate", earnedAt: "May 12, 2026", recipient: { id: "a-4", name: "Hauwa Mohammed",  email: "hauwa@kano.ng",     role: "Affiliate · Kano lead" },source: "4 orders via HAUWA10",     basis:  92_400, rate: 10, amount:  9_240, state: "approved", bankShort: "Sterling ··· 7766" },
  { id: "COMM-2026-05-007", type: "sales",     earnedAt: "May 10, 2026", recipient: { id: "m-2", name: "Alex Reyes",      email: "alex@funkeapparel.com", role: "Cashier · Lekki" },    source: "Daily target Apr 1-30",       basis:  240_000, rate: 5,  amount: 12_000, state: "approved", bankShort: "Access ··· 9931" },

  // Paid — historical
  { id: "COMM-2026-04-014", type: "affiliate", earnedAt: "Apr 28, 2026", recipient: { id: "a-1", name: "Tunde Bello",     email: "tunde@ekopro.com",  role: "Affiliate · Lagos" },   source: "April · 18 orders",          basis: 612_800, rate: 10, amount: 61_280, state: "paid", paidDate: "May 5, 2026",  bankShort: "GTBank ··· 4218" },
  { id: "COMM-2026-04-015", type: "affiliate", earnedAt: "Apr 28, 2026", recipient: { id: "a-2", name: "Aisha Personal",  email: "aisha@personal.io", role: "Affiliate · Influencer" },source: "April · 11 orders",         basis: 284_000, rate: 15, amount: 42_600, state: "paid", paidDate: "May 5, 2026",  bankShort: "Kuda ··· 3382" },
  { id: "COMM-2026-04-016", type: "sales",     earnedAt: "Apr 30, 2026", recipient: { id: "m-3", name: "Tunde Bello",     email: "tunde@funkeapparel.com", role: "Sales rep · Ikeja" },    source: "April closing",              basis: 1_240_000, rate: 5,  amount: 62_000, state: "paid", paidDate: "May 5, 2026",  bankShort: "First Bank ··· 1188" },
  { id: "COMM-2026-03-022", type: "affiliate", earnedAt: "Mar 30, 2026", recipient: { id: "a-1", name: "Tunde Bello",     email: "tunde@ekopro.com",  role: "Affiliate · Lagos" },   source: "March · 14 orders",         basis: 482_000, rate: 10, amount: 48_200, state: "paid", paidDate: "Apr 5, 2026",  bankShort: "GTBank ··· 4218" },

  // Rejected
  { id: "COMM-2026-05-008", type: "affiliate", earnedAt: "May 6, 2026",  recipient: { id: "a-5", name: "Walk-in shopper",  email: "guest@pallio.shop", role: "Affiliate · trial" },   source: "1 order (refunded)",         basis:  24_500, rate: 10, amount:  2_450, state: "rejected", bankShort: "—" },
]

const STATE_TONE: Record<EntryState, StatusTone> = {
  pending:   "warning",
  approved:  "info",
  paid:      "success",
  rejected:  "neutral",
}

type Filter = "all" | EntryState | EntryType

export default function CommissionsPayout() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const [period, setPeriod] = React.useState<Period>("30d")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [entries, setEntries] = React.useState<Entry[]>(SEED_ENTRIES)
  const [statementFor, setStatementFor] = React.useState<string | null>(null)
  const [rulesOpen, setRulesOpen] = React.useState(false)

  const todayLabel = () => new Date().toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })

  // --- State machine. Approve verifies pending → approved; pay debits
  // + transfers approved → paid (records the date); reject voids a
  // pending entry (e.g. the underlying order was refunded). All support
  // a single id or a batch, and clear those ids from the selection.
  const setState = (ids: Set<string>, from: EntryState, to: EntryState, stamp = false) => {
    setEntries((prev) => prev.map((e) =>
      ids.has(e.id) && e.state === from
        ? { ...e, state: to, ...(stamp ? { paidDate: todayLabel() } : {}) }
        : e,
    ))
    setSelectedIds(new Set())
  }
  const idsOrAll = (explicit: Set<string>, fallbackState: EntryState) =>
    explicit.size > 0 ? explicit : new Set(entries.filter((e) => e.state === fallbackState).map((e) => e.id))

  const approve = (ids: Set<string>) => {
    const target = idsOrAll(ids, "pending")
    const n = entries.filter((e) => target.has(e.id) && e.state === "pending").length
    setState(target, "pending", "approved")
    toast.success(`${n} ${n === 1 ? "entry" : "entries"} approved`, { description: "Ready for the next batch payout." })
  }
  const pay = (ids: Set<string>) => {
    const target = idsOrAll(ids, "approved")
    const rows = entries.filter((e) => target.has(e.id) && e.state === "approved")
    const gross = rows.reduce((s, e) => s + e.amount, 0)
    setState(target, "approved", "paid", true)
    toast.success(`Paid ${rows.length} · ${formatPrice(netOf(gross))} net`, { description: `${formatPrice(whtOf(gross))} WHT withheld · transfers via Paystack NIBSS.` })
  }
  const reject = (e: Entry) => {
    setEntries((prev) => prev.map((x) => (x.id === e.id ? { ...x, state: "rejected" } : x)))
    toast(`${e.id} rejected`, {
      description: e.recipient.name,
      action: { label: "Undo", onClick: () => setEntries((prev) => prev.map((x) => (x.id === e.id ? { ...x, state: "pending" } : x))) },
    })
  }

  const filtered = React.useMemo(() => {
    return entries.filter((e) => {
      if (filter === "all") return true
      if (filter === "sales" || filter === "affiliate") return e.type === filter
      return e.state === filter
    })
  }, [filter, entries])

  const pending     = entries.filter((e) => e.state === "pending")
  const approved    = entries.filter((e) => e.state === "approved")
  const paid        = entries.filter((e) => e.state === "paid")
  const owed        = pending.reduce((s, e) => s + e.amount, 0) + approved.reduce((s, e) => s + e.amount, 0)
  const paidYTD     = paid.reduce((s, e) => s + e.amount, 0)
  const approvedNow = approved.reduce((s, e) => s + e.amount, 0)

  const counts: Record<Filter, number> = {
    all:       entries.length,
    pending:   pending.length,
    approved:  approved.length,
    paid:      paid.length,
    rejected:  entries.filter((e) => e.state === "rejected").length,
    sales:     entries.filter((e) => e.type === "sales").length,
    affiliate: entries.filter((e) => e.type === "affiliate").length,
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleAll = (rows: Entry[]) => {
    const selectable = rows.filter((r) => r.state === "pending" || r.state === "approved")
    const allSelected = selectable.length > 0 && selectable.every((r) => selectedIds.has(r.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) selectable.forEach((r) => next.delete(r.id))
      else selectable.forEach((r) => next.add(r.id))
      return next
    })
  }
  const selectedAmount = entries.filter((e) => selectedIds.has(e.id)).reduce((s, e) => s + e.amount, 0)

  // Per-recipient statement (drawer): every entry for one person + totals.
  const statementEntries = statementFor ? entries.filter((e) => e.recipient.email === statementFor) : []
  const statementName = statementEntries[0]?.recipient.name ?? ""

  const exportRows = entries.map((e) => ({
    id: e.id, type: e.type, recipient: e.recipient.name, source: e.source,
    basis: e.basis, rate_pct: e.rate, gross: e.amount, wht: whtOf(e.amount), net: netOf(e.amount), state: e.state,
    paid_date: e.paidDate ?? "", bank: e.bankShort,
  }))

  return (
    <ReportShell
      title="Commission Payouts"
      titleTooltip={
        <>
          The lifecycle of every commission — sales-rep + affiliate —
          from <strong>pending</strong> (earned this period) to{" "}
          <strong>approved</strong> (verified) to{" "}
          <strong>paid</strong> (bank-transferred). Bulk-approve in
          one click, bulk-pay with a single transfer batch.
        </>
      }
      exportFilename={`pallio-commissions-${period}`}
      exportRows={exportRows}
      period={period}
      onPeriodChange={setPeriod}
    >
      {/* KPIs */}
      <section className="grid gap-3 lg:grid-cols-4">
        <Tile label="Owed (unpaid)"     value={formatPrice(owed)}        sub={`${pending.length + approved.length} entries`} tone="warning" />
        <Tile label="Approved · ready"  value={formatPrice(approvedNow)} sub={`${approved.length} entries · pay any time`} tone="info" />
        <Tile label="Paid YTD"          value={formatPrice(paidYTD)}     sub={`${paid.length} entries · 2026`} tone="success" />
        <Tile label="Net cost ratio"    value="6.2%"                       sub="of attributable revenue" tone="brand" />
      </section>

      {/* Hero action bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <Send className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Next batch payout</p>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">{formatPrice(approvedNow)} · {approved.length} approved</h2>
                <p className="text-xs text-muted-foreground md:text-sm">
                  Recipients net <strong className="font-bold text-foreground">{formatPrice(netOf(approvedNow))}</strong> after <strong className="font-bold text-foreground">{formatPrice(whtOf(approvedNow))}</strong> (5%) withholding tax. Transfers route via Paystack NIBSS, debiting on the 5th.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setRulesOpen(true)}>
                <SlidersHorizontal className="h-3.5 w-3.5" /> Rules
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending.length === 0}
                onClick={() => approve(selectedIds)}
                title={pending.length === 0 ? "No pending commissions to approve" : undefined}
                aria-label={pending.length === 0 ? "No pending commissions to approve" : undefined}
              >
                <CheckSquare className="h-3.5 w-3.5" /> Approve {selectedIds.size > 0 ? `${selectedIds.size} selected` : `all pending (${pending.length})`}
              </Button>
              <Button
                size="sm"
                disabled={approved.length === 0}
                onClick={() => pay(selectedIds)}
                title={approved.length === 0 ? "No approved commissions to pay" : undefined}
                aria-label={approved.length === 0 ? "No approved commissions to pay" : undefined}
              >
                <Send className="h-3.5 w-3.5" /> Pay {approved.length} approved
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter chips */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
        {(["all", "pending", "approved", "paid", "rejected", "sales", "affiliate"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              filter === f
                ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {f}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", filter === f ? "bg-white/20" : "bg-muted")}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Selected bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-brand/30 bg-brand-soft/40 px-4 py-2.5 dark:bg-primary/15">
          <p className="text-sm">
            <strong className="font-bold tabular-nums">{selectedIds.size} selected</strong> · <strong className="font-bold tabular-nums">{formatPrice(selectedAmount)}</strong>
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            <Button size="sm" variant="outline" onClick={() => approve(selectedIds)}>
              <Check className="h-3.5 w-3.5" /> Approve selected
            </Button>
            <Button size="sm" onClick={() => pay(selectedIds)}>
              <Send className="h-3.5 w-3.5" /> Pay selected
            </Button>
          </div>
        </div>
      )}

      {/* Ledger table */}
      <Card>
        <CardContent className="p-0">
          {isMobile ? (
            <ul className="divide-y divide-border">
              {filtered.map((e) => (
                <li key={e.id} className="p-3">
                  <EntryCard
                    entry={e}
                    formatPrice={formatPrice}
                    selected={selectedIds.has(e.id)}
                    onToggle={() => toggle(e.id)}
                    onApprove={() => approve(new Set([e.id]))}
                    onReject={() => reject(e)}
                    onPay={() => pay(new Set([e.id]))}
                    onOpenStatement={() => setStatementFor(e.recipient.email)}
                  />
                </li>
              ))}
              {filtered.length === 0 && <li className="p-12 text-center text-sm text-muted-foreground">No entries match the filter.</li>}
            </ul>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        className="h-3.5 w-3.5 cursor-pointer"
                        checked={filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id))}
                        onChange={() => toggleAll(filtered)}
                      />
                    </th>
                    <th className="px-3 py-2.5 font-medium">Entry</th>
                    <th className="px-3 py-2.5 font-medium">Recipient</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 text-right font-medium">Basis</th>
                    <th className="px-3 py-2.5 text-right font-medium">Rate</th>
                    <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-3 py-2.5 font-medium">State</th>
                    <th className="px-3 py-2.5 text-right font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((e) => {
                    const isSelected = selectedIds.has(e.id)
                    const canSelect = e.state === "pending" || e.state === "approved"
                    return (
                      <tr key={e.id} className={cn("transition-all duration-150 hover:bg-accent/30", isSelected && "bg-brand-soft/30 dark:bg-primary/10")}>
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            aria-label={`Select ${e.id}`}
                            className="h-3.5 w-3.5 cursor-pointer"
                            checked={isSelected}
                            onChange={() => canSelect && toggle(e.id)}
                            disabled={!canSelect}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-mono text-xs font-bold">{e.id}</p>
                          <p className="text-[10px] text-muted-foreground">{e.earnedAt}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <button type="button" onClick={() => setStatementFor(e.recipient.email)} className="flex items-center gap-2 text-left hover:underline">
                            <Avatar seed={e.recipient.email} name={e.recipient.name} size={26} />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">{e.recipient.name}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{e.recipient.role}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.source}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums">{formatPrice(e.basis)}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums">{e.rate}%</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          <p className="text-xs font-bold">{formatPrice(e.amount)}</p>
                          <p className="text-[10px] text-muted-foreground">net {formatPrice(netOf(e.amount))}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <div>
                            <StatusBadge tone={STATE_TONE[e.state]} withDot>{e.state}</StatusBadge>
                            {e.paidDate && <p className="mt-0.5 text-[10px] text-muted-foreground">{e.paidDate}</p>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {e.state === "pending" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => approve(new Set([e.id]))}>Approve</Button>
                              <Button size="sm" variant="ghost" onClick={() => reject(e)} className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">Reject</Button>
                            </div>
                          )}
                          {e.state === "approved" && (
                            <Button size="sm" onClick={() => pay(new Set([e.id]))}>Pay now</Button>
                          )}
                          {e.state === "paid" && (
                            <Button size="sm" variant="ghost" onClick={() => toast.success(`${e.id} receipt downloaded.`)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="p-12 text-center text-sm text-muted-foreground">No entries match the filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top earners + lifecycle explainer */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold md:text-base">Top earners · this period</h3>
            <p className="text-[11px] text-muted-foreground">Who's bringing in the most attributable revenue.</p>
            <ul className="mt-3 space-y-2.5">
              {topEarners(entries).slice(0, 5).map((r, i) => (
                <li key={r.email} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">{i + 1}</span>
                  <Avatar seed={r.email} name={r.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">{r.role}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{formatPrice(r.total)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold md:text-base">Lifecycle of a commission</h3>
            <ol className="mt-3 space-y-2 text-sm">
              {[
                { Icon: TrendingUp,   label: "Earned", body: "Pallio attributes every order. Rate × basis = entry amount." },
                { Icon: Clock,        label: "Pending", body: "Awaiting your review. Reject if the underlying order was refunded." },
                { Icon: CheckCircle2, label: "Approved", body: "You've signed off. Ready for the next batch payout." },
                { Icon: Send,         label: "Paid", body: "Pallio debits your bank + transfers via Paystack NIBSS · same-day." },
                { Icon: Receipt,      label: "Mirrored to books", body: "Posts to Accounting as an OPEX expense + generates WHT certificates." },
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <s.Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <ConnectionCard providerId="paystack" reason="Routes commission transfers to recipient bank accounts via NIBSS." />

      {/* Cross-links */}
      <div className="grid gap-2 sm:grid-cols-4">
        {[
          { Icon: Users,        label: "Manage affiliates",    body: "Set rates, add new partners.",          href: "/settings/users" },
          { Icon: Award,        label: "Sales leaderboard",     body: "Reps by revenue + commission rate.",   href: "/sales/team" },
          { Icon: TrendingUp,   label: "Commission strategy",   body: "Calculator + model rate changes.",     href: "/marketing/commissions" },
          { Icon: Wallet,       label: "Business bank",         body: "Where the payout funds debit from.",   href: "/settings/payments/accounts" },
        ].map((q) => (
          <Link key={q.label} to={q.href} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
            <q.Icon className="h-4 w-4 text-brand dark:text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{q.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{q.body}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Per-rep statement */}
      <BottomSheet
        open={statementFor !== null}
        onClose={() => setStatementFor(null)}
        title={statementName ? `${statementName} · statement` : "Statement"}
        description="Every commission for this recipient, with gross, withholding and net."
        maxHeightVh={85}
      >
        {statementEntries.length > 0 && (() => {
          const sum = (st: EntryState) => statementEntries.filter((e) => e.state === st).reduce((s, e) => s + e.amount, 0)
          const lifetimeGross = statementEntries.reduce((s, e) => s + e.amount, 0)
          return (
            <div className="pb-2">
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["Pending", sum("pending"), "warning"],
                  ["Approved", sum("approved"), "info"],
                  ["Paid", sum("paid"), "success"],
                ] as const).map(([label, val, tone]) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-2.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className={cn("mt-0.5 text-sm font-bold tabular-nums",
                      tone === "warning" && "text-amber-600 dark:text-amber-300",
                      tone === "info" && "text-sky-600 dark:text-sky-300",
                      tone === "success" && "text-emerald-600 dark:text-emerald-400",
                    )}>{formatPrice(val)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Lifetime gross · net after {Math.round(WHT_RATE * 100)}% WHT</span>
                <span className="font-bold tabular-nums">{formatPrice(lifetimeGross)} · {formatPrice(netOf(lifetimeGross))}</span>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {statementEntries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{e.source}</p>
                      <p className="text-[10px] text-muted-foreground">{e.earnedAt} · {e.rate}% of {formatPrice(e.basis)}{e.paidDate ? ` · paid ${e.paidDate}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge tone={STATE_TONE[e.state]}>{e.state}</StatusBadge>
                      <span className="text-xs font-bold tabular-nums">{formatPrice(e.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}
      </BottomSheet>

      <CommissionRulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </ReportShell>
  )
}

// ---------- Helpers ----------
function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "brand" | "success" | "info" | "warning" | "danger" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "brand"   && "text-brand dark:text-primary",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "info"    && "text-sky-600 dark:text-sky-300",
          tone === "warning" && "text-amber-600 dark:text-amber-300",
          tone === "danger"  && "text-rose-600 dark:text-rose-400",
        )}>{value}</p>
        {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function EntryCard({ entry: e, formatPrice, selected, onToggle, onApprove, onReject, onPay, onOpenStatement }: {
  entry: Entry
  formatPrice: (n: number) => string
  selected: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
  onPay: () => void
  onOpenStatement: () => void
}) {
  const canSelect = e.state === "pending" || e.state === "approved"
  return (
    <div className={cn("flex items-start gap-3", selected && "rounded-xl bg-brand-soft/30 p-2 dark:bg-primary/10")}>
      <input
        type="checkbox"
        className="mt-2 h-3.5 w-3.5 cursor-pointer"
        checked={selected}
        onChange={onToggle}
        disabled={!canSelect}
        aria-label={`Select ${e.id}`}
      />
      <button type="button" onClick={onOpenStatement} aria-label={`Statement for ${e.recipient.name}`}>
        <Avatar seed={e.recipient.email} name={e.recipient.name} size={36} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <button type="button" onClick={onOpenStatement} className="truncate text-left text-sm font-semibold hover:underline">{e.recipient.name}</button>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold tabular-nums">{formatPrice(e.amount)}</p>
            <p className="text-[10px] text-muted-foreground">net {formatPrice(netOf(e.amount))}</p>
          </div>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">{e.recipient.role}</p>
        <p className="truncate text-[11px] text-muted-foreground">{e.source}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={STATE_TONE[e.state]} withDot>{e.state}</StatusBadge>
          <span className="text-[10px] text-muted-foreground">{e.rate}% · {e.earnedAt}</span>
          {e.paidDate && <span className="text-[10px] text-muted-foreground">paid {e.paidDate}</span>}
        </div>
        {(e.state === "pending" || e.state === "approved") && (
          <div className="mt-2 flex items-center gap-1.5">
            {e.state === "pending" && (
              <>
                <Button size="sm" variant="outline" onClick={onApprove}>Approve</Button>
                <Button size="sm" variant="ghost" onClick={onReject} className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">Reject</Button>
              </>
            )}
            {e.state === "approved" && (
              <Button size="sm" onClick={onPay}>Pay now</Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function topEarners(entries: Entry[]): { name: string; email: string; role: string; total: number }[] {
  const map = new Map<string, { name: string; email: string; role: string; total: number }>()
  for (const e of entries) {
    const key = e.recipient.email
    const existing = map.get(key) ?? { name: e.recipient.name, email: e.recipient.email, role: e.recipient.role, total: 0 }
    existing.total += e.amount
    map.set(key, existing)
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

void Building2; void CreditCard; void Filter; void Input
