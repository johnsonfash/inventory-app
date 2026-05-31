import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  PlayCircle,
  Receipt,
  Send,
  Users,
  Wallet,
} from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { type Period } from "@/components/reports/period-chips"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { Avatar } from "@/components/avatar"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type Frequency = "monthly" | "bi-weekly" | "weekly"
type RunStatus = "draft" | "scheduled" | "paid" | "failed"

type Employee = {
  id: string
  name: string
  email: string
  role: string
  location: string
  base: number
  allowances: number
  commission: number
  paye: number
  pension: number
  nhf: number
  frequency: Frequency
  bankShort: string
}

const STAFF: Employee[] = [
  { id: "m-1", name: "Mia Chen",         email: "mia@funkeapparel.com",    role: "Manager · Lekki",      location: "Lekki",   base: 620_000, allowances:  80_000, commission:  84_000, paye:  62_400, pension: 40_320, nhf: 15_500, frequency: "monthly", bankShort: "GTBank ··· 4218" },
  { id: "m-2", name: "Alex Reyes",        email: "alex@funkeapparel.com",  role: "Cashier · Lekki",      location: "Lekki",   base: 220_000, allowances:  30_000, commission:  12_000, paye:  18_400, pension: 13_400, nhf:  5_500, frequency: "monthly", bankShort: "Access ··· 9931" },
  { id: "m-3", name: "Tunde Bello",      email: "tunde@funkeapparel.com",   role: "Sales rep · Ikeja",     location: "Ikeja",   base: 280_000, allowances:  40_000, commission:  68_000, paye:  28_400, pension: 17_600, nhf:  7_000, frequency: "monthly", bankShort: "First Bank ··· 1188" },
  { id: "m-4", name: "Aisha Nwosu",      email: "aisha@funkeapparel.com",   role: "Marketer",              location: "HQ",      base: 320_000, allowances:  45_000, commission:  24_000, paye:  31_400, pension: 19_500, nhf:  8_000, frequency: "monthly", bankShort: "Kuda ··· 3382" },
  { id: "m-5", name: "Funke Adesanya",   email: "funke@funkeapparel.com",   role: "Affiliate manager",     location: "HQ",      base: 380_000, allowances:  60_000, commission:  92_000, paye:  44_200, pension: 26_400, nhf: 11_400, frequency: "monthly", bankShort: "Sterling ··· 7766" },
  { id: "m-6", name: "Linda Mensah",     email: "linda@funkeapparel.com",   role: "Stockist · Wuse",       location: "Wuse 2",  base: 220_000, allowances:  30_000, commission:   8_000, paye:  16_800, pension: 12_500, nhf:  5_500, frequency: "monthly", bankShort: "Opay ··· 2204" },
  { id: "m-7", name: "Daniel Kim",       email: "dk@funkeapparel.com",      role: "Designer (contract)",  location: "Remote",  base: 460_000, allowances:       0, commission:       0, paye:       0, pension:      0, nhf:      0, frequency: "monthly", bankShort: "Sterling ··· 4456" },
]

type Run = {
  id: string
  period: string
  paidDate: string
  employees: number
  gross: number
  net: number
  taxes: number
  status: RunStatus
  reference?: string
}

const RUNS: Run[] = [
  { id: "PR-2026-04", period: "April 2026", paidDate: "Apr 30, 2026", employees: 7, gross: 2_864_000, net: 2_466_000, taxes:  398_000, status: "paid",      reference: "FIRS-PAYE-20428" },
  { id: "PR-2026-03", period: "March 2026", paidDate: "Mar 31, 2026", employees: 7, gross: 2_720_000, net: 2_342_000, taxes:  378_000, status: "paid",      reference: "FIRS-PAYE-20221" },
  { id: "PR-2026-05", period: "May 2026",   paidDate: "May 31, 2026", employees: 7, gross: 2_984_000, net: 2_565_000, taxes:  419_000, status: "scheduled" },
  { id: "PR-2026-02", period: "February 2026", paidDate: "Feb 28, 2026", employees: 7, gross: 2_640_000, net: 2_274_000, taxes: 366_000, status: "paid",      reference: "FIRS-PAYE-20018" },
  { id: "PR-2026-01", period: "January 2026",  paidDate: "Jan 31, 2026", employees: 6, gross: 2_220_000, net: 1_914_000, taxes: 306_000, status: "paid",      reference: "FIRS-PAYE-19814" },
]

const STATUS_TONE: Record<RunStatus, StatusTone> = {
  draft:     "neutral",
  scheduled: "warning",
  paid:      "success",
  failed:    "danger",
}

