import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronRight, DollarSign, MessageSquare, Search, ShoppingCart, Users } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChartTooltipContent } from "@/components/ui/chart"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { ChartCard } from "@/components/reports/chart-card"
import { PeriodChips, type Period } from "@/components/reports/period-chips"
import { RoleGuard } from "@/components/auth/role-guard"
import { Avatar } from "@/components/avatar"
import { aggregateSalesByChannel, aggregateSalesByLocation, aggregateSalesBySalesperson } from "@/lib/pos/storage"
import { fetchAnalyticsTeams } from "@/lib/api-mocks/analytics-teams"
import { useCurrency } from "@/contexts/currency"

type SpRow = { salesperson: string; sales: number; revenue: number }
type LocRow = { location: string; sales: number; revenue: number }
type ChRow = { channel: string; sales: number; revenue: number }

const axisProps = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const

// (Avatars now come from the shared `Avatar` component — seeded by
// name so the same person always gets the same face.)

export default function TeamPerformancePage() {
  const [period, setPeriod] = React.useState<Period>("30d")
  const [commissionRate, setCommissionRate] = React.useState<number>(5)
  const [query, setQuery] = React.useState("")
  const [bySp, setBySp] = React.useState<SpRow[]>(aggregateSalesBySalesperson())
  const [byLoc, setByLoc] = React.useState<LocRow[]>(aggregateSalesByLocation())
  const [byCh, setByCh] = React.useState<ChRow[]>(aggregateSalesByChannel())
  const { formatPrice, symbol } = useCurrency()

  useRegisterPageRefresh(React.useCallback(async () => {
    const d = await fetchAnalyticsTeams(period)
    if (Array.isArray(d.bySalesperson)) setBySp(d.bySalesperson)
    if (Array.isArray(d.byLocation)) setByLoc(d.byLocation)
    if (Array.isArray(d.byChannel)) setByCh(d.byChannel)
  }, [period]))

  React.useEffect(() => {
    let ignore = false
    fetchAnalyticsTeams(period).then((d) => {
      if (ignore) return
      if (Array.isArray(d.bySalesperson)) setBySp(d.bySalesperson)
      if (Array.isArray(d.byLocation)) setByLoc(d.byLocation)
      if (Array.isArray(d.byChannel)) setByCh(d.byChannel)
    })
    return () => { ignore = true }
  }, [period])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return bySp
    return bySp.filter((r) => r.salesperson.toLowerCase().includes(q))
  }, [bySp, query])

  const sorted = React.useMemo(() => [...filtered].sort((a, b) => b.revenue - a.revenue), [filtered])

  const totalRevenue = bySp.reduce((s, r) => s + r.revenue, 0)
  const totalSales = bySp.reduce((s, r) => s + r.sales, 0)
  const avgOrder = totalSales ? totalRevenue / totalSales : 0
  const winner = sorted[0]
  const topRevenue = winner?.revenue ?? 1

  return (
    <RoleGuard permission="view:team">
      <PageShell
        title="Team performance"
        withToolbar
        titleTooltip={
          <>
            Sales-by-rep leaderboard. Each row shows total sales rung
            up by that team member, plus their commission earnings
            and tier (leader / podium / rest). Numbers update live as
            transactions clear.
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SummaryStrip
            tiles={[
              { label: "Revenue", value: formatPrice(totalRevenue), tone: "brand", hint: "team total" },
              { label: "Sales", value: String(totalSales), tone: "info", hint: "this period" },
              { label: "Avg order", value: formatPrice(avgOrder), tone: "success", hint: "per sale" },
              { label: "Top rep", value: winner?.salesperson?.split(" ")[0] ?? "—", tone: "warning", hint: winner ? formatPrice(winner.revenue) : "no data" },
            ]}
          />

          <PeriodChips value={period} onChange={setPeriod} />

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reps…" className="pl-9" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm" title="Commission rate · 0–100%">
              <span className="text-xs text-muted-foreground">Commission</span>
              <Input
                type="number"
                placeholder="0"
                min={0}
                max={100}
                step={0.5}
                aria-label="Commission rate (0 to 100 percent)"
                value={commissionRate === 0 ? "" : commissionRate}
                onChange={(e) => {
                  if (e.target.value === "") { setCommissionRate(0); return }
                  const n = Number(e.target.value)
                  if (Number.isNaN(n)) return
                  setCommissionRate(Math.min(100, Math.max(0, n)))
                }}
                className="h-7 w-14 border-0 bg-transparent p-0 text-right text-sm focus-visible:ring-0"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <Link to="/sales/team/chat">
              <Button variant="outline"><MessageSquare className="h-4 w-4" /> Team chat</Button>
            </Link>
          </div>

          {/* Leaderboard */}
          {sorted.length === 0 ? (
            <EmptyState Icon={Users} title="No reps yet" description="Sales attributed to reps will appear here." />
          ) : (
            <section className="flex flex-col gap-2">
              <h3 className="text-base font-semibold tracking-tight md:text-lg">Leaderboard</h3>
              <ul className="space-y-2">
                {sorted.map((r, idx) => {
                  const pct = (r.revenue / topRevenue) * 100
                  const commission = r.revenue * (commissionRate / 100)
                  const tier: StatusTone = idx === 0 ? "brand" : idx <= 2 ? "info" : "neutral"
                  return (
                    <li key={r.salesperson}>
                      <Link
                        to={`/sales/team/${encodeURIComponent(r.salesperson)}`}
                        className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40"
                      >
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-muted text-xs">
                          <span className="text-[9px] uppercase text-muted-foreground">Rank</span>
                          <span className="text-base font-bold tabular-nums leading-tight">{idx + 1}</span>
                        </div>
                        <Avatar seed={r.salesperson} name={r.salesperson} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{r.salesperson}</p>
                            <p className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(r.revenue)}</p>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{r.sales} sales · {formatPrice(commission)} commission</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-1.5 rounded-full bg-gradient-to-r from-brand via-fuchsia-500 to-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                            <StatusBadge tone={tier}>{idx === 0 ? "leader" : idx <= 2 ? "podium" : "rest"}</StatusBadge>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Revenue by rep" description="Comparative performance">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sorted.map((r) => ({ rep: r.salesperson.split(" ")[0], revenue: r.revenue }))} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                  <XAxis dataKey="rep" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltipContent labelKey="rep" />} cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }} />
                  <Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue by channel" description="Where the money came from">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCh.map((r) => ({ channel: r.channel, revenue: r.revenue }))} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                  <XAxis dataKey="channel" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltipContent labelKey="channel" />} cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }} />
                  <Bar dataKey="revenue" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Locations breakdown */}
          {byLoc.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-base font-semibold tracking-tight md:text-lg">By location</h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {byLoc.map((r) => (
                  <li key={r.location} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <DollarSign className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.location}</p>
                      <p className="text-[11px] text-muted-foreground">{r.sales} sales · <span className="font-bold tabular-nums text-foreground">{formatPrice(r.revenue)}</span></p>
                    </div>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </PageShell>
    </RoleGuard>
  )
}
