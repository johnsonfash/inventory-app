// F4 — Customer tickets & resolution.
//
// One mental model across every industry: a customer complains, the
// resolution team triages, replies, and closes the loop with a REAL
// downstream record (refund / replacement order / replan shipment /
// store credit / no-action acknowledgement).
//
// The same shape works for retail damage claims, restaurant "missing
// item from delivery" complaints, salon redo requests, auto warranty
// callbacks, manufacturing shipment disputes, etc. Categories are
// intentionally generic — `useTerm("customer", "Customer")` localises
// the UI vocabulary without forking the data model.

export type TicketStatus =
  | "new"
  | "triage"
  | "in_progress"
  | "awaiting_customer"
  | "resolved"
  | "closed"

export type TicketCategory =
  | "damaged"
  | "missing"
  | "late"
  | "wrong_item"
  | "quality"
  | "billing"
  | "refund_request"
  | "other"

export type TicketChannel =
  | "inbox"
  | "phone"
  | "whatsapp"
  | "sms"
  | "email"
  | "walk_in"
  | "storefront"

export type ResolutionKind =
  | "refund"
  | "replacement_order"
  | "replan_delivery"
  | "store_credit"
  | "no_action"
  | "apology"

export type TicketPriority = "low" | "normal" | "high" | "urgent"

export type TicketMessage = {
  id: string
  at: number
  direction: "in" | "out"
  channel: TicketChannel
  /** Member id for outbound, customer name for inbound. */
  author: string
  body: string
}

export type TicketEvent = {
  id: string
  at: number
  kind: "status" | "assignment" | "resolution" | "note" | "message_sent"
  /** Member id ("system" for auto-generated events). */
  by: string
  detail: string
}

export type TicketResolution = {
  kind: ResolutionKind
  notes?: string
  refundUsd?: number
  replacementOrderId?: string
  storeCreditAmount?: number
  replanShipmentId?: string
  completedAt: number
  by: string
}

export type Ticket = {
  /** Human-friendly id (e.g. "tk-2401"). */
  id: string
  createdAt: number
  updatedAt: number
  status: TicketStatus
  category: TicketCategory
  channel: TicketChannel
  subject: string
  body: string
  customer: { id?: string; name: string; email?: string; phone?: string }
  /** Invoice number this ticket references (e.g. "INV-2402"). */
  invoiceRef?: string
  orderRef?: string
  /** Member id of the assignee. */
  assignedTo?: string
  /** Epoch ms — SLA target; overdue if now > slaDueAt and status not closed/resolved. */
  slaDueAt?: number
  priority: TicketPriority
  resolution?: TicketResolution
  messages: TicketMessage[]
  events: TicketEvent[]
  tags?: string[]
}
