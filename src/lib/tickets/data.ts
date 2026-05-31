import { kvJson } from "@/lib/storage/kv"
import type {
  ResolutionKind,
  Ticket,
  TicketCategory,
  TicketChannel,
  TicketEvent,
  TicketMessage,
  TicketPriority,
  TicketResolution,
  TicketStatus,
} from "./types"

// F4 — tickets data layer.
//
// In-memory live array seeded from kv on first read, mirrored back to
// kv on every mutation. Same persistence pattern as POS storage —
// reads are sync against the live array, writes fire an async
// `kvJson.set` and notify listeners through a window event so any
// subscribed page (queue + detail open in two tabs) re-renders.

const KEY = "pallio:tickets:v1"
const CHANGED_EVENT = "pallio:tickets-changed"

let cache: Ticket[] | null = null

function load(): Ticket[] {
  if (cache != null) return cache
  if (typeof window === "undefined") {
    cache = seed()
    return cache
  }
  const stored = kvJson.get<Ticket[]>(KEY)
  if (stored && Array.isArray(stored) && stored.length > 0) {
    cache = stored
    return stored
  }
  cache = seed()
  void kvJson.set(KEY, cache)
  return cache
}

function persist(): void {
  if (cache) void kvJson.set(KEY, cache)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT))
  }
}

/** Public: live array. Pages calling read paths get whatever the cache holds today. */
export function loadTickets(): Ticket[] {
  return load()
}

export function getTicket(id: string): Ticket | undefined {
  return load().find((t) => t.id === id)
}

/** Subscribe to changes — pages re-fetch on the event. */
export function subscribeTickets(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(CHANGED_EVENT, cb)
  return () => window.removeEventListener(CHANGED_EVENT, cb)
}

// ----- Mutations -----

export type CreateTicketInput = {
  subject: string
  body: string
  category: TicketCategory
  channel: TicketChannel
  priority?: TicketPriority
  customer: Ticket["customer"]
  invoiceRef?: string
  orderRef?: string
  assignedTo?: string
  /** Hours from now until SLA expiry. Defaults by priority (urgent 2h, high 8h, normal 24h, low 72h). */
  slaHours?: number
  tags?: string[]
  /** Member id of who created it; falls back to "system" (e.g. inbound webhook). */
  by?: string
}

export function createTicket(input: CreateTicketInput): Ticket {
  const now = Date.now()
  const priority: TicketPriority = input.priority ?? "normal"
  const slaHours = input.slaHours ?? slaForPriority(priority)
  const ticket: Ticket = {
    id: nextTicketId(),
    createdAt: now,
    updatedAt: now,
    status: "new",
    category: input.category,
    channel: input.channel,
    subject: input.subject,
    body: input.body,
    customer: input.customer,
    invoiceRef: input.invoiceRef,
    orderRef: input.orderRef,
    assignedTo: input.assignedTo,
    slaDueAt: now + slaHours * 3_600_000,
    priority,
    messages: [
      // The inbound complaint becomes the first message so the thread
      // reads naturally — operator's first reply slots after it.
      {
        id: msgId(),
        at: now,
        direction: "in",
        channel: input.channel,
        author: input.customer.name,
        body: input.body,
      },
    ],
    events: [
      {
        id: evtId(),
        at: now,
        kind: "status",
        by: input.by ?? "system",
        detail: `Ticket created via ${channelLabel(input.channel)}`,
      },
    ],
    tags: input.tags,
  }
  const list = load()
  list.unshift(ticket)
  persist()
  return ticket
}

export function updateTicket(id: string, patch: Partial<Omit<Ticket, "id" | "messages" | "events">>): Ticket | undefined {
  const list = load()
  const idx = list.findIndex((t) => t.id === id)
  if (idx < 0) return undefined
  const next: Ticket = { ...list[idx]!, ...patch, updatedAt: Date.now() }
  list[idx] = next
  persist()
  return next
}

