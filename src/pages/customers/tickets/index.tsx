import * as React from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  Clock,
  FileWarning,
  HelpCircle,
  LifeBuoy,
  PackageX,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { FilterButton } from "@/components/lists/filter-button"
import { FilterSheet, FilterSection, FilterPillGroup } from "@/components/lists/filter-sheet"
import { FilterChips, type FilterChip } from "@/components/lists/filter-chips"
import { useTerm } from "@/hooks/use-industry"
import {
  TICKET_CATEGORY_LABELS,
  TICKET_CHANNEL_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  isOverdue,
  loadTickets,
  subscribeTickets,
} from "@/lib/tickets/data"
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/lib/tickets/types"
import { MEMBERS } from "@/lib/team/data"

// F4 — Tickets queue.
//
// Sorted: overdue first (red), then by SLA-due-soonest, then by createdAt
// desc. The intent is that whoever pops the page sees the unsafe items
// at the top — no horizontal scrolling required to spot a fire.

const STATUS_TONE: Record<TicketStatus, StatusTone> = {
  new: "info",
  triage: "warning",
  in_progress: "brand",
  awaiting_customer: "warning",
  resolved: "success",
  closed: "neutral",
}

const PRIORITY_TONE: Record<TicketPriority, StatusTone> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "danger",
}

const STATUS_OPTIONS: TicketStatus[] = ["new", "triage", "in_progress", "awaiting_customer", "resolved", "closed"]
const CATEGORY_OPTIONS: TicketCategory[] = ["damaged", "missing", "late", "wrong_item", "quality", "billing", "refund_request", "other"]
const PRIORITY_OPTIONS: TicketPriority[] = ["urgent", "high", "normal", "low"]

