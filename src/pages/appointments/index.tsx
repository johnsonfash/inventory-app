import * as React from "react"
import { toast } from "sonner"
import { CalendarDays, CalendarOff, Check, ChevronLeft, ChevronRight, Clock, MapPin, Plus, User, X } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { AddAppointmentDialog, type QuickAppt } from "@/components/dialogs/add-appointment-dialog"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { cn } from "@/lib/utils"

type Appt = {
  id: string
  title: string
  customer: string
  date: string // YYYY-MM-DD
  start: string
  end: string
  staff: string
  location: string
  type: "consult" | "service" | "installation" | "follow-up"
  status: "scheduled" | "confirmed" | "cancelled"
}

const todayISO = new Date().toISOString().slice(0, 10)
const addDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const SEED_APPOINTMENTS: Appt[] = [
  { id: "A-1042", title: "Pickup — bulk order", customer: "Acme Co", date: todayISO, start: "09:30", end: "10:00", staff: "Mia Chen", location: "WH-A loading bay", type: "service", status: "confirmed" },
  { id: "A-1043", title: "Inventory consult", customer: "NovaApps", date: todayISO, start: "11:00", end: "11:45", staff: "Alex Larson", location: "Conference room", type: "consult", status: "scheduled" },
  { id: "A-1044", title: "POS install", customer: "BrightLane", date: todayISO, start: "14:30", end: "16:00", staff: "Priya Patel", location: "On-site", type: "installation", status: "confirmed" },
  { id: "A-1045", title: "Quarterly review", customer: "Linda M.", date: addDays(1), start: "10:00", end: "10:30", staff: "Mia Chen", location: "Virtual · Zoom", type: "consult", status: "scheduled" },
  { id: "A-1046", title: "Damaged item follow-up", customer: "Zenith Ltd", date: addDays(2), start: "13:00", end: "13:30", staff: "Daniel Kim", location: "WH-B", type: "follow-up", status: "scheduled" },
  { id: "A-1047", title: "Pickup", customer: "Walk-in", date: addDays(3), start: "09:00", end: "09:30", staff: "Mia Chen", location: "Storefront", type: "service", status: "cancelled" },
]

const typeTone: Record<Appt["type"], StatusTone> = {
  consult: "info",
  service: "brand",
  installation: "warning",
  "follow-up": "neutral",
}
const statusTone: Record<Appt["status"], StatusTone> = {
  scheduled: "warning",
  confirmed: "success",
  cancelled: "danger",
}

// --- Staff time off / leave ---
// Staff block time as unavailable; an admin approves or rejects. Approved
// leave shows on the calendar (so it isn't double-booked) and notifies
// the requester. Mock today; backend gates request vs approve by RBAC
// and pushes the notification.
type LeaveStatus = "pending" | "approved" | "rejected"
type TimeOff = {
  id: string
  staff: string
  start: string // YYYY-MM-DD
  end: string   // inclusive
  allDay: boolean
  reason: string
  status: LeaveStatus
  decisionNote?: string
}

const STAFF = ["Mia Chen", "Alex Larson", "Priya Patel", "Daniel Kim"]

const SEED_TIME_OFF: TimeOff[] = [
  { id: "TO-3001", staff: "Priya Patel", start: addDays(2), end: addDays(3), allDay: true, reason: "Family event", status: "pending" },
  { id: "TO-3002", staff: "Daniel Kim",  start: addDays(6), end: addDays(8), allDay: true, reason: "Annual leave", status: "approved" },
]

const leaveTone: Record<LeaveStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
}

// Every ISO date in [start, end] inclusive.
function datesInRange(start: string, end: string): string[] {
  const out: string[] = []
  const d = new Date(start)
  const last = new Date(end)
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}

