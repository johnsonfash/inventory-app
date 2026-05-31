import * as React from "react"
import { Check, Clock, Flame } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/lists/empty-state"
import { CoachMark } from "@/components/onboarding/coach-mark"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCapability } from "@/hooks/use-industry"
import { prepQueue, seedExamplePrep, setLinePrepStatus, type PrepStatus, type PrepTicket } from "@/lib/pos/venue"
import { cn } from "@/lib/utils"

// Industry-agnostic KDS: a FIFO list of fired items waiting to be made.
// Restaurants call it the kitchen display; salons the stylist queue;
// workshops the service queue. Same data, neutral copy. Designed for a
// wall-mounted tablet — big tap targets, status advances on tap.

const NEXT: Record<PrepStatus, PrepStatus | null> = {
  queued: "in-progress",
  "in-progress": "ready",
  ready: "served",
  served: null,
}

const STATUS_META: Record<PrepStatus, { label: string; tone: string; Icon: typeof Flame }> = {
  queued: { label: "New", tone: "border-sky-500/50 bg-sky-500/10", Icon: Flame },
  "in-progress": { label: "Making", tone: "border-amber-500/50 bg-amber-500/10", Icon: Clock },
  ready: { label: "Ready", tone: "border-emerald-500/50 bg-emerald-500/10", Icon: Check },
  served: { label: "Served", tone: "border-border bg-muted", Icon: Check },
}

function waitLabel(firedAt?: number) {
  if (!firedAt) return ""
  const m = Math.floor((Date.now() - firedAt) / 60_000)
  return m < 1 ? "just now" : `${m}m`
}

export default function PrepQueuePage() {
  const [tickets, setTickets] = React.useState<PrepTicket[]>(() => prepQueue())
  const firstTicketRef = React.useRef<HTMLButtonElement>(null)
  // Soft capability — restaurants/QSR/manufacturing make heavy use,
  // retail/pharmacy almost never. Banner reminds the operator but
  // the queue is fully functional regardless.
  const hasPrepQueue = useCapability("hasPrepQueue")

  const reload = React.useCallback(() => setTickets(prepQueue()), [])

  // Poll so tickets fired from the venue page appear without a manual
  // refresh — a KDS screen is left running unattended.
  React.useEffect(() => {
    const t = setInterval(reload, 4000)
    return () => clearInterval(t)
  }, [reload])

  useRegisterPageRefresh(
    React.useCallback(async () => {
      reload()
      await new Promise((r) => setTimeout(r, 150))
    }, [reload]),
  )

  const advance = (t: PrepTicket) => {
    const next = NEXT[t.line.prepStatus ?? "queued"]
    if (next) {
      setLinePrepStatus(t.orderId, t.line.id, next)
      reload()
    }
  }

  return (
    <PageShell
      title="Prep queue"
      withToolbar={false}
      titleTooltip={
        <>
          Fired items waiting to be made, oldest first. Tap a ticket to move it along:
          New → Making → Ready → Served. Works as a kitchen display, a stylist queue, or a
          workshop service board — same screen, your words.
        </>
      }
    >
      {!hasPrepQueue && (
        <div className="mb-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          A prep queue is most useful for kitchens, prep stations, and
          assembly. You can still use this screen if your team likes a
          shared progress board.
        </div>
      )}
      {tickets.length === 0 ? (
        <EmptyState
          Icon={Flame}
          title="Nothing in the queue"
          description="When you fire items from a table or tab, they show up here in the order they were sent."
          action={
            <Button type="button" variant="outline" onClick={() => { seedExamplePrep(); reload() }}>
              Show me an example
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tickets.map((t, idx) => {
            const status = t.line.prepStatus ?? "queued"
            const meta = STATUS_META[status]
            const Icon = meta.Icon
            return (
              <button
                key={t.line.id}
                ref={idx === 0 ? firstTicketRef : undefined}
                type="button"
                onClick={() => advance(t)}
                className={cn(
                  "flex flex-col rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.98]",
                  meta.tone,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{waitLabel(t.line.firedAt)}</span>
                </div>
                <p className="mt-2 text-lg font-bold leading-tight">
                  {t.line.qty}× {t.line.name}
                </p>
                {t.line.variantLabel && (
                  <p className="text-xs text-muted-foreground">{t.line.variantLabel}</p>
                )}
                {t.line.modifiers?.length ? (
                  <p className="text-xs text-muted-foreground">+ {t.line.modifiers.map((m) => m.name).join(", ")}</p>
                ) : null}
                <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-muted-foreground">
                  <span>{t.spotLabel}</span>
                  {NEXT[status] && <span className="font-semibold text-foreground">Tap → {STATUS_META[NEXT[status]!].label}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <CoachMark
        id="pos-prep-intro"
        anchorRef={firstTicketRef}
        title="Tap to advance"
        body="Each tap moves a ticket along: New → Making → Ready → Served. The oldest sits at the front."
        placement="bottom"
      />
    </PageShell>
  )
}
