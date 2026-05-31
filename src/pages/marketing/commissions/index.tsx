
import * as React from "react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CommissionCalculator } from "@/components/team/commission-calculator"
import { ExportCSVButton, ExportPDFButton } from "@/components/export-buttons"
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { aggregateSalesBySalesperson } from "@/lib/pos/storage"
import { RoleGuard } from "@/components/auth/role-guard"
import { fetchAnalyticsTeams } from "@/lib/api-mocks/analytics-teams"
import { useCurrency } from "@/contexts/currency"

type SpRow = { salesperson: string; sales: number; revenue: number }

export default function MarketingCommissionsPage() {
  const [data, setData] = React.useState<SpRow[]>(aggregateSalesBySalesperson())
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const { formatPrice } = useCurrency()

  React.useEffect(() => {
    let ignore = false
    fetchAnalyticsTeams()
      .then((res) => {
        if (ignore) return
        if (Array.isArray(res?.bySalesperson)) {
          setData(
            res.bySalesperson.map((r) => ({
              salesperson: r.salesperson || "Unassigned",
              sales: Number(r.sales) || 0,
              revenue: Number(r.revenue) || 0,
            })),
          )
        }
      })
      .catch(() => {
        if (ignore) return
        // Local POS aggregate still renders — we just warn the user so
        // they know the live API failed and the numbers may be stale.
        toast.error("Couldn't load latest team analytics", { description: "Showing local sales data." })
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <RoleGuard permission="view:commissions">
      <PageShell
        title="Commissions & Bonuses"
        withToolbar
        titleTooltip={
          <>
            Admin view of every payout your sales reps + affiliates
            are due. Calculator simulates "if I changed the % rate or
            the bonus threshold, what would the team earn?". Each
            individual affiliate sees only their own numbers at
            <strong> /affiliate/dashboard</strong>.
          </>
        }
      >
        <div className="mb-2 flex items-center gap-2">
          <ExportCSVButton data={data} filename="commissions.csv" />
          <ExportPDFButton selector="#commissions-report" filename="commissions.pdf" />
        </div>
        <div id="commissions-report" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Revenue by Salesperson</CardTitle>
              <CardDescription>Track commissions potential</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {/* Use the canonical pattern from the other report pages —
                  fill direct from --chart-1 CSS var. Wrapping in hsl()
                  (the previous approach) was broken because our chart
                  tokens are oklch() values, not HSL components, so
                  hsl(oklch(...)) evaluates to invalid + falls back to
                  black — invisible against the dark card. */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                  <XAxis dataKey="salesperson" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent labelKey="salesperson" />} cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }} />
                  <Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <CommissionCalculator totalRevenue={totalRevenue} />

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Team Summary</CardTitle>
              <CardDescription>Sales counts and revenue by salesperson</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Salesperson</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.salesperson}>
                        <TableCell className="font-medium">{row.salesperson}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.sales}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPrice(row.revenue)}</TableCell>
                      </TableRow>
                    ))}
                    {data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No data yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </RoleGuard>
  )
}
