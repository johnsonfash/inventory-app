import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Mail,
  MessageSquare,
  Package,
  Phone,
  ShoppingCart,
  Trash2,
  TrendingDown,
  Truck,
  Wallet,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { Avatar } from "@/components/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { useCurrency } from "@/contexts/currency"
import { toast } from "sonner"

// Single-vendor detail. Reachable from /purchasing/vendors via slug.
// Mirrors the customer detail layout — contact header, KPI ribbon,
// recent activity (POs + bills), notes. Mock data; backend swaps the
// useVendor(slug) source when ready.

type Tier = "preferred" | "active" | "watch" | "new"

type Vendor = {
  slug: string
  name: string
  email: string
  phone?: string
  category: string
  city?: string
  paymentTerms: string
  leadTimeDays: number
  ytdSpend: number
  openPOs: number
  onTimeRate: number
  lastPOAt: string
  joinedDaysAgo: number
  tier: Tier
  notes?: string
}

// Same roster as the list page. Once a backend lands this lives in
// a shared lib/vendors module that both pages import.
const VENDORS: Vendor[] = [
  { slug: "cobalt",    name: "Cobalt Electronics",     email: "sales@cobalt.com",       phone: "+1 555 0100",        category: "Electronics",  city: "Shenzhen · CN", paymentTerms: "Net 30", leadTimeDays: 21, ytdSpend: 1840000, openPOs: 3, onTimeRate: 0.78, lastPOAt: "3 days ago",  joinedDaysAgo: 540, tier: "active",    notes: "Reliable on phone, sometimes flaky on PO confirmations via email. Use WhatsApp for time-sensitive orders." },
  { slug: "delta",     name: "Delta Apparel",           email: "orders@delta.com",       phone: "+234 803 555 0119",  category: "Fashion",      city: "Aba · NG",      paymentTerms: "Net 14", leadTimeDays: 7,  ytdSpend: 920000,  openPOs: 1, onTimeRate: 0.94, lastPOAt: "yesterday",   joinedDaysAgo: 412, tier: "preferred", notes: "Our go-to for fast turnaround on streetwear. 2x annual volume discount kicks in at ₦1.2M." },
  { slug: "porcel",    name: "Porcel Homewares",        email: "wholesale@porcel.co",    phone: "+234 813 555 0204",  category: "Home goods",   city: "Lagos · NG",    paymentTerms: "Prepay", leadTimeDays: 4,  ytdSpend: 410000,  openPOs: 0, onTimeRate: 0.97, lastPOAt: "12 days ago", joinedDaysAgo: 220, tier: "preferred" },
  { slug: "glowco",    name: "Glow Co Beauty",          email: "trade@glowco.com",       phone: "+234 802 555 0173",  category: "Beauty",       city: "Lagos · NG",    paymentTerms: "Net 30", leadTimeDays: 14, ytdSpend: 680000,  openPOs: 2, onTimeRate: 0.82, lastPOAt: "5 days ago",  joinedDaysAgo: 310, tier: "active" },
  { slug: "acme",      name: "Acme Peripherals",        email: "b2b@acme.io",            phone: "+1 415 555 0144",    category: "Electronics",  city: "San Jose · US", paymentTerms: "Net 60", leadTimeDays: 28, ytdSpend: 215000,  openPOs: 0, onTimeRate: 0.66, lastPOAt: "47 days ago", joinedDaysAgo: 180, tier: "watch",     notes: "On watch — 3 of last 5 POs late. Consider increasing buffer stock or switching." },
  { slug: "hausa",     name: "Hausa Spice Co.",         email: "orders@hausaspice.ng",   phone: "+234 706 555 0227",  category: "Food & spice", city: "Kano · NG",     paymentTerms: "Net 7",  leadTimeDays: 3,  ytdSpend: 156000,  openPOs: 1, onTimeRate: 0.99, lastPOAt: "2 days ago",  joinedDaysAgo: 95,  tier: "preferred" },
  { slug: "lagosmart", name: "LagosMart Distributors",  email: "b2b@lagosmart.ng",       phone: "+234 901 555 0312",  category: "Convenience",  city: "Lagos · NG",    paymentTerms: "Net 14", leadTimeDays: 5,  ytdSpend: 290000,  openPOs: 4, onTimeRate: 0.88, lastPOAt: "today",       joinedDaysAgo: 140, tier: "active" },
  { slug: "studio",    name: "Studio Print Shop",       email: "print@studio.lagos",     phone: "+234 904 555 0411",  category: "Packaging",    city: "Lagos · NG",    paymentTerms: "Prepay", leadTimeDays: 6,  ytdSpend: 48000,   openPOs: 0, onTimeRate: 0.91, lastPOAt: "2 weeks ago", joinedDaysAgo: 22,  tier: "new" },
]

