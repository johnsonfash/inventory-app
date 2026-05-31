import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useTerm } from "@/hooks/use-industry"
import { cn } from "@/lib/utils"
import {
  RESOLUTION_LABELS,
  TICKET_CATEGORY_LABELS,
  TICKET_CHANNEL_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  addMessage,
  getTicket,
  isOverdue,
  logEvent,
  resolveTicket,
  subscribeTickets,
  updateTicket,
} from "@/lib/tickets/data"
import type {
  ResolutionKind,
  Ticket,
  TicketChannel,
  TicketStatus,
} from "@/lib/tickets/types"
import { MEMBERS } from "@/lib/team/data"

// F4 — ticket detail.
//
// Layout: status header (with assignee + status controls), then a
// 2-column grid on desktop — left column is body + customer/invoice
// context + audit timeline, right column is the message thread with
// reply composer. Mobile collapses to a single stack with the thread
// last (operators usually want context first on a phone).

const STATUS_TONE: Record<TicketStatus, StatusTone> = {
  new: "info",
  triage: "warning",
  in_progress: "brand",
  awaiting_customer: "warning",
  resolved: "success",
  closed: "neutral",
}

const STATUS_TRANSITIONS: TicketStatus[] = [
  "new",
  "triage",
  "in_progress",
  "awaiting_customer",
  "resolved",
  "closed",
]

const REPLY_CHANNELS: { value: TicketChannel; Icon: React.ElementType; label: string }[] = [
  { value: "email", Icon: Mail, label: "Email" },
  { value: "whatsapp", Icon: MessageSquare, label: "WhatsApp" },
  { value: "sms", Icon: MessageSquare, label: "SMS" },
  { value: "phone", Icon: Phone, label: "Phone log" },
  { value: "inbox", Icon: MessageSquare, label: "Inbox" },
]

// "Current user" stand-in until auth lands. Mia Chen is the active
// session per lib/team/data.ts seed.
const ME_ID = "m-1"

