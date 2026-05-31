import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Flame, Plus, Search, Trash2, Users, Wallet } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { CoachMark } from "@/components/onboarding/coach-mark"
import { useCurrency } from "@/contexts/currency"
import { useCapability } from "@/hooks/use-industry"
import { genId, loadCatalog, type CartItem } from "@/lib/pos/storage"
import {
  closeOpenOrder,
  createOpenOrder,
  fireStage,
  loadVenue,
  openOrderForSpot,
  spotNoun,
  upsertOpenOrder,
  type OpenOrder,
  type OrderLine,
  type Spot,
} from "@/lib/pos/venue"
import { cn } from "@/lib/utils"

const STATUS_TONE: Record<Spot["status"], string> = {
  open: "border-border bg-card hover:border-brand/40",
  seated: "border-emerald-500/40 bg-emerald-500/10",
  busy: "border-amber-500/40 bg-amber-500/10",
  reserved: "border-sky-500/40 bg-sky-500/10",
  closed: "border-border bg-muted/50 opacity-60",
}

export default function VenuePage() {
  const navigate = useNavigate()
  const { formatPrice } = useCurrency()
  // SOFT capability check — non-hospitality industries see a polite
  // explainer at the top, but the page is fully usable if they want
  // tables anyway (e.g. a clinic with a waiting room). The grid
  // renders below either way. Never gate-block, just nudge.
  const hasTables = useCapability("hasTables")
  // Venue label set follows the active POS mode; default to "restaurant"
  // so tables read naturally. The POS settings mode could be threaded in
  // later; the data model is identical regardless of label.
  const labels = spotNoun("restaurant")
  const [venue, setVenue] = React.useState(() => loadVenue())
  const [activeSpotId, setActiveSpotId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const firstSpotRef = React.useRef<HTMLButtonElement>(null)

  const refresh = React.useCallback(() => {
    setVenue(loadVenue())
  }, [])
  useRegisterPageRefresh(
    React.useCallback(async () => {
      refresh()
      await new Promise((r) => setTimeout(r, 150))
    }, [refresh]),
  )

  // Catalog merged across modes, deduped by SKU — venue serves any
  // industry, so don't assume one mode's items.
  const catalog = React.useMemo(() => {
    const all = [
      ...loadCatalog("restaurant"),
      ...loadCatalog("services"),
      ...loadCatalog("retail"),
      ...loadCatalog("auto"),
    ]
    const seen = new Set<string>()
    return all.filter((c) => (seen.has(c.sku) ? false : (seen.add(c.sku), true)))
  }, [])

  const activeOrder = activeSpotId ? openOrderForSpot(activeSpotId) : undefined
  const activeSpot = venue.spots.find((s) => s.id === activeSpotId)

  // bump a small local counter to re-read orders after a mutation
  const [, force] = React.useReducer((n) => n + 1, 0)

  const openSpot = (spot: Spot) => {
    setActiveSpotId(spot.id)
    if (!openOrderForSpot(spot.id)) {
      createOpenOrder({ venueId: venue.id, spotId: spot.id, label: `${labels.one} ${spot.label}` })
      setVenue(loadVenue())
    }
    setSearch("")
    force()
  }

  const addToOrder = (sku: string, name: string, price: number, taxRate?: number) => {
    if (!activeOrder) return
    const existing = activeOrder.lines.find((l) => l.sku === sku && !l.firedAt)
    if (existing) existing.qty += 1
    else {
      const line: OrderLine = { id: genId("line"), sku, name, price, taxRate, qty: 1 }
      activeOrder.lines.push(line)
    }
    activeOrder.events.push({ at: Date.now(), type: "add", detail: name })
    upsertOpenOrder(activeOrder)
    force()
  }

  const removeLine = (lineId: string) => {
    if (!activeOrder) return
    activeOrder.lines = activeOrder.lines.filter((l) => l.id !== lineId)
    upsertOpenOrder(activeOrder)
    force()
  }

  const fire = () => {
    if (!activeOrder) return
    const n = fireStage(activeOrder.id)
    setVenue(loadVenue())
    force()
    if (n > 0) {
      // visual feedback via spot status
      const v = loadVenue()
      const spot = v.spots.find((s) => s.id === activeOrder.spotId)
      if (spot) spot.status = "busy"
      setVenue(v)
    }
  }

  const closeSpot = () => {
    if (!activeOrder) return
    closeOpenOrder(activeOrder.id)
    setActiveSpotId(null)
    setVenue(loadVenue())
  }

  const pay = () => {
    if (!activeOrder) return
    navigate(`/pos?orderId=${activeOrder.id}`)
  }

  const orderTotal = (o?: OpenOrder) =>
    (o?.lines ?? []).reduce((s, l) => s + l.qty * l.price, 0)

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog.slice(0, 24)
    return catalog.filter((c) => c.name.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q)).slice(0, 40)
  }, [catalog, search])

  return (
    <PageShell
      title="Tables & tabs"
      withToolbar={false}
      titleTooltip={
        <>
          A live view of your {labels.layout.toLowerCase()}. Tap a {labels.one.toLowerCase()} to open a
          tab, add items, and fire them to the prep queue. The same view works as tables (restaurant),
          chairs (salon), bays (workshop), or rooms — only the label changes.
        </>
      }
    >
      {!hasTables && (
        // Soft hint for industries that don't typically use a tables
        // layout — pharmacy, retail, manufacturing. We don't block,
        // because clinics + barbershops + repair counters can still
        // get value from chairs/bays.
        <div className="mb-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          Your industry doesn't typically use {labels.layout.toLowerCase()}. The
          screen still works — chairs, bays, rooms, or counters all fit. If you
          don't need it, you can hide the chip from{" "}
          <Link to="/pos" className="font-medium text-brand underline-offset-2 hover:underline dark:text-primary">
            POS
          </Link>
          {" "}or POS Settings.
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {venue.spots.map((spot, idx) => {
          const order = openOrderForSpot(spot.id)
          const total = orderTotal(order)
          return (
            <button
              key={spot.id}
              ref={idx === 0 ? firstSpotRef : undefined}
              type="button"
              onClick={() => openSpot(spot)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-2 text-center transition-all active:scale-[0.97]",
                STATUS_TONE[spot.status],
              )}
            >
              <span className="text-lg font-bold">{spot.label}</span>
              {spot.capacity && (
                <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Users className="h-2.5 w-2.5" /> {spot.capacity}
                </span>
              )}
              {order ? (
                <span className="mt-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-foreground dark:bg-primary dark:text-primary-foreground">
                  {formatPrice(total)}
                </span>
              ) : (
                <span className="mt-1 text-[10px] capitalize text-muted-foreground">{spot.status}</span>
              )}
            </button>
          )
        })}
      </div>

      <CoachMark
        id="pos-venue-intro"
        anchorRef={firstSpotRef}
        title={`Open a ${labels.one.toLowerCase()}`}
        body={`Tap to seat it, add items, fire them to the prep queue, then take payment. Paying frees the ${labels.one.toLowerCase()} automatically.`}
        placement="bottom"
      />

      {/* Order panel for the tapped spot */}
      <BottomSheet
        open={!!activeSpotId}
        onClose={() => setActiveSpotId(null)}
        title={activeSpot ? `${labels.one} ${activeSpot.label}` : labels.one}
        description={activeOrder ? `${activeOrder.lines.length} item(s) · ${formatPrice(orderTotal(activeOrder))}` : ""}
        maxHeightVh={88}
        footer={
          activeOrder ? (
            <div className="flex items-center gap-2 pb-3">
              <Button type="button" variant="outline" onClick={closeSpot} className="shrink-0">
                <Trash2 className="h-4 w-4" /> Close
              </Button>
              <Button type="button" variant="outline" onClick={fire} className="shrink-0">
                <Flame className="h-4 w-4" /> Fire
              </Button>
              <Button type="button" onClick={pay} disabled={activeOrder.lines.length === 0} className="flex-1">
                <Wallet className="h-4 w-4" /> Take payment · {formatPrice(orderTotal(activeOrder))}
              </Button>
            </div>
          ) : null
        }
      >
        {activeOrder && (
          <div className="flex flex-col gap-3">
            {/* Current lines */}
            {activeOrder.lines.length > 0 && (
              <ul className="space-y-1.5">
                {activeOrder.lines.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {l.qty}× {l.name}
                      {l.firedAt && (
                        <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300">
                          fired
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums">{formatPrice(l.qty * l.price)}</span>
                    {!l.firedAt && (
                      <button
                        type="button"
                        onClick={() => removeLine(l.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add items */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items to add…"
                className="pl-9"
              />
            </div>
            <ul className="grid grid-cols-2 gap-1.5">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => addToOrder(c.sku, c.name, c.price, c.taxRate)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                    <Plus className="h-3.5 w-3.5 shrink-0 text-brand dark:text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </BottomSheet>
    </PageShell>
  )
}
