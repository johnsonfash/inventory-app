import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, Check, Gift, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoTooltip } from "@/components/info-tooltip"

type Tier = {
  id: string
  name: string
  blurb: string
  /** Monthly price in Naira. */
  monthly: number
  /** Annual price in Naira (savings vs 12 × monthly). */
  yearly: number
  cta: string
  highlight?: boolean
  features: string[]
}

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    blurb: "For a single store or stall ready to leave the spreadsheet behind.",
    monthly: 2_000,
    yearly: 20_000,  // 12-mo price ≈ 2 free months
    cta: "Start 30 days free",
    features: [
      "Up to 3 locations · 5 team members",
      "Unlimited products & sales",
      "Full POS, keeps selling offline",
      "Inventory, bundles & recipes/production",
      "Sales, invoicing & purchasing",
      "Double-entry books, VAT & receipts",
      "Online storefront",
      "100 AI credits / month",
      "Email & chat support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    blurb: "For multi-location businesses with a sales team and ad spend.",
    monthly: 5_000,
    yearly: 50_000,
    cta: "Start 30 days free",
    highlight: true,
    features: [
      "Everything in Starter, plus:",
      "Up to 10 locations · 25 team members",
      "AI insights + 7-day forecast",
      "Smart restock & automatic purchase orders",
      "Ads: Facebook, Instagram, YouTube + Marketplace",
      "AI ad copy & video generation (1,000 credits / mo)",
      "Custom roles & custom storefront domain",
      "Payroll, commissions & bank reconciliation",
      "Priority support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    blurb: "For chains and operators with affiliates and a real ad team.",
    monthly: 10_000,
    yearly: 100_000,
    cta: "Start 30 days free",
    features: [
      "Everything in Growth, plus:",
      "Unlimited locations & team members",
      "Affiliate program + payouts",
      "Advanced AI: anomaly detection & cash-flow forecast",
      "5,000 AI credits / month",
      "Single sign-on (SSO) & 1-year audit log",
      "White-label invoices & receipts",
      "Multi-currency",
      "Phone + WhatsApp support, SLA-backed uptime",
    ],
  },
]

type CmpValue = string | boolean
type CmpRow = { feature: string; values: [CmpValue, CmpValue, CmpValue]; tip?: string }

// Grouped so the table reads like the actual app — selling, inventory/
// production, books, marketing, AI, team/security, platform. Core ops
// are in every plan (we never gate whole modules); advanced tools and
// higher limits scale with the tier.
const COMPARISON: { group: string; rows: CmpRow[] }[] = [
  {
    group: "Plan limits",
    rows: [
      { feature: "Locations",                 values: ["3", "10", "Unlimited"] },
      { feature: "Team members",              values: ["5", "25", "Unlimited"] },
      { feature: "Products & sales",          values: ["Unlimited", "Unlimited", "Unlimited"] },
      { feature: "AI credits / month",        values: ["100", "1,000", "5,000"], tip: "Credits power the AI assistant, AI ad copy and ad-video generation, and bulk descriptions. Top up any time; see Add-ons & credits below." },
    ],
  },
  {
    group: "Selling & POS",
    rows: [
      { feature: "Point of sale, works offline",        values: [true, true, true] },
      { feature: "Tables, tabs & kitchen prep queue",   values: [true, true, true], tip: "Hospitality mode: seat tables, run tabs, and send orders to a prep/kitchen queue. Ignore it if you don't need it; nothing is hidden." },
      { feature: "Returns, drafts & multiple cashiers", values: [true, true, true] },
      { feature: "Appointments & bookings",             values: [true, true, true] },
      { feature: "Online storefront",                   values: [true, true, true] },
      { feature: "Custom storefront domain",            values: [false, true, true] },
    ],
  },
  {
    group: "Inventory & production",
    rows: [
      { feature: "Multi-location stock, transfers & adjustments", values: [true, true, true] },
      { feature: "Bundles, kits & composite items",               values: [true, true, true] },
      { feature: "Recipes / BOM, production & batch tracking",    values: [true, true, true], tip: "Make-to-stock for bakeries, kitchens, cosmetics labs, workshops and manufacturers: components, yield, sub-recipes, and lot/expiry tracking." },
      { feature: "Expiry (FEFO) & recall trace",                  values: [true, true, true] },
    ],
  },
  {
    group: "Money & books",
    rows: [
      { feature: "Sales, invoicing & purchasing",                values: [true, true, true] },
      { feature: "Double-entry accounting, VAT & tax",           values: [true, true, true], tip: "A real general ledger: every sale, return and bill posts automatically. P&L, balance sheet and cash flow are derived, not typed in." },
      { feature: "Payroll & staff commissions",                  values: [false, true, true] },
      { feature: "Bank reconciliation & period lock",            values: [false, true, true] },
      { feature: "Accountant export (QuickBooks, Xero, GL CSV)", values: [false, true, true] },
    ],
  },
  {
    group: "Marketing & growth",
    rows: [
      { feature: "Discounts & customer segments",                values: [true, true, true] },
      { feature: "Ads: Facebook, Instagram, YouTube + Marketplace", values: [false, true, true] },
      { feature: "AI ad copy & video generation",                values: [false, true, true], tip: "Generate captions, ad scripts and short marketing videos from your own catalogue. Runs on AI credits; top up any time." },
      { feature: "Affiliate program & payouts",                  values: [false, false, true], tip: "Unique referral links, automatic sales attribution, and one-click commission payouts." },
    ],
  },
  {
    group: "AI & insights",
    rows: [
      { feature: "AI insights & 7-day forecast",         values: [false, true, true], tip: "Restock nudges, late-supplier flags, margin drift and ad-return spikes, surfaced as cards with one-tap actions." },
      { feature: "AI assistant (chat over your data)",   values: ["Limited", true, true] },
      { feature: "Anomaly detection & cash-flow forecast", values: [false, false, true] },
    ],
  },
  {
    group: "Team, security & support",
    rows: [
      { feature: "Role-based access",                      values: ["Basic", "Custom roles", "Custom roles"] },
      { feature: "Biometric unlock (Face ID / fingerprint)", values: [true, true, true] },
      { feature: "Single sign-on (SSO)",                   values: [false, false, true] },
      { feature: "Audit log",                              values: [false, "30 days", "1 year"] },
      { feature: "White-label invoices & receipts",        values: [false, false, true] },
      { feature: "Support",                                values: ["Email & chat", "Priority", "Phone + WhatsApp · SLA"] },
    ],
  },
  {
    group: "Platform",
    rows: [
      { feature: "Apps for iPhone, Android, Mac & Windows", values: [true, true, true] },
      { feature: "Offline mode + automatic sync",           values: [true, true, true] },
      { feature: "Multi-currency",                          values: [false, true, true] },
      { feature: "REST API + webhooks",                     values: [true, true, true] },
      { feature: "Integrations (Paystack, Shopify, couriers…)", values: [true, true, true] },
    ],
  },
]

