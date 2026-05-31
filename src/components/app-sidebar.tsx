
import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Link, useLocation } from "react-router-dom"
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { BrandMark } from "@/components/brand-mark"
import { cn } from "@/lib/utils"
import { NAV, type NavItem, type SubItem } from "@/lib/nav"
import { useNavBadge, type BadgeKey } from "@/lib/nav-badges"
import { useNavCuration, useTerm } from "@/hooks/use-industry"

// Sidebar reads the full app menu from `@/lib/nav` — single source of
// truth, shared with the mobile More drawer. See lib/nav.ts for the
// section/sub-item ordering rationale.
const COLLAPSED_KEY = "pallio:sidebar-collapsed"

export function AppSidebar() {
  const pathname = useLocation().pathname
  // Industry curation: groups the active industry profile typically
  // doesn't need are demoted to the bottom of the sidebar under a
  // "Less common for your business" separator. They stay fully
  // reachable — search still finds them, the routes still resolve,
  // and a single click navigates. This is SOFT curation, never hard
  // module gating (see memory: feedback_no_hard_modules).
  const { softHide } = useNavCuration()
  // Industry-localised group titles for the sidebar. Profiles can
  // override "Inventory" → "Pantry" (restaurant) / "Materials"
  // (manufacturing) / "Parts catalogue" (auto), etc.
  const inventoryLabel = useTerm("inventory", "Inventory")
  // Per-title curation. Only the groups whose meaning shifts most
  // between industries get translated — Dashboard/Settings/Help
  // stay neutral.
  const labelForTitle = React.useCallback(
    (title: string): string => {
      switch (title) {
        case "Inventory":
          return inventoryLabel
        default:
          return title
      }
    },
    [inventoryLabel],
  )

  // Persist collapsed state. Read sync so the first paint matches
  // whatever the user picked last session — no resize flash.
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try { return localStorage.getItem(COLLAPSED_KEY) === "1" } catch { return false }
  })
  React.useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0") } catch { /* ignore */ }
  }, [collapsed])

  // Cmd/Ctrl + B toggle. The tip text in the footer promised this
  // shortcut for two waves before any handler existed.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
        // Don't steal focus from inputs / contentEditables where the
        // user might be trying to bold text.
        const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase()
        const editable = (e.target as HTMLElement | null)?.isContentEditable
        if (tag === "input" || tag === "textarea" || editable) return
        e.preventDefault()
        setCollapsed((c) => !c)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const [openStates, setOpenStates] = React.useState<Record<string, boolean>>(() =>
    NAV.reduce(
      (acc, item) => {
        const active = item.url ? pathname === item.url : item.sub?.some((s) => pathname.startsWith(s.url))
        acc[item.title] = !!active
        return acc
      },
      {} as Record<string, boolean>,
    ),
  )

  const toggle = (title: string) => setOpenStates((p) => ({ ...p, [title]: !p[title] }))

  // -------- Sidebar search --------
  // Filters the nav list as the user types. Matches either a group
  // title or any sub-item title (case-insensitive substring). When a
  // sub-item matches, we surface the whole group with that one
  // sub-item — so the user sees the context.
  const [query, setQuery] = React.useState("")
  const trimmedQuery = query.trim().toLowerCase()
  const filteredNav = React.useMemo<NavItem[]>(() => {
    if (!trimmedQuery) return NAV
    const out: NavItem[] = []
    for (const item of NAV) {
      const titleMatches = item.title.toLowerCase().includes(trimmedQuery)
      if (!item.sub) {
        if (titleMatches) out.push(item)
        continue
      }
      const matchedSubs = item.sub.filter((s) => s.title.toLowerCase().includes(trimmedQuery))
      if (titleMatches) {
        // Group itself matches — keep all its sub-items so the user
        // can navigate the full group from the search result.
        out.push(item)
      } else if (matchedSubs.length > 0) {
        out.push({ ...item, sub: matchedSubs })
      }
    }
    return out
  }, [trimmedQuery])

  // Auto-open every group when there's an active search, so matches
  // are immediately visible without a click.
  const isSearching = trimmedQuery.length > 0

  // -------- Collapsed-mode flyout --------
  // When the sidebar is collapsed, hovering / clicking a group icon
  // pops a fixed-positioned panel with the sub-items, anchored to
  // the right of the icon. Replaces the previous "click expands the
  // whole sidebar" behaviour which was disorienting.
  type FlyoutState = { title: string; top: number } | null
  const [flyout, setFlyout] = React.useState<FlyoutState>(null)
  const closeTimerRef = React.useRef<number | null>(null)

  const cancelClose = React.useCallback(() => {
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const scheduleClose = React.useCallback(() => {
    cancelClose()
    closeTimerRef.current = window.setTimeout(() => {
      setFlyout(null)
      closeTimerRef.current = null
    }, 140)
  }, [cancelClose])

  const openFlyout = React.useCallback((title: string, anchor: HTMLElement) => {
    cancelClose()
    const rect = anchor.getBoundingClientRect()
    setFlyout({ title, top: rect.top })
  }, [cancelClose])

  // Close on Escape; close on route change (sub-item nav fires
  // pathname update, which we already key effects off).
  React.useEffect(() => {
    if (!flyout) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlyout(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [flyout])

  React.useEffect(() => { setFlyout(null) }, [pathname])

  // If the user expands the sidebar, drop the flyout so it doesn't
  // hang in space at the wrong position.
  React.useEffect(() => { if (!collapsed) setFlyout(null) }, [collapsed])

  // Clean up the timer on unmount.
  React.useEffect(() => () => cancelClose(), [cancelClose])

  const flyoutItem = flyout ? NAV.find((n) => n.title === flyout.title) : null

  // When the route changes, re-expand the matching group so deep
  // links open into the right tree.
  React.useEffect(() => {
    setOpenStates((prev) => {
      const next = { ...prev }
      for (const item of NAV) {
        if (item.sub?.some((s) => pathname.startsWith(s.url))) next[item.title] = true
      }
      return next
    })
  }, [pathname])

  // Partition the filtered nav into "primary" and "demoted" based on
  // the active industry profile's softHideSections. We never DROP
  // items — demoted ones just move to the bottom under a separator
  // and render at reduced opacity. Searching bypasses curation
  // entirely so a typed match is never silently demoted to the
  // bottom; it shows up in natural NAV order at the top.
  const [primaryNav, demotedNav] = React.useMemo<[NavItem[], NavItem[]]>(() => {
    if (isSearching) return [filteredNav, []]
    const primary: NavItem[] = []
    const demoted: NavItem[] = []
    for (const item of filteredNav) {
      if (softHide.has(item.title)) demoted.push(item)
      else primary.push(item)
    }
    return [primary, demoted]
  }, [filteredNav, softHide, isSearching])

  // Single renderer used for both primary and demoted lists. `demoted`
  // dims the row so the user sees it's been deprioritised — the click
  // surface is identical either way.
  const renderNavItem = (item: NavItem, demoted: boolean) => {
    const active = item.url ? pathname === item.url : item.sub?.some((s) => pathname.startsWith(s.url))
    if (item.sub) {
      // When the user is searching, force every group open so
      // matched sub-items are visible without an extra click.
      const isOpen = isSearching ? true : openStates[item.title]
      return (
        <li
          key={item.title}
          className={cn(demoted && !active && "opacity-60 hover:opacity-100 focus-within:opacity-100")}
        >
          <button
            type="button"
            onClick={(e) => {
              // Collapsed: clicking the icon opens the flyout
              // (touch devices have no hover; click is the
              // fallback). Expanded: toggles the inline tree.
              if (collapsed) {
                openFlyout(item.title, e.currentTarget)
                return
              }
              toggle(item.title)
            }}
            onMouseEnter={collapsed ? (e) => openFlyout(item.title, e.currentTarget) : undefined}
            onMouseLeave={collapsed ? scheduleClose : undefined}
            onFocus={collapsed ? (e) => openFlyout(item.title, e.currentTarget) : undefined}
            aria-expanded={collapsed ? flyout?.title === item.title : isOpen}
            aria-controls={!collapsed ? `nav-${slug(item.title)}` : undefined}
            aria-label={collapsed ? labelForTitle(item.title) : undefined}
            title={collapsed ? labelForTitle(item.title) : undefined}
            className={cn(
              "group/group flex w-full items-center rounded-md text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              collapsed ? "relative h-10 justify-center px-0" : "gap-2 px-2 py-2",
              active && "bg-accent",
              collapsed && flyout?.title === item.title && "bg-accent",
            )}
          >
            <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} aria-hidden="true" />
            {collapsed && (
              // Tiny chevron pinned to the right edge in
              // collapsed mode — signals "this icon has
              // sub-items, flyout opens this way".
              <ChevronRight
                aria-hidden="true"
                className={cn(
                  "absolute right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted-foreground transition-opacity",
                  flyout?.title === item.title
                    ? "opacity-100 text-brand dark:text-primary"
                    : "opacity-40 group-hover/group:opacity-90 group-focus-visible/group:opacity-90",
                )}
              />
            )}
            {!collapsed && (
              <>
                <span className="truncate">{labelForTitle(item.title)}</span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 opacity-60 transition-transform",
                    isOpen ? "rotate-180" : "rotate-0",
                  )}
                  aria-hidden="true"
                />
              </>
            )}
          </button>
          {!collapsed && (
            <div
              id={`nav-${slug(item.title)}`}
              className={cn(
                "grid overflow-hidden pl-6 transition-all",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <ul className="min-h-0 space-y-0.5 border-l border-border pl-2">
                {item.sub.map((s) => {
                  const subActive = pathname === s.url
                  return (
                    <li key={s.url}>
                      <Link
                        aria-current={subActive ? "page" : undefined}
                        to={s.url}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                          subActive && "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
                        )}
                      >
                        <span className="truncate">{s.title}</span>
                        <SubBadge sub={s} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </li>
      )
    }
    return (
      <li
        key={item.title}
        className={cn(demoted && !active && "opacity-60 hover:opacity-100 focus-within:opacity-100")}
      >
        <Link
          aria-current={active ? "page" : undefined}
          aria-label={collapsed ? labelForTitle(item.title) : undefined}
          title={collapsed ? labelForTitle(item.title) : undefined}
          to={item.url!}
          onMouseEnter={collapsed ? () => { cancelClose(); setFlyout(null) } : undefined}
          className={cn(
            "flex items-center rounded-md text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            collapsed ? "h-10 justify-center px-0" : "gap-2 px-2 py-2",
            active && "bg-accent",
          )}
        >
          <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} aria-hidden="true" />
          {!collapsed && <span className="truncate">{labelForTitle(item.title)}</span>}
        </Link>
      </li>
    )
  }

  return (
    <aside
      className={cn(
        "flex h-svh flex-col border-r border-border bg-background transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-64",
      )}
      aria-label="Primary navigation"
    >
      {/* Brand + collapse toggle */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border px-2 py-3",
          collapsed && "justify-center px-0",
        )}
      >
        {!collapsed && (
          <Link to="/dashboard" className="flex flex-1 items-center gap-2 px-1.5">
            <BrandMark className="h-8 w-8 shrink-0 shadow-sm shadow-violet-500/20" />
            <span className="text-sm font-semibold tracking-tight">Pallio</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-keyshortcuts="Meta+B Control+B"
          title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Search — only visible when expanded. */}
      {!collapsed && (
        <div className="px-2 py-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nav…"
            className="h-9"
            aria-label="Search navigation"
          />
        </div>
      )}

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-2">
        {!collapsed && isSearching && filteredNav.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            No matches for "<span className="font-medium text-foreground">{query}</span>".
          </p>
        ) : null}
        <ul className="space-y-0.5">
          {/* Primary groups — everything not on this industry's
              softHide list. While searching, curation is bypassed so
              the user sees ALL matches in their natural order — search
              should never silently demote a hit. */}
          {primaryNav.map((item) => renderNavItem(item, false))}

          {/* Demoted groups — typically not relevant for this
              industry. Rendered with a separator + muted opacity, but
              still fully functional. The user can click in and stay
              there; nothing is gated. Skipped when searching so a
              demoted match doesn't get hidden under a separator. */}
          {!isSearching && demotedNav.length > 0 && (
            <li aria-hidden="true" className={cn("pt-3", collapsed && "px-0")}>
              {collapsed ? (
                <div className="mx-2 border-t border-border" />
              ) : (
                <div className="flex items-center gap-2 px-2 pb-1.5">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Less common for your business
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
            </li>
          )}
          {!isSearching && demotedNav.map((item) => renderNavItem(item, true))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="border-t border-border px-3 py-2.5 text-[10px] text-muted-foreground">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">⌘B</kbd> to toggle
        </div>
      )}

      {/* Collapsed-mode flyout. Portaled to body so the aside's
          overflow-auto on <nav> doesn't clip it. Positioned with
          `fixed` against the hovered button's bounding rect. The
          panel itself owns max-height + overflow so a 13-item group
          (Settings) doesn't get its tail clipped by the viewport. */}
      {typeof document !== "undefined" && collapsed && createPortal(
        <AnimatePresence>
          {flyout && flyoutItem && (() => {
            // Anchor: icon's top. But if there isn't enough room
            // below the icon for a useful panel, push the panel up
            // so it still fits. The internal overflow-y-auto on the
            // list takes care of anything taller than the remaining
            // viewport.
            const vh = typeof window === "undefined" ? 800 : window.innerHeight
            const MIN_PANEL = 200 // ensure at least 200px visible panel even near the bottom edge
            const top = clamp(flyout.top, 8, vh - MIN_PANEL - 8)
            const maxHeight = vh - top - 12
            return (
              <motion.div
                key={flyout.title}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.12 }}
                role="menu"
                aria-label={labelForTitle(flyoutItem.title)}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
                style={{
                  position: "fixed",
                  left: 64 + 6,
                  top,
                  maxHeight,
                  zIndex: 60,
                }}
                className="flex w-60 flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-xl shadow-black/10 dark:shadow-black/40"
              >
                <div className="shrink-0 border-b border-border px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {labelForTitle(flyoutItem.title)}
                  </p>
                </div>
                <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
                  {flyoutItem.sub?.map((s) => {
                    const subActive = pathname === s.url
                    return (
                      <li key={s.url}>
                        <Link
                          to={s.url}
                          onClick={() => setFlyout(null)}
                          aria-current={subActive ? "page" : undefined}
                          role="menuitem"
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                            subActive
                              ? "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary"
                              : "text-foreground",
                          )}
                        >
                          <span className="truncate">{s.title}</span>
                          <SubBadge sub={s} />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            )
          })()}
        </AnimatePresence>,
        document.body,
      )}
    </aside>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function slug(s: string): string {
  return s.replace(/\s+/g, "-").toLowerCase()
}

// Live count pill for sub-items that opt in via `badgeKey`. No-op for
// items without a badge or when the count is zero — the layout stays
// stable because the parent uses `justify-between` with this on the
// trailing side.
function SubBadge({ sub }: { sub: SubItem }) {
  const count = useNavBadge(sub.badgeKey as BadgeKey | undefined)
  if (!sub.badgeKey || count <= 0) return null
  return (
    <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-brand-foreground dark:bg-primary dark:text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  )
}
