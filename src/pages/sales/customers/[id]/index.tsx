import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  Gift,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { Avatar } from "@/components/avatar"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useCurrency } from "@/contexts/currency"
import { useTerm } from "@/hooks/use-industry"
import {
  addStoreCredit,
  getLoyalty,
  listGiftCards,
  loadLoyaltyRules,
  loyaltyIdFor,
  redeemPointsForCredit,
  type GiftCard,
} from "@/lib/pos/loyalty"
import { toast } from "sonner"

// Single-customer detail. Reachable from /sales/customers via slug.
// Shows the contact strip, KPI ribbon, order history, payment-method
// breakdown, and a notes / activity log. Mock data for now; backend
// swaps the `useCustomer(slug)` data source when ready.

type Tier = "vip" | "regular" | "new" | "lapsed"
type Customer = {
  slug: string
  name: string
  email: string
  phone?: string
  tier: Tier
  orders: number
  lifetimeSpend: number
  lastOrderDaysAgo: number
  joinedDaysAgo: number
  city?: string
  notes?: string
  preferredChannel?: "email" | "whatsapp" | "phone"
}

// Mock registry. Keep slugs URL-safe + deterministic from email/name
// so the list page's <Link> targets always resolve.
function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "walk-in"
}

const CUSTOMERS: Customer[] = [
  { slug: toSlug("ap@acmeco.com"),        name: "Acme Co",        email: "ap@acmeco.com",       phone: "+1 415 555 0111",  tier: "vip",     orders: 86,  lifetimeSpend: 18420, lastOrderDaysAgo: 2,   joinedDaysAgo: 540, city: "San Francisco · CA",     preferredChannel: "email" },
  { slug: toSlug("aisha@personal.io"),    name: "Aisha Nwosu",    email: "aisha@personal.io",   phone: "+44 20 7946 0118", tier: "regular", orders: 14,  lifetimeSpend: 1840,  lastOrderDaysAgo: 8,   joinedDaysAgo: 260, city: "London · UK",            preferredChannel: "whatsapp" },
  { slug: toSlug("team@brightlane.com"),  name: "BrightLane",     email: "team@brightlane.com", tier: "regular", orders: 24,  lifetimeSpend: 4910,  lastOrderDaysAgo: 1,   joinedDaysAgo: 410, city: "Lagos · NG",             preferredChannel: "email" },
  { slug: toSlug("dk@neuroframe.dev"),    name: "Daniel Kim",     email: "dk@neuroframe.dev",   tier: "new",     orders: 6,   lifetimeSpend: 920,   lastOrderDaysAgo: 14,  joinedDaysAgo: 28,  city: "Seoul · KR",             preferredChannel: "email" },
  { slug: toSlug("linda.m@studio.so"),    name: "Linda Mensah",   email: "linda.m@studio.so",   phone: "+233 24 555 0119", tier: "vip",     orders: 41,  lifetimeSpend: 7280,  lastOrderDaysAgo: 30,  joinedDaysAgo: 720, city: "Accra · GH",             preferredChannel: "whatsapp" },
  { slug: toSlug("ops@novaapps.io"),      name: "NovaApps",       email: "ops@novaapps.io",     phone: "+1 212 555 0107",  tier: "vip",     orders: 58,  lifetimeSpend: 12180, lastOrderDaysAgo: 4,   joinedDaysAgo: 612, city: "New York · NY",          preferredChannel: "email" },
  { slug: toSlug("sade@gmail.com"),       name: "Sade Adeyemi",   email: "sade@gmail.com",      tier: "new",     orders: 2,   lifetimeSpend: 86,    lastOrderDaysAgo: 60,  joinedDaysAgo: 70,  city: "Lagos · NG",             preferredChannel: "whatsapp" },
  { slug: "walk-in",                      name: "Walk-in (cash)", email: "",                    tier: "regular", orders: 312, lifetimeSpend: 4220,  lastOrderDaysAgo: 0,   joinedDaysAgo: 365, city: "Multiple",               preferredChannel: undefined,  notes: "House account for anonymous cash sales." },
  { slug: toSlug("accounts@zenith.co"),   name: "Zenith Ltd",     email: "accounts@zenith.co",  phone: "+234 803 555 0166", tier: "lapsed",  orders: 19,  lifetimeSpend: 6210,  lastOrderDaysAgo: 180, joinedDaysAgo: 900, city: "Abuja · NG",             preferredChannel: "phone",     notes: "No orders in 6 months. Worth a re-engagement email." },
]

