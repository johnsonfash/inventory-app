import * as React from "react"
import { Link } from "react-router-dom"
import { Plus, type LucideIcon } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { SummaryStrip, type SummaryTile } from "@/components/lists/summary-strip"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { getStatus } from "@/lib/integrations/data"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

export type Campaign = {
  id: string
  name: string
  status: "active" | "paused" | "draft" | "ended"
  spend: number
  impressions: number
  clicks: number
  conversions: number
  roas?: number
}

const statusTone: Record<Campaign["status"], StatusTone> = {
  active: "success",
  paused: "warning",
  draft: "neutral",
  ended: "danger",
}

type Props = {
  title: string
  description: string
  /** Optional plain-English explainer rendered as an `InfoTooltip`
   *  next to the channel title — same pattern as PageShell. */
  titleTooltip?: React.ReactNode
  Icon: LucideIcon
  tone: "sky" | "fuchsia" | "rose" | "violet" | "emerald"
  campaigns: Campaign[]
  newCampaignHref: string
  newListingHref?: string
  /** Integration provider id this channel runs on (e.g. "facebook-ads").
   *  When supplied, a connection card is shown above the campaign list
   *  + the "New campaign" CTA is replaced with a "Connect first" CTA
   *  when the provider isn't connected. */
  providerId?: string
}

const TONES = {
  violet: { iconBg: "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary", from: "from-brand-soft" },
  sky: { iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300", from: "from-sky-50 dark:from-sky-950/15" },
  fuchsia: { iconBg: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-300", from: "from-fuchsia-50 dark:from-fuchsia-950/15" },
  rose: { iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300", from: "from-rose-50 dark:from-rose-950/15" },
  emerald: { iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300", from: "from-emerald-50 dark:from-emerald-950/15" },
} as const

// Shared shell used by Facebook / Instagram / YouTube / Marketplace
// channel pages. Renders a brand hero + KPI strip + campaign list.
export function ChannelShell({ title, description, titleTooltip, Icon, tone, campaigns, newCampaignHref, newListingHref, providerId }: Props) {
  const providerConnected = providerId ? getStatus(providerId) === "connected" : true
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))
  const { formatPrice, formatCompact } = useCurrency()

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalImpr = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0)
  const active = campaigns.filter((c) => c.status === "active").length
  const blendedRoas = totalSpend > 0
    ? campaigns.reduce((s, c) => s + (c.roas ?? 0) * c.spend, 0) / totalSpend
    : 0
  const ctr = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0

  const tiles: SummaryTile[] = [
    { label: "Spend (30d)", value: formatCompact(totalSpend), tone: "brand", hint: "this period" },
    { label: "Impressions", value: totalImpr >= 1000 ? `${(totalImpr / 1000).toFixed(1)}k` : String(totalImpr), tone: "info", hint: `CTR ${ctr.toFixed(1)}%` },
    { label: "Conversions", value: String(totalConv), tone: "success", hint: `ROAS ${blendedRoas.toFixed(1)}×` },
    { label: "Active", value: String(active), tone: "warning", hint: `of ${campaigns.length}` },
  ]

  return (
    <PageShell title={title} withToolbar={false} titleTooltip={titleTooltip}>
      <div className="flex flex-col gap-4">
        {/* Hero */}
        <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br via-card to-card p-5", TONES[tone].from)}>
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", TONES[tone].iconBg)}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {newListingHref && (
                providerConnected ? (
                  <Link to={newListingHref}>
                    <Button variant="outline">
                      <Plus className="h-4 w-4" /> New listing
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    aria-disabled
                    title={`Connect ${title} first to create listings`}
                    className="opacity-50"
                  >
                    <Plus className="h-4 w-4" /> New listing
                  </Button>
                )
              )}
              {providerConnected ? (
                <Link to={newCampaignHref}>
                  <Button>
                    <Plus className="h-4 w-4" /> New campaign
                  </Button>
                </Link>
              ) : providerId ? (
                <Link to={`/settings/integrations/${providerId}`}>
                  <Button>
                    Connect first →
                  </Button>
                </Link>
              ) : (
                <Link to={newCampaignHref}>
                  <Button>
                    <Plus className="h-4 w-4" /> New campaign
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Underlying integration — connect / config card. Renders
            only when the channel declares a providerId. */}
        {providerId && (
          <ConnectionCard
            providerId={providerId}
            reason={providerConnected
              ? `${title} is wired up. Your catalog auto-syncs to this channel.`
              : `Connect ${title} to run campaigns. Pallio syncs your catalog automatically.`}
          />
        )}

        <SummaryStrip tiles={tiles} />

        {/* Campaigns */}
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold tracking-tight md:text-lg">Campaigns</h3>
          {campaigns.length === 0 ? (
            <EmptyState
              Icon={Icon}
              title="No campaigns yet"
              description="Spin up your first campaign to start driving traffic to this channel."
              action={
                <Link to={newCampaignHref}>
                  <Button>
                    <Plus className="h-4 w-4" /> New campaign
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-3 border-b border-border bg-muted/40 px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground md:grid">
                <span>Campaign</span>
                <span className="text-right">Spend</span>
                <span className="text-right">Impr.</span>
                <span className="text-right">Clicks</span>
                <span className="text-right">ROAS</span>
                <span />
              </div>
              <ul className="divide-y divide-border">
                {campaigns.map((c) => (
                  <li
                    key={c.id}
                    className="grid items-center gap-3 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_80px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{c.id}</span> · {c.conversions} conversions
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 md:contents">
                      <DataCell label="Spend" value={formatPrice(c.spend)} />
                      <DataCell label="Impr." value={c.impressions >= 1000 ? `${(c.impressions / 1000).toFixed(1)}k` : String(c.impressions)} />
                      <DataCell label="Clicks" value={c.clicks.toLocaleString()} />
                      <DataCell
                        label="ROAS"
                        value={`${(c.roas ?? 0).toFixed(1)}×`}
                        className={(c.roas ?? 0) >= 3 ? "text-emerald-600 dark:text-emerald-400" : (c.roas ?? 0) >= 1.5 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}
                      />
                    </div>
                    <div className="md:text-right">
                      <StatusBadge tone={statusTone[c.status]} withDot>
                        {c.status}
                      </StatusBadge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}

function DataCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="text-center md:text-right">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground md:hidden">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums", className)}>{value}</p>
    </div>
  )
}
