import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Download, Loader2, RefreshCw, X } from "lucide-react"
import { useRegisterSW } from "virtual:pwa-register/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Top-level PWA host. Two responsibilities:
//
// 1. Show an "Update available" toast when a new SW is waiting. The
//    user can refresh on their schedule rather than getting a forced
//    reload.
// 2. Surface the browser's beforeinstallprompt as an inline "Install
//    Pallio" prompt — Chrome / Edge / Android browsers fire it; iOS
//    Safari doesn't (manual A2HS).
export function PWAInstaller() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_, registration) {
      // Poll for an updated SW every 30 minutes — generous, avoids
      // hammering the server but catches new releases the same day.
      if (!registration) return
      setInterval(() => {
        registration.update().catch(() => {})
      }, 30 * 60 * 1000)
    },
  })

  // ----- Update toast state -----
  const [showUpdate, setShowUpdate] = needRefresh
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await updateServiceWorker(true)
    } catch {
      // updateServiceWorker triggers a navigation; if it returns/throws,
      // drop the busy state so the user can retry.
      setRefreshing(false)
    }
  }

  // ----- Install prompt state (beforeinstallprompt) -----
  const [installEvent, setInstallEvent] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [dismissedInstall, setDismissedInstall] = React.useState(() => {
    try {
      return localStorage.getItem("pallio:install-dismissed") === "1"
    } catch {
      return false
    }
  })

  React.useEffect(() => {
    const onPrompt = (e: Event) => {
      // Prevent the mini-infobar so we can drive the prompt ourselves.
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstallEvent(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt as EventListener)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt as EventListener)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const dismissInstall = () => {
    setInstallEvent(null)
    setDismissedInstall(true)
    try {
      localStorage.setItem("pallio:install-dismissed", "1")
    } catch {
      /* ignore */
    }
  }

  const acceptInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  // Decide which (if any) banner to render. Update wins over install.
  const view = showUpdate ? "update" : installEvent && !dismissedInstall ? "install" : null

  return (
    <AnimatePresence>
      {view && (
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className={cn(
            "pointer-events-auto fixed inset-x-0 bottom-0 z-40 px-4",
            // Sit above the mobile bottom nav (~5rem incl. safe-area).
            "pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-6",
          )}
        >
          {view === "update" ? (
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xl">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <RefreshCw className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Update available</p>
                <p className="text-[11px] text-muted-foreground">Refresh to get the latest Pallio.</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowUpdate(false)} disabled={refreshing}>
                Later
              </Button>
              <Button size="sm" onClick={handleRefresh} disabled={refreshing} aria-busy={refreshing}>
                {refreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Refreshing
                  </>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          ) : (
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xl">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-fuchsia-500 text-white shadow-sm shadow-brand/30">
                <Download className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Install Pallio</p>
                <p className="text-[11px] text-muted-foreground">Add to your home screen for a fast, app-like experience.</p>
              </div>
              <button
                type="button"
                aria-label="Dismiss install prompt"
                onClick={dismissInstall}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <Button size="sm" onClick={acceptInstall}>
                Install
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Chrome's BeforeInstallPromptEvent — not in the standard types yet.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
  prompt(): Promise<void>
}