export function addMessage(id: string, msg: Omit<TicketMessage, "id" | "at"> & { at?: number }): TicketMessage | undefined {
  const list = load()
  const idx = list.findIndex((t) => t.id === id)
  if (idx < 0) return undefined
  const at = msg.at ?? Date.now()
  const message: TicketMessage = { id: msgId(), at, ...msg }
  const ticket = list[idx]!
  ticket.messages = [...ticket.messages, message]
  ticket.updatedAt = at
  // Outbound replies move new tickets into in_progress automatically —
  // matches what an operator would expect after they typed a reply.
  if (msg.direction === "out" && ticket.status === "new") {
    ticket.status = "in_progress"
    ticket.events = [
      ...ticket.events,
      {
        id: evtId(),
        at,
        kind: "status",
        by: msg.author,
        detail: "Status → in progress (first outbound reply)",
      },
    ]
  }
  ticket.events = [
    ...ticket.events,
    {
      id: evtId(),
      at,
      kind: "message_sent",
      by: msg.author,
      detail: `${msg.direction === "out" ? "Replied" : "Received"} via ${channelLabel(msg.channel)}`,
    },
  ]
  persist()
  return message
}

export function logEvent(id: string, evt: Omit<TicketEvent, "id" | "at"> & { at?: number }): TicketEvent | undefined {
  const list = load()
  const idx = list.findIndex((t) => t.id === id)
  if (idx < 0) return undefined
  const at = evt.at ?? Date.now()
  const event: TicketEvent = { id: evtId(), at, ...evt }
  const ticket = list[idx]!
  ticket.events = [...ticket.events, event]
  ticket.updatedAt = at
  persist()
  return event
}

export type ResolveInput = Omit<TicketResolution, "completedAt"> & { completedAt?: number }

/**
 * The killer mutation. Records the resolution + flips status to resolved
 * + logs an audit event. In MOCK we do NOT mutate downstream subsystems
 * (sales/invoices) — when the backend lands, refund/replacement/credit
 * kinds will fan out to createRefund/createOrder/createCredit and the
 * resolution will carry the returned ids.
 */
export function resolveTicket(id: string, resolution: ResolveInput): Ticket | undefined {
  const list = load()
  const idx = list.findIndex((t) => t.id === id)
  if (idx < 0) return undefined
  const at = resolution.completedAt ?? Date.now()
  const ticket = list[idx]!
  const fullResolution: TicketResolution = { ...resolution, completedAt: at }
  ticket.resolution = fullResolution
  ticket.status = "resolved"
  ticket.updatedAt = at
  ticket.events = [
    ...ticket.events,
    {
      id: evtId(),
      at,
      kind: "resolution",
      by: resolution.by,
      detail: resolutionLabel(fullResolution),
    },
  ]
  persist()
  return ticket
}

// ----- helpers -----

function slaForPriority(p: TicketPriority): number {
  if (p === "urgent") return 2
  if (p === "high") return 8
  if (p === "low") return 72
  return 24
}

function channelLabel(c: TicketChannel): string {
  switch (c) {
    case "inbox": return "inbox"
    case "phone": return "phone"
    case "whatsapp": return "WhatsApp"
    case "sms": return "SMS"
    case "email": return "email"
    case "walk_in": return "walk-in"
    case "storefront": return "storefront"
  }
}

function resolutionLabel(r: TicketResolution): string {
  switch (r.kind) {
    case "refund": return `Refunded ${fmt(r.refundUsd ?? 0)}`
    case "replacement_order": return `Created replacement order${r.replacementOrderId ? ` ${r.replacementOrderId}` : ""}`
    case "replan_delivery": return `Replanned shipment${r.replanShipmentId ? ` ${r.replanShipmentId}` : ""}`
    case "store_credit": return `Issued ${fmt(r.storeCreditAmount ?? 0)} store credit`
    case "no_action": return "Resolved with no action"
    case "apology": return "Acknowledged + apology sent"
  }
}

function fmt(n: number): string {
  return `$${n.toFixed(2)}`
}

let __idCounter = 0
function nextTicketId(): string {
  // tk-YY-NNNN — readable, monotonically increasing within the year.
  // We don't try to guarantee uniqueness across reloads of the same
  // browser; the seed counter advances past the existing max on load.
  if (cache && cache.length > 0) {
    const maxN = Math.max(
      0,
      ...cache.map((t) => {
        const m = t.id.match(/tk-\d{2}-(\d+)$/)
        return m ? Number(m[1]) : 0
      }),
    )
    __idCounter = Math.max(__idCounter, maxN)
  }
  __idCounter += 1
  const yy = String(new Date().getFullYear()).slice(-2)
  return `tk-${yy}-${String(__idCounter).padStart(4, "0")}`
}

