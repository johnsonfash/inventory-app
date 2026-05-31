import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  HelpCircle,
  Search,
  X,
} from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { type Period } from "@/components/reports/period-chips"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

import {
  bankLedgerLines,
  reconSummary,
  reconciledThrough,
  setReconciledThrough,
  toggleCleared,
} from "@/lib/accounting/reconcile"
import { seedExampleLedger } from "@/lib/accounting/ledger"

// Bank reconciliation — match every Pallio journal-entry hit on a
// bank account against the bank's official statement. Catch the
// stuff that's in Pallio but not the bank (timing) + stuff in the
// bank but not Pallio (fees, transfers we missed posting).

type Side = "bank" | "pallio"
type LineStatus = "matched" | "unmatched" | "needs-review"

type Line = {
  id: string
  date: string
  description: string
  amount: number
  side: Side
  ref?: string
  matchedTo?: string
  status: LineStatus
}

// Mock account being reconciled
const ACCOUNT = {
  id: "1020",
  name: "GTBank · Operating",
  shortNumber: "··· 4218",
  openingBalance: 5_840_000,
  bankClosingBalance: 6_240_000,
  statementPeriod: "May 1 – May 20, 2026",
  lastReconciledAt: "Apr 30, 2026",
}

// Pre-matched + auto-suggested pairs
const LINES: Line[] = [
  // Matched pairs (Pallio entry hits an identical bank line)
  { id: "B-001", side: "bank",   date: "May 20", description: "GTB · Paystack settlement",  ref: "PS-820041", amount:  244_674, status: "matched", matchedTo: "P-001" },
  { id: "P-001", side: "pallio", date: "May 20", description: "JE-2026-05-001 · POS sale", ref: "JE-2026-05-001", amount: 244_674, status: "matched", matchedTo: "B-001" },
  { id: "B-002", side: "bank",   date: "May 19", description: "Inward NIBSS · Cobalt",     ref: "NIB-99441", amount:  840_000, status: "matched", matchedTo: "P-002" },
  { id: "P-002", side: "pallio", date: "May 19", description: "JE-2026-05-018 · A/R Cobalt", ref: "JE-2026-05-018", amount: 840_000, status: "matched", matchedTo: "B-002" },
  { id: "B-003", side: "bank",   date: "May 15", description: "DR · Cobalt Distributors",    ref: "TRF-7891", amount: -420_000, status: "matched", matchedTo: "P-003" },
  { id: "P-003", side: "pallio", date: "May 15", description: "JE-2026-05-004 · A/P Cobalt", ref: "JE-2026-05-004", amount: -420_000, status: "matched", matchedTo: "B-003" },
  { id: "B-004", side: "bank",   date: "May 12", description: "Salary batch · NIBSS",        ref: "PAYROLL-MAY", amount: -2_466_000, status: "matched", matchedTo: "P-004" },
  { id: "P-004", side: "pallio", date: "May 12", description: "JE-2026-05-005 · May payroll", ref: "JE-2026-05-005", amount: -2_466_000, status: "matched", matchedTo: "B-004" },

  // Unmatched — only in bank (need a Pallio entry posted)
  { id: "B-005", side: "bank",   date: "May 18", description: "GTB · Monthly account fee",  ref: "FEE-MAY",   amount:    -3_500, status: "unmatched" },
  { id: "B-006", side: "bank",   date: "May 16", description: "Stamp duty",                  ref: "STMP-2026-05", amount:      -50, status: "unmatched" },
  { id: "B-007", side: "bank",   date: "May 14", description: "Inward · Walk-in customer",  ref: "UNK-2202",  amount:    62_000, status: "needs-review" },

  // Unmatched — only in Pallio (in transit / posted but bank not yet showing)
  { id: "P-005", side: "pallio", date: "May 20", description: "JE-2026-05-008 · Owner draw (draft)", ref: "JE-2026-05-008", amount: -300_000, status: "unmatched" },
  { id: "P-006", side: "pallio", date: "May 19", description: "JE-2026-05-022 · Cash deposit",      ref: "JE-2026-05-022", amount:  180_000, status: "unmatched" },
]

