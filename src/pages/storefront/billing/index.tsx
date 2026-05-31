import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  ExternalLink,
  Gauge,
  Globe,
  HardDrive,
  Pause,
  Receipt,
  Sparkles,
  Wallet,
  X,
  Zap,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { FormSection } from "@/components/forms/form-section"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { EmptyState } from "@/components/lists/empty-state"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { ConnectionChip } from "@/components/integrations/connection-chip"
import { useCurrency } from "@/contexts/currency"
import { getStorefrontState, TEMPLATES_BY_ID } from "@/lib/storefront/data"
import { cn } from "@/lib/utils"

// Template billing — subscription, payment method, invoice history,
// usage quotas, plan switcher, cancel/pause. Distinct from
// /settings/payments (which is the OWNER's payout accounts).

type InvoiceStatus = "paid" | "pending" | "failed" | "refunded"

type Invoice = {
  id: string
  date: string
  description: string
  amount: number
  status: InvoiceStatus
}

const INVOICES: Invoice[] = [
  { id: "INV-2026-05", date: "2026-05-01", description: "Premium plan · May 2026",          amount: 2_000, status: "paid" },
  { id: "INV-2026-04", date: "2026-04-01", description: "Premium plan · April 2026",        amount: 2_000, status: "paid" },
  { id: "INV-2026-03", date: "2026-03-01", description: "Premium plan · March 2026",        amount: 2_000, status: "paid" },
  { id: "INV-2026-02", date: "2026-02-01", description: "Premium plan · February 2026",     amount: 2_000, status: "paid" },
  { id: "INV-2026-01", date: "2026-01-01", description: "Premium plan · January 2026",      amount: 2_000, status: "paid" },
  { id: "INV-2025-12", date: "2025-12-01", description: "Pro plan · December 2025",         amount: 1_000, status: "paid" },
  { id: "INV-2025-11", date: "2025-11-01", description: "Pro plan · November 2025",         amount: 1_000, status: "paid" },
  { id: "INV-2025-10", date: "2025-10-01", description: "Pro plan · October 2025",          amount: 1_000, status: "paid" },
  { id: "INV-2025-09", date: "2025-09-01", description: "Custom domain · annual fee",       amount:  4_500, status: "paid" },
  { id: "INV-2025-08", date: "2025-08-01", description: "Pro plan · September 2025",        amount: 1_000, status: "paid" },
  { id: "INV-2025-07", date: "2025-07-01", description: "Pro plan · August 2025",           amount: 1_000, status: "paid" },
  { id: "INV-2025-06", date: "2025-06-01", description: "Activation · Lekki Luxe template", amount:     0, status: "paid" },
]

const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  paid:     "success",
  pending:  "warning",
  failed:   "danger",
  refunded: "neutral",
}

type Tier = "free" | "pro" | "premium"

const TIER_PRICE: Record<Tier, number> = {
  free:    0,
  pro:     1_000,
  premium: 2_000,
}

const TIER_FEATURES: Record<Tier, { headline: string; features: string[]; cta: string }> = {
  free: {
    headline: "Get a storefront live",
    features: [
      "10 hand-tuned free templates",
      "Hosted at *.pallio.shop",
      "Unlimited products + orders",
      "Paystack / Flutterwave checkout",
      "Pallio-branded footer + cookie banner",
      "Email support · 24h reply",
    ],
    cta: "Downgrade",
  },
  pro: {
    headline: "Most popular for growing brands",
    features: [
      "9 Pro templates (Atelier, Tech Stack, Brew & Co…)",
      "Custom domain with auto-SSL",
      "Remove Pallio branding",
      "Abandoned-cart automation",
      "Discount-code engine",
      "Email + WhatsApp support · 8h reply",
    ],
    cta: "Choose Pro",
  },
  premium: {
    headline: "For premium + multi-channel sellers",
    features: [
      "6 Premium templates (Lekki Luxe, Garage Pro, Sole Society…)",
      "Custom domain + multi-domain (3)",
      "Unlimited automated campaigns",
      "Priority WhatsApp + phone support · 1h reply",
      "Dedicated launch consultant",
      "Pallio Pixel for paid-ad attribution",
    ],
    cta: "Choose Premium",
  },
}