const tierTone: Record<Tier, StatusTone> = {
  preferred: "success",
  active:    "info",
  watch:     "warning",
  new:       "brand",
}

// Mock PO history per vendor. Backend will replace.
type PO = { id: string; date: string; total: number; status: "open" | "received" | "partial" | "cancelled"; items: number; eta: string }
function mockPOsFor(v: Vendor): PO[] {
  const baseCount = Math.max(3, Math.min(8, Math.round(v.ytdSpend / 100000)))
  const statuses: PO["status"][] = v.openPOs > 0
    ? ["open", "received", "received", "partial", "received", "received", "received", "received"]
    : ["received", "received", "received", "partial", "received", "received", "cancelled", "received"]
  return Array.from({ length: baseCount }, (_, i) => ({
    id: `PO-${(1800 - i * 11 - v.slug.length * 3).toString().padStart(4, "0")}`,
    date: i === 0 ? v.lastPOAt : `${5 + i * 9} days ago`,
    total: Math.round((v.ytdSpend / baseCount) * (0.7 + ((i * 7) % 5) / 10)),
    status: statuses[i % statuses.length],
    items: 3 + ((i * 5) % 11),
    eta: i === 0 && v.openPOs > 0 ? `in ${Math.max(1, v.leadTimeDays - 3)} days` : "delivered",
  }))
}