export { toSlug as toCustomerSlug, CUSTOMERS }

const tierTone: Record<Tier, StatusTone> = {
  vip: "brand",
  regular: "info",
  new: "success",
  lapsed: "warning",
}

// Mock order history per customer. Real backend supplies via
// /api/customers/{slug}/orders.
type Order = { id: string; date: string; total: number; status: "paid" | "refunded" | "pending"; items: number; channel: "pos" | "online" | "phone" }
function mockOrdersFor(c: Customer): Order[] {
  if (c.orders === 0) return []
  // Generate up to 8 most-recent orders deterministically from slug.
  const seed = c.slug.length + c.orders
  const channels: Order["channel"][] = ["pos", "online", "phone"]
  const statuses: Order["status"][] = ["paid", "paid", "paid", "refunded", "pending"]
  return Array.from({ length: Math.min(8, c.orders) }, (_, i) => ({
    id: `INV-${(2400 - i * 7 - seed).toString().padStart(4, "0")}`,
    date: `${c.lastOrderDaysAgo + i * 4} days ago`,
    total: Math.round((c.lifetimeSpend / Math.max(c.orders, 1)) * (0.6 + ((i * 13) % 7) / 10)),
    status: statuses[(i + seed) % statuses.length],
    items: 1 + ((i * 3) % 5),
    channel: channels[(i + seed) % channels.length],
  }))
}

