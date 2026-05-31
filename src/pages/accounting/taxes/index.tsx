import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { AlertTriangle, Calendar, CheckCircle2, ChevronRight, Download, FileText, Globe, Receipt, ShieldCheck } from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { PeriodChips, type Period } from "@/components/reports/period-chips"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"
import { seedExampleLedger, vatSummary } from "@/lib/accounting/ledger"

type FilingStatus = "filed" | "due" | "overdue" | "draft"

type Filing = {
  id: string
  kind: "VAT" | "WHT" | "PAYE" | "CIT"
  period: string
  due: string
  taxable: number
  taxAmount: number
  status: FilingStatus
  reference?: string
}

const SEED_FILINGS: Filing[] = [
  { id: "VAT-2026-04", kind: "VAT",  period: "April 2026",   due: "May 21, 2026",  taxable: 4_182_400, taxAmount:  313_680, status: "due" },
  { id: "WHT-2026-04", kind: "WHT",  period: "April 2026",   due: "May 21, 2026",  taxable:   840_000, taxAmount:   42_000, status: "due" },
  { id: "PAYE-2026-04",kind: "PAYE", period: "April 2026",   due: "May 10, 2026",  taxable: 1_840_000, taxAmount:  168_400, status: "overdue" },
  { id: "VAT-2026-03", kind: "VAT",  period: "March 2026",   due: "April 21, 2026",taxable: 3_840_000, taxAmount:  288_000, status: "filed", reference: "FIRS-9X4-2826" },
  { id: "VAT-2026-02", kind: "VAT",  period: "February 2026",due: "March 21, 2026",taxable: 3_240_000, taxAmount:  243_000, status: "filed", reference: "FIRS-9X4-2814" },
  { id: "CIT-2025",    kind: "CIT",  period: "FY 2025",      due: "June 30, 2026", taxable:18_400_000, taxAmount: 5_520_000, status: "draft" },
  { id: "VAT-2026-01", kind: "VAT",  period: "January 2026", due: "Feb 21, 2026",  taxable: 3_120_000, taxAmount:  234_000, status: "filed", reference: "FIRS-9X4-2798" },
]

const STATUS_TONE: Record<FilingStatus, StatusTone> = {
  filed:    "success",
  due:      "warning",
  overdue:  "danger",
  draft:    "neutral",
}

const RATES = [
  { kind: "VAT",  rate: "7.5%",  base: "Net sales",                  applies: "Most goods + services" },
  { kind: "WHT",  rate: "5%",    base: "Vendor payments",            applies: "Professional services + contractors" },
  { kind: "PAYE", rate: "Bands", base: "Employee gross pay",         applies: "Lagos State residents" },
  { kind: "CIT",  rate: "30%",   base: "Net profit",                 applies: "Annual companies income tax" },
]