function msgId(): string { return `tkm-${Math.random().toString(36).slice(2, 10)}` }
function evtId(): string { return `tke-${Math.random().toString(36).slice(2, 10)}` }

// ----- seed -----

function hoursAgo(h: number): number { return Date.now() - h * 3_600_000 }
function hoursAhead(h: number): number { return Date.now() + h * 3_600_000 }
function daysAgo(d: number): number { return Date.now() - d * 86_400_000 }

// Realistic seed — references real customers + invoices from lib/sales/data.ts
// so the detail page can deep-link back into the existing pipeline.
function seed(): Ticket[] {
  const now = Date.now()
  __idCounter = 0
  return [
    {
      id: "tk-26-0001",
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(1),
      status: "new",
      category: "damaged",
      channel: "whatsapp",
      priority: "high",
      subject: "Hub arrived with cracked casing",
      body: "Hi — I got 4 USB‑C hubs from order SO‑2401 but one casing is cracked. Can you replace just the one?",
      customer: { id: "cust-nova", name: "NovaApps", email: "ops@novaapps.com", phone: "+1 212 555 0107" },
      invoiceRef: "INV-2401",
      orderRef: "SO-2401",
      assignedTo: "m-1",
      slaDueAt: hoursAhead(6),
      messages: [
        {
          id: "tkm-seed-a1",
          at: hoursAgo(2),
          direction: "in",
          channel: "whatsapp",
          author: "NovaApps",
          body: "Hi — I got 4 USB‑C hubs from order SO‑2401 but one casing is cracked. Can you replace just the one?",
        },
      ],
      events: [
        { id: "tke-seed-a1", at: hoursAgo(2), kind: "status", by: "system", detail: "Ticket created via WhatsApp" },
        { id: "tke-seed-a2", at: hoursAgo(1), kind: "assignment", by: "m-1", detail: "Assigned to Mia Chen" },
      ],
      tags: ["damage", "partial"],
    },
    {
      id: "tk-26-0002",
      createdAt: daysAgo(2),
      updatedAt: hoursAgo(20),
      status: "awaiting_customer",
      category: "missing",
      channel: "email",
      priority: "normal",
      subject: "Only 10 of 12 tees received",
      body: "Hello — invoice INV‑2402 says 12 cotton tees, but the box only had 10. Photos attached.",
      customer: { id: "cust-bright", name: "BrightLane", email: "billing@brightlane.io" },
      invoiceRef: "INV-2402",
      orderRef: "SO-2402",
      assignedTo: "m-2",
      slaDueAt: hoursAhead(8),
      messages: [
        {
          id: "tkm-seed-b1",
          at: daysAgo(2),
          direction: "in",
          channel: "email",
          author: "BrightLane",
          body: "Hello — invoice INV‑2402 says 12 cotton tees, but the box only had 10. Photos attached.",
        },
        {
          id: "tkm-seed-b2",
          at: hoursAgo(20),
          direction: "out",
          channel: "email",
          author: "m-2",
          body: "Thanks — checking with the warehouse now. Could you confirm the carton seal was intact when it arrived?",
        },
      ],
      events: [
        { id: "tke-seed-b1", at: daysAgo(2), kind: "status", by: "system", detail: "Ticket created via email" },
        { id: "tke-seed-b2", at: daysAgo(2), kind: "assignment", by: "m-2", detail: "Assigned to Alex Larson" },
        { id: "tke-seed-b3", at: hoursAgo(20), kind: "status", by: "m-2", detail: "Status → awaiting customer" },
      ],
    },
    {
      id: "tk-26-0003",
      createdAt: hoursAgo(30),
      updatedAt: hoursAgo(4),
      status: "in_progress",
      category: "wrong_item",
      channel: "phone",
      priority: "high",
      subject: "Received wrong serum scent",
      body: "Called to report INV‑2403 came with citrus serum instead of the hydrating one I ordered.",
      customer: { id: "cust-glow", name: "Glow Co", email: "wholesale@glowco.com" },
      invoiceRef: "INV-2403",
      orderRef: "SO-2403",
      assignedTo: "m-1",
      slaDueAt: hoursAhead(4),
      messages: [
        {
          id: "tkm-seed-c1",
          at: hoursAgo(30),
          direction: "in",
          channel: "phone",
          author: "Glow Co",
          body: "Called to report INV‑2403 came with citrus serum instead of the hydrating one I ordered.",
        },
        {
          id: "tkm-seed-c2",
          at: hoursAgo(4),
          direction: "out",
          channel: "phone",
          author: "m-1",
          body: "Confirmed batch picked from the wrong shelf. Replacement going out today, return label for the wrong one via email.",
        },
      ],
      events: [
        { id: "tke-seed-c1", at: hoursAgo(30), kind: "status", by: "system", detail: "Ticket created via phone" },
        { id: "tke-seed-c2", at: hoursAgo(28), kind: "assignment", by: "m-1", detail: "Assigned to Mia Chen" },
        { id: "tke-seed-c3", at: hoursAgo(4), kind: "status", by: "m-1", detail: "Status → in progress" },
      ],
    },
    {
      id: "tk-26-0004",
      createdAt: daysAgo(5),
      updatedAt: daysAgo(4),
      status: "resolved",
      category: "damaged",
      channel: "email",
      priority: "normal",
      subject: "Three mugs broken on arrival",
      body: "Hi — three of the ceramic mugs from INV‑2406 were broken on arrival. Refund please.",
      customer: { id: "cust-acme", name: "Acme Co", email: "ap@acme.co" },
      invoiceRef: "INV-2406",
      orderRef: "SO-2406",
      assignedTo: "m-2",
      messages: [
        {
          id: "tkm-seed-d1",
          at: daysAgo(5),
          direction: "in",
          channel: "email",
          author: "Acme Co",
          body: "Hi — three of the ceramic mugs from INV‑2406 were broken on arrival. Refund please.",
        },
        {
          id: "tkm-seed-d2",
          at: daysAgo(4.8),
          direction: "out",
          channel: "email",
          author: "m-2",
          body: "Sorry about that — refund processed today for the broken units.",
        },
      ],
      events: [
        { id: "tke-seed-d1", at: daysAgo(5), kind: "status", by: "system", detail: "Ticket created via email" },
        { id: "tke-seed-d2", at: daysAgo(4.9), kind: "assignment", by: "m-2", detail: "Assigned to Alex Larson" },
        { id: "tke-seed-d3", at: daysAgo(4), kind: "resolution", by: "m-2", detail: "Refunded $24.00" },
      ],
      resolution: {
        kind: "refund",
        notes: "3 of 3 broken mugs refunded; customer kept the rest",
        refundUsd: 24,
        completedAt: daysAgo(4),
        by: "m-2",
      },
    },
    {
      id: "tk-26-0005",
      createdAt: hoursAgo(6),
      updatedAt: hoursAgo(6),
      status: "new",
      category: "late",
      channel: "sms",
      priority: "urgent",
      subject: "Where is my order?",
      body: "It's been a week and SO‑2404 still hasn't arrived. Need it for an event tomorrow.",
      customer: { id: "cust-aisha", name: "Aisha N.", email: "aisha@walkin.local", phone: "+44 20 7946 0118" },
      orderRef: "SO-2404",
      slaDueAt: hoursAhead(1),
      messages: [
        {
          id: "tkm-seed-e1",
          at: hoursAgo(6),
          direction: "in",
          channel: "sms",
          author: "Aisha N.",
          body: "It's been a week and SO‑2404 still hasn't arrived. Need it for an event tomorrow.",
        },
      ],
      events: [
        { id: "tke-seed-e1", at: hoursAgo(6), kind: "status", by: "system", detail: "Ticket created via SMS" },
      ],
      tags: ["delivery"],
    },
    {
      id: "tk-26-0006",
      createdAt: daysAgo(1),
      updatedAt: hoursAgo(2),
      status: "triage",
      category: "quality",
      channel: "storefront",
      priority: "normal",
      subject: "Serum bottles leaking",
      body: "Two of the hydrating serum bottles arrived leaking, packaging stained.",
      customer: { id: "cust-glow", name: "Glow Co", email: "wholesale@glowco.com" },
      invoiceRef: "INV-2403",
      orderRef: "SO-2403",
      slaDueAt: hoursAhead(10),
      messages: [
        {
          id: "tkm-seed-f1",
          at: daysAgo(1),
          direction: "in",
          channel: "storefront",
          author: "Glow Co",
          body: "Two of the hydrating serum bottles arrived leaking, packaging stained.",
        },
      ],
      events: [
        { id: "tke-seed-f1", at: daysAgo(1), kind: "status", by: "system", detail: "Ticket created via storefront" },
        { id: "tke-seed-f2", at: hoursAgo(2), kind: "status", by: "m-1", detail: "Status → triage" },
      ],
      tags: ["batch-check"],
    },
    {
      id: "tk-26-0007",
      createdAt: daysAgo(3),
      updatedAt: hoursAgo(50),
      status: "in_progress",
      category: "billing",
      channel: "email",
      priority: "high",
      subject: "Double-charged on my card",
      body: "INV‑2402 charged my card twice on the 14th. Need one of them refunded.",
      customer: { id: "cust-bright", name: "BrightLane", email: "billing@brightlane.io" },
      invoiceRef: "INV-2402",
      assignedTo: "m-2",
      slaDueAt: hoursAgo(3), // overdue
      messages: [
        {
          id: "tkm-seed-g1",
          at: daysAgo(3),
          direction: "in",
          channel: "email",
          author: "BrightLane",
          body: "INV‑2402 charged my card twice on the 14th. Need one of them refunded.",
        },
        {
          id: "tkm-seed-g2",
          at: daysAgo(2.5),
          direction: "out",
          channel: "email",
          author: "m-2",
          body: "Pulling the gateway log now — back to you within the hour.",
        },
      ],
      events: [
        { id: "tke-seed-g1", at: daysAgo(3), kind: "status", by: "system", detail: "Ticket created via email" },
        { id: "tke-seed-g2", at: daysAgo(3), kind: "assignment", by: "m-2", detail: "Assigned to Alex Larson" },
        { id: "tke-seed-g3", at: daysAgo(2.5), kind: "status", by: "m-2", detail: "Status → in progress" },
      ],
    },
    {
      id: "tk-26-0008",
      createdAt: daysAgo(9),
      updatedAt: daysAgo(8),
      status: "closed",
      category: "refund_request",
      channel: "walk_in",
      priority: "low",
      subject: "Changed my mind on the mouse",
      body: "Came in to return the wireless mouse — bought yesterday, still sealed.",
      customer: { id: "cust-aisha", name: "Aisha N.", email: "aisha@walkin.local" },
      messages: [
        {
          id: "tkm-seed-h1",
          at: daysAgo(9),
          direction: "in",
          channel: "walk_in",
          author: "Aisha N.",
          body: "Came in to return the wireless mouse — bought yesterday, still sealed.",
        },
      ],
      events: [
        { id: "tke-seed-h1", at: daysAgo(9), kind: "status", by: "system", detail: "Ticket created via walk-in" },
        { id: "tke-seed-h2", at: daysAgo(8), kind: "resolution", by: "m-3", detail: "Refunded $22.00" },
        { id: "tke-seed-h3", at: daysAgo(8), kind: "status", by: "m-3", detail: "Status → closed" },
      ],
      resolution: {
        kind: "refund",
        notes: "Refund-to-card at till. Item resealed and restocked.",
        refundUsd: 22,
        completedAt: daysAgo(8),
        by: "m-3",
      },
    },
  ]
}