const orderStatusTone: Record<Order["status"], StatusTone> = {
  paid: "success",
  refunded: "warning",
  pending: "info",
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const customerTerm = useTerm("customer", "Customer")
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  // Bumped after a loyalty mutation so derived numbers refresh from kv.
  const [loyaltyTick, setLoyaltyTick] = React.useState(0)
  const [addCreditOpen, setAddCreditOpen] = React.useState(false)
  const [creditAmount, setCreditAmount] = React.useState("")

  const customer = CUSTOMERS.find((c) => c.slug === id)

  React.useEffect(() => {
    if (customer) document.title = `${customer.name} · Customer · Pallio`
  }, [customer])

  if (!customer) {
    return (
      <PageShell title="Customer not found">
        <EmptyState
          Icon={ShoppingBag}
          title="We couldn't find that customer."
          description="They may have been deleted or merged with another account."
          action={
            <Link to="/sales/customers">
              <Button variant="outline">Back to customers</Button>
            </Link>
          }
        />
      </PageShell>
    )
  }

  const orders = mockOrdersFor(customer)
  const aov = customer.orders > 0 ? customer.lifetimeSpend / customer.orders : 0
  const lastOrderLabel =
    customer.lastOrderDaysAgo === 0 ? "Today"
    : customer.lastOrderDaysAgo === 1 ? "Yesterday"
    : `${customer.lastOrderDaysAgo} days ago`

  // Loyalty + store credit + gift cards (F7). Re-read each render
  // (cheap kv read) so redeem / add-credit actions reflect instantly.
  const loyaltyId = loyaltyIdFor({ email: customer.email, phone: customer.phone })
  // loyaltyTick is read so the lint rule keeps it in the dep graph —
  // bumping it forces this block to recompute when we mutate kv.
  void loyaltyTick
  const loyaltyAccount = loyaltyId ? getLoyalty(loyaltyId) : undefined
  const rules = loadLoyaltyRules()
  const customerGiftCards: GiftCard[] = React.useMemo(() => {
    const email = customer.email?.toLowerCase()
    const phone = customer.phone
    return listGiftCards().filter((g) => {
      if (!g.customer) return false
      if (email && g.customer.email?.toLowerCase() === email) return true
      if (phone && g.customer.phone === phone) return true
      if (g.customer.name && g.customer.name === customer.name) return true
      return false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.email, customer.phone, customer.name, loyaltyTick])

  const onRedeemPoints = () => {
    if (!loyaltyId || !loyaltyAccount) {
      toast("Attach an email or phone to enrol this customer in loyalty.")
      return
    }
    if (loyaltyAccount.points < rules.minPointsToRedeem) {
      toast(`Needs at least ${rules.minPointsToRedeem} points to redeem.`)
      return
    }
    const { credit } = redeemPointsForCredit(loyaltyId, loyaltyAccount.points)
    if (credit > 0) {
      setLoyaltyTick((t) => t + 1)
      toast.success(`Redeemed ${loyaltyAccount.points} points for ${formatPrice(credit)} store credit.`)
    } else {
      toast.error("Couldn't redeem — check the loyalty rules.")
    }
  }

  const onAddManualCredit = () => {
    if (!loyaltyId) {
      toast("Customer needs an email or phone for store credit.")
      return
    }
    const amt = Number(creditAmount) || 0
    if (amt <= 0) {
      toast.error("Enter an amount greater than zero.")
      return
    }
    addStoreCredit(loyaltyId, customer.name, amt)
    setLoyaltyTick((t) => t + 1)
    setCreditAmount("")
    setAddCreditOpen(false)
    toast.success(`Added ${formatPrice(amt)} store credit for ${customer.name}.`)
  }

  const onCall = () => {
    if (!customer.phone) return toast("No phone number on file.")
    window.location.href = `tel:${customer.phone.replace(/\s+/g, "")}`
  }
  const onEmail = () => {
    if (!customer.email) return toast("No email address on file.")
    window.location.href = `mailto:${customer.email}`
  }
  const onWhatsApp = () => {
    if (!customer.phone) return toast("No phone number on file.")
    const num = customer.phone.replace(/[^\d]/g, "")
    window.open(`https://wa.me/${num}`, "_blank")
  }
  const onEdit = () => navigate(`/sales/customers/${customer.slug}/edit`)
  const onDelete = () => setConfirmDelete(true)
  const confirmDeleteCustomer = () => {
    setConfirmDelete(false)
    toast.success(`${customer.name} marked for deletion. Order history is kept.`)
    navigate("/sales/customers")
  }
  const onExport = () => {
    // Build a CSV of this customer's recent orders client-side so the
    // button always produces a real file (backend wiring later).
    const rows = orders
    const headers = ["invoice", "date", "items", "total", "channel", "status"]
    const escape = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`
    const csv = [
      headers.join(","),
      ...rows.map((o) =>
        [o.id, o.date, o.items, o.total, o.channel, o.status].map(escape).join(","),
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${customer.slug}-orders.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} order${rows.length === 1 ? "" : "s"} as CSV.`)
  }

  return (
    <PageShell
      title={customer.name}
      titleTooltip={`Joined ${customer.joinedDaysAgo} days ago · ${customer.city ?? "—"}`}
      mobileTrailing={
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Edit3 className="h-4 w-4" />
        </Button>
      }
    >
      <div className="flex flex-col gap-4 md:gap-5">
        {/* Back link (desktop only — mobile top bar already has back arrow) */}
        <div className="hidden md:block">
          <Link to="/sales/customers" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to customers
          </Link>
        </div>

        {/* Profile header */}
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <Avatar seed={customer.email || customer.name} name={customer.name} size={64} className="ring-2 ring-brand/20 dark:ring-primary/20" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{customer.name}</h1>
                    <StatusBadge tone={tierTone[customer.tier]} withDot>{customer.tier}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {customer.city} · Joined {customer.joinedDaysAgo} days ago
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {customer.email && (
                      <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 transition-colors hover:bg-accent">
                        <Mail className="h-3 w-3" /> {customer.email}
                      </a>
                    )}
                    {customer.phone && (
                      <a href={`tel:${customer.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 transition-colors hover:bg-accent">
                        <Phone className="h-3 w-3" /> {customer.phone}
                      </a>
                    )}
                    {customer.preferredChannel && (
                      <span className="text-muted-foreground">prefers {customer.preferredChannel}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {customer.phone && (
                  <>
                    <Button size="sm" variant="outline" onClick={onCall}><Phone className="h-3.5 w-3.5" /> Call</Button>
                    <Button size="sm" variant="outline" onClick={onWhatsApp}><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</Button>
                  </>
                )}
                {customer.email && <Button size="sm" variant="outline" onClick={onEmail}><Mail className="h-3.5 w-3.5" /> Email</Button>}
                <Button size="sm" onClick={onEdit}><Edit3 className="h-3.5 w-3.5" /> Edit</Button>
              </div>
            </div>

            {customer.notes && (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                <p className="font-semibold text-foreground/80">Notes</p>
                <p className="mt-1 text-muted-foreground">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi Icon={ShoppingBag} label="Total orders" value={customer.orders.toLocaleString()} tone="brand" />
          <Kpi Icon={TrendingUp} label="Lifetime spend" value={formatPrice(customer.lifetimeSpend)} tone="success" />
          <Kpi Icon={Package} label="Avg. order value" value={formatPrice(aov)} tone="info" />
          <Kpi Icon={Calendar} label="Last order" value={lastOrderLabel} tone={customer.lastOrderDaysAgo > 90 ? "warning" : "neutral"} />
        </div>

        {/* F7: Loyalty + store credit + gift cards. Always shown — even
            for a customer with no enrolment yet, the empty state nudges
            the operator to attach an email/phone. */}
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold md:text-base">Loyalty & value instruments</h2>
                <p className="text-[11px] text-muted-foreground">
                  Points, store credit, and gift cards issued to this {customerTerm.toLowerCase()}.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAddCreditOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add credit
              </Button>
            </div>

            {!loyaltyId ? (
              <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
                <p className="text-sm font-semibold">No loyalty profile yet.</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Add an email or phone in their contact details to start awarding points.
                </p>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <ValueTile
                  Icon={Sparkles}
                  label="Loyalty points"
                  value={String(loyaltyAccount?.points ?? 0)}
                  hint={
                    rules.earnEnabled
                      ? `${rules.pointsPerCurrencyUnit} pt per unit spent`
                      : "Earning is paused"
                  }
                />
                <ValueTile
                  Icon={Wallet}
                  label="Store credit"
                  value={formatPrice(loyaltyAccount?.storeCredit ?? 0)}
                  hint="Usable as tender at the till"
                />
                <ValueTile
                  Icon={Gift}
                  label="Active gift cards"
                  value={String(customerGiftCards.filter((g) => g.status === "active").length)}
                  hint={`${customerGiftCards.length} issued total`}
                />
              </div>
            )}

            {loyaltyAccount && loyaltyAccount.points > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                <span className="text-muted-foreground">
                  {loyaltyAccount.points >= rules.minPointsToRedeem
                    ? `${loyaltyAccount.points} points ≈ ${formatPrice(Math.round(loyaltyAccount.points * rules.redeemRate * 100) / 100)} store credit`
                    : `Needs ${rules.minPointsToRedeem - loyaltyAccount.points} more pts to redeem`}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loyaltyAccount.points < rules.minPointsToRedeem}
                  onClick={onRedeemPoints}
                >
                  Redeem points → store credit
                </Button>
              </div>
            )}

            {customerGiftCards.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Gift cards
                </p>
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                  {customerGiftCards.map((g) => (
                    <li key={g.code} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                        <Gift className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-semibold">
                          {maskCardCode(g.code)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Issued {formatPrice(g.originalAmount)} ·{" "}
                          {new Date(g.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums">{formatPrice(g.currentBalance)}</p>
                        <StatusBadge tone={giftStatusTone(g.status)} withDot>
                          {g.status}
                        </StatusBadge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order history */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
              <div>
                <h2 className="text-sm font-semibold md:text-base">Order history</h2>
                <p className="text-[11px] text-muted-foreground">{customer.orders} orders total · showing latest {orders.length}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={onExport}><Download className="h-3.5 w-3.5" /> Export</Button>
            </div>
            {orders.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  Icon={ShoppingBag}
                  title="No orders yet."
                  description="When this customer places an order, it'll show up here."
                />
              </div>
            ) : isMobile ? (
              <ul className="divide-y divide-border">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link to={`/sales/invoices/${o.id.toLowerCase()}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                        <ShoppingBag className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{o.id}</p>
                          <p className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(o.total)}</p>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-muted-foreground">{o.date} · {o.items} items · {o.channel}</p>
                          <StatusBadge tone={orderStatusTone[o.status]} withDot>{o.status}</StatusBadge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium md:px-5">Invoice</th>
                    <th className="px-3 py-2.5 font-medium">Date</th>
                    <th className="px-3 py-2.5 text-right font-medium">Items</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th className="px-3 py-2.5 font-medium">Channel</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-accent/30">
                      <td className="px-4 py-2.5 font-mono text-xs md:px-5">{o.id}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{o.date}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{o.items}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatPrice(o.total)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground capitalize">{o.channel}</td>
                      <td className="px-3 py-2.5"><StatusBadge tone={orderStatusTone[o.status]} withDot>{o.status}</StatusBadge></td>
                      <td className="px-3 py-2.5 text-right">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/sales/invoices/${o.id.toLowerCase()}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link to={`/sales/invoices/new?customer=${customer.slug}`} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
            <ShoppingBag className="h-4 w-4 text-brand dark:text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">New invoice</p>
              <p className="text-[11px] text-muted-foreground">Sell to this customer now.</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <Link to={`/communications/new?to=${customer.email}`} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
            <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Send a message</p>
              <p className="text-[11px] text-muted-foreground">Email, WhatsApp or SMS.</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <button onClick={onDelete} className="group flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 text-left transition-colors hover:border-rose-500/60">
            <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Delete customer</p>
              <p className="text-[11px] text-muted-foreground">Removes their record (order history kept).</p>
            </div>
          </button>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <DialogContent className="max-w-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold">Delete {customer.name}?</p>
              <p className="text-[11px] text-muted-foreground">
                Their profile is removed. Past orders + invoices stay for audit.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteCustomer}>Delete customer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* F7: manual store-credit add — admin / goodwill credit. */}
      <Dialog open={addCreditOpen} onOpenChange={(o) => !o && setAddCreditOpen(false)}>
        <DialogContent className="max-w-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Wallet className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold">Add manual credit</p>
              <p className="text-[11px] text-muted-foreground">
                Admin action — usually a goodwill gesture or refund-as-credit. Logged on the customer.
              </p>
            </div>
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Amount</span>
            <Input
              type="number"
              inputMode="decimal"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="0.00"
              min={0}
              step="0.01"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && onAddManualCredit()}
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAddCreditOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={onAddManualCredit} disabled={!(Number(creditAmount) > 0)}>
              Add credit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

// Hide all but the last 4 chars of a gift-card code in operator views.
function maskCardCode(code: string): string {
  const last4 = code.slice(-4)
  return `${"•".repeat(Math.max(0, code.length - 4))}${last4}`
}

function giftStatusTone(status: GiftCard["status"]): StatusTone {
  if (status === "active") return "success"
  if (status === "redeemed") return "warning"
  return "danger"
}

function ValueTile({
  Icon,
  label,
  value,
  hint,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1.5 text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}

function Kpi({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: "brand" | "success" | "info" | "warning" | "neutral"
}) {
  const TONE: Record<typeof tone, string> = {
    brand:   "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    info:    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    neutral: "bg-muted text-muted-foreground",
  }
  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE[tone]}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className="mt-2 text-lg font-bold tabular-nums md:text-xl">{value}</p>
      </CardContent>
    </Card>
  )
}
