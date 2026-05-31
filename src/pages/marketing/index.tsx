import * as React from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  BarChart3,
  Facebook,
  Instagram,
  Megaphone,
  Music2,
  Plus,
  ShoppingBag,
  Sparkles,
  Trophy,
  Youtube,
  type LucideIcon,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { useAutoMarkStep } from "@/hooks/use-auto-mark-step"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/currency"

type Channel = {
  href: string
  name: string
  Icon: LucideIcon
  status: "connected" | "available"
  campaigns: number
  spend30d: number
  roas: number | null
  tone: "violet" | "sky" | "fuchsia" | "rose" | "emerald"
}

// MOCK DATA — replaced by /v1/marketing/channels when the backend lands.
// Spend, ROAS, and campaign counts are illustrative; do not treat the
// numbers as live KPIs. The shape mirrors the real API response.
const CHANNELS: Channel[] = [
  { href: "/marketing/facebook-ads", name: "Facebook Ads", Icon: Facebook, status: "connected", campaigns: 4, spend30d: 1240, roas: 3.8, tone: "sky" },
  { href: "/marketing/instagram-ads", name: "Instagram Ads", Icon: Instagram, status: "connected", campaigns: 3, spend30d: 980, roas: 4.2, tone: "fuchsia" },
  { href: "/marketing/youtube-adsense", name: "YouTube & AdSense", Icon: Youtube, status: "connected", campaigns: 1, spend30d: 320, roas: 2.1, tone: "rose" },
  { href: "/marketing/tiktok-ads", name: "TikTok Ads", Icon: Music2, status: "available", campaigns: 0, spend30d: 0, roas: null, tone: "violet" },
  { href: "/marketing/facebook-marketplace", name: "Facebook Marketplace", Icon: ShoppingBag, status: "available", campaigns: 0, spend30d: 0, roas: null, tone: "emerald" },
]

const TONES = {
  violet: "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
} as const

export default function Marketing() {
  useAutoMarkStep("first-campaign")
  const { formatPrice } = useCurrency()
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const totalSpend = CHANNELS.reduce((s, c) => s + c.spend30d, 0)
  const totalCampaigns = CHANNELS.reduce((s, c) => s + c.campaigns, 0)
  const connectedCount = CHANNELS.filter((c) => c.status === "connected").length
  const connected = CHANNELS.filter((c) => c.roas != null)
  const blendedRoas = connected.length
    ? (connected.reduce((s, c) => s + (c.roas ?? 0) * c.spend30d, 0) / connected.reduce((s, c) => s + c.spend30d, 0)) || 0
    : 0
  const topRoas = [...CHANNELS].filter((c) => c.roas != null).sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0]

  return (
    <PageShell
      title="Marketing"
      withToolbar
      titleTooltip={
        <>
          Where you launch ad campaigns, manage your storefront
          listings, track ROAS, and pay affiliate commissions. Pallio
          syncs catalog + stock to every connected channel so prices
          stay in lock-step.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-fuchsia-50/40 p-5 dark:from-primary/10 dark:via-card dark:to-fuchsia-950/15">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/20 blur-3xl dark:bg-primary/20" aria-hidden />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-brand dark:text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Performance
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">
                {formatPrice(totalSpend)} spent across {connectedCount} channels
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Blended ROAS: <span className="font-semibold text-foreground">{blendedRoas.toFixed(1)}×</span>
                {topRoas && (
                  <>
                    {" "}· Top performer: <span className="font-semibold text-foreground">{topRoas.name}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/marketing/generate">
                <Button variant="outline">
                  <Sparkles className="h-4 w-4" /> Generate with AI
                </Button>
              </Link>
              <Link to="/marketing/listings/new">
                <Button>
                  <Plus className="h-4 w-4" /> New listing
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <SummaryStrip
          tiles={[
            { label: "Spend (30d)", value: formatPrice(totalSpend), tone: "brand", hint: "across channels" },
            { label: "Campaigns", value: String(totalCampaigns), tone: "info", hint: "active" },
            { label: "Blended ROAS", value: `${blendedRoas.toFixed(1)}×`, tone: blendedRoas >= 3 ? "success" : "warning", hint: blendedRoas >= 3 ? "healthy" : "needs review" },
            { label: "Channels", value: String(connectedCount), tone: "warning", hint: "connected" },
          ]}
        />

        {/* Channels */}
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight md:text-lg">Channels</h3>
              <p className="text-xs text-muted-foreground md:text-sm">Performance per advertising surface</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CHANNELS.map((c) => {
              const Icon = c.Icon
              return (
                <Link
                  key={c.href}
                  to={c.href}
                  className="group rounded-2xl border border-border bg-card p-4 transition-all hover:border-brand/40 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", TONES[c.tone])}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <StatusBadge tone={c.status === "connected" ? "success" : "neutral"}>
                          {c.status}
                        </StatusBadge>
                      </div>
                      {c.status === "connected" ? (
                        <>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {c.campaigns} campaigns · {formatPrice(c.spend30d)} (30d)
                          </p>
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-[11px] text-muted-foreground">ROAS</span>
                            <span className={cn(
                              "text-base font-bold tabular-nums",
                              (c.roas ?? 0) >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
                            )}>
                              {(c.roas ?? 0).toFixed(1)}×
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Not connected yet — set up to start listing.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                    Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Commissions, analytics and listings shortcuts */}
        <section className="grid gap-3 sm:grid-cols-3">
          <Link to="/marketing/analytics" className="group rounded-2xl border border-border bg-card p-4 transition-all hover:border-brand/40 hover:shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Ad performance</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Cross-channel ROAS, CPA, alerts and what to scale.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
          <Link to="/marketing/commissions" className="group rounded-2xl border border-border bg-card p-4 transition-all hover:border-brand/40 hover:shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Trophy className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Sales team commissions</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Rules, per-rep bonuses, and tier breakpoints.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
          <Link to="/marketing/listings/new" className="group rounded-2xl border border-border bg-card p-4 transition-all hover:border-brand/40 hover:shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <Megaphone className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">New cross-channel listing</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Publish one listing to multiple channels at once.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </section>

        {/* Marketing tool integrations — surface connection status so
            the user knows which campaign automations + tracking + ESP
            tools are live. Each card deep-links to the integration
            connect / config page. */}
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold md:text-base">Marketing tools</h3>
            <p className="text-[11px] text-muted-foreground">Email-service providers, ad-pixel + analytics tools that power your campaigns.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <ConnectionCard providerId="mailchimp"  reason="Email newsletters + abandoned-cart automation." />
            <ConnectionCard providerId="klaviyo"    reason="Behavioural emails — win-backs, post-purchase flows." />
            <ConnectionCard providerId="meta-pixel" reason="Track Meta ad conversions on your storefront." />
            <ConnectionCard providerId="ga4"        reason="Google Analytics 4 — site traffic + funnel." />
            <ConnectionCard providerId="mixpanel"   reason="Event-level analytics for product launches." />
            <ConnectionCard providerId="whatsapp-cloud" reason="WhatsApp Business broadcasts + campaigns." />
          </div>
        </section>
      </div>
    </PageShell>
  )
}
