import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  CheckCircle2,
  ChevronRight,
  Filter,
  Plus,
  Search,
  Truck,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { OnboardingNudge } from "@/components/onboarding/onboarding-nudge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { FilterChips, type FilterChip } from "@/components/lists/filter-chips"
import { FilterButton } from "@/components/lists/filter-button"
import {
  FilterPillGroup,
  FilterSection,
  FilterSheet,
} from "@/components/lists/filter-sheet"
import { SwipeableRow } from "@/components/mobile/swipeable-row"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/currency"

type POStatus = "draft" | "pending" | "partial" | "received" | "cancelled"

type PO = {
  id: string
  vendor: string
  items: number
  total: number
  status: POStatus
  due: string
  overdue: boolean
}

const pos: PO[] = [
  { id: "PO-1042", vendor: "Cobalt Distributors", items: 8, total: 4820, status: "pending", due: "May 22", overdue: false },
  { id: "PO-1041", vendor: "Glow Co", items: 4, total: 1240, status: "partial", due: "May 20", overdue: false },
  { id: "PO-1040", vendor: "Acme Supplies", items: 6, total: 920, status: "pending", due: "May 25", overdue: false },
  { id: "PO-1039", vendor: "Porcel Ceramics", items: 12, total: 2110, status: "draft", due: "May 14", overdue: true },
  { id: "PO-1038", vendor: "Delta Apparel", items: 24, total: 5800, status: "received", due: "May 12", overdue: false },
  { id: "PO-1037", vendor: "Cobalt Distributors", items: 2, total: 318, status: "cancelled", due: "May 10", overdue: false },
]

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
] as const

const statusTone: Record<POStatus, StatusTone> = {
  draft: "neutral",
  pending: "warning",
  partial: "info",
  received: "success",
  cancelled: "danger",
}

