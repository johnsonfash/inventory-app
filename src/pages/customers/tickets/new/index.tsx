import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { LifeBuoy, MessageSquare } from "lucide-react"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTerm } from "@/hooks/use-industry"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import {
  TICKET_CATEGORY_LABELS,
  TICKET_CHANNEL_LABELS,
  TICKET_PRIORITY_LABELS,
  createTicket,
} from "@/lib/tickets/data"
import type {
  TicketCategory,
  TicketChannel,
  TicketPriority,
} from "@/lib/tickets/types"
import { MEMBERS } from "@/lib/team/data"

const CATEGORIES: TicketCategory[] = ["damaged", "missing", "late", "wrong_item", "quality", "billing", "refund_request", "other"]
const CHANNELS: TicketChannel[] = ["inbox", "phone", "whatsapp", "sms", "email", "walk_in", "storefront"]
const PRIORITIES: TicketPriority[] = ["low", "normal", "high", "urgent"]

const ME_ID = "m-1"

export default function NewTicket() {
  const navigate = useNavigate()
  const customerTerm = useTerm("customer", "Customer")

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))

  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [category, setCategory] = React.useState<TicketCategory>("damaged")
  const [channel, setChannel] = React.useState<TicketChannel>("inbox")
  const [priority, setPriority] = React.useState<TicketPriority>("normal")
  const [customerName, setCustomerName] = React.useState("")
  const [customerEmail, setCustomerEmail] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [invoiceRef, setInvoiceRef] = React.useState("")
  const [orderRef, setOrderRef] = React.useState("")
  const [assignedTo, setAssignedTo] = React.useState<string>("__unassigned")
  const [submitting, setSubmitting] = React.useState(false)

  const canSubmit = subject.trim().length > 1 && body.trim().length > 1 && customerName.trim().length > 1

  const submit = () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const ticket = createTicket({
      subject: subject.trim(),
      body: body.trim(),
      category,
      channel,
      priority,
      customer: {
        name: customerName.trim(),
        email: customerEmail.trim() || undefined,
        phone: customerPhone.trim() || undefined,
      },
      invoiceRef: invoiceRef.trim() || undefined,
      orderRef: orderRef.trim() || undefined,
      assignedTo: assignedTo === "__unassigned" ? undefined : assignedTo,
      by: ME_ID,
    })
    toast.success(`Ticket ${ticket.id} created`)
    navigate(`/customers/tickets/${ticket.id}`)
  }

  return (
    <FormShell
      title="New ticket"
      description={`Open a follow-up for a ${customerTerm.toLowerCase()} complaint or question.`}
      backHref="/customers/tickets"
      onSubmit={submit}
      footer={
        <FormFooter
          submitLabel="Create ticket"
          submitDisabled={!canSubmit}
          submitting={submitting}
          cancelHref="/customers/tickets"
          submitTooltip={!canSubmit ? "Add a subject, body, and customer name" : undefined}
        />
      }
      aside={
        <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <p className="mb-1.5 inline-flex items-center gap-1.5 font-semibold text-foreground">
            <LifeBuoy className="h-3.5 w-3.5 text-brand dark:text-primary" /> Anatomy of a good ticket
          </p>
          <ul className="space-y-1.5">
            <li>One subject line that says what's wrong in 5–8 words.</li>
            <li>Body should quote the {customerTerm.toLowerCase()}'s exact words — keeps everyone honest.</li>
            <li>Link the invoice or order so resolution paths are one click away.</li>
            <li>Priority is operator judgment — urgent only if the customer says "today".</li>
          </ul>
        </div>
      }
    >
      <FormSection title="Complaint" Icon={MessageSquare} description="What the customer told you.">
        <FormGrid cols={1}>
          <FormField label="Subject" required htmlFor="subject">
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Cracked casing on USB‑C hub"
            />
          </FormField>
          <FormField label="Body" required htmlFor="body" hint="Quote what the customer said in their own words.">
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="They messaged saying one of four hubs arrived with a cracked plastic shell…"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Classification">
        <FormGrid cols={3}>
          <FormField label="Category" required>
            <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
              <SelectTrigger><SelectValue>{TICKET_CATEGORY_LABELS[category]}</SelectValue></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{TICKET_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Channel" required>
            <Select value={channel} onValueChange={(v) => setChannel(v as TicketChannel)}>
              <SelectTrigger><SelectValue>{TICKET_CHANNEL_LABELS[channel]}</SelectValue></SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>{TICKET_CHANNEL_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Priority">
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger><SelectValue>{TICKET_PRIORITY_LABELS[priority]}</SelectValue></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title={customerTerm} description={`Who reported it.`}>
        <FormGrid cols={2}>
          <FormField label={`${customerTerm} name`} required span={2} htmlFor="customer-name">
            <Input
              id="customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in name or business"
            />
          </FormField>
          <FormField label="Email" htmlFor="customer-email">
            <Input
              id="customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="ops@example.com"
            />
          </FormField>
          <FormField label="Phone" htmlFor="customer-phone">
            <Input
              id="customer-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+1 415…"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="References & routing" description="Optional — link to a sale and assign an owner.">
        <FormGrid cols={3}>
          <FormField label="Invoice ref" htmlFor="invoice-ref">
            <Input
              id="invoice-ref"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="INV-2401"
            />
          </FormField>
          <FormField label="Order ref" htmlFor="order-ref">
            <Input
              id="order-ref"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="SO-2401"
            />
          </FormField>
          <FormField label="Assignee">
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue>
                  {assignedTo === "__unassigned"
                    ? "Unassigned"
                    : (MEMBERS.find((m) => m.id === assignedTo)?.name ?? assignedTo)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned">Unassigned</SelectItem>
                {MEMBERS.filter((m) => m.status === "active").map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