const STATUS_TONE: Record<LineStatus, StatusTone> = {
  matched:       "success",
  unmatched:     "warning",
  "needs-review":"danger",
}

type Filter = "all" | LineStatus

export default function Reconciliation() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))
  const { formatPrice } = useCurrency()
  const [period, setPeriod] = React.useState<Period>("30d")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [query, setQuery] = React.useState("")
  const [selectedPair, setSelectedPair] = React.useState<{ bank?: string; pallio?: string }>({})
  const [markingRec, setMarkingRec] = React.useState(false)
  const [recLocked, setRecLocked] = React.useState(false)

  const bankLines   = LINES.filter((l) => l.side === "bank")
  const palioLines  = LINES.filter((l) => l.side === "pallio")

  const matched      = LINES.filter((l) => l.status === "matched").length / 2
  const unmatched    = LINES.filter((l) => l.status === "unmatched").length
  const needsReview  = LINES.filter((l) => l.status === "needs-review").length

  // Reconciliation math
  const palioMovements = palioLines.reduce((s, l) => s + l.amount, 0)
  const palioClosing   = ACCOUNT.openingBalance + palioMovements
  const adjustments    = bankLines.filter((l) => l.status !== "matched").reduce((s, l) => s + l.amount, 0)
  const diff           = ACCOUNT.bankClosingBalance - (palioClosing + adjustments)

  const filteredBank   = filterLines(bankLines, filter, query)
  const filteredPallio = filterLines(palioLines, filter, query)

  const proposeMatch = () => {
    if (!selectedPair.bank || !selectedPair.pallio) {
      toast.error("Select one bank line + one Pallio entry first.")
      return
    }
    toast.success(`${selectedPair.bank} matched to ${selectedPair.pallio}.`)
    setSelectedPair({})
  }

  const exportRows = LINES.map((l) => ({
    id: l.id, side: l.side, date: l.date, description: l.description, ref: l.ref ?? "",
    amount: l.amount, status: l.status, matched_to: l.matchedTo ?? "",
  }))

  return (
    <ReportShell
      title="Bank Reconciliation"
      titleTooltip={
        <>
          Match every transaction on your bank statement against the
          corresponding journal entry in Pallio. Anything unmatched
          is a discrepancy — fees the bank charged you Pallio
          didn't know about, transfers in flight, or entries we
          posted that haven't cleared yet. Reconcile monthly to catch
          fraud + missing income early.
        </>
      }
      exportFilename={`pallio-reconciliation-${period}`}
      exportRows={exportRows}
      period={period}
      onPeriodChange={setPeriod}
    >
      {/* ACCT-4: real reconciliation from the ledger's own bank movements */}
      <LedgerReconcilePanel />

      {/* Account selector header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <Banknote className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Reconciling</p>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">{ACCOUNT.name} <span className="font-mono text-muted-foreground">{ACCOUNT.shortNumber}</span></h2>
                <p className="text-xs text-muted-foreground md:text-sm">
                  Statement period: <strong className="text-foreground">{ACCOUNT.statementPeriod}</strong> · last reconciled {ACCOUNT.lastReconciledAt}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={markingRec || recLocked}
                title={recLocked ? `Reconciled through ${ACCOUNT.statementPeriod}. Locked until next period.` : undefined}
                onClick={async () => {
                  setMarkingRec(true)
                  try {
                    await new Promise((r) => setTimeout(r, 350))
                    setRecLocked(true)
                    toast.success(`Reconciliation finalised for ${ACCOUNT.statementPeriod}.`, {
                      description: "Entries are now locked. Next reconciliation due Jun 30, 2026.",
                    })
                  } catch {
                    toast.error("Could not finalise reconciliation. Try again.")
                  } finally {
                    setMarkingRec(false)
                  }
                }}
              >
                <CheckCircle2 className={cn("h-3.5 w-3.5", markingRec && "animate-pulse")} />{" "}
                {markingRec ? "Marking…" : recLocked ? "Reconciled · locked" : "Mark reconciled"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation math summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold md:text-base">Balance check</h3>
            <StatusBadge tone={Math.abs(diff) < 100 ? "success" : "danger"} withDot>
              {Math.abs(diff) < 100 ? "Balanced" : `Off by ${formatPrice(Math.abs(diff))}`}
            </StatusBadge>
          </div>
          <ul className="mt-3 divide-y divide-border text-sm">
            <Row label="Opening balance · Pallio"            value={ACCOUNT.openingBalance} formatPrice={formatPrice} />
            <Row label="+ Pallio activity this period"        value={palioMovements}          formatPrice={formatPrice} />
            <Row label="= Pallio closing balance"              value={palioClosing}            bold tone="info" formatPrice={formatPrice} />
            <Row label="+ Bank-only adjustments (fees, etc.)" value={adjustments}             formatPrice={formatPrice} />
            <Row label="= Should match bank closing"           value={palioClosing + adjustments} bold formatPrice={formatPrice} />
            <Row label="Bank statement closing"                 value={ACCOUNT.bankClosingBalance} formatPrice={formatPrice} />
            <Row label="Difference"                            value={diff}                    bold tone={Math.abs(diff) < 100 ? "success" : "danger"} formatPrice={formatPrice} />
          </ul>
          {Math.abs(diff) >= 100 && (
            <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="mr-1.5 inline h-3 w-3" />
              You're {formatPrice(Math.abs(diff))} off. Either a transaction is missing from Pallio (post a journal) or from the bank (it's in transit).
            </p>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <section className="grid gap-3 lg:grid-cols-4">
        <Tile label="Matched pairs"  value={String(matched)}      tone="success" sub={`${matched * 2} of ${LINES.length} lines`} />
        <Tile label="Unmatched"      value={String(unmatched)}     tone="warning" sub="post or wait for clear" />
        <Tile label="Needs review"   value={String(needsReview)}   tone={needsReview > 0 ? "danger" : "neutral"} sub="bank shows source unknown" />
        <Tile label="Match progress" value={`${Math.round((matched * 2 / LINES.length) * 100)}%`} tone="brand" sub="auto-suggest finds 89%" />
      </section>

      {/* Filter chips + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
          {(["all", "matched", "unmatched", "needs-review"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                filter === f
                  ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f.replace("-", " ")}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", filter === f ? "bg-white/20" : "bg-muted")}>
                {f === "all" ? LINES.length : LINES.filter((l) => l.status === f).length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] sm:ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search line items…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Selected pair bar */}
      {(selectedPair.bank || selectedPair.pallio) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand-soft/40 px-4 py-2.5 dark:bg-primary/15">
          <p className="text-sm">
            Match candidate: <strong className="font-mono">{selectedPair.bank ?? "—"}</strong>
            <ArrowLeftRight className="mx-2 inline h-3.5 w-3.5 text-brand dark:text-primary" />
            <strong className="font-mono">{selectedPair.pallio ?? "—"}</strong>
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedPair({})}>Clear</Button>
            <Button
              size="sm"
              onClick={proposeMatch}
              disabled={!selectedPair.bank || !selectedPair.pallio}
              title={(!selectedPair.bank || !selectedPair.pallio) ? "Select one bank line and one Pallio entry to confirm match" : undefined}
              aria-label={(!selectedPair.bank || !selectedPair.pallio) ? "Select one bank line and one Pallio entry to confirm match" : undefined}
            >
              <Check className="h-3.5 w-3.5" /> Confirm match
            </Button>
          </div>
        </div>
      )}

      {/* Two-column ledger */}
      <div className="grid gap-3 lg:grid-cols-2">
        <LedgerColumn
          title="Bank statement"
          subtitle="What your bank says happened"
          icon={Banknote}
          lines={filteredBank}
          selected={selectedPair.bank}
          onSelect={(id) => setSelectedPair((p) => ({ ...p, bank: p.bank === id ? undefined : id }))}
          formatPrice={formatPrice}
        />
        <LedgerColumn
          title="Pallio journal"
          subtitle="What we posted to the ledger"
          icon={FileText}
          lines={filteredPallio}
          selected={selectedPair.pallio}
          onSelect={(id) => setSelectedPair((p) => ({ ...p, pallio: p.pallio === id ? undefined : id }))}
          formatPrice={formatPrice}
        />
      </div>

      {/* History */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold md:text-base">Reconciliation history</h3>
          <ul className="mt-3 divide-y divide-border">
            {[
              { period: "Apr 2026", date: "Apr 30",  diff:      0, by: "Aisha Nwosu", status: "balanced" as const },
              { period: "Mar 2026", date: "Mar 31",  diff:   8_400, by: "Aisha Nwosu", status: "balanced" as const },
              { period: "Feb 2026", date: "Feb 29",  diff:      0, by: "Mia Chen",    status: "balanced" as const },
              { period: "Jan 2026", date: "Feb 2",   diff: -24_000, by: "Mia Chen",    status: "adjusted" as const },
            ].map((h) => (
              <li key={h.period} className="flex items-center gap-3 py-2.5">
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  h.status === "balanced" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                )}>
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{h.period}</p>
                  <p className="text-[11px] text-muted-foreground">{h.date} · by {h.by}</p>
                </div>
                <p className={cn("text-sm font-bold tabular-nums", h.diff === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-300")}>
                  {h.diff === 0 ? "Balanced" : `Adj ${formatPrice(h.diff)}`}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Cross-links */}
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { Icon: Banknote, label: "Receiving Accounts", body: "Manage the accounts that get reconciled.",   href: "/settings/payments/business-accounts" },
          { Icon: FileText, label: "Journal Entries",     body: "Drill into the ledger entries.",             href: "/accounting/journal-entries" },
          { Icon: HelpCircle, label: "How reconciliation works", body: "Plain-English walkthrough.",         href: "/faq" },
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

// ---------- Helpers ----------
function filterLines(lines: Line[], filter: Filter, query: string): Line[] {
  const q = query.trim().toLowerCase()
  return lines.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false
    if (!q) return true
    return l.description.toLowerCase().includes(q) || (l.ref?.toLowerCase().includes(q) ?? false)
  })
}

function LedgerColumn({ title, subtitle, icon: Icon, lines, selected, onSelect, formatPrice }: {
  title: string
  subtitle: string
  icon: typeof Banknote
  lines: Line[]
  selected: string | undefined
  onSelect: (id: string) => void
  formatPrice: (n: number) => string
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold">{title}</p>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {lines.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No lines match.</div>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((l) => {
              const isSelected = selected === l.id
              const canSelect = l.status !== "matched"
              return (
                <li
                  key={l.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 transition-colors",
                    canSelect && "cursor-pointer hover:bg-accent/30",
                    !canSelect && "opacity-70",
                    isSelected && "bg-brand-soft/40 dark:bg-primary/10",
                  )}
                  onClick={() => canSelect && onSelect(l.id)}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {l.status === "matched" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isSelected ? (
                      <Check className="h-4 w-4 text-brand dark:text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <p className="truncate text-xs font-semibold">{l.description}</p>
                      <StatusBadge tone={STATUS_TONE[l.status]}>{l.status.replace("-", " ")}</StatusBadge>
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">{l.date} {l.ref && `· ${l.ref}`}</p>
                  </div>
                  <p className={cn(
                    "shrink-0 text-sm font-bold tabular-nums",
                    l.amount < 0 && "text-rose-600 dark:text-rose-400",
                    l.amount > 0 && "text-emerald-600 dark:text-emerald-400",
                  )}>
                    {l.amount < 0 ? "−" : ""}{formatPrice(Math.abs(l.amount))}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, value, bold, tone, formatPrice }: { label: string; value: number; bold?: boolean; tone?: "info" | "success" | "danger"; formatPrice: (n: number) => string }) {
  return (
    <li className={cn("flex items-baseline justify-between py-2", bold && "border-t border-border pt-3 mt-1")}>
      <span className={cn(bold ? "font-bold" : "text-muted-foreground")}>{label}</span>
      <span className={cn(
        "tabular-nums",
        bold ? "text-lg font-bold" : "text-sm",
        tone === "info"    && "text-sky-600 dark:text-sky-300",
        tone === "success" && "text-emerald-600 dark:text-emerald-400",
        tone === "danger"  && "text-rose-600 dark:text-rose-400",
        !tone && value < 0 && "text-rose-600 dark:text-rose-400",
      )}>{value < 0 ? "−" : ""}{formatPrice(Math.abs(value))}</span>
    </li>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "brand" | "success" | "info" | "warning" | "danger" | "neutral" }) {
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

// ACCT-4: reconcile the ledger's own bank movements. Tick off each line
// that appears on the statement; the cleared balance should match the
// statement's closing balance.
function LedgerReconcilePanel() {
  const { formatPrice } = useCurrency()
  const [version, setVersion] = React.useState(0)
  const [stmt, setStmt] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  React.useEffect(() => { seedExampleLedger() }, [])
  const lines = React.useMemo(() => bankLedgerLines("1010"), [version])
  const summary = React.useMemo(() => reconSummary("1010"), [version])
  const through = reconciledThrough()
  const stmtNum = Number(stmt) || 0
  const diff = stmt.trim() ? summary.difference(stmtNum) : summary.bookBalance - summary.clearedBalance

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Reconcile from the ledger · Bank</p>
            <p className="text-[11px] text-muted-foreground">
              Tick each movement that shows on your statement. {through ? `Reconciled through ${through}.` : "Not yet reconciled."}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <label className="text-[11px] text-muted-foreground">
              Statement balance
              <input
                type="number"
                value={stmt}
                onChange={(e) => setStmt(e.target.value)}
                placeholder="0.00"
                className="mt-1 block h-9 w-32 rounded-lg border border-input bg-background px-2 text-sm outline-none"
              />
            </label>
            <Button
              size="sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                try {
                  await new Promise((r) => setTimeout(r, 300))
                  const today = new Date().toISOString().slice(0, 10)
                  setReconciledThrough(today)
                  setVersion((v) => v + 1)
                  toast.success(`Reconciled through ${today}.`, { description: "Cleared entries are now locked." })
                } catch {
                  toast.error("Could not save reconciliation. Try again.")
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? "Saving…" : "Mark reconciled"}
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Tile label="Book balance" value={formatPrice(summary.bookBalance)} tone="info" />
          <Tile label="Cleared" value={formatPrice(summary.clearedBalance)} tone="success" sub={`${summary.unclearedCount} uncleared`} />
          <Tile label="Difference" value={formatPrice(diff)} tone={Math.abs(diff) < 0.01 ? "success" : "warning"} sub={Math.abs(diff) < 0.01 ? "reconciled" : "to clear"} />
        </div>

        {lines.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  checked={l.cleared}
                  onChange={() => { toggleCleared(l.key); setVersion((v) => v + 1) }}
                  aria-label={`Clear ${l.memo}`}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.memo}</p>
                  <p className="text-[11px] text-muted-foreground">{l.date}</p>
                </div>
                <span className={cn("text-sm font-semibold tabular-nums", l.amount < 0 ? "text-rose-600 dark:text-rose-400" : "")}>
                  {l.amount < 0 ? "−" : "+"}{formatPrice(Math.abs(l.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

void X