export default function Taxes() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))
  const { formatPrice } = useCurrency()
  const isMobile = useIsMobile()
  const [period, setPeriod] = React.useState<Period>("ytd")
  // ACCT-6: the real VAT figure, derived from the ledger's VAT Payable
  // account — output tax collected, input tax reclaimable, net to remit.
  const vat = React.useMemo(() => { seedExampleLedger(); return vatSummary() }, [])

  // Filings live in React state so File/Review/Receipt actions can
  // optimistically flip the row's badge + button without a refresh.
  const [filings, setFilings] = React.useState<Filing[]>(SEED_FILINGS)
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  const due       = filings.filter((f) => f.status === "due" || f.status === "overdue").reduce((s, f) => s + f.taxAmount, 0)
  const filedYtd  = filings.filter((f) => f.status === "filed").reduce((s, f) => s + f.taxAmount, 0)
  const overdueCount = filings.filter((f) => f.status === "overdue").length
  const draftCount   = filings.filter((f) => f.status === "draft").length
  const [exporting, setExporting] = React.useState(false)

  const onFilingAction = async (f: Filing) => {
    if (f.status === "filed") {
      toast.success(`Downloaded ${f.id} certificate.`)
      return
    }
    // Optimistic flip → filed, then confirm via toast. If the backend
    // ever rejects, restore the previous status.
    setPendingId(f.id)
    const previous = f.status
    setFilings((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: "filed", reference: x.reference ?? `FIRS-PENDING-${f.id}` } : x)))
    try {
      await new Promise((r) => setTimeout(r, 250))
      toast.success(`${f.id} marked filed — Pallio will send the receipt.`)
    } catch {
      setFilings((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: previous } : x)))
      toast.error(`Could not mark ${f.id} filed. Try again.`)
    } finally {
      setPendingId(null)
    }
  }

  const exportRows = filings.map((f) => ({
    filing: f.id, kind: f.kind, period: f.period, due: f.due,
    taxable: f.taxable, tax: f.taxAmount, status: f.status, reference: f.reference ?? "",
  }))

  return (
    <ReportShell
      title="Taxes & filings"
      titleTooltip={
        <>
          VAT, withholding (WHT), payroll (PAYE), and annual company
          income tax (CIT) tracked in one place. Pallio computes from
          your books — you just review + file.
        </>
      }
      exportFilename={`pallio-tax-${period}`}
      exportRows={exportRows}
      period={period}
      onPeriodChange={setPeriod}
    >
      <section className="grid gap-3 lg:grid-cols-4">
        <Tile label="Due now"    value={formatPrice(due)}        tone={overdueCount > 0 ? "danger" : "warning"} sub={overdueCount > 0 ? `${overdueCount} overdue · file today` : "next: May 21"} />
        <Tile label="Filed YTD"  value={formatPrice(filedYtd)}  tone="success" sub={`${filings.filter((f) => f.status === "filed").length} returns`} />
        <Tile label="Drafts"     value={String(draftCount)}      tone="neutral" sub="awaiting review" />
        <Tile label="Compliance"  value="On track"                tone={overdueCount > 0 ? "warning" : "success"} sub="FIRS + LIRS" />
      </section>

      {/* ACCT-6: VAT computed live from the ledger (ties the filing figure
          to the books — not a separate estimate) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">VAT payable — from your ledger</p>
              <p className="text-[11px] text-muted-foreground">
                Output tax collected on sales, less input tax on purchases. This equals your books.
              </p>
            </div>
            <div className="flex items-center gap-5 text-right">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Output</p>
                <p className="text-sm font-bold tabular-nums">{formatPrice(vat.outputTax)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Input</p>
                <p className="text-sm font-bold tabular-nums">{formatPrice(vat.inputTax)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Net payable</p>
                <p className="text-lg font-bold tabular-nums text-brand dark:text-primary">{formatPrice(vat.netPayable)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filings list */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-baseline justify-between gap-2 p-4">
            <div>
              <h3 className="text-sm font-semibold md:text-base">Tax filings</h3>
              <p className="text-[11px] text-muted-foreground">VAT + WHT + PAYE + annual CIT — generated from your books.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={async () => {
                setExporting(true)
                try {
                  await new Promise((r) => setTimeout(r, 300))
                  downloadFilingsCsv(exportRows)
                  toast.success("Filings exported · ready for your accountant.")
                } finally {
                  setExporting(false)
                }
              }}
            >
              <Download className={cn("h-3.5 w-3.5", exporting && "animate-pulse")} /> {exporting ? "Preparing…" : "Export"}
            </Button>
          </div>
          {isMobile ? (
            /* Mobile: card per filing — an 8-column table would scroll
               sideways off a phone. Same data, stacked. */
            <ul className="divide-y divide-border border-t border-border">
              {filings.map((f) => (
                <li key={f.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold">{f.kind}</span>
                        <p className="truncate font-mono text-xs font-bold">{f.id}</p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{f.period} · due {f.due}</p>
                      {f.reference && <p className="text-[10px] text-muted-foreground">Ref · <span className="font-mono">{f.reference}</span></p>}
                    </div>
                    <StatusBadge tone={STATUS_TONE[f.status]} withDot>{f.status}</StatusBadge>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className="text-[11px] text-muted-foreground">
                      <span className="tabular-nums">{formatPrice(f.taxable)}</span> taxable ·{" "}
                      <span className="font-bold tabular-nums text-foreground">{formatPrice(f.taxAmount)}</span> tax
                    </div>
                    <Button
                      size="sm"
                      variant={f.status === "filed" ? "ghost" : "outline"}
                      disabled={pendingId === f.id}
                      onClick={() => onFilingAction(f)}
                    >
                      {pendingId === f.id ? "Filing…" : f.status === "filed" ? "Receipt" : f.status === "draft" ? "Review" : "File now"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Filing</th>
                    <th className="px-3 py-2.5 font-medium">Kind</th>
                    <th className="px-3 py-2.5 font-medium">Period</th>
                    <th className="px-3 py-2.5 font-medium">Due</th>
                    <th className="px-3 py-2.5 text-right font-medium">Taxable</th>
                    <th className="px-3 py-2.5 text-right font-medium">Tax</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filings.map((f) => (
                    <tr key={f.id} className="transition-all duration-150 hover:bg-accent/30">
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-xs font-bold">{f.id}</p>
                        {f.reference && <p className="text-[10px] text-muted-foreground">Ref · <span className="font-mono">{f.reference}</span></p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold">{f.kind}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{f.period}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{f.due}</td>
                      <td className="px-3 py-2.5 text-right text-xs tabular-nums">{formatPrice(f.taxable)}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">{formatPrice(f.taxAmount)}</td>
                      <td className="px-3 py-2.5"><StatusBadge tone={STATUS_TONE[f.status]} withDot>{f.status}</StatusBadge></td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant={f.status === "filed" ? "ghost" : "outline"}
                          disabled={pendingId === f.id}
                          onClick={() => onFilingAction(f)}
                        >
                          {pendingId === f.id ? "Filing…" : f.status === "filed" ? "Receipt" : f.status === "draft" ? "Review" : "File now"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rates reference */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold md:text-base">Rate reference</h3>
          <p className="text-[11px] text-muted-foreground">Nigerian tax rates Pallio applies automatically. Update under <Link to="/settings/taxes" className="font-semibold text-brand hover:underline dark:text-primary">Settings → Taxes</Link>.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {RATES.map((r) => (
              <div key={r.kind} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold">{r.kind}</span>
                  <span className="text-base font-bold tabular-nums">{r.rate}</span>
                </div>
                <p className="mt-1 text-xs font-semibold">{r.base}</p>
                <p className="text-[11px] text-muted-foreground">{r.applies}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance notes */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold">FIRS + LIRS compliance</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pallio computes VAT on every sale + WHT on every vendor payment + PAYE on every payslip — based on your live numbers. We surface what's due so nothing slips. <strong className="text-foreground">You still file the returns through TaxProMax or your accountant</strong> — Pallio just gives you the right numbers.
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-4">
                {[
                  { Icon: CheckCircle2, label: "TIN on file" },
                  { Icon: CheckCircle2, label: "FIRS-compliant VAT invoices" },
                  { Icon: CheckCircle2, label: "WHT certificates auto-generated" },
                  { Icon: AlertTriangle, label: "PAYE overdue · file today" },
                ].map((c) => (
                  <li key={c.label} className="inline-flex items-center gap-1.5">
                    <c.Icon className={cn("h-3 w-3", c.Icon === AlertTriangle ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-400")} />
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConnectionCard providerId="quickbooks" reason="Mirror filings into QuickBooks so your accountant has the same numbers Pallio shows." />

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { Icon: FileText, label: "Balance sheet",   body: "Net worth snapshot.",                          href: "/accounting/balance-sheet" },
          { Icon: Receipt,  label: "Profit & Loss",   body: "Income statement.",                            href: "/accounting/profit-loss" },
          { Icon: Globe,    label: "TaxProMax portal", body: "File this directly on the FIRS portal.",       href: "https://taxpromax.firs.gov.ng/" },
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
    </ReportShell>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "success" | "warning" | "danger" | "neutral" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-600 dark:text-amber-300",
          tone === "danger"  && "text-rose-600 dark:text-rose-400",
        )}>{value}</p>
        {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

void Calendar

function downloadFilingsCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) return
  const esc = (c: unknown) => {
    const s = String(c ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const keys = Object.keys(rows[0]!)
  const csv = [keys.map(esc).join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `pallio-tax-filings-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
