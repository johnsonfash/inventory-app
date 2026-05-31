import * as React from "react"
import { Boxes, CalendarClock, Hourglass, PackageMinus, Search, AlertTriangle } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCapability } from "@/hooks/use-industry"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { loadLots, fefoOrder, type LotEntry } from "@/lib/inventory/recipes"

function daysLeft(expiresAt?: string): number | null {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.floor(ms / 86_400_000)
}

function expiryTone(days: number | null): StatusTone {
  if (days == null) return "neutral"
  if (days <= 7) return "danger"
  if (days <= 30) return "warning"
  return "success"
}

export default function LotsIndex() {
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<"all" | "expiring" | "low" | "no-expiry">("all")
  // Soft capability — critical for food, pharma, cosmetics. Other
  // industries get a quiet hint but can still track lots if useful.
  const usesLotTracking = useCapability("usesLotTracking")
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const lots = React.useMemo(() => loadLots(), [])

  const filtered = React.useMemo(() => {
    let list: LotEntry[] = lots
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (l) =>
          l.lotCode.toLowerCase().includes(q) ||
          l.sku.toLowerCase().includes(q) ||
          (l.vendor ?? "").toLowerCase().includes(q),
      )
    }
    if (filter === "expiring") {
      list = list.filter((l) => {
        const d = daysLeft(l.expiresAt)
        return d != null && d <= 30
      })
    } else if (filter === "low") {
      list = list.filter((l) => l.qty / l.originalQty <= 0.2 && l.qty > 0)
    } else if (filter === "no-expiry") {
      list = list.filter((l) => !l.expiresAt)
    }
    // FEFO order — earliest expiry first.
    return fefoOrder(list)
  }, [lots, query, filter])

  const expiring30 = lots.filter((l) => {
    const d = daysLeft(l.expiresAt)
    return d != null && d <= 30
  }).length
  const critical = lots.filter((l) => {
    const d = daysLeft(l.expiresAt)
    return d != null && d <= 7
  }).length
  const totalLots = lots.length
  const totalAtRisk = lots
    .filter((l) => {
      const d = daysLeft(l.expiresAt)
      return d != null && d <= 30
    })
    .reduce((s, l) => s + l.qty, 0)

  return (
    <PageShell
      title="Batches"
      withToolbar
      titleTooltip={
        <>
          A <strong>lot</strong> (or <strong>batch</strong>) is a single
          received or produced quantity tagged with a traceability code
          and an optional expiry. Critical for food + cosmetics + pharma
          recall handling (FSMA / EU 178/2002), useful for any industry
          that wants to know which production date a unit came from.
          Pallio consumes lots <strong>FEFO</strong> (first-expired-first-out)
          by default.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!usesLotTracking && (
          <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            Lot &amp; batch tracking matters most for food, pharma, and
            cosmetics. You can still use it for any item — handy when a
            warranty or production date needs to be tied to a unit.
          </div>
        )}
        <SummaryStrip
          tiles={[
            { label: "Active lots", value: String(totalLots), tone: "brand", hint: "tracked" },
            { label: "Expiring 30d", value: String(expiring30), tone: "warning", hint: "at risk" },
            { label: "Critical ≤7d", value: String(critical), tone: "danger", hint: "use first" },
            { label: "At-risk qty", value: String(Math.round(totalAtRisk * 10) / 10), tone: "info", hint: "across lots" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by lot code, SKU, vendor…" className="pl-9" />
          </div>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {(["all", "expiring", "low", "no-expiry"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? "rounded-md bg-brand px-3 py-1 text-xs font-semibold text-white"
                    : "px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {f === "all" ? "All" : f === "expiring" ? "Expiring 30d" : f === "low" ? "Running low" : "No expiry"}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              Icon={Boxes}
              title="No lots match"
              description="Try a different code or filter. New lots are created automatically when stock is received with a lot code, or when a production run is logged."
            />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((l) => {
              const days = daysLeft(l.expiresAt)
              const pctLeft = Math.round((l.qty / l.originalQty) * 100)
              return (
                <li key={l.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <span className={
                      days != null && days <= 7
                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
                        : days != null && days <= 30
                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
                        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary"
                    }>
                      {days != null && days <= 7 ? <AlertTriangle className="h-4 w-4" /> : <Boxes className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          <span className="font-mono">{l.lotCode}</span>{" "}
                          <span className="font-normal text-muted-foreground">· {l.sku}</span>
                        </p>
                        {l.expiresAt && (
                          <StatusBadge tone={expiryTone(days)} withDot>
                            {days != null && days >= 0 ? `${days}d` : "expired"}
                          </StatusBadge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {l.qty} of {l.originalQty} {l.unit} remaining ({pctLeft}%)
                        {l.locationId && <> · {l.locationId}</>}
                        {l.vendor && <> · {l.vendor}</>}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span><CalendarClock className="mr-0.5 inline h-3 w-3" /> received {new Date(l.receivedAt).toLocaleDateString()}</span>
                        {l.expiresAt && <span><Hourglass className="mr-0.5 inline h-3 w-3" /> exp {new Date(l.expiresAt).toLocaleDateString()}</span>}
                        {l.poNumber && <span>· PO <span className="font-mono">{l.poNumber}</span></span>}
                        {l.productionRunId && <span>· run <span className="font-mono">{l.productionRunId}</span></span>}
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={
                            pctLeft <= 20
                              ? "h-1 bg-rose-500"
                              : pctLeft <= 50
                              ? "h-1 bg-amber-500"
                              : "h-1 bg-emerald-500"
                          }
                          style={{ width: `${pctLeft}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <PackageMinus className="h-4 w-4" />
          Lots are auto-created on receipt (with optional lot code + expiry) or when a production run is logged. Manual entry available from Inventory → Receive.
        </div>
      </div>
    </PageShell>
  )
}
