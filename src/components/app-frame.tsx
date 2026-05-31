import * as React from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Box, ChevronDown, Loader2, PackagePlus, Plus, Search, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLocationSwitch } from "@/components/org-location-switch"
import { LocationScopePill } from "@/components/location-scope-pill"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileTopBar } from "@/components/mobile/mobile-top-bar"
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav"
import { MobileMoreDrawer } from "@/components/mobile/mobile-more-drawer"
import { UserMenu } from "@/components/app/user-menu"
import { NotificationBell } from "@/components/app/notification-bell"
import { InfoTooltip } from "@/components/info-tooltip"
import { usePullToRefresh, usePageRefreshHandler } from "@/hooks/use-pull-to-refresh"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePageMeta } from "@/contexts/page-meta"
import { useSetCommandPalette } from "@/contexts/command-palette"
import { cn } from "@/lib/utils"

// Stable app chrome. Mounted once at the top of the tree (inside
// App.tsx, ABOVE the Suspense that gates the route component). The
// sidebar, mobile top bar, and bottom nav never unmount across
// navigations — only the inner page content does, and only when its
// chunk is in flight.
//
// Each PageShell publishes its title / toolbar / mobile-trailing
// slot to PageMetaContext; AppFrame reads it from there. See
// src/contexts/page-meta.tsx for the data flow.
export function AppFrame({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [moreOpen, setMoreOpen] = React.useState(false)
  const meta = usePageMeta()
  const openPalette = useSetCommandPalette()

  const pageRefresh = usePageRefreshHandler()
  const { bind, pull, armed, refreshing } = usePullToRefresh({
    onRefresh: pageRefresh,
    enabled: isMobile,
  })

  // Hard-lock document scroll while AppFrame is mounted. The outer
  // `<div h-[100dvh] overflow-hidden>` already clips overflow, but a
  // single misbehaving descendant (a sticky bar with negative margins,
  // a fixed-positioned overlay outside the AppFrame tree, an iOS
  // momentum scroll chained from `<main>`) used to be able to drag
  // the document body, pulling the sidebar up and exposing a blank
  // band at the bottom. Setting body overflow to hidden makes that
  // impossible — `<main>` is the only thing that scrolls. Restored on
  // unmount so MarketingFrame's window-scroll routes still work.
  React.useEffect(() => {
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [])

  // Default mobile-trailing slot: search + notification bell + user
  // menu. Pages that publish their own mobileTrailing (e.g. settings
  // sheets) override this.
  const defaultMobileTrailing = (
    // gap-2 (8px) — matches the visual rhythm of three 36×36 circles
    // side-by-side. gap-1.5 (6px) was too tight; the bell ended up
    // crowding the avatar.
    <div className="flex items-center gap-2">
      {/* Mobile scope pill — compact variant so it doesn't crowd
          the page title. Same hook as the desktop pill so flipping
          either updates the other live. Drives report + dashboard
          + sales-list scope; the POS is intentionally NOT scoped
          here (it stays bound to the clocked-in location via
          useOrgLocation). */}
      <LocationScopePill variant="compact" />
      <button
        type="button"
        onClick={() => openPalette(true)}
        aria-label="Search (⌘K)"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 hover:bg-accent active:bg-accent/70 transition-colors"
      >
        <Search className="h-4 w-4" />
      </button>
      <NotificationBell />
      <UserMenu />
    </div>
  )

  if (isMobile) {
    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
        <MobileTopBar title={meta.title} titleTooltip={meta.titleTooltip} trailing={meta.mobileTrailing ?? defaultMobileTrailing} />

        {/* Pull-to-refresh indicator. Anchored to the top of the
            scroll container; opacity scales with pull distance. */}
        <div
          className="pointer-events-none relative z-10 -mb-px flex justify-center"
          style={{ height: pull }}
        >
          <div
            className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-card text-brand shadow-sm transition-opacity"
            style={{ opacity: Math.min(1, pull / 32) }}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <motion.span
                animate={{ rotate: armed ? 180 : 0 }}
                transition={{ type: "spring", damping: 22, stiffness: 320 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            )}
          </div>
        </div>

        <main
          id="main"
          {...bind}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-mobile-nav"
          style={{
            transform: `translateY(${pull * 0.4}px)`,
            transition: refreshing ? "none" : pull === 0 ? "transform 200ms ease" : "none",
          }}
        >
          <div className="min-w-0 px-4 pt-3 pb-2">{children}</div>
        </main>

        <MobileBottomNav onMoreClick={() => setMoreOpen(true)} />
        <MobileMoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
      </div>
    )
  }

  // Desktop / tablet shell.
  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:gap-3 md:px-5">
          <h1 className="flex min-w-0 items-center gap-1 truncate text-base font-semibold tracking-tight">
            <span className="truncate">{meta.title}</span>
            {meta.titleTooltip && (
              <InfoTooltip label={meta.title} size="sm">
                {meta.titleTooltip}
              </InfoTooltip>
            )}
          </h1>
          <div className="ml-auto flex items-center gap-1.5 md:gap-2">
            <OrgLocationSwitch />
            {/* Global view-scope pill. Sits next to OrgLocationSwitch
                because they're a related pair: the OrgLocationSwitch
                says "who am I and where am I sitting" (binds the POS),
                this one says "which locations am I LOOKING AT in
                reports + dashboards". Independent on purpose. */}
            <LocationScopePill />
            {/* Command-palette trigger. Two presentations:
                - md-lg (768–1023): icon-only button — saves ~240px of
                  header width so the avatar doesn't clip on narrow
                  desktops.
                - lg+ (≥ 1024): full search bar with placeholder + ⌘K
                  hint. Both open the same palette. */}
            <button
              type="button"
              onClick={() => openPalette(true)}
              aria-label="Search the app (Cmd+K)"
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent md:flex lg:hidden"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openPalette(true)}
              aria-label="Search the app (Cmd+K)"
              className="hidden h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent lg:flex lg:w-[280px]"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 truncate">Search items, orders…</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
            <NotificationBell />
            <div className="mx-0.5 hidden h-5 w-px bg-border md:block" aria-hidden />
            <UserMenu />
          </div>
        </header>

        {meta.withToolbar && (
          <div
            className={cn(
              "border-b border-border px-4 py-2.5 md:px-5 md:py-3",
              "bg-linear-to-r from-brand-soft/60 via-background to-emerald-50/40",
              "dark:from-primary/10 dark:via-background dark:to-emerald-950/15",
            )}
          >
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {meta.toolbarActions ?? (
                <>
                  <Link to="/pos" className="shrink-0">
                    <Button size="sm" className="whitespace-nowrap">
                      <Plus className="h-3.5 w-3.5" /> New sale
                    </Button>
                  </Link>
                  <Link to="/inventory/new" className="shrink-0">
                    <Button size="sm" variant="outline" className="whitespace-nowrap">
                      <PackagePlus className="h-3.5 w-3.5" /> New item
                    </Button>
                  </Link>
                  <Link to="/purchasing/pos/new" className="shrink-0">
                    <Button size="sm" variant="outline" className="whitespace-nowrap">
                      <Box className="h-3.5 w-3.5" /> Purchase order
                    </Button>
                  </Link>
                  <Link to="/inventory/receive" className="shrink-0">
                    <Button size="sm" variant="outline" className="whitespace-nowrap">
                      <Truck className="h-3.5 w-3.5" /> Receive stock
                    </Button>
                  </Link>
                  <span className="hidden flex-1 md:block" aria-hidden />
                  <button
                    type="button"
                    onClick={() => openPalette(true)}
                    className="ml-auto hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
                  >
                    More via{" "}
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <main id="main" className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
