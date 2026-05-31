import * as React from "react"
import { Link } from "react-router-dom"
import { Building2, ChevronRight, Loader2, Mail, Phone, Plus, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { SwipeableRow } from "@/components/mobile/swipeable-row"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useCurrency } from "@/contexts/currency"

type Row = {
  name: string
  email: string
  phone: string
  category: string
  activePOs: number
  lifetime: number
  tier: "preferred" | "standard" | "new"
}

const rows: Row[] = [
  { name: "Cobalt Distributors", email: "sales@cobalt.com", phone: "+1 555 1000", category: "Electronics", activePOs: 8, lifetime: 84200, tier: "preferred" },
  { name: "Delta Apparel", email: "orders@delta.com", phone: "+1 555 1001", category: "Apparel", activePOs: 3, lifetime: 38400, tier: "preferred" },
  { name: "Acme Supplies", email: "hello@acme.io", phone: "+1 555 1002", category: "General", activePOs: 4, lifetime: 14620, tier: "standard" },
  { name: "Porcel Ceramics", email: "ap@porcel.com", phone: "+1 555 1003", category: "Home", activePOs: 2, lifetime: 7110, tier: "standard" },
  { name: "Glow Co", email: "hi@glow.co", phone: "+1 555 1004", category: "Beauty", activePOs: 6, lifetime: 22480, tier: "new" },
]

const tierTone: Record<Row["tier"], StatusTone> = { preferred: "brand", standard: "info", new: "success" }

function initialsOf(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("")
}

function avatarTint(name: string) {
  const palette = [
    "bg-brand/15 text-brand dark:bg-primary/20 dark:text-primary",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palette[h % palette.length]!
}

export default function Suppliers() {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")
  const [refreshing, setRefreshing] = React.useState(false)
  const { formatPrice } = useCurrency()

  useRegisterPageRefresh(
    React.useCallback(async () => {
      setRefreshing(true)
      try { await new Promise((r) => setTimeout(r, 400)) } finally { setRefreshing(false) }
    }, []),
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q),
    )
  }, [query])

  const preferred = rows.filter((r) => r.tier === "preferred").length
  const totalActive = rows.reduce((s, r) => s + r.activePOs, 0)
  const lifetimeSpend = rows.reduce((s, r) => s + r.lifetime, 0)

  return (
    <PageShell
      title="Suppliers"
      withToolbar
      titleTooltip={
        <>
          Old-school synonym for <strong>Vendors</strong> — same data,
          same actions — the businesses you buy stock from. Pallio
          uses "Vendors" in the official sidebar but accepts
          "Suppliers" everywhere retail jargon expects it.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Suppliers", value: String(rows.length), tone: "brand", hint: "tracked" },
            { label: "Preferred", value: String(preferred), tone: "info", hint: "tier 1" },
            { label: "Active POs", value: String(totalActive), tone: "warning", hint: "in flight" },
            { label: "Lifetime spend", value: formatPrice(lifetimeSpend), tone: "success", hint: "to date" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search supplier by name, email, or category…" className="pl-9" />
          </div>
          {refreshing && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refreshing…
            </span>
          )}
          <Link to="/purchasing/vendors/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> Add supplier</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={Building2} title="No suppliers match" description="Try a different name or category." />
          </CardContent></Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.email}>
                <SwipeableRow
                  rightActions={[
                    { label: "Call", tone: "primary", icon: <Phone className="h-4 w-4" />, onPress: () => { window.location.href = `tel:${r.phone.replace(/\s+/g, "")}` } },
                    { label: "Email", tone: "neutral", icon: <Mail className="h-4 w-4" />, onPress: () => { window.location.href = `mailto:${r.email}` } },
                  ]}
                >
                  <Link to={`/purchasing/vendors/${r.name.toLowerCase().replace(/\s+/g, "-")}`} className="flex items-center gap-3 p-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarTint(r.name)}`}>
                      {initialsOf(r.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <StatusBadge tone={tierTone[r.tier]}>{r.tier}</StatusBadge>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{r.email}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {r.activePOs} active POs · {formatPrice(r.lifetime)} lifetime
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </SwipeableRow>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Supplier</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Email</th>
                  <th className="px-3 py-2.5 font-medium">Phone</th>
                  <th className="px-3 py-2.5 text-right font-medium">Active POs</th>
                  <th className="px-3 py-2.5 text-right font-medium">Lifetime</th>
                  <th className="px-3 py-2.5 font-medium">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.email} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${avatarTint(r.name)}`}>{initialsOf(r.name)}</span>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.category}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.email}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.phone}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.activePOs}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(r.lifetime)}</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={tierTone[r.tier]} withDot>{r.tier}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  )
}
