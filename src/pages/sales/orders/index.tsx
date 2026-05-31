import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  Plus,
  Search,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { OnboardingNudge } from "@/components/onboarding/onboarding-nudge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { EmptyState } from "@/components/lists/empty-state"
import { InfoTooltip } from "@/components/info-tooltip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useIsMobile } from "@/hooks/use-mobile"
import { INVOICES, ORDERS, invoiceByOrder } from "@/lib/sales/data"
import type { Order, OrderStatus } from "@/lib/sales/types"
import { useCurrency } from "@/contexts/currency"
import { useTerm } from "@/hooks/use-industry"
import { cn } from "@/lib/utils"

const STEPS: { key: OrderStatus | "paid"; label: string }[] = [
  { key: "draft",     label: "Draft" },
  { key: "sent",      label: "Sent" },
  { key: "accepted",  label: "Accepted" },
  { key: "invoiced",  label: "Invoiced" },
  { key: "paid",      label: "Paid" },
  { key: "fulfilled", label: "Fulfilled" },
]

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  draft: "neutral",
  sent: "info",
  accepted: "warning",
  invoiced: "info",
  fulfilled: "success",
  cancelled: "danger",
}

// True if a given step has been reached for this order.
function stepReached(order: Order, step: (typeof STEPS)[number]["key"]): boolean {
  if (order.status === "cancelled") return false
  const inv = order.invoiceId ? INVOICES.find((i) => i.id === order.invoiceId) : undefined
  const paid = inv?.status === "paid"
  switch (step) {
    case "draft":     return true
    case "sent":      return order.status !== "draft"
    case "accepted":  return ["accepted", "invoiced", "fulfilled"].includes(order.status)
    case "invoiced":  return ["invoiced", "fulfilled"].includes(order.status) || !!inv
    case "paid":      return !!paid
    case "fulfilled": return order.status === "fulfilled"
    default:          return false
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function SalesOrders() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all")
  const [invoicingId, setInvoicingId] = React.useState<string | null>(null)
  const { formatPrice: fmtMoney, formatCompact } = useCurrency()
  // Restaurant: "Checks", QSR: "Tickets", auto: "Work orders", services: "Bookings".
  // Default "Order" stays the title for retail / apparel / pharmacy.
  const saleSingularRaw = useTerm("sale", "Order")
  const salePluralRaw = useTerm("sale.plural", "orders")
  const salePlural = salePluralRaw.charAt(0).toUpperCase() + salePluralRaw.slice(1)
  const newOrderCta = `New ${saleSingularRaw.toLowerCase()}`

  const onInvoiceOrder = async (orderId: string) => {
    if (invoicingId) return
    setInvoicingId(orderId)
    try {
      await new Promise((r) => setTimeout(r, 350))
      toast.success("Invoice draft ready — finish the details below.")
      navigate("/sales/invoices/new")
    } finally {
      setInvoicingId(null)
    }
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return ORDERS.filter((o) => statusFilter === "all" || o.status === statusFilter).filter((o) => {
      if (!q) return true
      return o.number.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q)
    })
  }, [query, statusFilter])

  const total = ORDERS.reduce((s, o) => s + o.totalUsd, 0)
  const invoiced = ORDERS.filter((o) => o.invoiceId).length
  const drafts = ORDERS.filter((o) => o.status === "draft").length
  const fulfilled = ORDERS.filter((o) => o.status === "fulfilled").length

  return (
    <PageShell
      title={`Sales ${salePluralRaw.toLowerCase()}`}
      withToolbar
      titleTooltip={
        <>
          A <strong>sales {saleSingularRaw.toLowerCase()}</strong> is what you
          create when a customer agrees to buy — but before money changes hands or
          the goods leave the shelf. Pallio holds the stock so it
          can't get sold twice, then converts it to an invoice + a
          shipment once you're ready.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <OnboardingNudge stepKey="first-sale" cta="Make first sale" />
        <SummaryStrip
          tiles={[
            { label: salePlural,   value: String(ORDERS.length),         tone: "brand",   hint: "all time" },
            { label: "Drafts",     value: String(drafts),                tone: "warning", hint: "in progress" },
            { label: "Invoiced",   value: String(invoiced),              tone: "info",    hint: "billed out" },
            { label: "Open total", value: formatCompact(total),  tone: "success", hint: "across pipeline" },
          ]}
        />

        {/* Filters + new */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
            {(["all", "draft", "sent", "accepted", "invoiced", "fulfilled", "cancelled"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                  statusFilter === f
                    ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search number, customer…" className="pl-9" />
            </div>
            <Link to="/sales/orders/new" className="hidden sm:inline-flex">
              <Button><Plus className="h-4 w-4" /> {newOrderCta}</Button>
            </Link>
          </div>
        </div>

        {/* Pipeline explainer */}
        <div className="flex items-baseline gap-1.5">
          <h3 className="text-sm font-semibold md:text-base">Pipeline</h3>
          <InfoTooltip label="Order pipeline" size="xs">
            Each row shows where the order sits in your fulfillment process —
            Draft → Sent → Accepted → Invoiced → Paid → Fulfilled. Click an
            order to open its invoice + record payment.
          </InfoTooltip>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            Icon={ClipboardList}
            title={`No ${salePluralRaw.toLowerCase()} match`}
            description="Try a different filter or search."
            action={
              <Link to="/sales/orders/new">
                <Button><Plus className="h-4 w-4" /> {newOrderCta}</Button>
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((o) => {
              const invoice = invoiceByOrder(o.id)
              return (
                <li key={o.id}>
                  <article className="rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">{o.customer.name}</p>
                          <StatusBadge tone={STATUS_TONE[o.status]} withDot>{o.status}</StatusBadge>
                          {invoice && (
                            <Link
                              to={`/sales/invoices/${invoice.id}`}
                              className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground dark:bg-primary/15 dark:text-primary"
                            >
                              <FileText className="h-2.5 w-2.5" /> {invoice.number}
                            </Link>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          <span className="font-mono">{o.number}</span> · {o.lines.length} line{o.lines.length === 1 ? "" : "s"} · {fmtDate(o.createdAt)}
                          {o.expectedFulfillBy && <> · fulfil by {fmtDate(o.expectedFulfillBy)}</>}
                        </p>
                      </div>
                      <p className="text-right text-sm font-bold tabular-nums">
                        {fmtMoney(o.totalUsd)}
                      </p>
                    </div>

                    {/* Pipeline row */}
                    <ol className={cn(
                      "mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide",
                      isMobile ? "" : "",
                    )}>
                      {STEPS.map((step, idx) => {
                        const done = stepReached(o, step.key)
                        const isLast = idx === STEPS.length - 1
                        return (
                          <li key={step.key} className="flex items-center gap-1.5">
                            <span
                              aria-label={`${step.label} ${done ? "complete" : "pending"}`}
                              className={cn(
                                "flex h-5 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold uppercase tracking-wider",
                                done
                                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : "border-border bg-background text-muted-foreground",
                              )}
                            >
                              {done && <Check className="h-2.5 w-2.5" />}
                              {step.label}
                            </span>
                            {!isLast && (
                              <span aria-hidden className={cn("h-0.5 w-3 sm:w-4", done ? "bg-emerald-500/40" : "bg-border")} />
                            )}
                          </li>
                        )
                      })}
                    </ol>

                    {/* Trailing action — open invoice when one exists,
                        otherwise prompt to invoice it. */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                      <p className="text-[11px] text-muted-foreground">
                        {invoice ? (
                          <>Balance{" "}
                            <span className={cn("font-bold tabular-nums", invoice.balanceUsd > 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300")}>
                              {fmtMoney(invoice.balanceUsd)}
                            </span>{" "}
                            on {invoice.number}
                          </>
                        ) : (
                          "Not yet invoiced."
                        )}
                      </p>
                      {invoice ? (
                        <Link to={`/sales/invoices/${invoice.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand/80 dark:text-primary">
                          Open invoice <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : o.status === "accepted" ? (
                        <Button
                          size="sm"
                          onClick={() => onInvoiceOrder(o.id)}
                          disabled={invoicingId !== null}
                          aria-label={`Invoice order ${o.number}`}
                        >
                          {invoicingId === o.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Invoicing…
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" /> Invoice this order
                            </>
                          )}
                        </Button>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <MobileFab href="/sales/orders/new" label="New order" />
    </PageShell>
  )
}
