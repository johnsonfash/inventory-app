import * as React from "react"
import { ScrollText, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/avatar"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { cn } from "@/lib/utils"

type Area = "auth" | "inventory" | "sales" | "money" | "settings" | "team"
type Log = { id: string; who: string; email: string; area: Area; action: string; when: string }

const AREA_TONE: Record<Area, StatusTone> = {
  auth: "neutral", inventory: "info", sales: "success", money: "warning", settings: "brand", team: "danger",
}

const LOGS: Log[] = [
  { id: "l1",  who: "Mia Chen",   email: "mia@funkeapparel.com",   area: "money",     action: "Paid commission COMM-2026-05-006 (₦9,240)",            when: "12 min ago" },
  { id: "l2",  who: "Mia Chen",   email: "mia@funkeapparel.com",   area: "money",     action: "Approved 5 pending commissions",                        when: "13 min ago" },
  { id: "l3",  who: "Alex Reyes", email: "alex@funkeapparel.com",  area: "sales",     action: "Voided invoice INV-2174",                               when: "1 h ago" },
  { id: "l4",  who: "Mia Chen",   email: "mia@funkeapparel.com",   area: "settings",  action: "Updated business details (logo, tax ID)",               when: "3 h ago" },
  { id: "l5",  who: "Tunde Bello",email: "tunde@funkeapparel.com", area: "inventory", action: "Received stock against PO-1042 (60 units)",             when: "5 h ago" },
  { id: "l6",  who: "Mia Chen",   email: "mia@funkeapparel.com",   area: "team",      action: "Invited daniel@funkeapparel.com as Cashier",            when: "yesterday" },
  { id: "l7",  who: "System",     email: "system@pallio.app",      area: "auth",      action: "Failed sign-in attempt blocked (3 tries)",             when: "yesterday" },
  { id: "l8",  who: "Alex Reyes", email: "alex@funkeapparel.com",  area: "inventory", action: "Adjusted stock: Cotton Tee −4 (damaged)",               when: "yesterday" },
  { id: "l9",  who: "Mia Chen",   email: "mia@funkeapparel.com",   area: "money",     action: "Locked accounting period April 2026",                   when: "2 days ago" },
  { id: "l10", who: "Mia Chen",   email: "mia@funkeapparel.com",   area: "settings",  action: "Created API key 'Storefront sync' (read-write)",        when: "2 days ago" },
]

const FILTERS = ["all", "auth", "inventory", "sales", "money", "settings", "team"] as const

export default function AuditLogSettings() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 350)) }, []))
  const [query, setQuery] = React.useState("")
  const [area, setArea] = React.useState<(typeof FILTERS)[number]>("all")

  const filtered = LOGS.filter((l) => area === "all" || l.area === area).filter((l) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return l.who.toLowerCase().includes(q) || l.action.toLowerCase().includes(q)
  })

  return (
    <PageShell
      title="Audit log"
      withToolbar={false}
      titleTooltip="An append-only record of every sensitive action — who did what, and when. Money moves, voids, stock adjustments, settings changes, sign-ins and team changes. Backend keeps this immutable; retention scales with your plan."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search who or what…" className="pl-9" />
          </div>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setArea(f)}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                  area === f ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground")}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            {LOGS.length === 0 ? (
              <EmptyState
                Icon={ScrollText}
                title="No audit entries yet"
                description="Sensitive actions — voids, money moves, settings changes — will appear here as soon as your team starts working."
              />
            ) : (
              <EmptyState
                Icon={ScrollText}
                title="No entries match your filters"
                description={query.trim() || area !== "all"
                  ? "Clear the search or pick a different area to widen the view."
                  : "Try a different search or area."}
              />
            )}
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <ul className="divide-y divide-border">
              {filtered.map((l) => (
                <li key={l.id} className="flex items-start gap-3 p-3">
                  <Avatar seed={l.email} name={l.who} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{l.who}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{l.when}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{l.action}</p>
                    <StatusBadge tone={AREA_TONE[l.area]} className="mt-1">{l.area}</StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        )}
      </div>
    </PageShell>
  )
}
