import * as React from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  CreditCard,
  Megaphone,
  Package,
  RotateCcw,
  Users,
  type LucideIcon,
} from "lucide-react"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

// Notification bell + popover. Sits in the desktop header next to
// the ModeToggle; mobile gets it as the top-bar trailing slot
// (replacing the search icon's previous default).
//
// Tapping opens a popover (desktop) / BottomSheet (mobile) with the
// latest 5 notifications + "View all" → /notifications.

type Notification = {
  id: string
  title: string
  body: string
  ago: string  // pre-formatted relative time
  unread?: boolean
  kind: "stock" | "sale" | "refund" | "campaign" | "team" | "alert"
  href?: string
}

const ICON: Record<Notification["kind"], LucideIcon> = {
  stock: Package,
  sale: CreditCard,
  refund: RotateCcw,
  campaign: Megaphone,
  team: Users,
  alert: AlertTriangle,
}

const TONE: Record<Notification["kind"], string> = {
  stock: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  sale: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  refund: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  campaign: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  team: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  alert: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
}

// Mock notifications. Swap for api.get<Paginated<Notification>>
// ('/notifications?limit=5') when the backend ships.
const NOTIFICATIONS: Notification[] = [
  { id: "n-1", kind: "stock",    title: "USB‑C Hub crossed reorder threshold", body: "18 units left, ~4 days at current pace.", ago: "12m", unread: true, href: "/inventory" },
  { id: "n-2", kind: "sale",     title: "Mia closed a ₦86,000 sale",            body: "INV-2401 · Aisha N. · paid via card.",     ago: "38m", unread: true, href: "/sales/invoices/inv-2401" },
  { id: "n-3", kind: "campaign", title: "IG Reels ROAS hit 4.2×",              body: "Holiday Tee Reel is the top performer.",   ago: "1h",                href: "/marketing/instagram-ads" },
  { id: "n-4", kind: "team",     title: "Sara Quill is now an affiliate",       body: "Code QUILL10 issued · 10% commission.",   ago: "2h",  unread: true, href: "/settings/users" },
  { id: "n-5", kind: "alert",    title: "Cobalt: 2 days late on PO‑1042",      body: "3 of last 4 POs from this vendor missed ETA.", ago: "5h",          href: "/purchasing/vendors" },
]

export function NotificationBell() {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<Notification[]>(NOTIFICATIONS)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null)

  const unread = items.filter((n) => n.unread).length

  React.useEffect(() => {
    // Mobile uses BottomSheet which owns its own dismissal — running
    // this outside-click handler would close the sheet on every
    // internal tap (the sheet's portalled DOM isn't inside the
    // `notif-popover` element we check against).
    if (!open || isMobile) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !document.getElementById("notif-popover")?.contains(t)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onClick)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, isMobile])

  const onOpen = () => {
    if (triggerRef.current) setAnchorRect(triggerRef.current.getBoundingClientRect())
    setOpen(true)
  }

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const body = (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Notifications</p>
          <p className="text-[11px] text-muted-foreground">{unread === 0 ? "All caught up" : `${unread} unread`}</p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-[11px] font-semibold text-brand hover:underline dark:text-primary"
          >
            Mark all read
          </button>
        )}
      </header>
      <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
        {items.map((n) => {
          const Icon = ICON[n.kind]
          const Inner = (
            <div className={cn(
              "flex items-start gap-3 px-4 py-3 transition-colors",
              n.unread ? "bg-brand-soft/40 dark:bg-primary/10" : "hover:bg-accent/40",
            )}>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONE[n.kind])}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{n.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{n.ago} ago</p>
              </div>
              {n.unread && <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-brand dark:bg-primary" aria-label="Unread" />}
            </div>
          )
          return (
            <li key={n.id}>
              {n.href ? (
                <Link to={n.href} onClick={() => setOpen(false)}>{Inner}</Link>
              ) : (
                Inner
              )}
            </li>
          )
        })}
      </ul>
      <footer className="border-t border-border px-2 py-1.5">
        <Link
          to="/notifications"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-accent dark:text-primary"
        >
          View all notifications <ArrowRight className="h-3 w-3" />
        </Link>
      </footer>
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <p className="text-sm font-semibold">All caught up</p>
        </div>
      )}
    </>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onOpen}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {isMobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title="Notifications">
          <div className="pb-3">{body}</div>
        </BottomSheet>
      ) : (
        typeof document !== "undefined" && createPortal(
          <AnimatePresence>
            {open && anchorRect && (
              <motion.div
                id="notif-popover"
                role="dialog"
                aria-label="Notifications"
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
                className="w-[22rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl shadow-black/20 dark:shadow-black/50"
              >
                {body}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
      )}
    </>
  )
}