export default function TicketsIndex() {
  const isMobile = useIsMobile()
  const customerTerm = useTerm("customer", "Customer")

  // Subscribe to the live array. The reducer-bumped tick is a dep on
  // the memo below so a mutation elsewhere (a Resolve in another tab,
  // a webhook-fired createTicket) triggers a re-derive — `loadTickets`
  // returns the same array reference so we can't memo against identity.
  const [tick, force] = React.useReducer((x: number) => x + 1, 0)
  React.useEffect(() => subscribeTickets(force), [])
  const all = React.useMemo(() => [...loadTickets()], [tick])

  const [query, setQuery] = React.useState("")
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [statusSel, setStatusSel] = React.useState<TicketStatus[]>([])
  const [categorySel, setCategorySel] = React.useState<TicketCategory[]>([])
  const [prioritySel, setPrioritySel] = React.useState<TicketPriority[]>([])
  const [assigneeSel, setAssigneeSel] = React.useState<string | null>(null)

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 350)) }, []))

  const now = Date.now()
  const overdueCount = all.filter((t) => isOverdue(t, now)).length
  const openCount = all.filter((t) => t.status !== "resolved" && t.status !== "closed").length
  const newCount = all.filter((t) => t.status === "new").length

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = all
    if (q) {
      list = list.filter((t) =>
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.customer.name.toLowerCase().includes(q) ||
        (t.invoiceRef ?? "").toLowerCase().includes(q) ||
        (t.orderRef ?? "").toLowerCase().includes(q),
      )
    }
    if (statusSel.length) list = list.filter((t) => statusSel.includes(t.status))
    if (categorySel.length) list = list.filter((t) => categorySel.includes(t.category))
    if (prioritySel.length) list = list.filter((t) => prioritySel.includes(t.priority))
    if (assigneeSel) {
      if (assigneeSel === "__unassigned") list = list.filter((t) => !t.assignedTo)
      else list = list.filter((t) => t.assignedTo === assigneeSel)
    }
    return [...list].sort((a, b) => sortKey(a, now) - sortKey(b, now))
  }, [all, query, statusSel, categorySel, prioritySel, assigneeSel, now])

  const appliedCount =
    statusSel.length + categorySel.length + prioritySel.length + (assigneeSel ? 1 : 0)

  const chips: FilterChip[] = [
    ...statusSel.map((s) => ({ key: `s:${s}`, label: TICKET_STATUS_LABELS[s], onRemove: () => setStatusSel((p) => p.filter((x) => x !== s)) })),
    ...categorySel.map((c) => ({ key: `c:${c}`, label: TICKET_CATEGORY_LABELS[c], onRemove: () => setCategorySel((p) => p.filter((x) => x !== c)) })),
    ...prioritySel.map((p) => ({ key: `p:${p}`, label: `Priority: ${TICKET_PRIORITY_LABELS[p]}`, onRemove: () => setPrioritySel((prev) => prev.filter((x) => x !== p)) })),
    ...(assigneeSel
      ? [{ key: `a:${assigneeSel}`, label: assigneeSel === "__unassigned" ? "Unassigned" : assigneeName(assigneeSel), onRemove: () => setAssigneeSel(null) }]
      : []),
  ]

  const resetFilters = () => {
    setStatusSel([])
    setCategorySel([])
    setPrioritySel([])
    setAssigneeSel(null)
  }

  return (
    <PageShell
      title={`${customerTerm} tickets`}
      withToolbar
      titleTooltip={
        <>
          A complaint or follow-up from a {customerTerm.toLowerCase()} — damaged
          goods, missing items, late delivery, wrong item, quality, billing.
          Resolve each one with a real action: refund, replacement, replanned
          delivery, store credit, or just a recorded apology.
        </>
      }
      toolbarActions={
        <Button asChild>
          <Link to="/customers/tickets/new"><Plus className="h-4 w-4" /> New ticket</Link>
        </Button>
      }
      mobileTrailing={<FilterButton onClick={() => setFilterOpen(true)} count={appliedCount} />}
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Open", value: String(openCount), tone: "info", hint: "active" },
            { label: "New", value: String(newCount), tone: "brand", hint: "untriaged" },
            { label: "Overdue", value: String(overdueCount), tone: overdueCount > 0 ? "danger" : "success", hint: overdueCount > 0 ? "SLA past" : "on track" },
            { label: "Total", value: String(all.length), tone: "neutral", hint: "lifetime" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject, customer, invoice…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="hidden md:inline-flex" onClick={() => setFilterOpen(true)}>
            Filters{appliedCount ? ` · ${appliedCount}` : ""}
          </Button>
        </div>

        {chips.length > 0 && <FilterChips chips={chips} onClearAll={resetFilters} />}

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              Icon={LifeBuoy}
              title="No tickets match"
              description="Try clearing filters, or open a new ticket."
              action={
                <Button asChild>
                  <Link to="/customers/tickets/new"><Plus className="h-4 w-4" /> New ticket</Link>
                </Button>
              }
            />
          </CardContent></Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/customers/tickets/${t.id}`}
                  className="block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-start gap-3">
                    <CategoryIcon category={t.category} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{t.subject}</p>
                        {isOverdue(t, now) && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-300">
                            <AlertTriangle className="h-3 w-3" /> SLA
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <span className="font-mono">{t.id}</span> · {t.customer.name}
                        {t.invoiceRef ? ` · ${t.invoiceRef}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge tone={STATUS_TONE[t.status]} withDot>
                          {TICKET_STATUS_LABELS[t.status]}
                        </StatusBadge>
                        <StatusBadge tone={PRIORITY_TONE[t.priority]}>
                          {TICKET_PRIORITY_LABELS[t.priority]}
                        </StatusBadge>
                        <span className="ml-auto text-[10px] text-muted-foreground">{relativeTime(t.updatedAt, now)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Subject</th>
                  <th className="px-3 py-2.5 font-medium">{customerTerm}</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Assignee</th>
                  <th className="px-3 py-2.5 font-medium">SLA</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr key={t.id} className="cursor-pointer transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5 font-mono text-xs">
                      <Link to={`/customers/tickets/${t.id}`} className="hover:underline">{t.id}</Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to={`/customers/tickets/${t.id}`} className="font-medium hover:underline">{t.subject}</Link>
                      {t.invoiceRef && (
                        <span className="ml-2 text-[10px] font-mono text-muted-foreground">{t.invoiceRef}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{t.customer.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{TICKET_CATEGORY_LABELS[t.category]}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={STATUS_TONE[t.status]} withDot>{TICKET_STATUS_LABELS[t.status]}</StatusBadge>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={PRIORITY_TONE[t.priority]}>{TICKET_PRIORITY_LABELS[t.priority]}</StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {t.assignedTo ? assigneeName(t.assignedTo) : <span className="italic">Unassigned</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {isOverdue(t, now) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-300">
                          <AlertTriangle className="h-3 w-3" /> overdue
                        </span>
                      ) : t.slaDueAt ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {relativeTime(t.slaDueAt, now, true)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/customers/tickets/${t.id}`}><ChevronRight className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MobileFab href="/customers/tickets/new" label="New ticket" />

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        appliedCount={appliedCount}
        title="Filter tickets"
      >
        <FilterSection title="Status">
          <FilterPillGroup
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: TICKET_STATUS_LABELS[s] }))}
            value={statusSel}
            onChange={(v) => setStatusSel((v ?? []) as TicketStatus[])}
            multi
          />
        </FilterSection>
        <FilterSection title="Category">
          <FilterPillGroup
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: TICKET_CATEGORY_LABELS[c] }))}
            value={categorySel}
            onChange={(v) => setCategorySel((v ?? []) as TicketCategory[])}
            multi
          />
        </FilterSection>
        <FilterSection title="Priority">
          <FilterPillGroup
            options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: TICKET_PRIORITY_LABELS[p] }))}
            value={prioritySel}
            onChange={(v) => setPrioritySel((v ?? []) as TicketPriority[])}
            multi
          />
        </FilterSection>
        <FilterSection title="Assignee">
          <FilterPillGroup
            options={[
              { value: "__unassigned", label: "Unassigned" },
              ...MEMBERS.map((m) => ({ value: m.id, label: m.name })),
            ]}
            value={assigneeSel}
            onChange={(v) => setAssigneeSel(typeof v === "string" ? v : null)}
          />
        </FilterSection>
      </FilterSheet>
    </PageShell>
  )
}

// ----- helpers -----

function assigneeName(id: string): string {
  const m = MEMBERS.find((x) => x.id === id)
  return m?.name ?? id
}

function sortKey(t: Ticket, now: number): number {
  // Negative = sorts to top. Overdue beats due-soon beats most-recently-updated.
  if (isOverdue(t, now)) return -10_000_000_000 + (t.slaDueAt ?? 0)
  if (t.slaDueAt && t.status !== "resolved" && t.status !== "closed") return t.slaDueAt
  return Number.MAX_SAFE_INTEGER - t.updatedAt
}

function relativeTime(epochMs: number, now: number, future = false): string {
  const diff = future ? epochMs - now : now - epochMs
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60_000)
  if (mins < 1) return future ? "due now" : "just now"
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return future ? `in ${hrs}h` : `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return future ? `in ${days}d` : `${days}d ago`
}

const CATEGORY_ICONS: Record<TicketCategory, React.ComponentType<{ className?: string }>> = {
  damaged: FileWarning,
  missing: PackageX,
  late: Clock,
  wrong_item: Boxes,
  quality: Sparkles,
  billing: Wallet,
  refund_request: RotateCcw,
  other: HelpCircle,
}

function CategoryIcon({ category }: { category: TicketCategory }) {
  const Icon = CATEGORY_ICONS[category]
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
      <Icon className="h-4 w-4" />
    </span>
  )
}