function avatarTint(name: string) {
  const palette = [
    "bg-brand/15 text-brand dark:bg-primary/20 dark:text-primary",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palette[h % palette.length]!
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("")
}

export default function PurchaseOrders() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [query, setQuery] = React.useState("")
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [statuses, setStatuses] = React.useState<POStatus[]>([])
  const [stagedStatuses, setStagedStatuses] = React.useState<POStatus[]>([])
  const { formatPrice } = useCurrency()

  React.useEffect(() => {
    if (filterOpen) setStagedStatuses(statuses)
  }, [filterOpen, statuses])

  useRegisterPageRefresh(
    React.useCallback(async () => {
      await new Promise((r) => setTimeout(r, 400))
    }, []),
  )

  const filtered = React.useMemo(() => {
    let list = pos
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) => p.id.toLowerCase().includes(q) || p.vendor.toLowerCase().includes(q),
      )
    }
    if (statuses.length > 0) list = list.filter((p) => statuses.includes(p.status))
    return list
  }, [query, statuses])

  const chips: FilterChip[] = React.useMemo(() => {
    return statuses.map((s) => ({
      key: `s:${s}`,
      label: STATUS_OPTIONS.find((o) => o.value === s)!.label,
      onRemove: () => setStatuses((p) => p.filter((x) => x !== s)),
    }))
  }, [statuses])

  const appliedCount = chips.length

  const openCount = pos.filter((p) => p.status === "pending" || p.status === "partial").length
  const receivedCount = pos.filter((p) => p.status === "received").length
  const overdueCount = pos.filter((p) => p.overdue).length
  const totalOpenValue = pos.reduce(
    (s, p) => (p.status === "pending" || p.status === "partial" ? s + p.total : s),
    0,
  )

  return (
    <PageShell
      title="Purchase orders"
      withToolbar
      mobileTrailing={<FilterButton onClick={() => setFilterOpen(true)} count={appliedCount} />}
      titleTooltip={
        <>
          A <strong>purchase order</strong> (PO) is an official request
          you send a supplier to deliver goods at agreed prices and
          terms. Pallio tracks each PO's lifecycle: <em>open → received
          → billed → paid</em>, and warns you when one is overdue.
          (Not to be confused with the till "POS" — that's
          <em> Point of Sale</em>, in the sidebar above.)
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <OnboardingNudge stepKey="first-po" cta="Create first PO" />
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0">
          {[
            { label: "Open POs", value: String(openCount), tone: "info" as StatusTone, hint: "awaiting" },
            { label: "Overdue", value: String(overdueCount), tone: "danger" as StatusTone, hint: "act now" },
            { label: "Received", value: String(receivedCount), tone: "success" as StatusTone, hint: "closed" },
            { label: "Open value", value: formatPrice(totalOpenValue), tone: "brand" as StatusTone, hint: "in flight" },
          ].map((t) => (
            <div
              key={t.label}
              className="min-w-[140px] snap-start rounded-2xl border border-border bg-card p-3 md:min-w-0"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{t.value}</p>
              <div className="mt-1.5">
                <StatusBadge tone={t.tone} withDot>{t.hint}</StatusBadge>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PO # or vendor…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="hidden md:inline-flex" onClick={() => setFilterOpen(true)}>
            <Filter className="h-4 w-4" /> Filters {appliedCount ? `(${appliedCount})` : ""}
          </Button>
          <Link to="/purchasing/pos/new" className="hidden md:inline-flex">
            <Button>
              <Plus className="h-4 w-4" /> New PO
            </Button>
          </Link>
        </div>

        <FilterChips chips={chips} onClearAll={appliedCount > 0 ? () => setStatuses([]) : undefined} />

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                Icon={Truck}
                title="No POs match"
                description="Try clearing filters or search to broaden the view."
              />
            </CardContent>
          </Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <SwipeableRow
                  rightActions={[
                    {
                      label: "Receive",
                      tone: "primary",
                      icon: <Truck className="h-4 w-4" />,
                      onPress: () => navigate(`/purchasing/receipts/new?po=${encodeURIComponent(p.id)}`),
                    },
                    {
                      label: "Close",
                      tone: "neutral",
                      icon: <CheckCircle2 className="h-4 w-4" />,
                      onPress: () => toast.success(`Closed ${p.id}`),
                    },
                  ]}
                >
                  <Link to={`/purchasing/pos/${p.id.toLowerCase()}`} className="flex items-center gap-3 p-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${avatarTint(p.vendor)}`}
                    >
                      {initialsOf(p.vendor)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{p.vendor}</p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(p.total)}</p>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          <span className="font-mono">{p.id}</span> · {p.items} items
                        </span>
                        <StatusBadge tone={statusTone[p.status]}>{p.status}</StatusBadge>
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-[10px] tabular-nums",
                          p.overdue ? "font-medium text-rose-600 dark:text-rose-400" : "text-muted-foreground",
                        )}
                      >
                        {p.overdue ? `Overdue · was due ${p.due}` : `Due ${p.due}`}
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
                  <th className="px-3 py-2.5 font-medium">PO</th>
                  <th className="px-3 py-2.5 font-medium">Vendor</th>
                  <th className="px-3 py-2.5 text-right font-medium">Items</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Due</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5 font-mono text-xs">{p.id}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${avatarTint(p.vendor)}`}
                        >
                          {initialsOf(p.vendor)}
                        </span>
                        <span className="font-medium">{p.vendor}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.items}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(p.total)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={statusTone[p.status]} withDot>
                        {p.status}
                      </StatusBadge>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5",
                        p.overdue ? "font-medium text-rose-600 dark:text-rose-400" : "text-muted-foreground",
                      )}
                    >
                      {p.overdue ? `Overdue (was ${p.due})` : p.due}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/purchasing/pos/${p.id.toLowerCase()}`}>Open</Link>
                      </Button>
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
        appliedCount={appliedCount}
        title="Filter purchase orders"
      >
        <FilterSection title="Status">
          <FilterPillGroup
            multi
            options={STATUS_OPTIONS as unknown as { value: POStatus; label: string }[]}
            value={stagedStatuses}
            onChange={(v) => setStagedStatuses(Array.isArray(v) ? v : v ? [v] : [])}
          />
        </FilterSection>
      </FilterSheet>

      <MobileFab href="/purchasing/pos/new" label="New PO" />
    </PageShell>
  )
}
