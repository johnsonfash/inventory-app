import * as React from "react"
import { Link } from "react-router-dom"
import {
  ChevronRight,
  Mail,
  Phone,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SwipeableRow } from "@/components/mobile/swipeable-row"
import { Avatar } from "@/components/avatar"
import { AddCustomerDialog, type QuickCustomer } from "@/components/dialogs/add-customer-dialog"
import { useCurrency } from "@/contexts/currency"
import { useTerm } from "@/hooks/use-industry"

type Customer = {
  name: string
  email: string
  phone?: string
  orders: number
  lifetimeSpend: number
  tier: "vip" | "regular" | "new" | "lapsed"
  lastOrderDaysAgo?: number
}

const customers: Customer[] = [
  { name: "Acme Co", email: "ap@acmeco.com", phone: "+1 415 555 0111", orders: 86, lifetimeSpend: 18420, tier: "vip", lastOrderDaysAgo: 2 },
  { name: "Aisha Nwosu", email: "aisha@personal.io", phone: "+44 20 7946 0118", orders: 14, lifetimeSpend: 1840, tier: "regular", lastOrderDaysAgo: 8 },
  { name: "BrightLane", email: "team@brightlane.com", orders: 24, lifetimeSpend: 4910, tier: "regular", lastOrderDaysAgo: 1 },
  { name: "Daniel Kim", email: "dk@neuroframe.dev", orders: 6, lifetimeSpend: 920, tier: "new", lastOrderDaysAgo: 14 },
  { name: "Linda Mensah", email: "linda.m@studio.so", phone: "+233 24 555 0119", orders: 41, lifetimeSpend: 7280, tier: "vip", lastOrderDaysAgo: 30 },
  { name: "NovaApps", email: "ops@novaapps.io", phone: "+1 212 555 0107", orders: 58, lifetimeSpend: 12180, tier: "vip", lastOrderDaysAgo: 4 },
  { name: "Sade Adeyemi", email: "sade@gmail.com", orders: 2, lifetimeSpend: 86, tier: "new", lastOrderDaysAgo: 60 },
  { name: "Walk-in (cash)", email: "—", orders: 312, lifetimeSpend: 4220, tier: "regular", lastOrderDaysAgo: 0 },
  { name: "Zenith Ltd", email: "accounts@zenith.co", phone: "+234 803 555 0166", orders: 19, lifetimeSpend: 6210, tier: "lapsed", lastOrderDaysAgo: 180 },
]

// URL-safe slug for the per-customer detail route. Email-derived
// when available (stable + unique), name-derived for cash walk-ins.
function customerSlug(c: Customer): string {
  const src = c.email && c.email !== "—" ? c.email : c.name
  return src.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "walk-in"
}

const tierTone: Record<Customer["tier"], StatusTone> = {
  vip: "brand",
  regular: "info",
  new: "success",
  lapsed: "warning",
}

