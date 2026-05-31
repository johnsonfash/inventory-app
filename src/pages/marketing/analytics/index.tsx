import * as React from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Lightbulb,
  TrendingUp,
  Trophy,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

// Goal-aware so analytics works beyond product sales: a campaign can
// optimise for a SALE (measured by ROAS), an app INSTALL or a LEAD
// (measured by cost-per-acquisition against a target).
type Goal = "sale" | "install" | "lead"
type Campaign = {
  id: string
  name: string
  channel: string
  goal: Goal
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number // only meaningful for sale goals
}

const TARGET_CPA: Record<Goal, number> = { sale: 0, install: 800, lead: 2500 }

const CAMPAIGNS: Campaign[] = [
  { id: "IG-Reels-Tee",   name: "Holiday Tee · Reels",     channel: "Instagram Ads",       goal: "sale",    spend: 312_000, impressions: 1_420_000, clicks: 31_200, conversions: 230, revenue: 1_310_400 },
  { id: "FB-Hub",         name: "USB-C Hub · Catalog",     channel: "Facebook Ads",        goal: "sale",    spend: 248_000, impressions: 980_000,   clicks: 18_900, conversions: 168, revenue: 1_004_000 },
  { id: "TT-AppInstall",  name: "App launch · In-feed",    channel: "TikTok Ads",          goal: "install", spend: 180_000, impressions: 2_100_000, clicks: 44_000, conversions: 312, revenue: 0 },
  { id: "YT-Leads",       name: "Service leads · Pre-roll", channel: "YouTube & AdSense",  goal: "lead",    spend: 96_000,  impressions: 420_000,   clicks: 5_400,  conversions: 28,  revenue: 0 },
  { id: "FBM-Mug",        name: "Ceramic Mug · Marketplace", channel: "Facebook Marketplace", goal: "sale", spend: 40_000,  impressions: 88_000,    clicks: 2_100,  conversions: 61,  revenue: 214_000 },
]

const PERIODS = ["7d", "30d", "90d"] as const

const roasOf = (c: Campaign) => (c.spend > 0 ? c.revenue / c.spend : 0)
const cpaOf = (c: Campaign) => (c.conversions > 0 ? c.spend / c.conversions : 0)
const ctrOf = (c: Campaign) => (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0)

// One headline metric per campaign, depending on its goal.
function resultTone(c: Campaign): StatusTone {
  if (c.goal === "sale") {
    const r = roasOf(c)
    return r >= 3 ? "success" : r >= 1.5 ? "warning" : "danger"
  }
  const cpa = cpaOf(c)
  const target = TARGET_CPA[c.goal]
  return cpa <= target ? "success" : cpa <= target * 1.3 ? "warning" : "danger"
}