export default function StorefrontBilling() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()

  const state = React.useMemo(() => getStorefrontState(), [])
  const template = state.templateId ? TEMPLATES_BY_ID[state.templateId] : null
  const currentTier: Tier = template?.tier ?? "free"
  const monthly = TIER_PRICE[currentTier]
  const nextBilling = new Date()
  nextBilling.setMonth(nextBilling.getMonth() + 1)
  nextBilling.setDate(1)
  const nextBillingLabel = nextBilling.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })

  const totalPaid = INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0)

  const downloadBlob = (filename: string, body: string, mime: string) => {
    try {
      const blob = new Blob([body], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      return true
    } catch {
      return false
    }
  }

  const downloadInvoice = (inv: Invoice) => {
    const lines = [
      `Pallio · Invoice ${inv.id}`,
      `Date: ${inv.date}`,
      `Description: ${inv.description}`,
      `Amount: ${formatPrice(inv.amount)}`,
      `Status: ${inv.status}`,
    ].join("\n")
    const ok = downloadBlob(`${inv.id}.txt`, lines, "text/plain;charset=utf-8")
    if (ok) toast.success(`Downloaded ${inv.id}.txt`)
    else toast.error("Couldn't start the download.")
  }

  const exportAllInvoices = () => {
    const header = "Invoice,Date,Description,Amount,Status"
    const rows = INVOICES.map((i) => `${i.id},${i.date},"${i.description.replace(/"/g, '""')}",${i.amount},${i.status}`)
    const csv = [header, ...rows].join("\n")
    const ok = downloadBlob(`pallio-invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8")
    if (ok) toast.success(`Exported ${INVOICES.length} invoices · check your downloads.`)
    else toast.error("Couldn't start the export.")
  }

  if (!template) {
    return (
      <PageShell
        title="Billing"
        withToolbar={false}
        titleTooltip="Template subscription + payment history. Available once you pick a template."
      >
        <Card>
          <CardContent className="p-0">
            <EmptyState
              Icon={Globe}
              title="No storefront yet"
              description="Pick a template before there's anything to bill for."
              action={<Link to="/storefront/templates"><Button>Pick a template</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Storefront billing"
      withToolbar={false}
      titleTooltip={
        <>
          What you're paying for your hosted storefront — the
          template subscription, custom domain fees, and one-time
          add-ons. Every invoice is downloadable as PDF. Separate
          from <strong>Settings → Payments</strong> which covers
          where customer money lands.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Current plan hero */}
        <section
          className="relative overflow-hidden rounded-2xl border border-border p-5"
          style={{ background: `linear-gradient(135deg, ${template.colors.primary}15, ${template.colors.accent}10 60%, transparent)` }}
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: `${template.colors.primary}40` }} aria-hidden />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: template.colors.primary }}>
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Current plan</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight md:text-2xl">{template.name} · {currentTier === "free" ? "Free" : currentTier === "pro" ? "Pro" : "Premium"}</h2>
                  <StatusBadge tone="success" withDot>active</StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground md:text-sm">
                  {currentTier === "free" ? "No charge — you're on the free tier." : <>
                    <strong className="font-bold tabular-nums text-foreground">{formatPrice(monthly)}/month</strong> · next charge on {nextBillingLabel}
                  </>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {currentTier !== "premium" && (
                <Button size="sm" disabled title="Plan upgrades go live once billing is connected to Paystack.">
                  <Zap className="h-3.5 w-3.5" /> Upgrade
                </Button>
              )}
              <Button size="sm" variant="outline" disabled title="Pausing a subscription needs the billing backend — coming soon.">
                <Pause className="h-3.5 w-3.5" /> Pause
              </Button>
            </div>
          </div>
        </section>

        <SummaryStrip
          tiles={[
            { label: "Monthly cost", value: formatPrice(monthly),         tone: "brand",   hint: currentTier === "free" ? "you pay nothing" : `next ${nextBillingLabel.split(",")[0]}` },
            { label: "Paid to date", value: formatPrice(totalPaid),        tone: "success", hint: "12 months" },
            { label: "Invoices",     value: String(INVOICES.length),       tone: "info",    hint: "all paid" },
            { label: "Custom domain",value: state.customDomain ? "Yes" : "—", tone: state.customDomain ? "warning" : "neutral", hint: state.customDomain ?? "Pallio subdomain" },
          ]}
        />

        {/* Payment method + Usage two-up */}
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* Payment method */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold md:text-base">Payment method</h3>
                <div className="flex items-center gap-2">
                  <ConnectionChip providerId="paystack" />
                  <Button size="sm" variant="ghost" disabled title="Card management opens once we connect to your payment provider's hosted update flow.">
                    Update card →
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm">
                  <span className="text-[11px] font-black uppercase tracking-widest">Visa</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Visa · ending 4242</p>
                  <p className="text-[11px] text-muted-foreground">Expires 12/27 · charged on the 1st of each month</p>
                </div>
                <StatusBadge tone="success" withDot>primary</StatusBadge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                {[
                  { label: "Provider",    value: "Paystack" },
                  { label: "Currency",    value: "NGN" },
                  { label: "VAT receipts",value: "On" },
                  { label: "Auto-renew",  value: "On" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-border bg-background px-2.5 py-1.5">
                    <p className="font-semibold uppercase tracking-widest text-muted-foreground">{m.label}</p>
                    <p className="mt-0.5 font-bold">{m.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage / quotas */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold md:text-base">Usage this month</h3>
              <p className="text-[11px] text-muted-foreground">All plans include unlimited orders. These are storage + bandwidth meters.</p>
              <ul className="mt-3 space-y-3">
                {[
                  { Icon: Receipt,   label: "Orders",          used: 248,  cap: 0,     unit: "" },
                  { Icon: HardDrive, label: "Storage",         used: 1.2,  cap: 10,    unit: "GB" },
                  { Icon: Gauge,     label: "Bandwidth",       used: 84,   cap: 250,   unit: "GB" },
                  { Icon: Award,     label: "Email sends",     used: 1_240,cap: 5_000, unit: "" },
                ].map((u) => {
                  const pct = u.cap === 0 ? 100 : Math.min(100, (u.used / u.cap) * 100)
                  return (
                    <li key={u.label}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5"><u.Icon className="h-3 w-3 text-muted-foreground" /> {u.label}</span>
                        <span className="tabular-nums">
                          <strong className="font-bold">{u.used.toLocaleString()}</strong>
                          {u.cap === 0 ? " · unlimited" : ` of ${u.cap.toLocaleString()}`}
                          {u.unit && ` ${u.unit}`}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", pct > 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Invoice history */}
        <FormSection title="Invoice history" description="12 months · downloadable as CSV for your accountant." Icon={Receipt} trailing={
          <Button size="sm" variant="outline" onClick={exportAllInvoices}>
            <Download className="h-3.5 w-3.5" /> Export all
          </Button>
        }>
          {isMobile ? (
            <ul className="flex flex-col gap-2">
              {INVOICES.map((inv) => (
                <li key={inv.id}>
                  <button
                    type="button"
                    onClick={() => downloadInvoice(inv)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-brand/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold">{inv.id}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{inv.description}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(inv.date).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{formatPrice(inv.amount)}</p>
                      <StatusBadge tone={STATUS_TONE[inv.status]}>{inv.status}</StatusBadge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Invoice</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {INVOICES.map((inv) => (
                    <tr key={inv.id} className="transition-colors hover:bg-accent/30">
                      <td className="px-3 py-2.5 font-mono text-xs font-bold">{inv.id}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {new Date(inv.date).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{inv.description}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">{formatPrice(inv.amount)}</td>
                      <td className="px-3 py-2.5"><StatusBadge tone={STATUS_TONE[inv.status]}>{inv.status}</StatusBadge></td>
                      <td className="px-3 py-2.5 text-right">
                        <Button size="sm" variant="ghost" onClick={() => downloadInvoice(inv)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FormSection>

        {/* Plan switcher */}
        <FormSection title="Switch plans" description="Change at any time — Pallio prorates the next invoice." Icon={Zap}>
          <div className="grid gap-3 lg:grid-cols-3">
            {(["free", "pro", "premium"] as const).map((tier) => {
              const isCurrent = tier === currentTier
              const isDowngrade = (currentTier === "premium" && tier !== "premium") || (currentTier === "pro" && tier === "free")
              const features = TIER_FEATURES[tier]
              return (
                <div
                  key={tier}
                  className={cn(
                    "relative flex flex-col overflow-hidden rounded-2xl border p-5 transition-colors",
                    isCurrent ? "border-brand bg-brand-soft/30 ring-2 ring-brand/30 dark:border-primary dark:bg-primary/10 dark:ring-primary/30" : "border-border bg-card",
                  )}
                >
                  {tier === "pro" && !isCurrent && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">
                      <Sparkles className="h-2.5 w-2.5" /> Most popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      <Check className="h-2.5 w-2.5" /> Current
                    </span>
                  )}
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">{tier}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{features.headline}</p>
                  <p className="mt-3 text-3xl font-bold tabular-nums">
                    {TIER_PRICE[tier] === 0 ? "Free" : <>{formatPrice(TIER_PRICE[tier])}<span className="text-sm font-normal text-muted-foreground"> / month</span></>}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm">
                    {features.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    variant={isCurrent ? "outline" : "default"}
                    className={cn("mt-5 w-full", isCurrent && "cursor-default")}
                    disabled
                    title={isCurrent ? "This is your current plan." : "Plan changes go live once billing is connected to Paystack."}
                  >
                    {isCurrent ? "Current plan" : isDowngrade ? "Downgrade" : features.cta}
                  </Button>
                </div>
              )
            })}
          </div>
        </FormSection>

        {/* Add-ons */}
        <FormSection title="Add-ons" description="Optional extras billed alongside your monthly plan." Icon={Wallet}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { Icon: Globe,         name: "Extra custom domain", sub: "Connect a second / third domain (e.g. .com + .ng).",     price: "₦500/month", active: false },
              { Icon: ArrowUpRight,  name: "Multi-region CDN",    sub: "Faster load times for buyers in EU + US.",                price: "₦800/month", active: false },
              { Icon: Receipt,       name: "Advanced invoicing",  sub: "Branded VAT-compliant invoices, recurring billing.",      price: "₦600/month", active: true  },
              { Icon: Award,         name: "Pallio Pixel Pro",    sub: "Server-side ad-attribution for Meta + Google ads.",      price: "₦1,200/month", active: false },
            ].map((a) => (
              <li key={a.name}>
                <div className={cn("flex items-center gap-3 rounded-xl border p-3", a.active ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-background")}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <a.Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{a.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{a.sub}</p>
                    <p className="mt-0.5 text-xs font-bold tabular-nums">{a.price}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={a.active ? "outline" : "default"}
                    disabled
                    title={a.active ? "Add-on cancellation needs the billing backend — coming soon." : "Add-on purchases go live once billing is connected to Paystack."}
                  >
                    {a.active ? "Cancel" : "Add"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </FormSection>

        {/* Promo code */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-600 dark:text-fuchsia-300" />
                <div>
                  <p className="text-sm font-semibold">Have a promo code?</p>
                  <p className="text-[11px] text-muted-foreground">Apply once and it discounts every renewal until expiry.</p>
                </div>
              </div>
              <div className="flex w-full max-w-sm gap-2 sm:w-auto">
                <Input placeholder="LAUNCH50" className="font-mono" disabled />
                <Button size="sm" disabled title="Promo code validation happens server-side — coming once billing is wired up.">
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone — cancel subscription */}
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">Cancel subscription</h3>
                <p className="text-[11px] text-muted-foreground">
                  Your storefront stays live until <strong className="text-foreground">{nextBillingLabel}</strong>, then downgrades to Free. Existing orders + customer accounts are preserved.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-500/40 text-rose-600 dark:text-rose-400"
              disabled
              title="Subscription cancellation needs the billing backend — coming soon."
            >
              <X className="h-3.5 w-3.5" /> Cancel subscription
            </Button>
          </div>
        </section>

        {/* Cross-links */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { Icon: CreditCard, label: "Settings → Payments", body: "Where customer money lands (your payout accounts).", href: "/settings/payments" },
            { Icon: Globe,      label: "Domain + DNS",         body: "Manage subdomain + custom domain settings.",         href: "/storefront/domain" },
            { Icon: ExternalLink,label: "Pallio billing docs", body: "Refund policy, VAT, invoicing law.",                  href: "/faq" },
          ].map((q) => (
            <Link key={q.label} to={q.href} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
              <q.Icon className="h-4 w-4 text-brand dark:text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{q.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{q.body}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  )
}

void Calendar; void CheckCircle2; void ArrowRight