// ----- copy helpers (used by pages/components for labels + dropdowns) -----

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  new: "New",
  triage: "Triage",
  in_progress: "In progress",
  awaiting_customer: "Awaiting customer",
  resolved: "Resolved",
  closed: "Closed",
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  damaged: "Damaged",
  missing: "Missing items",
  late: "Late delivery",
  wrong_item: "Wrong item",
  quality: "Quality issue",
  billing: "Billing",
  refund_request: "Refund request",
  other: "Other",
}

export const TICKET_CHANNEL_LABELS: Record<TicketChannel, string> = {
  inbox: "Inbox",
  phone: "Phone",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  walk_in: "Walk-in",
  storefront: "Storefront",
}

export const RESOLUTION_LABELS: Record<ResolutionKind, string> = {
  refund: "Refund",
  replacement_order: "Replacement order",
  replan_delivery: "Replan shipment",
  store_credit: "Store credit",
  no_action: "No action",
  apology: "Apology only",
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
}

/** Whether a ticket's SLA has elapsed without resolution. */
export function isOverdue(t: Ticket, now: number = Date.now()): boolean {
  if (!t.slaDueAt) return false
  if (t.status === "resolved" || t.status === "closed") return false
  return now > t.slaDueAt
}

/** New-ticket count — drives the sidebar badge. */
export function newTicketCount(): number {
  return load().filter((t) => t.status === "new").length
}