function buildMonth(ref: Date) {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)) // start on Monday
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export default function Appointments() {
  const [refDate, setRefDate] = React.useState(new Date())
  const [selected, setSelected] = React.useState(todayISO)
  const [appts, setAppts] = React.useState<Appt[]>(SEED_APPOINTMENTS)
  const [addOpen, setAddOpen] = React.useState(false)

  const handleCreate = (a: QuickAppt) => {
    setAppts((prev) => [
      { ...a, id: `A-${Date.now().toString().slice(-5)}`, status: "scheduled" },
      ...prev,
    ])
    setSelected(a.date) // jump the calendar to the new booking's day
  }

  // Time off / leave state + handlers.
  const [timeOff, setTimeOff] = React.useState<TimeOff[]>(SEED_TIME_OFF)
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [rejectFor, setRejectFor] = React.useState<TimeOff | null>(null)
  const [rejectNote, setRejectNote] = React.useState("")

  const submitRequest = (req: Omit<TimeOff, "id" | "status">) => {
    setTimeOff((prev) => [{ ...req, id: `TO-${Date.now().toString().slice(-5)}`, status: "pending" }, ...prev])
    toast.success("Time-off request sent", { description: "Your manager has been notified to approve it." })
    setRequestOpen(false)
  }
  const approveLeave = (t: TimeOff) => {
    setTimeOff((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: "approved" } : x)))
    toast.success("Leave approved", { description: `${t.staff} · ${t.reason}. The calendar now blocks these days.` })
  }
  const confirmReject = () => {
    if (!rejectFor) return
    const t = rejectFor
    try {
      setTimeOff((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: "rejected", decisionNote: rejectNote.trim() || undefined } : x)))
      toast(`Leave rejected`, { description: `${t.staff} has been notified.` })
      setRejectFor(null)
      setRejectNote("")
    } catch {
      // Defensive: when this flows through a backend the state update
      // could throw or the server could reject — keep the sheet open
      // and surface the failure rather than silently dismissing.
      toast.error("Couldn't reject the request", { description: "Try again in a moment." })
    }
  }

  // ISO date → staff on approved leave that day (drives calendar markers
  // + the selected-day banner).
  const leaveByDay = React.useMemo(() => {
    const m = new Map<string, string[]>()
    for (const t of timeOff) {
      if (t.status !== "approved") continue
      for (const iso of datesInRange(t.start, t.end)) {
        m.set(iso, [...(m.get(iso) ?? []), t.staff])
      }
    }
    return m
  }, [timeOff])
  const pendingLeave = timeOff.filter((t) => t.status === "pending")

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const days = buildMonth(refDate)
  const monthLabel = refDate.toLocaleString(undefined, { month: "long", year: "numeric" })
  const sameMonth = (d: Date) => d.getMonth() === refDate.getMonth()
  const isoOf = (d: Date) => d.toISOString().slice(0, 10)

  const countsByDay = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const a of appts) m.set(a.date, (m.get(a.date) ?? 0) + 1)
    return m
  }, [appts])

  const dayItems = appts.filter((a) => a.date === selected).sort((a, b) => a.start.localeCompare(b.start))
  const upcoming = appts
    .filter((a) => a.date >= todayISO && a.status !== "cancelled")
    .sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`))
    .slice(0, 5)

  return (
    <PageShell
      title="Appointments"
      withToolbar
      titleTooltip={
        <>
          Customer bookings — fittings, consults, pickups, in-store
          appointments. Each one ties to a staff member, a location,
          and optionally an order, so the same calendar drives revenue
          + roster planning.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Header strip */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight md:text-xl">Schedule</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{appts.length} appointments on the calendar</p>
          </div>
          <Button className="hidden md:inline-flex" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New appointment</Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Calendar */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold">{monthLabel}</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRefDate(new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRefDate(new Date())}
                  className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setRefDate(new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {d}
                </span>
              ))}
              {days.map((d) => {
                const iso = isoOf(d)
                const inMonth = sameMonth(d)
                const isToday = iso === todayISO
                const isSelected = iso === selected
                const n = countsByDay.get(iso) ?? 0
                const onLeave = leaveByDay.has(iso)
                return (
                  <button
                    type="button"
                    key={iso}
                    onClick={() => setSelected(iso)}
                    className={cn(
                      "relative flex aspect-square min-h-9 flex-col items-center justify-center rounded-lg text-xs transition-colors",
                      !inMonth && "text-muted-foreground/40",
                      isSelected && "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground",
                      !isSelected && isToday && "ring-1 ring-inset ring-brand dark:ring-primary",
                      !isSelected && onLeave && "bg-amber-500/10",
                      !isSelected && "hover:bg-accent",
                    )}
                    title={onLeave ? `On leave: ${leaveByDay.get(iso)!.join(", ")}` : undefined}
                  >
                    <span className={cn(isSelected ? "font-bold" : isToday ? "font-semibold" : "")}>{d.getDate()}</span>
                    <span className="mt-0.5 flex items-center gap-0.5">
                      {n > 0 && (
                        <span className={cn("h-1 w-1 rounded-full", isSelected ? "bg-white" : "bg-brand dark:bg-primary")} />
                      )}
                      {onLeave && (
                        <span className={cn("h-1 w-1 rounded-full", isSelected ? "bg-white/80" : "bg-amber-500")} />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected day list.
              Desktop: sticky so the day's bookings stay in view while you
              scroll the calendar (rather than scrolling away). `self-start`
              keeps the column content-height so sticky has room to travel;
              max-h + overflow lets a busy day scroll inside the panel.
              Mobile: this stacks directly under the (short) calendar, so
              the tapped day's list is already a thumb-flick away — no
              overlay needed here. */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-7.5rem)] lg:self-start lg:overflow-y-auto lg:pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {new Date(selected).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            {leaveByDay.has(selected) && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs dark:bg-amber-950/15">
                <CalendarOff className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
                <span><strong className="font-semibold">On leave:</strong> {leaveByDay.get(selected)!.join(", ")}</span>
              </div>
            )}
            {dayItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No appointments</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Nothing booked for this day.</p>
                <Button size="sm" className="mt-3" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New appointment</Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {dayItems.map((a) => (
                  <li key={a.id} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {a.customer}
                        </p>
                      </div>
                      <StatusBadge tone={statusTone[a.status]}>{a.status}</StatusBadge>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {a.start} – {a.end}</span>
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {a.staff}</span>
                      <span className="inline-flex items-center gap-1 sm:col-span-2"><MapPin className="h-3 w-3" /> {a.location}</span>
                    </div>
                    <div className="mt-2">
                      <StatusBadge tone={typeTone[a.type]}>{a.type}</StatusBadge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming */}
        <section className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</p>
          {upcoming.length === 0 ? (
            <EmptyState Icon={CalendarDays} title="Nothing scheduled" description="Add an appointment to see it here." size="sm" />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <span className="text-[10px] uppercase">
                      {new Date(a.date).toLocaleString(undefined, { month: "short" })}
                    </span>
                    <span className="text-base font-bold leading-tight">{new Date(a.date).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{a.title}</p>
                      <StatusBadge tone={statusTone[a.status]}>{a.status}</StatusBadge>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {a.customer} · {a.start} · {a.staff}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Time off & leave */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time off &amp; leave</p>
              {pendingLeave.length > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">{pendingLeave.length} request{pendingLeave.length === 1 ? "" : "s"} awaiting approval</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => setRequestOpen(true)}>
              <CalendarOff className="h-3.5 w-3.5" /> Request time off
            </Button>
          </div>
          {timeOff.length === 0 ? (
            <EmptyState Icon={CalendarOff} title="No time off booked" description="Staff requests appear here for you to approve." size="sm" />
          ) : (
            <ul className="space-y-2">
              {timeOff.map((t) => (
                <li key={t.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.staff}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {fmtRange(t.start, t.end)} · {t.allDay ? "All day" : "Part day"} · {t.reason}
                      </p>
                      {t.decisionNote && <p className="mt-0.5 text-[11px] text-rose-600 dark:text-rose-400">Note: {t.decisionNote}</p>}
                    </div>
                    <StatusBadge tone={leaveTone[t.status]}>{t.status}</StatusBadge>
                  </div>
                  {t.status === "pending" && (
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" onClick={() => approveLeave(t)}><Check className="h-3.5 w-3.5" /> Approve</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectFor(t)} className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <MobileFab onClick={() => setAddOpen(true)} label="New appointment" />
      <AddAppointmentDialog open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} staffOptions={STAFF} defaultDate={selected} />

      <RequestTimeOffSheet open={requestOpen} onClose={() => setRequestOpen(false)} onSubmit={submitRequest} />

      {/* Reject with an optional note shared back to the requester. */}
      <BottomSheet
        open={rejectFor !== null}
        onClose={() => { setRejectFor(null); setRejectNote("") }}
        title="Reject time-off request"
        description={rejectFor ? `${rejectFor.staff} · ${fmtRange(rejectFor.start, rejectFor.end)}` : undefined}
        footer={
          <div className="flex items-center justify-end gap-2 pb-3">
            <Button variant="ghost" onClick={() => { setRejectFor(null); setRejectNote("") }}>Cancel</Button>
            <Button onClick={confirmReject} className="bg-rose-600 text-white hover:bg-rose-600/90 dark:bg-rose-700 dark:hover:bg-rose-700/90">Reject request</Button>
          </div>
        }
      >
        <label className="flex flex-col gap-1.5 pb-1 text-xs">
          <span className="font-semibold text-foreground/80">Reason (optional, shared with the requester)</span>
          <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="e.g. clashes with the month-end stock count — let's pick another week" />
        </label>
      </BottomSheet>
    </PageShell>
  )
}

// Range label: "May 28" for a single day, "May 28 – May 30" for a span.
function fmtRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  const s = new Date(start).toLocaleDateString(undefined, opts)
  if (start === end) return s
  return `${s} – ${new Date(end).toLocaleDateString(undefined, opts)}`
}

// Self-contained request form (isolated state so a cancelled draft never
// leaks into the next request).
function RequestTimeOffSheet({ open, onClose, onSubmit }: {
  open: boolean
  onClose: () => void
  onSubmit: (r: Omit<TimeOff, "id" | "status">) => void
}) {
  const [staff, setStaff] = React.useState(STAFF[0]!)
  const [start, setStart] = React.useState(todayISO)
  const [end, setEnd] = React.useState(todayISO)
  const [allDay, setAllDay] = React.useState(true)
  const [reason, setReason] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setStaff(STAFF[0]!)
    setStart(todayISO)
    setEnd(todayISO)
    setAllDay(true)
    setReason("")
  }, [open])

  const valid = reason.trim().length > 0 && end >= start
  const submit = () => {
    if (!valid) return
    onSubmit({ staff, start, end, allDay, reason: reason.trim() })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Request time off"
      description="Block these days as unavailable. Your manager approves before it shows on the calendar."
      maxHeightVh={85}
      footer={
        <div className="flex items-center justify-end gap-2 pb-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!valid}>Send request</Button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex flex-col gap-3 pb-1">
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-foreground/80">Staff member</span>
          <Select value={staff} onValueChange={setStaff}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAFF.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-foreground/80">From</span>
            <Input type="date" value={start} onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value) }} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-foreground/80">To</span>
            <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
          <div>
            <p className="text-sm font-medium">All day</p>
            <p className="text-[11px] text-muted-foreground">Off for the whole working day(s).</p>
          </div>
          <Switch checked={allDay} onCheckedChange={setAllDay} aria-label="All day" />
        </div>
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-foreground/80">Reason</span>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Annual leave, appointment, family event…" />
        </label>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </BottomSheet>
  )
}