export default function Payroll() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const [period, setPeriod] = React.useState<Period>("30d")
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [approving, setApproving] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [downloadingRunId, setDownloadingRunId] = React.useState<string | null>(null)

  const grossThisMonth = STAFF.reduce((s, e) => s + e.base + e.allowances + e.commission, 0)
  const taxThisMonth   = STAFF.reduce((s, e) => s + e.paye + e.pension + e.nhf, 0)
  const netThisMonth   = grossThisMonth - taxThisMonth
  const yearGross      = RUNS.filter((r) => r.status === "paid").reduce((s, r) => s + r.gross, 0)

  const exportRows = STAFF.map((e) => ({
    id: e.id, name: e.name, role: e.role, base: e.base, allowances: e.allowances,
    commission: e.commission, paye: e.paye, pension: e.pension, nhf: e.nhf,
    net: e.base + e.allowances + e.commission - e.paye - e.pension - e.nhf,
    bank: e.bankShort,
  }))

  return (
    <ReportShell
      title="Payroll"
      titleTooltip={
        <>
          Pay your staff — salary, allowances, sales commissions —
          minus the legal deductions (<strong>PAYE</strong> tax,
          pension, <strong>NHF</strong> housing fund in Nigeria). Each
          pay run records the spend in Accounting and prepares the tax
          paperwork in <strong>Tax Filings</strong> automatically — you
          just review and file.
        </>
      }
      exportFilename={`pallio-payroll-${period}`}
      exportRows={exportRows}
      period={period}
      onPeriodChange={setPeriod}
    >
      {/* Headline KPIs */}
      <section className="grid gap-3 lg:grid-cols-4">
        <Tile label="Gross this month"  value={formatPrice(grossThisMonth)} sub={`${STAFF.length} employees`} tone="brand" />
        <Tile label="Statutory deductions" value={formatPrice(taxThisMonth)}    sub="PAYE + pension + NHF" tone="warning" />
        <Tile label="Net to staff"      value={formatPrice(netThisMonth)}    sub="paid into bank accounts" tone="success" />
        <Tile label="Paid YTD"          value={formatPrice(yearGross)}       sub={`${RUNS.filter((r) => r.status === "paid").length} runs · 2026`} tone="info" />
      </section>

      {/* Next run hero */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <PlayCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Next pay run</p>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">May 2026 · {STAFF.length} employees</h2>
                <p className="text-xs text-muted-foreground md:text-sm">
                  <strong className="font-bold tabular-nums text-foreground">{formatPrice(grossThisMonth)} gross</strong> · scheduled for <strong className="font-bold text-foreground">May 31</strong> · auto-debit from primary business account
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                <Receipt className="h-3.5 w-3.5" /> Preview payslips
              </Button>
              <Button
                size="sm"
                disabled={approving}
                onClick={async () => {
                  setApproving(true)
                  try {
                    // Mock the debit/run window so the button shows an honest
                    // loading state — the real backend will replace this with
                    // the wallet debit + NIBSS batch.
                    await new Promise((r) => setTimeout(r, 800))
                    toast.success("Pay run approved — debits Pallio Wallet on May 31.")
                  } finally {
                    setApproving(false)
                  }
                }}
              >
                <Send className={cn("h-3.5 w-3.5", approving && "animate-pulse")} /> {approving ? "Running…" : "Approve + run"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary register */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 p-4">
            <div>
              <h3 className="text-sm font-semibold md:text-base">Salary register · this month</h3>
              <p className="text-[11px] text-muted-foreground">Each row computed live from base + allowances + commission − deductions.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={async () => {
                setExporting(true)
                try {
                  await new Promise((r) => setTimeout(r, 300))
                  downloadRegisterCsv(exportRows)
                  toast.success("Salary register exported as CSV.")
                } finally {
                  setExporting(false)
                }
              }}
            >
              <Download className={cn("h-3.5 w-3.5", exporting && "animate-pulse")} /> {exporting ? "Preparing…" : "Export"}
            </Button>
          </div>
          {isMobile ? (
            <ul className="divide-y divide-border">
              {STAFF.map((e) => {
                const gross = e.base + e.allowances + e.commission
                const ded = e.paye + e.pension + e.nhf
                const net = gross - ded
                return (
                  <li key={e.id} className="flex items-center gap-3 p-3">
                    <Avatar seed={e.email} name={e.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{e.role}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{e.bankShort}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{formatPrice(net)}</p>
                      <p className="text-[10px] text-muted-foreground">net · {e.frequency}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Employee</th>
                    <th className="px-3 py-2.5 font-medium">Role · location</th>
                    <th className="px-3 py-2.5 text-right font-medium">Base</th>
                    <th className="px-3 py-2.5 text-right font-medium">Allowances</th>
                    <th className="px-3 py-2.5 text-right font-medium">Commission</th>
                    <th className="px-3 py-2.5 text-right font-medium">PAYE</th>
                    <th className="px-3 py-2.5 text-right font-medium">Pension</th>
                    <th className="px-3 py-2.5 text-right font-medium">NHF</th>
                    <th className="px-3 py-2.5 text-right font-medium">Net</th>
                    <th className="px-3 py-2.5 font-medium">Bank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {STAFF.map((e) => {
                    const net = e.base + e.allowances + e.commission - e.paye - e.pension - e.nhf
                    return (
                      <tr key={e.id} className="transition-colors hover:bg-accent/30">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar seed={e.email} name={e.name} size={26} />
                            <span className="text-xs font-semibold">{e.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.role}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums">{formatPrice(e.base)}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums">{formatPrice(e.allowances)}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums">{e.commission > 0 ? formatPrice(e.commission) : "—"}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">−{formatPrice(e.paye)}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">−{formatPrice(e.pension)}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">−{formatPrice(e.nhf)}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums">{formatPrice(net)}</td>
                        <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{e.bankShort}</td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td className="px-3 py-2.5 text-xs uppercase tracking-wider">Totals</td>
                    <td />
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums">{formatPrice(STAFF.reduce((s, e) => s + e.base, 0))}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums">{formatPrice(STAFF.reduce((s, e) => s + e.allowances, 0))}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums">{formatPrice(STAFF.reduce((s, e) => s + e.commission, 0))}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">−{formatPrice(STAFF.reduce((s, e) => s + e.paye, 0))}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">−{formatPrice(STAFF.reduce((s, e) => s + e.pension, 0))}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">−{formatPrice(STAFF.reduce((s, e) => s + e.nhf, 0))}</td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums">{formatPrice(netThisMonth)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay run history */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-baseline justify-between gap-2 p-4">
            <div>
              <h3 className="text-sm font-semibold md:text-base">Pay-run history</h3>
              <p className="text-[11px] text-muted-foreground">Every run posts to Accounting + auto-files PAYE on the FIRS portal.</p>
            </div>
          </div>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Run</th>
                  <th className="px-3 py-2.5 font-medium">Period</th>
                  <th className="px-3 py-2.5 font-medium">Paid</th>
                  <th className="px-3 py-2.5 text-right font-medium">Employees</th>
                  <th className="px-3 py-2.5 text-right font-medium">Gross</th>
                  <th className="px-3 py-2.5 text-right font-medium">Taxes</th>
                  <th className="px-3 py-2.5 text-right font-medium">Net</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {RUNS.sort((a, b) => b.paidDate.localeCompare(a.paidDate)).map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-xs font-bold">{r.id}</p>
                      {r.reference && <p className="text-[10px] text-muted-foreground">PAYE · <span className="font-mono">{r.reference}</span></p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{r.period}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.paidDate}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums">{r.employees}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">{formatPrice(r.gross)}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">−{formatPrice(r.taxes)}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums">{formatPrice(r.net)}</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={STATUS_TONE[r.status]} withDot>{r.status}</StatusBadge></td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={downloadingRunId === r.id}
                        aria-label={`Download ${r.id} payslip summary`}
                        onClick={async () => {
                          setDownloadingRunId(r.id)
                          try {
                            await new Promise((res) => setTimeout(res, 300))
                            downloadRunSummary(r)
                            toast.success(`Downloaded ${r.id} payslip summary.`)
                          } finally {
                            setDownloadingRunId(null)
                          }
                        }}
                      >
                        <Download className={cn("h-3.5 w-3.5", downloadingRunId === r.id && "animate-pulse")} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Compliance + statutory */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold md:text-base">Statutory contributions</h3>
            <p className="text-[11px] text-muted-foreground">Rates applied automatically per Lagos / federal law. Adjust in <Link to="/settings/taxes" className="font-semibold text-brand hover:underline dark:text-primary">Tax Settings</Link>.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                { label: "PAYE (Lagos LIRS)",    rate: "Bands", base: "Gross pay" },
                { label: "Pension (RSA)",        rate: "8% + 10%", base: "8% employee, 10% employer" },
                { label: "NHF (Housing fund)",  rate: "2.5%", base: "Basic salary" },
                { label: "ITF (Industrial Training Fund)", rate: "1%",   base: "Annual payroll (> ₦50m payroll)" },
                { label: "NSITF (workplace insurance)",     rate: "1%",   base: "Gross monthly payroll" },
              ].map((c) => (
                <li key={c.label} className="flex items-baseline justify-between rounded-lg border border-border bg-background px-3 py-2">
                  <span>
                    <p className="text-sm font-semibold">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground">{c.base}</p>
                  </span>
                  <span className="text-sm font-bold tabular-nums">{c.rate}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* What happens on each run */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold md:text-base">What happens on a pay run</h3>
            <p className="text-[11px] text-muted-foreground">One click runs all of this in sequence — Pallio handles the chain end-to-end.</p>
            <ol className="mt-3 space-y-2 text-sm">
              {[
                { Icon: CircleDollarSign, label: "Debit your primary business bank account",          sub: "Authorised via direct-debit mandate" },
                { Icon: Wallet,           label: "Pay each employee into their saved bank account",    sub: `${STAFF.length} transfers · same-day via NIBSS` },
                { Icon: Receipt,          label: "Generate + email payslip PDFs to each employee",     sub: "Includes break-down + YTD totals" },
                { Icon: CheckCircle2,     label: "Post payroll entry to Accounting (Profit & Loss)",   sub: "OPEX · Salaries + wages line" },
                { Icon: Send,             label: "Auto-file PAYE on FIRS portal",                      sub: "Mirror to Tax Filings page" },
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <s.Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <ConnectionCard providerId="paystack" reason="Routes payroll transfers to staff bank accounts via Paystack Transfers." />

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { Icon: Users,        label: "Manage staff",      body: "Add / remove staff and set salaries.", href: "/settings/users" },
          { Icon: Wallet,       label: "Business bank",     body: "Account that payroll debits from.",     href: "/settings/payments/accounts" },
          { Icon: Receipt,      label: "Tax Filings",       body: "PAYE returns generated from each run.", href: "/accounting/taxes" },
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <PayslipPreview staff={STAFF} formatPrice={formatPrice} />
        </DialogContent>
      </Dialog>
    </ReportShell>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "brand" | "success" | "info" | "warning" | "danger" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "brand"   && "text-brand dark:text-primary",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "info"    && "text-sky-600 dark:text-sky-300",
          tone === "warning" && "text-amber-600 dark:text-amber-300",
          tone === "danger"  && "text-rose-600 dark:text-rose-400",
        )}>{value}</p>
        {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

void AlertTriangle; void ArrowRight; void Calendar; void Check

// Payslip preview list — shows the per-employee breakdown the
// approver would otherwise click "Send" without seeing. Keeps the
// approve step honest.
function PayslipPreview({ staff, formatPrice }: { staff: Employee[]; formatPrice: (n: number) => string }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold">Payslip preview · May 2026</h2>
        <p className="text-[11px] text-muted-foreground">Review each employee&apos;s net before approving the run. Mirrors the PDF that emails after approval.</p>
      </div>
      <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
        {staff.map((e) => {
          const gross = e.base + e.allowances + e.commission
          const ded = e.paye + e.pension + e.nhf
          const net = gross - ded
          return (
            <li key={e.id} className="grid grid-cols-2 gap-y-1 px-3 py-3 text-xs sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-2">
                <p className="text-sm font-semibold">{e.name}</p>
                <p className="text-[11px] text-muted-foreground">{e.role}</p>
                <p className="text-[10px] text-muted-foreground">{e.bankShort}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gross</p>
                <p className="tabular-nums">{formatPrice(gross)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Deductions</p>
                <p className="tabular-nums text-rose-600 dark:text-rose-400">−{formatPrice(ded)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net pay</p>
                <p className="text-sm font-bold tabular-nums">{formatPrice(net)}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function csvFromRows(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return ""
  const esc = (c: unknown) => {
    const s = String(c ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const keys = Object.keys(rows[0]!)
  return [
    keys.map(esc).join(","),
    ...rows.map((r) => keys.map((k) => esc(r[k])).join(",")),
  ].join("\n")
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function downloadRegisterCsv(rows: Record<string, string | number>[]) {
  const csv = csvFromRows(rows)
  triggerDownload(csv, `pallio-salary-register-${new Date().toISOString().slice(0, 10)}.csv`)
}

function downloadRunSummary(r: Run) {
  const csv = csvFromRows([
    {
      run: r.id,
      period: r.period,
      paid_date: r.paidDate,
      employees: r.employees,
      gross: r.gross,
      taxes: r.taxes,
      net: r.net,
      status: r.status,
      reference: r.reference ?? "",
    },
  ])
  triggerDownload(csv, `pallio-payroll-${r.id}.csv`)
}