export default function TicketDetail() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const customerTerm = useTerm("customer", "Customer")

  const [tick, force] = React.useReducer((x: number) => x + 1, 0)
  React.useEffect(() => subscribeTickets(force), [])
  // Re-derive when the cache mutates so addMessage / resolveTicket
  // updates re-paint without leaving the stale snapshot mounted.
  const ticket = React.useMemo(() => getTicket(params.id ?? ""), [params.id, tick])

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))

  const [replyChannel, setReplyChannel] = React.useState<TicketChannel>("email")
  const [replyBody, setReplyBody] = React.useState("")
  const [resolveOpen, setResolveOpen] = React.useState(false)
  const [cancelOpen, setCancelOpen] = React.useState(false)

  // Default reply channel to the inbound ticket's channel — feels native
  // to the operator (reply to email-in via email).
  React.useEffect(() => {
    if (ticket && REPLY_CHANNELS.some((c) => c.value === ticket.channel)) {
      setReplyChannel(ticket.channel)
    }
  }, [ticket?.id])

  if (!ticket) {
    return (
      <PageShell title={`${customerTerm} ticket`} withToolbar={false}>
        <Card><CardContent className="p-0">
          <EmptyState
            Icon={AlertTriangle}
            title="Ticket not found"
            description="It may have been deleted or the link is stale."
            action={<Button asChild><Link to="/customers/tickets"><ArrowLeft className="h-4 w-4" /> Back to tickets</Link></Button>}
          />
        </CardContent></Card>
      </PageShell>
    )
  }

  const sendReply = () => {
    const body = replyBody.trim()
    if (!body) {
      toast.error("Reply is empty")
      return
    }
    addMessage(ticket.id, {
      direction: "out",
      channel: replyChannel,
      author: ME_ID,
      body,
    })
    setReplyBody("")
    toast.success(`Reply sent via ${TICKET_CHANNEL_LABELS[replyChannel]}`)
  }

  const changeStatus = (next: TicketStatus) => {
    if (next === ticket.status) return
    updateTicket(ticket.id, { status: next })
    logEvent(ticket.id, {
      kind: "status",
      by: ME_ID,
      detail: `Status → ${TICKET_STATUS_LABELS[next]}`,
    })
    toast.success(`Moved to ${TICKET_STATUS_LABELS[next]}`)
  }

  const changeAssignee = (next: string) => {
    const value = next === "__unassigned" ? undefined : next
    updateTicket(ticket.id, { assignedTo: value })
    logEvent(ticket.id, {
      kind: "assignment",
      by: ME_ID,
      detail: value ? `Assigned to ${assigneeName(value)}` : "Unassigned",
    })
  }

  const cancelTicket = () => {
    updateTicket(ticket.id, { status: "closed" })
    logEvent(ticket.id, {
      kind: "status",
      by: ME_ID,
      detail: "Closed without resolution",
    })
    setCancelOpen(false)
    toast.success("Ticket closed")
    navigate("/customers/tickets")
  }

  const overdue = isOverdue(ticket)

  return (
    <PageShell title={`${customerTerm} ticket · ${ticket.id}`} withToolbar={false}>
      <div className="flex flex-col gap-4">
        <div>
          <Link
            to="/customers/tickets"
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All tickets
          </Link>
        </div>

        {/* Status header */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold tracking-tight md:text-xl">{ticket.subject}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-mono">{ticket.id}</span>
                  <span>· opened {fmtDateTime(ticket.createdAt)}</span>
                  <span>· via {TICKET_CHANNEL_LABELS[ticket.channel]}</span>
                </p>
              </div>
              {overdue && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-500/20 dark:text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5" /> SLA overdue
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATUS_TONE[ticket.status]} withDot>
                {TICKET_STATUS_LABELS[ticket.status]}
              </StatusBadge>
              <StatusBadge tone="info">{TICKET_CATEGORY_LABELS[ticket.category]}</StatusBadge>
              <StatusBadge tone={ticket.priority === "urgent" ? "danger" : ticket.priority === "high" ? "warning" : "neutral"}>
                Priority: {TICKET_PRIORITY_LABELS[ticket.priority]}
              </StatusBadge>
              {ticket.tags?.map((t) => (
                <StatusBadge key={t} tone="neutral">{t}</StatusBadge>
              ))}
            </div>

            <div className="grid gap-3 border-t border-border pt-3 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
                <div className="mt-1">
                  <Select value={ticket.status} onValueChange={(v) => changeStatus(v as TicketStatus)}>
                    <SelectTrigger><SelectValue>{TICKET_STATUS_LABELS[ticket.status]}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {STATUS_TRANSITIONS.map((s) => (
                        <SelectItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assignee</p>
                <div className="mt-1">
                  <Select value={ticket.assignedTo ?? "__unassigned"} onValueChange={changeAssignee}>
                    <SelectTrigger><SelectValue>{ticket.assignedTo ? assigneeName(ticket.assignedTo) : "Unassigned"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned">Unassigned</SelectItem>
                      {MEMBERS.filter((m) => m.status === "active").map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SLA target</p>
                <p className={cn("mt-2 text-sm font-medium", overdue && "text-rose-600 dark:text-rose-300")}>
                  {ticket.slaDueAt ? fmtDateTime(ticket.slaDueAt) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main 2-column grid */}
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {/* Body + customer */}
            <Card>
              <CardContent className="space-y-4 p-4">
                <section>
                  <h3 className="text-sm font-semibold">Original report</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{ticket.body}</p>
                </section>

                <div className="grid gap-3 border-t border-border pt-3 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{customerTerm}</p>
                    <p className="mt-1 text-sm font-medium">{ticket.customer.name}</p>
                    {ticket.customer.email && (
                      <p className="text-xs text-muted-foreground">{ticket.customer.email}</p>
                    )}
                    {ticket.customer.phone && (
                      <p className="text-xs text-muted-foreground">{ticket.customer.phone}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">References</p>
                    {ticket.invoiceRef && (
                      <p className="text-sm">
                        <Link
                          to={`/sales/invoices/${ticket.invoiceRef}`}
                          className="inline-flex items-center gap-1 font-mono text-brand hover:underline dark:text-primary"
                        >
                          {ticket.invoiceRef} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </p>
                    )}
                    {ticket.orderRef && (
                      <p className="text-sm">
                        <Link
                          to={`/sales/orders`}
                          className="inline-flex items-center gap-1 font-mono text-brand hover:underline dark:text-primary"
                        >
                          {ticket.orderRef} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </p>
                    )}
                    {!ticket.invoiceRef && !ticket.orderRef && (
                      <p className="text-xs text-muted-foreground">No linked sale</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resolution snapshot */}
            {ticket.resolution && (
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    <h3 className="text-sm font-semibold">Resolved · {RESOLUTION_LABELS[ticket.resolution.kind]}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(ticket.resolution.completedAt)} by {assigneeName(ticket.resolution.by)}
                  </p>
                  {ticket.resolution.notes && (
                    <p className="whitespace-pre-wrap text-sm">{ticket.resolution.notes}</p>
                  )}
                  <ResolutionFigures resolution={ticket.resolution} />
                </CardContent>
              </Card>
            )}

            {/* Audit timeline */}
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">Activity</h3>
                <ol className="relative space-y-3 border-l border-border pl-4">
                  {[...ticket.events].reverse().map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[1.18rem] top-1.5 h-2 w-2 rounded-full bg-brand dark:bg-primary" />
                      <p className="text-xs font-medium">{e.detail}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {fmtDateTime(e.at)} · {assigneeName(e.by)}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Thread + reply composer */}
          <div className="space-y-3">
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="text-sm font-semibold">Messages</h3>
                <ul className="space-y-3">
                  {ticket.messages.map((m) => (
                    <li
                      key={m.id}
                      className={cn(
                        "rounded-xl border p-3 text-sm",
                        m.direction === "in"
                          ? "border-border bg-muted/40"
                          : "border-brand/30 bg-brand-soft/60 dark:border-primary/30 dark:bg-primary/10",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className="font-semibold">
                          {m.direction === "in" ? m.author : assigneeName(m.author)}
                        </span>
                        <span>{TICKET_CHANNEL_LABELS[m.channel]} · {fmtDateTime(m.at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </li>
                  ))}
                </ul>

                {/* Reply composer */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {REPLY_CHANNELS.map((c) => {
                      const active = replyChannel === c.value
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setReplyChannel(c.value)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors",
                            active
                              ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                              : "border border-border bg-card text-foreground hover:bg-accent",
                          )}
                        >
                          <c.Icon className="h-3 w-3" /> {c.label}
                        </button>
                      )
                    })}
                  </div>
                  <Textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={`Reply via ${TICKET_CHANNEL_LABELS[replyChannel]}…`}
                  />
                  <div className="flex justify-end">
                    <Button onClick={sendReply}><Send className="h-4 w-4" /> Send reply</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Resolve action surface — fixed bar pinned at the bottom of the page */}
        {ticket.status !== "resolved" && ticket.status !== "closed" && (
          <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-border bg-background/90 px-4 py-3 pwa-bottom backdrop-blur md:static md:mx-0 md:flex md:items-center md:justify-between md:gap-3 md:border-0 md:bg-transparent md:p-0">
            <div className="hidden text-sm text-muted-foreground md:block">
              Close the loop: refund, replacement, replan, store credit, or note an outcome.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setCancelOpen(true)}>
                Close without resolving
              </Button>
              <Button className="flex-1 md:flex-none" onClick={() => setResolveOpen(true)}>
                <CheckCircle2 className="h-4 w-4" /> Resolve ticket
              </Button>
            </div>
          </div>
        )}
      </div>

      <ResolveSheet
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        ticket={ticket}
        onResolved={(kind) => {
          setResolveOpen(false)
          toast.success(`Ticket resolved · ${RESOLUTION_LABELS[kind]}`)
        }}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close without resolving?</DialogTitle>
            <DialogDescription>
              The ticket will be marked closed and no downstream action will be taken. You can re-open it
              from the timeline if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep open</Button>
            <Button variant="destructive" onClick={cancelTicket}>Close ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

// ---------------------------------------------------------------------
// Resolve sheet — action surface for the resolution action.
// ---------------------------------------------------------------------

type ResolveSheetProps = {
  open: boolean
  onClose: () => void
  ticket: Ticket
  onResolved: (kind: ResolutionKind) => void
}

const RESOLUTION_KINDS: ResolutionKind[] = [
  "refund",
  "replacement_order",
  "replan_delivery",
  "store_credit",
  "apology",
  "no_action",
]

function ResolveSheet({ open, onClose, ticket, onResolved }: ResolveSheetProps) {
  const [kind, setKind] = React.useState<ResolutionKind>("refund")
  const [refundAmount, setRefundAmount] = React.useState("")
  const [creditAmount, setCreditAmount] = React.useState("")
  const [replacementOrderId, setReplacementOrderId] = React.useState("")
  const [replanShipmentId, setReplanShipmentId] = React.useState("")
  const [notes, setNotes] = React.useState("")

  React.useEffect(() => {
    if (open) {
      // Smart default per category — refund for damage/billing, replan
      // for late, replacement for wrong-item/missing. Operator can still
      // override; this just saves a tap.
      const fromCategory: Partial<Record<typeof ticket.category, ResolutionKind>> = {
        damaged: "refund",
        billing: "refund",
        refund_request: "refund",
        late: "replan_delivery",
        wrong_item: "replacement_order",
        missing: "replacement_order",
        quality: "store_credit",
      }
      setKind(fromCategory[ticket.category] ?? "refund")
      setRefundAmount("")
      setCreditAmount("")
      setReplacementOrderId("")
      setReplanShipmentId("")
      setNotes("")
    }
  }, [open, ticket.category])

  const submit = () => {
    const refundUsd = kind === "refund" ? parseAmount(refundAmount) : undefined
    const storeCreditAmount = kind === "store_credit" ? parseAmount(creditAmount) : undefined
    if (kind === "refund" && (refundUsd == null || refundUsd <= 0)) {
      toast.error("Enter a refund amount")
      return
    }
    if (kind === "store_credit" && (storeCreditAmount == null || storeCreditAmount <= 0)) {
      toast.error("Enter a credit amount")
      return
    }
    resolveTicket(ticket.id, {
      kind,
      notes: notes.trim() || undefined,
      refundUsd,
      storeCreditAmount,
      replacementOrderId: kind === "replacement_order" ? replacementOrderId.trim() || undefined : undefined,
      replanShipmentId: kind === "replan_delivery" ? replanShipmentId.trim() || undefined : undefined,
      by: ME_ID,
    })
    onResolved(kind)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Resolve ticket"
      description={`How are you closing the loop on ${ticket.id}?`}
      footer={
        <div className="flex gap-2 pb-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={submit}>
            <CheckCircle2 className="h-4 w-4" /> Resolve ticket
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Resolution
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RESOLUTION_KINDS.map((k) => {
              const active = k === kind
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    active
                      ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/10 dark:text-primary"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  <p className="font-medium">{RESOLUTION_LABELS[k]}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{resolutionHint(k)}</p>
                </button>
              )
            })}
          </div>
        </section>

        {kind === "refund" && (
          <FormRow label="Refund amount (USD)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="0.00"
            />
          </FormRow>
        )}

        {kind === "replacement_order" && (
          <FormRow label="Replacement order ID (optional)" hint="Paste the SO‑NNNN once you've raised it.">
            <Input
              value={replacementOrderId}
              onChange={(e) => setReplacementOrderId(e.target.value)}
              placeholder="SO-…"
            />
          </FormRow>
        )}

        {kind === "replan_delivery" && (
          <FormRow label="Replanned shipment ID (optional)" hint="Tracking or shipment reference for the new delivery.">
            <Input
              value={replanShipmentId}
              onChange={(e) => setReplanShipmentId(e.target.value)}
              placeholder="SH-…"
            />
          </FormRow>
        )}

        {kind === "store_credit" && (
          <FormRow label="Credit amount (USD)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="0.00"
            />
          </FormRow>
        )}

        <FormRow label="Notes" hint="Optional — what did you do, what should the next agent know.">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Refunded 3 broken mugs; the rest were fine."
          />
        </FormRow>
      </div>
    </BottomSheet>
  )
}

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground/90">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ResolutionFigures({ resolution }: { resolution: NonNullable<Ticket["resolution"]> }) {
  const items: { label: string; value: string }[] = []
  if (resolution.refundUsd != null) items.push({ label: "Refund", value: `$${resolution.refundUsd.toFixed(2)}` })
  if (resolution.storeCreditAmount != null) items.push({ label: "Store credit", value: `$${resolution.storeCreditAmount.toFixed(2)}` })
  if (resolution.replacementOrderId) items.push({ label: "Replacement order", value: resolution.replacementOrderId })
  if (resolution.replanShipmentId) items.push({ label: "Replanned shipment", value: resolution.replanShipmentId })
  if (items.length === 0) return null
  return (
    <div className="grid gap-2 border-t border-border pt-2 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{it.label}</p>
          <p className="mt-0.5 text-sm font-semibold">{it.value}</p>
        </div>
      ))}
    </div>
  )
}

// ----- helpers -----

function assigneeName(id: string): string {
  if (id === "system") return "System"
  const m = MEMBERS.find((x) => x.id === id)
  return m?.name ?? id
}

function fmtDateTime(epochMs: number): string {
  const d = new Date(epochMs)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function parseAmount(s: string): number | undefined {
  const n = Number(s)
  if (!Number.isFinite(n)) return undefined
  return Math.round(n * 100) / 100
}

function resolutionHint(k: ResolutionKind): string {
  switch (k) {
    case "refund": return "Money back to original method"
    case "replacement_order": return "Send a new order out"
    case "replan_delivery": return "Reschedule the shipment"
    case "store_credit": return "Issue an in-store credit"
    case "apology": return "Acknowledge + apologise"
    case "no_action": return "Recorded, no action needed"
  }
}