// What you pay for as you use it — metered by credits, separate from
// the flat plan price. The AI ad-video generator lives here.
const CREDIT_PACKS = [
  { name: "500 credits", price: "₦1,000" },
  { name: "2,000 credits", price: "₦3,500" },
  { name: "10,000 credits", price: "₦15,000" },
]

// Subscription extras that stack on top of any plan.
const ADDONS = [
  { name: "Extra location", price: "+₦500 / mo each" },
  { name: "Extra team member", price: "+₦300 / mo each" },
  { name: "Extra storefront", price: "+₦1,000 / mo each" },
  { name: "Custom storefront domain", price: "+₦800 / mo" },
  { name: "WhatsApp Business API", price: "+₦2,500 / mo" },
  { name: "Priority onboarding & data migration", price: "one-off" },
]

function fmtNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`
}

export default function PricingPage() {
  const navigate = useNavigate()
  const [billing, setBilling] = React.useState<"monthly" | "yearly">("monthly")
  // Tracks which tier is mid-navigation so its CTA shows a loading
  // label instead of jumping silently — matches the feedback pattern
  // used on the contact form's Send button.
  const [startingTier, setStartingTier] = React.useState<string | null>(null)

  React.useEffect(() => {
    document.title = "Pricing · Pallio"
  }, [])

  const startTrial = (tierId: string) => {
    setStartingTier(tierId)
    // Brief delay so the loading state is visible; real flow may go
    // through an account-creation handshake before /dashboard.
    window.setTimeout(() => navigate("/dashboard"), 250)
  }

  return (
    <div className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-7xl">
        {/* Free-trial banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 220 }}
          className="mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-brand-soft/40 p-4 md:items-center dark:from-emerald-950/15 dark:to-primary/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <Gift className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight md:text-base">
              <span className="text-emerald-700 dark:text-emerald-300">1 month free.</span>{" "}
              Full <strong>Scale</strong> features. No card.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Every Pallio account starts with 30 days of Scale-tier access. Pick a plan to continue after, or cancel any time.
            </p>
          </div>
          <Link to="/dashboard" className="hidden shrink-0 sm:inline-flex">
            <Button size="sm">
              Start free <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </motion.div>

        {/* Header */}
        <div className="mx-auto mt-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand dark:text-primary">
            Naira-first pricing
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
            One flat price.
            <br />
            <span className="bg-gradient-to-r from-brand via-fuchsia-500 to-emerald-500 bg-clip-text text-transparent">
              We never touch your sales.
            </span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Pick a plan, pay one monthly price. Your payment processor charges its normal fee, and Pallio doesn't add a kobo on top. Cancel whenever; pay yearly and two months are on us.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                className={
                  "rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors " +
                  (billing === b
                    ? "bg-brand text-brand-foreground shadow dark:bg-primary dark:text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {b}
                {b === "yearly" && billing !== "yearly" && (
                  <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                    2 months free
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {TIERS.map((tier, i) => {
            const display = billing === "monthly" ? tier.monthly : Math.round(tier.yearly / 12)
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.06, type: "spring", damping: 24, stiffness: 220 }}
                className={
                  "relative flex flex-col rounded-2xl border bg-card p-6 transition-all " +
                  (tier.highlight
                    ? "border-brand/60 shadow-2xl shadow-brand/20 ring-1 ring-brand/30 dark:border-primary/60 dark:shadow-primary/15"
                    : "border-border")
                }
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-brand to-fuchsia-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-brand/40">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </span>
                )}
                <h2 className="text-lg font-bold tracking-tight">{tier.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{tier.blurb}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight tabular-nums">
                    {fmtNaira(display)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {billing === "yearly"
                    ? <>Billed {fmtNaira(tier.yearly)}/yr · save {fmtNaira(tier.monthly * 12 - tier.yearly)}/yr</>
                    : <>or {fmtNaira(tier.yearly)} billed yearly (2 months free)</>
                  }
                </p>

                <Button
                  type="button"
                  className="mt-5 w-full"
                  variant={tier.highlight ? "default" : "outline"}
                  disabled={startingTier !== null}
                  onClick={() => startTrial(tier.id)}
                >
                  {startingTier === tier.id ? "Just a sec…" : tier.cta}
                  {startingTier !== tier.id && <ArrowRight className="h-3.5 w-3.5" />}
                </Button>

                <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* Annual-saving callout */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Pricing in Naira (₦). USD + KES + GHS billing coming soon.
        </p>

        {/* Comparison table */}
        <section className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Compare every plan</h2>
            <p className="mt-3 text-muted-foreground">
              Core selling, inventory and books are in every plan. We never lock whole modules behind a tier; advanced tools and higher limits scale up as you grow.
            </p>
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Feature</th>
                  {TIERS.map((t) => (
                    <th key={t.id} className="px-4 py-3 text-center font-semibold">{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COMPARISON.map((section) => (
                  <React.Fragment key={section.group}>
                    <tr className="bg-muted/20">
                      <td colSpan={1 + TIERS.length} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-brand dark:text-primary">
                        {section.group}
                      </td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr key={row.feature}>
                        <td className="px-4 py-3 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            {row.feature}
                            {row.tip && <InfoTooltip label={row.feature} size="xs">{row.tip}</InfoTooltip>}
                          </span>
                        </td>
                        {row.values.map((v, i) => (
                          <td key={i} className="px-4 py-3 text-center">
                            {typeof v === "boolean" ? (
                              v ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                  <Check className="h-3 w-3" />
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60">·</span>
                              )
                            ) : (
                              <span className="font-semibold tabular-nums">{v}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Add-ons & credits */}
        <section className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Add-ons &amp; credits</h2>
            <p className="mt-3 text-muted-foreground">
              Your plan price is flat. A few power features run on credits, and you can stack optional add-ons whenever you need them.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl gap-5 lg:grid-cols-2">
            {/* Credits */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold tracking-tight">Pay-as-you-go credits</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Every plan includes a monthly credit allowance (100 / 1,000 / 5,000). Credits power the <strong>AI assistant</strong>, <strong>AI ad copy &amp; video generation</strong>, bulk product descriptions, and SMS/email blasts. Run low? Top up any time, and extra credits stay good while your plan is active.
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {CREDIT_PACKS.map((p) => (
                  <li key={p.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="text-sm tabular-nums text-brand dark:text-primary">{p.price}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subscription add-ons */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <Gift className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold tracking-tight">Optional add-ons</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Outgrown a limit before you're ready for the next plan? Add just the piece you need.
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {ADDONS.map((a) => (
                  <li key={a.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5">
                    <span className="text-sm font-semibold">{a.name}</span>
                    <span className="shrink-0 pl-3 text-sm tabular-nums text-brand dark:text-primary">{a.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ teaser */}
        <section className="mt-20 rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-emerald-50/40 p-8 text-center dark:from-primary/10 dark:to-emerald-950/15">
          <h3 className="text-xl font-bold tracking-tight">Still have questions?</h3>
          <p className="mt-2 text-muted-foreground">
            The FAQ covers pricing, credits, data and more. Or message our team and we'll answer fast.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link to="/faq">
              <Button variant="outline">Read the FAQ</Button>
            </Link>
            <Link to="/contact">
              <Button>Talk to us</Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