export default function MarketingAnalytics() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))
  const { formatPrice } = useCurrency()
  const [period, setPeriod] = React.useState<(typeof PERIODS)[number]>("30d")

  const totalSpend = CAMPAIGNS.reduce((s, c) => s + c.spend, 0)
  const totalConv = CAMPAIGNS.reduce((s, c) => s + c.conversions, 0)
  const saleCamps = CAMPAIGNS.filter((c) => c.goal === "sale")
  const saleSpend = saleCamps.reduce((s, c) => s + c.spend, 0)
  const saleRev = saleCamps.reduce((s, c) => s + c.revenue, 0)
  const blendedRoas = saleSpend > 0 ? saleRev / saleSpend : 0
  const acqCamps = CAMPAIGNS.filter((c) => c.goal !== "sale")
  const avgCpa = acqCamps.length ? acqCamps.reduce((s, c) => s + cpaOf(c), 0) / acqCamps.length : 0
  const maxSpend = Math.max(...CAMPAIGNS.map((c) => c.spend))

  // Monitoring: derive alerts from the data.
  const alerts: { tone: StatusTone; Icon: typeof AlertTriangle; text: string }[] = []
  for (const c of CAMPAIGNS) {
    if (c.goal === "sale" && roasOf(c) < 1.5) alerts.push({ tone: "danger", Icon: ArrowDownRight, text: `${c.name} is at ${roasOf(c).toFixed(1)}× ROAS — losing margin. Pause or rework the creative.` })
    if (c.goal !== "sale" && cpaOf(c) > TARGET_CPA[c.goal] * 1.3) alerts.push({ tone: "warning", Icon: AlertTriangle, text: `${c.name} CPA is ${formatPrice(cpaOf(c))} vs ${formatPrice(TARGET_CPA[c.goal])} target — tighten the audience.` })
  }
  const topPerformer = [...saleCamps].sort((a, b) => roasOf(b) - roasOf(a))[0]
  if (topPerformer && roasOf(topPerformer) >= 3) alerts.push({ tone: "success", Icon: ArrowUpRight, text: `${topPerformer.name} is your best at ${roasOf(topPerformer).toFixed(1)}× — consider raising its budget.` })

  // A/B test (mock): two creatives of the same campaign.
  const ab = {
    name: "Holiday Tee · Reels",
    a: { label: "A · product-on-white", ctr: 1.9, roas: 3.2 },
    b: { label: "B · lifestyle UGC", ctr: 2.7, roas: 4.2 },
  }
  const abWinner = ab.b.roas >= ab.a.roas ? "b" : "a"

  const suggestions = [
    `Shift budget from low-ROAS sale ads toward ${topPerformer?.name ?? "your best campaign"}.`,
    "Your TikTok install CPA is under target — it has room to scale.",
    "Lifestyle/UGC creative is out-converting product-on-white; brief more of it.",
    "Add a retargeting audience to the YouTube lead campaign to lower CPA.",
  ]

  return (
    <PageShell
      title="Ad performance"
      withToolbar={false}
      titleTooltip="Cross-channel results in one place — ROAS for sales, cost-per-acquisition for app installs and leads — plus alerts and suggestions on what to scale, fix, or pause."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Link to="/marketing" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Marketing
          </Link>
          <div className="inline-flex gap-1 rounded-lg border border-border p-0.5">
            {PERIODS.map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:focus-visible:ring-primary",
                  period === p ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Ad spend" value={formatPrice(totalSpend)} sub={`${CAMPAIGNS.length} campaigns`} tone="brand" />
          <Kpi label="Blended ROAS" value={`${blendedRoas.toFixed(1)}×`} sub="sales campaigns" tone={blendedRoas >= 3 ? "success" : "warning"} />
          <Kpi label="Conversions" value={totalConv.toLocaleString()} sub="sales · installs · leads" tone="info" />
          <Kpi label="Avg CPA" value={formatPrice(avgCpa)} sub="installs + leads" tone="neutral" />
        </section>

        {/* Alerts / monitoring */}
        {alerts.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Needs attention</p>
            {alerts.map((a, i) => (
              <div key={i} className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
                a.tone === "danger" && "border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/15",
                a.tone === "warning" && "border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/15",
                a.tone === "success" && "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/15")}>
                <a.Icon className={cn("mt-0.5 h-4 w-4 shrink-0",
                  a.tone === "danger" && "text-rose-600 dark:text-rose-400",
                  a.tone === "warning" && "text-amber-600 dark:text-amber-300",
                  a.tone === "success" && "text-emerald-600 dark:text-emerald-400")} />
                <span>{a.text}</span>
              </div>
            ))}
          </section>
        )}

        {/* Per-campaign table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Campaign</th>
                    <th className="px-3 py-2.5 font-medium">Goal</th>
                    <th className="px-3 py-2.5 text-right font-medium">Spend</th>
                    <th className="px-3 py-2.5 text-right font-medium">CTR</th>
                    <th className="px-3 py-2.5 text-right font-medium">Conv.</th>
                    <th className="px-3 py-2.5 text-right font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* Rows are read-only — analytics summary only. Per-campaign
                      edit + budget controls live in the channel pages. */}
                  {CAMPAIGNS.map((c) => (
                    <tr key={c.id} className="cursor-default">
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.channel}</p>
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-brand dark:bg-primary" style={{ width: `${Math.round((c.spend / maxSpend) * 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge tone="neutral">{c.goal}</StatusBadge></td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(c.spend)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{ctrOf(c).toFixed(1)}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{c.conversions}</td>
                      <td className="px-3 py-2.5 text-right">
                        <StatusBadge tone={resultTone(c)}>
                          {c.goal === "sale" ? `${roasOf(c).toFixed(1)}× ROAS` : `${formatPrice(cpaOf(c))} CPA`}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* A/B + suggestions */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold"><Trophy className="h-4 w-4 text-brand dark:text-primary" /> A/B test · {ab.name}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["a", "b"] as const).map((k) => {
                  const v = ab[k]
                  const win = abWinner === k
                  return (
                    <div key={k} className={cn("rounded-xl border p-3", win ? "border-emerald-500/40 bg-emerald-500/5" : "border-border")}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">{v.label}</p>
                        {win && <StatusBadge tone="success">winner</StatusBadge>}
                      </div>
                      <p className="mt-2 text-lg font-bold tabular-nums">{v.roas.toFixed(1)}×</p>
                      <p className="text-[11px] text-muted-foreground">ROAS · {v.ctr.toFixed(1)}% CTR</p>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Variant B is winning — route 80% of budget to it and retire A.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold"><Lightbulb className="h-4 w-4 text-brand dark:text-primary" /> Suggestions</h3>
              <ul className="mt-3 space-y-2">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "brand" | "success" | "info" | "warning" | "neutral" }) {
  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-xl font-bold tabular-nums md:text-2xl",
          tone === "brand" && "text-brand dark:text-primary",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "info" && "text-sky-600 dark:text-sky-300",
          tone === "warning" && "text-amber-600 dark:text-amber-300")}>{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}
