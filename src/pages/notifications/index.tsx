import * as React from "react"
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  Info,
  Package,
  Settings,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SwitchField } from "@/components/forms/switch-field"
import { kvJson } from "@/lib/storage/kv"
import { cn } from "@/lib/utils"
import { formatPriceFor } from "@/contexts/currency"

type Level = "info" | "success" | "warning" | "error"
type Category = "Stock" | "Orders" | "Purchases" | "Billing" | "System"

type Notification = {
  id: string
  title: string
  description?: string
  category: Category
  level: Level
  agoMinutes: number
  read: boolean
}

const seed: Notification[] = [
  { id: "n1", title: "Low stock for EL-2109", description: "On-hand 12 below reorder 25", category: "Stock", level: "warning", agoMinutes: 2, read: false },
  { id: "n2", title: "PO-1045 received", description: "20 units of EL-2109 added to WH-A", category: "Purchases", level: "success", agoMinutes: 56, read: false },
  { id: "n3", title: "Invoice INV-3310 overdue", description: "BrightLane · 5 days past due", category: "Billing", level: "error", agoMinutes: 124, read: false },
  { id: "n4", title: "New analytics reports", description: "Trending Products + Stock Expiry now under Reports", category: "System", level: "info", agoMinutes: 180, read: true },
  { id: "n5", title: "Order SO-7846 fulfilled", description: `Daniel K. · ${formatPriceFor(1284)} · 6 items`, category: "Orders", level: "success", agoMinutes: 240, read: true },
  { id: "n6", title: "Stock adjustment ADJ-104", description: "−8 units of EL-2109 (damaged)", category: "Stock", level: "warning", agoMinutes: 360, read: true },
]

const categoryIcon: Record<Category, LucideIcon> = {
  Stock: Package,
  Orders: CheckCheck,
  Purchases: Truck,
  Billing: CreditCard,
  System: Info,
}
const levelTone: Record<Level, StatusTone> = { info: "info", success: "success", warning: "warning", error: "danger" }
const levelIconBg: Record<Level, string> = {
  info: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  error: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
}
const levelIcon: Record<Level, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

const FILTERS = ["All", "Unread", "Stock", "Orders", "Purchases", "Billing", "System"] as const

function relTime(min: number) {
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const READ_OVERRIDES_KEY = "pallio:notifications-read"

function applyReadOverrides(base: Notification[], overrides: Record<string, boolean>): Notification[] {
  return base.map((n) => (n.id in overrides ? { ...n, read: overrides[n.id]! } : n))
}

export default function Notifications() {
  // Persist read/unread state across reloads so the toggle "sticks".
  // Until backend lands the seed dataset is fixed, so we only need
  // to remember per-id overrides, not the whole feed.
  const [items, setItems] = React.useState<Notification[]>(() =>
    applyReadOverrides(seed, kvJson.get<Record<string, boolean>>(READ_OVERRIDES_KEY) ?? {}),
  )
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("All")
  const [showSettings, setShowSettings] = React.useState(false)
  const [persisting, setPersisting] = React.useState(false)

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    if (filter === "All") return items
    if (filter === "Unread") return items.filter((n) => !n.read)
    return items.filter((n) => n.category === filter)
  }, [items, filter])

  const unread = items.filter((n) => !n.read).length

  const persistOverrides = React.useCallback((next: Notification[]) => {
    const overrides: Record<string, boolean> = {}
    for (const n of next) overrides[n.id] = n.read
    setPersisting(true)
    void kvJson.set(READ_OVERRIDES_KEY, overrides).finally(() => setPersisting(false))
  }, [])

  const markAllRead = () =>
    setItems((p) => {
      const next = p.map((n) => ({ ...n, read: true }))
      persistOverrides(next)
      return next
    })
  const toggleRead = (id: string) =>
    setItems((p) => {
      const next = p.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
      persistOverrides(next)
      return next
    })

  return (
    <PageShell
      title="Notifications"
      withToolbar={false}
      titleTooltip={
        <>
          Anything Pallio wanted you to know about — low stock, late
          deliveries, overdue invoices, AI insights, team @mentions.
          Filter by category, mark read once triaged. Tune which
          events trigger pings in Settings → Notifications.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight md:text-xl">
              Inbox
              {unread > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-foreground dark:bg-primary dark:text-primary-foreground">
                  {unread}
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {unread === 0 ? "All caught up." : `${unread} unread ${unread === 1 ? "alert" : "alerts"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0 || persisting}
              aria-busy={persisting}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                persisting && "opacity-60",
              )}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Notification settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:px-0">
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {f}
                {f === "Unread" && unread > 0 && (
                  <span className={cn("ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]", active ? "bg-white/25" : "bg-muted")}>
                    {unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>
            {[
              { label: "Low stock alerts", description: "Notify when an item dips below its reorder point." },
              { label: "Order events", description: "Created, fulfilled, returned, refunded." },
              { label: "Purchase order updates", description: "Vendor confirmations, partial receipts, full delivery." },
              { label: "Billing reminders", description: "Customer invoices coming due, vendor bills approaching." },
              { label: "System announcements", description: "New features, scheduled maintenance, version notes." },
            ].map((it) => (
              <SwitchField key={it.label} label={it.label} description={it.description} defaultChecked />
            ))}
          </div>
        )}

        {/* Feed */}
        {filtered.length === 0 ? (
          <EmptyState
            Icon={BellOff}
            title="Nothing here"
            description={filter === "Unread" ? "You're all caught up." : "No notifications in this category."}
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => {
              const CategoryIcon = categoryIcon[n.category]
              const LevelIcon = levelIcon[n.level]
              return (
                <li
                  key={n.id}
                  className={cn(
                    "rounded-2xl border border-border bg-card p-3 transition-colors",
                    !n.read && "bg-brand-soft/40 dark:bg-primary/10",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", levelIconBg[n.level])}>
                      <LevelIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("min-w-0 truncate text-sm", n.read ? "font-medium" : "font-semibold")}>
                          {n.title}
                          {!n.read && (
                            <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand dark:bg-primary" />
                          )}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{relTime(n.agoMinutes)}</span>
                      </div>
                      {n.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge tone={levelTone[n.level]}>
                          <CategoryIcon className="h-3 w-3" /> {n.category}
                        </StatusBadge>
                        <button
                          type="button"
                          onClick={() => toggleRead(n.id)}
                          disabled={persisting}
                          aria-busy={persisting}
                          className={cn(
                            "text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed",
                            persisting && "opacity-60",
                          )}
                        >
                          Mark as {n.read ? "unread" : "read"}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Footer note */}
        <p className="flex items-center gap-1.5 pt-2 text-[11px] text-muted-foreground">
          <Bell className="h-3.5 w-3.5" />
          Push notifications for mobile and desktop are configured in Settings → Notifications.
        </p>
      </div>
    </PageShell>
  )
}
