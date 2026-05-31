import * as React from "react"
import { newTicketCount, subscribeTickets } from "@/lib/tickets/data"

// Runtime resolution for SubItem.badgeKey. Kept here so `lib/nav.ts`
// stays a pure static module (no side-effect imports) — sidebar /
// command-palette / mobile drawer all import NAV without dragging in
// kvJson + window event listeners.
//
// To add a new badge: pick a stable key (e.g. "drafts:open"), point
// the SubItem at it, and add a case below + a useNavBadge subscribe.

export type BadgeKey = "tickets:new"

export function getNavBadge(key: BadgeKey): number {
  switch (key) {
    case "tickets:new": return newTicketCount()
  }
}

/** React hook — subscribes to whichever live source feeds the given badge. */
export function useNavBadge(key: BadgeKey | undefined): number {
  const [v, setV] = React.useState<number>(() => (key ? getNavBadge(key) : 0))
  React.useEffect(() => {
    if (!key) return
    setV(getNavBadge(key))
    if (key === "tickets:new") {
      return subscribeTickets(() => setV(getNavBadge(key)))
    }
    return
  }, [key])
  return v
}