const poStatusTone: Record<PO["status"], StatusTone> = {
  open:      "info",
  received:  "success",
  partial:   "warning",
  cancelled: "neutral",
}

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const vendor = VENDORS.find((v) => v.slug === id)

  React.useEffect(() => {
    if (vendor) document.title = `${vendor.name} · Vendor · Pallio`
  }, [vendor])

  if (!vendor) {
    return (
      <PageShell title="Vendor not found">
        <EmptyState
          Icon={Building2}
          title="We couldn't find that vendor."
          description="They may have been deleted or merged with another supplier."
          action={
            <Link to="/purchasing/vendors">
              <Button variant="outline">Back to vendors</Button>
            </Link>
          }
        />
      </PageShell>
    )
  }

  const pos = mockPOsFor(vendor)
  const isLate = vendor.onTimeRate < 0.8

  const onCall = () => {
    if (!vendor.phone) return toast("No phone number on file.")
    window.location.href = `tel:${vendor.phone.replace(/\s+/g, "")}`
  }
  const onEmail = () => { window.location.href = `mailto:${vendor.email}` }
  const onWhatsApp = () => {
    if (!vendor.phone) return toast("No phone number on file.")
    const num = vendor.phone.replace(/[^\d]/g, "")
    window.open(`https://wa.me/${num}`, "_blank")
  }
  const onEdit = () => navigate(`/purchasing/vendors/${vendor.slug}/edit`)
  const onDelete = () => setConfirmDelete(true)
  const confirmDeleteVendor = async () => {
    setDeleting(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      toast.success(`${vendor.name} deleted`, { description: "Purchase order history is preserved." })
      setConfirmDelete(false)
      navigate("/purchasing/vendors")
    } catch {
      toast.error("Couldn't delete vendor. Try again.")
    } finally {
      setDeleting(false)
    }
  }
  const onExport = () => {
    // Build a CSV of the PO history right in the browser so the
    // download is real even before the backend exports endpoint lands.
    const header = ["PO", "Date", "Items", "Total", "Status", "ETA"]
    const lines = pos.map((p) => [p.id, p.date, p.items, p.total, p.status, p.eta])
    const csv = [header, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${vendor.slug}-po-history.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("CSV downloaded", { description: `${pos.length} purchase orders exported.` })
  }
  const onNewPO = () => navigate(`/purchasing/pos/new?vendor=${vendor.slug}`)

  return (
    <PageShell
      title={vendor.name}
      titleTooltip={`Joined ${vendor.joinedDaysAgo} days ago · ${vendor.city ?? "—"}`}
      mobileTrailing={
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Edit3 className="h-4 w-4" />
        </Button>
      }
    >
      <div className="flex flex-col gap-4 md:gap-5">
        <div className="hidden md:block">
          <Link to="/purchasing/vendors" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to vendors
          </Link>
        </div>

        {/* Profile header */}
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <Avatar seed={vendor.email} name={vendor.name} size={64} className="ring-2 ring-brand/20 dark:ring-primary/20" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{vendor.name}</h1>
                    <StatusBadge tone={tierTone[vendor.tier]} withDot>{vendor.tier}</StatusBadge>
                    {isLate && <StatusBadge tone="warning">Late on deliveries</StatusBadge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {vendor.category} · {vendor.city} · Joined {vendor.joinedDaysAgo} days ago
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <a href={`mailto:${vendor.email}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 transition-colors hover:bg-accent">
                      <Mail className="h-3 w-3" /> {vendor.email}
                    </a>
                    {vendor.phone && (
                      <a href={`tel:${vendor.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-1 transition-colors hover:bg-accent">
                        <Phone className="h-3 w-3" /> {vendor.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {vendor.phone && (
                  <>
                    <Button size="sm" variant="outline" onClick={onCall}><Phone className="h-3.5 w-3.5" /> Call</Button>
                    <Button size="sm" variant="outline" onClick={onWhatsApp}><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={onEmail}><Mail className="h-3.5 w-3.5" /> Email</Button>
                <Button size="sm" onClick={onEdit}><Edit3 className="h-3.5 w-3.5" /> Edit</Button>
              </div>
            </div>

            {vendor.notes && (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                <p className="font-semibold text-foreground/80">Notes</p>
                <p className="mt-1 text-muted-foreground">{vendor.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Late-vendor alert */}
        {isLate && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 dark:bg-amber-950/15">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <TrendingDown className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{vendor.name} is below 80% on-time delivery</p>
              <p className="text-xs text-muted-foreground">Current on-time rate: {Math.round(vendor.onTimeRate * 100)}%. Consider raising buffer stock on items sourced from this vendor, or evaluating an alternative.</p>
            </div>
          </div>
        )}

        {/* KPI ribbon */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi Icon={Wallet} label="YTD spend" value={formatPrice(vendor.ytdSpend)} tone="success" />
          <Kpi Icon={Package} label="Open POs" value={vendor.openPOs.toString()} tone={vendor.openPOs > 0 ? "info" : "neutral"} hint={vendor.openPOs > 0 ? "Awaiting receipt" : "Nothing in flight"} />
          <Kpi Icon={Clock} label="Avg. lead time" value={`${vendor.leadTimeDays} days`} tone={vendor.leadTimeDays > 21 ? "warning" : "neutral"} hint={vendor.paymentTerms} />
          <Kpi Icon={Truck} label="On-time" value={`${Math.round(vendor.onTimeRate * 100)}%`} tone={isLate ? "warning" : "success"} hint={`Last PO ${vendor.lastPOAt}`} />
        </div>

        {/* PO history */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
              <div>
                <h2 className="text-sm font-semibold md:text-base">Purchase order history</h2>
                <p className="text-[11px] text-muted-foreground">Latest {pos.length} POs · {vendor.openPOs} currently open</p>
              </div>
              <Button size="sm" variant="ghost" onClick={onExport}><Download className="h-3.5 w-3.5" /> Export</Button>
            </div>
            {pos.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  Icon={Package}
                  title="No POs yet."
                  description="When you order from this vendor, the POs will show up here."
                />
              </div>
            ) : isMobile ? (
              <ul className="divide-y divide-border">
                {pos.map((p) => (
                  <li key={p.id}>
                    <Link to={`/purchasing/pos/${p.id.toLowerCase()}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                        <Package className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{p.id}</p>
                          <p className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(p.total)}</p>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-muted-foreground">{p.date} · {p.items} items · {p.eta}</p>
                          <StatusBadge tone={poStatusTone[p.status]} withDot>{p.status}</StatusBadge>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium md:px-5">PO</th>
                    <th className="px-3 py-2.5 font-medium">Date</th>
                    <th className="px-3 py-2.5 text-right font-medium">Items</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th className="px-3 py-2.5 font-medium">ETA / received</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pos.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-accent/30">
                      <td className="px-4 py-2.5 font-mono text-xs md:px-5">{p.id}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.date}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{p.items}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatPrice(p.total)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.eta}</td>
                      <td className="px-3 py-2.5"><StatusBadge tone={poStatusTone[p.status]} withDot>{p.status}</StatusBadge></td>
                      <td className="px-3 py-2.5 text-right">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/purchasing/pos/${p.id.toLowerCase()}`}>
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
          <button onClick={onNewPO} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-brand/40 hover:bg-accent/40">
            <ShoppingCart className="h-4 w-4 text-brand dark:text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">New purchase order</p>
              <p className="text-[11px] text-muted-foreground">Order stock from this vendor.</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <Link to={`/purchasing/bills?vendor=${vendor.slug}`} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
            <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">View bills</p>
              <p className="text-[11px] text-muted-foreground">Outstanding + paid invoices from this vendor.</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <button onClick={onDelete} className="group flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 text-left transition-colors hover:border-rose-500/60">
            <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Delete vendor</p>
              <p className="text-[11px] text-muted-foreground">Removes their record (PO history kept).</p>
            </div>
          </button>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={(v) => !deleting && setConfirmDelete(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {vendor.name}?</DialogTitle>
            <DialogDescription>
              Their contact record will be removed. Past purchase orders, bills, and credits stay on the books for auditing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteVendor} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function Kpi({
  Icon,
  label,
  value,
  tone,
  hint,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: "brand" | "success" | "info" | "warning" | "neutral"
  hint?: string
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
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
