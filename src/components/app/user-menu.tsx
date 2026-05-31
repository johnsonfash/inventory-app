import * as React from "react"
import { createPortal } from "react-dom"
import { Link, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowRight,
  Bell,
  Bot,
  HelpCircle,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/avatar"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTWTheme } from "@/components/tw-theme-provider"
import { clearAuth } from "@/lib/api/auth-token"
import { cn } from "@/lib/utils"

// User avatar + dropdown menu. The button is the brand-gradient
// "P" pill that the AppFrame header used to render as a static
// circle; tapping it now opens:
//   * Desktop — anchored popover with profile / settings / theme /
//     help / sign-out items.
//   * Mobile — BottomSheet with the same items, larger tap targets.
//
// Sign-out fires a confirmation modal before clearing auth — losing
// session data without confirming is a frequent regret in operator
// software.

type CurrentUser = {
  name: string
  email: string
  role: string
}

// Mock current user. Real backend swaps this for an auth-context
// hook. Keeps the menu visually complete while we're still in
// dummy-data land.
const CURRENT_USER: CurrentUser = {
  name: "Mia Chen",
  email: "mia@funkeapparel.com",
  role: "Manager",
}

export function UserMenu() {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTWTheme()

  // Close on outside click + Escape. Mobile is handled by BottomSheet
  // itself (backdrop tap + Esc + drag-down) — running the outside-click
  // handler there would treat every tap inside the sheet as "outside"
  // and close the drawer immediately, since the sheet's portalled DOM
  // isn't inside `user-menu-popover` (that's the desktop popover only).
  React.useEffect(() => {
    if (!open || isMobile) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !document.getElementById("user-menu-popover")?.contains(t)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, isMobile])

  const openMenu = () => {
    if (triggerRef.current) setAnchorRect(triggerRef.current.getBoundingClientRect())
    setOpen(true)
  }

  const [signingOut, setSigningOut] = React.useState(false)

  const signOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await clearAuth()
      setConfirmOpen(false)
      setOpen(false)
      navigate("/")
    } catch {
      toast.error("Failed to sign out. Please try again.")
    } finally {
      setSigningOut(false)
    }
  }

  const ITEMS = [
    { label: "Profile",        Icon: User,     onClick: () => { setOpen(false); navigate("/settings/profile") } },
    { label: "Settings",       Icon: Settings, onClick: () => { setOpen(false); navigate("/settings") } },
    { label: "Team",           Icon: Users,    onClick: () => { setOpen(false); navigate("/settings/users") } },
    { label: "Security",       Icon: Lock,     onClick: () => { setOpen(false); navigate("/settings/security") } },
    { label: "Notifications",  Icon: Bell,     onClick: () => { setOpen(false); navigate("/notifications") } },
    { label: "AI Assistant",   Icon: Bot,      onClick: () => { setOpen(false); navigate("/ai") } },
    { label: "Help + docs",    Icon: HelpCircle, onClick: () => { setOpen(false); navigate("/faq") } },
    { label: "Contact support",Icon: LifeBuoy, onClick: () => { setOpen(false); navigate("/contact") } },
  ]

  const body = (
    <>
      {/* Workspace switcher — MOBILE ONLY. On desktop the header already
          shows the OrgLocationSwitch dual-select, so repeating it inside
          the avatar dropdown is redundant. On mobile there's no header
          switcher, so the drawer is where multi-store operators flip
          org/location (one tap avatar → row → option). Both surfaces
          share state via useOrgLocation. */}
      {isMobile && <WorkspaceSwitcher onSelect={() => setOpen(false)} />}

      {/* Header — name + email + role */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            seed={CURRENT_USER.email}
            name={CURRENT_USER.name}
            size={40}
            className="ring-2 ring-brand/20 dark:ring-primary/20"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{CURRENT_USER.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{CURRENT_USER.email}</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand dark:bg-primary/15 dark:text-primary">
            {CURRENT_USER.role}
          </span>
        </div>
      </div>

      {/* Items */}
      <ul className="py-1.5">
        {ITEMS.map((it) => (
          <li key={it.label}>
            <button
              type="button"
              onClick={it.onClick}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:bg-accent"
            >
              <it.Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{it.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            </button>
          </li>
        ))}
      </ul>

      {/* Theme switcher */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Theme</p>
        <div className="mt-2 inline-flex w-full gap-1 rounded-lg border border-border p-0.5">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs font-semibold capitalize transition-colors",
                resolvedTheme === t
                  ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setConfirmOpen(true) }}
          className="flex w-full items-center gap-3 rounded-md px-4 py-2 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400 focus-visible:outline-none focus-visible:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full transition-shadow hover:shadow-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar
          seed={CURRENT_USER.email}
          name={CURRENT_USER.name}
          size={36}
          className="ring-2 ring-transparent transition-colors hover:ring-brand/30"
        />
      </button>

      {isMobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title="Account">
          <div className="pb-3">{body}</div>
        </BottomSheet>
      ) : (
        typeof document !== "undefined" && createPortal(
          <AnimatePresence>
            {open && anchorRect && (
              <motion.div
                id="user-menu-popover"
                role="menu"
                aria-label="User menu"
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "fixed",
                  top: anchorRect.bottom + 8,
                  right: Math.max(8, window.innerWidth - anchorRect.right),
                  zIndex: 60,
                }}
                className="w-72 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl shadow-black/20 dark:shadow-black/50"
              >
                {body}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
      )}

      <SignOutConfirm open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={signOut} userName={CURRENT_USER.name} loading={signingOut} />

      {/* Unused-import suppression — Sun is reserved for the future "set theme to system from sunlight" telemetry idea. */}
      <span className="hidden"><Sun /></span>
    </>
  )
}

// Sign-out confirmation modal. Pulled out so we don't reflow the
// dropdown DOM tree when the user is about to confirm.
function SignOutConfirm({
  open,
  onClose,
  onConfirm,
  userName,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  userName: string
  loading?: boolean
}) {
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (typeof document === "undefined") return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-md sm:items-center"
          onClick={onClose}
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm sign out"
        >
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.97 }}
            animate={{ y: 0,  opacity: 1, scale: 1 }}
            exit={{ y: 16,  opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40 sm:rounded-2xl"
          >
            <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-rose-500/15 via-card to-card px-5 py-5 dark:from-rose-950/30">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-500/20 blur-3xl" aria-hidden />
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
                <LogOut className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-lg font-bold tracking-tight">Sign out of Pallio?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You'll be signed out of <span className="font-semibold text-foreground">{userName}</span> on this device. Drafts + holds + your filters stay safe.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3">
              <Button variant="ghost" onClick={onClose} disabled={loading}>Stay signed in</Button>
              <Button onClick={onConfirm} disabled={loading} aria-busy={loading} className="bg-rose-600 text-white hover:bg-rose-600/90 dark:bg-rose-700 dark:hover:bg-rose-700/90">
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing out
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