export default function Customers() {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")
  const { formatPrice } = useCurrency()
  // Industry vocab — restaurants see "Guests", services "Clients",
  // pharmacies "Patients", gyms "Members", hotels "Guests".
  const customerSingularRaw = useTerm("customer", "Customer")
  const customerPluralRaw = useTerm("customer.plural", "Customers")
  const customerPlural =
    customerPluralRaw.charAt(0).toUpperCase() + customerPluralRaw.slice(1)
  const addCustomerCta = `Add ${customerSingularRaw.toLowerCase()}`

  // Seed from the mock catalogue, then keep it in state so a quick-add
  // shows up immediately. The backend will own this list later; until
  // then new rows live for the session (same as the rest of the mock).
  const [rows, setRows] = React.useState<Customer[]>(customers)
  const [addOpen, setAddOpen] = React.useState(false)

  const handleCreate = (c: QuickCustomer) => {
    setRows((prev) => [
      { name: c.name, email: c.email, phone: c.phone, orders: 0, lifetimeSpend: 0, tier: "new" },
      ...prev,
    ])
  }

  useRegisterPageRefresh(
    React.useCallback(async () => {
      await new Promise((r) => setTimeout(r, 400))
    }, []),
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    )
  }, [query, rows])

  const groups = React.useMemo(() => {
    const m = new Map<string, Customer[]>()
    for (const c of [...filtered].sort((a, b) => a.name.localeCompare(b.name))) {
      const letter = (c.name[0] ?? "#").toUpperCase()
      const key = /[A-Z]/.test(letter) ? letter : "#"
      const arr = m.get(key) ?? []
      arr.push(c)
      m.set(key, arr)
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const vipCount = rows.filter((c) => c.tier === "vip").length
  const newCount = rows.filter((c) => c.tier === "new").length
  const lapsedCount = rows.filter((c) => c.tier === "lapsed").length
  const ltv = rows.reduce((s, c) => s + c.lifetimeSpend, 0)

  return (
    <PageShell
      title={customerPlural}
      withToolbar
      titleTooltip={
        <>
          People + businesses who buy from you. Each row stores their
          contact info, payment terms, default price list, lifetime
          spend, and the orders they've placed. "Walk-in (cash)" is a
          catch-all for shoppers without an account.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0">
          {[
            { label: customerPlural, value: rows.length.toLocaleString(), tone: "brand" as StatusTone },
            { label: "VIPs", value: String(vipCount), tone: "info" as StatusTone },
            { label: "New (30d)", value: String(newCount), tone: "success" as StatusTone },
            { label: "Lifetime spend", value: formatPrice(ltv), tone: "warning" as StatusTone },
          ].map((t) => (
            <div
              key={t.label}
              className="min-w-[140px] snap-start rounded-2xl border border-border bg-card p-3 md:min-w-0"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{t.value}</p>
              <div className="mt-1.5">
                <StatusBadge tone={t.tone} withDot>
                  active
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-9"
            />
          </div>
          <Button className="hidden md:inline-flex" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> {addCustomerCta}
          </Button>
        </div>

        {lapsedCount > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
            <span className="font-semibold">{lapsedCount} lapsed {customerPluralRaw.toLowerCase()}</span> haven't ordered in 90+ days — consider a re-engagement campaign.
          </div>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                Icon={Users}
                title={`No ${customerPluralRaw.toLowerCase()} match`}
                description="Try a different name or email."
                action={
                  <Button onClick={() => setAddOpen(true)}>
                    <UserPlus className="h-4 w-4" /> {addCustomerCta}
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : isMobile ? (
          <div className="space-y-4">
            {groups.map(([letter, rows]) => (
              <section key={letter}>
                <h4 className="sticky top-14 z-10 -mx-4 mb-1.5 bg-background/85 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                  {letter}
                </h4>
                <ul className="space-y-2">
                  {rows.map((c) => (
                    <li key={c.email}>
                      <SwipeableRow
                        rightActions={[
                          ...(c.phone
                            ? [
                                {
                                  label: "Call",
                                  tone: "primary" as const,
                                  icon: <Phone className="h-4 w-4" />,
                                  onPress: () => {
                                    window.location.href = `tel:${c.phone!.replace(/\s+/g, "")}`
                                  },
                                },
                              ]
                            : []),
                          {
                            label: "Email",
                            tone: "neutral" as const,
                            icon: <Mail className="h-4 w-4" />,
                            onPress: () => {
                              window.location.href = `mailto:${c.email}`
                            },
                          },
                        ]}
                      >
                        <Link to={`/sales/customers/${customerSlug(c)}`} className="flex items-center gap-3 p-3">
                          <Avatar seed={c.email || c.name} name={c.name} size={40} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold">{c.name}</p>
                              <StatusBadge tone={tierTone[c.tier]}>{c.tier}</StatusBadge>
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {c.orders} orders · {formatPrice(c.lifetimeSpend)} LTV
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </SwipeableRow>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Email</th>
                  <th className="px-3 py-2.5 font-medium">Phone</th>
                  <th className="px-3 py-2.5 text-right font-medium">Orders</th>
                  <th className="px-3 py-2.5 text-right font-medium">LTV</th>
                  <th className="px-3 py-2.5 font-medium">Tier</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.email} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar seed={c.email || c.name} name={c.name} size={28} />
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.email}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.orders}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(c.lifetimeSpend)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={tierTone[c.tier]} withDot>
                        {c.tier}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/sales/customers/${customerSlug(c)}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MobileFab onClick={() => setAddOpen(true)} label={addCustomerCta} />

      <AddCustomerDialog open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} />
    </PageShell>
  )
}
