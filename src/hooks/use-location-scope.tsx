import * as React from "react"
import { kv } from "@/lib/storage/kv"
import { LOCATIONS } from "@/lib/team/data"

// Global multi-location scope. Separate from useOrgLocation — that
// hook tracks the OPERATOR'S identity ("which org am I logged into,
// which physical location am I sitting at?"). This hook tracks
// the VIEW SCOPE ("show me KPIs / reports for which set of
// locations?"). The two intentionally diverge:
//
//   - useOrgLocation.loc = a single concrete location id (no "all"
//     mode), used by the POS, the till, the shift drawer. These
//     surfaces are ALWAYS bound to the clocked-in location — a
//     cashier in Lekki must not see the Wuse till.
//
//   - useLocationScope.scope = `"all"` aggregate OR a specific
//     locationId. Used by READ surfaces only (dashboard, reporting,
//     sales/order lists, inventory list KPIs). When set to "all",
//     the page aggregates across every location the user has access
//     to. When set to a specific id, it filters.
//
// CRITICAL: never let this hook clobber the till. POS code paths
// keep using useOrgLocation; reporting/dashboard/inventory KPIs use
// this hook. The two stay independent on purpose.
//
// Persists to `pallio:location-scope` via kv. Cross-tab + cross-
// instance sync via a window event so the header pill and a page
// reading the same scope don't drift.

export type LocationScope = "all" | string

export type LocationOption = {
  /** "all" or a Location.id from team/data. */
  value: LocationScope
  /** Display label ("All locations", "Warehouse A", …). */
  label: string
  /** Sub-label (city, type, …). Empty string when N/A. */
  sub: string
}

const SCOPE_KEY = "pallio:location-scope"
const SCOPE_EVT = "pallio:location-scope-changed"

function readStored(): LocationScope {
  const raw = kv.get(SCOPE_KEY)
  return (raw && raw.length > 0 ? raw : "all") as LocationScope
}

// Option list = "All" sentinel + every Location from team/data.
// Backend port: replace LOCATIONS with the signed-in user's
// accessible locations.
function buildOptions(): LocationOption[] {
  return [
    { value: "all", label: "All locations", sub: `${LOCATIONS.length} locations` },
    ...LOCATIONS.map((l) => ({ value: l.id, label: l.name, sub: l.city })),
  ]
}

export function useLocationScope(): {
  scope: LocationScope
  setScope: (next: LocationScope) => void
  locations: LocationOption[]
  /** Convenience — returns true when `scope === "all"`. */
  isAll: boolean
  /** Convenience — current option (label + sub) for the active scope. */
  current: LocationOption
} {
  const [scope, setScopeState] = React.useState<LocationScope>(() => readStored())
  const locations = React.useMemo(() => buildOptions(), [])

  const setScope = React.useCallback((next: LocationScope) => {
    setScopeState(next)
    // kv.set is async but we don't await — UI updates immediately
    // and the persisted write resolves out-of-band.
    void kv.set(SCOPE_KEY, next)
    window.dispatchEvent(new CustomEvent(SCOPE_EVT, { detail: next }))
  }, [])

  // Cross-instance sync: header pill + page KPIs both call this
  // hook; flipping one must update the other live.
  React.useEffect(() => {
    const onChange = (e: Event) =>
      setScopeState((e as CustomEvent<LocationScope>).detail)
    window.addEventListener(SCOPE_EVT, onChange)
    return () => window.removeEventListener(SCOPE_EVT, onChange)
  }, [])

  const current =
    locations.find((l) => l.value === scope) ?? locations[0]

  return {
    scope,
    setScope,
    locations,
    isAll: scope === "all",
    current,
  }
}
