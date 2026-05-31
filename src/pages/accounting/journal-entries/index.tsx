import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Plus,
  Search,
} from "lucide-react"
import { ReportShell } from "@/components/reports/report-shell"
import { type Period } from "@/components/reports/period-chips"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"
import {
  getAccount,
  isBalanced,
  listEntries,
  loadAccounts,
  periodLock,
  postEntry,
  reverseEntry,
  seedExampleLedger,
  setPeriodLock,
  trialBalance,
} from "@/lib/accounting/ledger"

type EntryStatus = "posted" | "draft" | "void"
type EntrySource = "system" | "manual" | "import"

type JournalLine = {
  account: string // code
  accountName: string
  debit: number
  credit: number
}

type Journal = {
  id: string
  date: string
  description: string
  reference?: string
  source: EntrySource
  origin: string
  status: EntryStatus
  postedBy: string
  lines: JournalLine[]
}

// Derive the page's journals from the real ledger (lib/accounting/ledger).
// Balances + balance-check are now genuine, not mock. ACCT-1.
function deriveJournals(): Journal[] {
  seedExampleLedger()
  return listEntries().map((e) => ({
    id: e.id,
    date: new Date(e.date).toLocaleDateString(),
    description: e.memo,
    reference: e.sourceRef,
    source: e.source,
    origin: e.reverses ? "Reversal" : e.source === "system" ? "Auto" : e.source === "import" ? "Import" : "Manual",
    status: e.reversedBy ? "void" : "posted",
    postedBy: e.source === "system" ? "Pallio (auto)" : "You",
    lines: e.lines.map((l) => {
      const acct = getAccount(l.accountId)
      return { account: acct?.code ?? l.accountId, accountName: acct?.name ?? l.accountId, debit: l.debit, credit: l.credit }
    }),
  }))
}

const STATUS_TONE: Record<EntryStatus, StatusTone> = {
  posted: "success",
  draft:  "warning",
  void:   "neutral",
}

const SOURCE_TONE: Record<EntrySource, StatusTone> = {
  system: "info",
  manual: "brand",
  import: "warning",
}

type Filter = "all" | EntryStatus | EntrySource

export default function JournalEntries() {
  const [version, setVersion] = React.useState(0)
  useRegisterPageRefresh(React.useCallback(async () => { setVersion((v) => v + 1); await new Promise((r) => setTimeout(r, 300)) }, []))
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const [period, setPeriod] = React.useState<Period>("30d")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [query, setQuery] = React.useState("")
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = React.useState(false)
  const [tbOpen, setTbOpen] = React.useState(false)
  // Real journal entries, rebuilt on refresh / after posting.
  const JOURNALS = React.useMemo(() => deriveJournals(), [version])
  const reload = () => setVersion((v) => v + 1)

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return JOURNALS.filter((j) => {
      if (filter !== "all") {
        if (filter === "posted" || filter === "draft" || filter === "void") {
          if (j.status !== filter) return false
        } else if (j.source !== filter) return false
      }
      if (!q) return true
      return (
        j.id.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        (j.reference?.toLowerCase().includes(q) ?? false) ||
        j.lines.some((l) => l.accountName.toLowerCase().includes(q) || l.account.includes(q))
      )
    })
  }, [filter, query, JOURNALS])

  const posted = JOURNALS.filter((j) => j.status === "posted")
  const drafts = JOURNALS.filter((j) => j.status === "draft")
  const totalDebits = posted.flatMap((j) => j.lines).reduce((s, l) => s + l.debit, 0)
  const balanced = posted.flatMap((j) => j.lines).reduce((s, l) => s + l.debit - l.credit, 0) === 0

  const counts: Record<Filter, number> = {
    all:     JOURNALS.length,
    posted:  posted.length,
    draft:   drafts.length,
    void:    JOURNALS.filter((j) => j.status === "void").length,
    system:  JOURNALS.filter((j) => j.source === "system").length,
    manual:  JOURNALS.filter((j) => j.source === "manual").length,
    import:  JOURNALS.filter((j) => j.source === "import").length,
  }

  const exportRows = JOURNALS.flatMap((j) =>
    j.lines.map((l) => ({
      id: j.id, date: j.date, description: j.description, reference: j.reference ?? "",
      source: j.source, status: j.status, account_code: l.account, account_name: l.accountName,
      debit: l.debit, credit: l.credit,
    })),
  )

  return (
    <ReportShell
      title="Journal Entries"
      titleTooltip={
        <>
          A receipt for every money move Pallio has made in your books.
          Each entry has two halves — money came <em>out of</em> one
          account and went <em>into</em> another (accountants call this
          "debit" and "credit"). System entries happen automatically
          when you make a sale, run payroll, pay a supplier, etc.
          Manual entries are for one-off adjustments your accountant
          raises (writing down value of old equipment, spreading the
          cost of yearly rent across months, etc.).
        </>
      }
      exportFilename={`pallio-journal-${period}`}
      exportRows={exportRows}
      period={period}
      onPeriodChange={setPeriod}
    >
      {/* KPIs */}
      <section className="grid gap-3 lg:grid-cols-4">
        <Tile label="Entries posted"     value={String(posted.length)}      tone="success" sub="balanced" />
        <Tile label="Drafts"             value={String(drafts.length)}      tone="warning" sub="awaiting review" />
        <Tile label="Total debits posted" value={formatPrice(totalDebits)}  tone="info"    sub="= total credits" />
        <Tile label="Balance check"      value={balanced ? "Balanced" : "Off"} tone={balanced ? "success" : "danger"} sub={balanced ? "debits = credits" : "investigate now"} />
      </section>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">{filtered.length} entries · {filtered.flatMap((j) => j.lines).length} line items</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // ACCT-7: real general-ledger CSV export — every posted line,
              // ready to hand to an accountant or import elsewhere.
              if (exportRows.length === 0) return
              const headers = Object.keys(exportRows[0]!)
              const esc = (c: unknown) => `"${String(c).replace(/"/g, '""')}"`
              const csv = [
                headers.map(esc).join(","),
                ...exportRows.map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(",")),
              ].join("\n")
              const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
              const a = document.createElement("a")
              a.href = url
              a.download = `pallio-general-ledger-${new Date().toISOString().slice(0, 10)}.csv`
              a.click()
              URL.revokeObjectURL(url)
              toast.success(`Exported ${exportRows.length} ledger lines to CSV.`)
            }}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10)
              setPeriodLock(today)
              toast.success(`Books locked through ${today}. New entries must be dated after.`)
              reload()
            }}
            title={periodLock() ? `Locked through ${periodLock()}` : "Lock the books up to today"}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> {periodLock() ? `Locked · ${periodLock()}` : "Close period"}
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Manual entry
          </Button>
        </div>
      </div>

      {/* Filter chips + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
          {(["all", "posted", "draft", "void", "system", "manual"] as const).map((f) => (
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
              {f === "all" ? "All" : f}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", filter === f ? "bg-white/20" : "bg-muted")}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] sm:ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search description, ref, account…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Journal list */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No journal entries match.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((j) => {
                const isExpanded = expanded.has(j.id)
                const debits  = j.lines.reduce((s, l) => s + l.debit, 0)
                const credits = j.lines.reduce((s, l) => s + l.credit, 0)
                return (
                  <li key={j.id}>
                    {/* Summary row */}
                    <button
                      type="button"
                      onClick={() => toggle(j.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </span>
                      <div className="hidden w-32 shrink-0 sm:block">
                        <p className="font-mono text-xs font-bold">{j.id}</p>
                        <p className="text-[10px] text-muted-foreground">{j.date}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">{j.description}</p>
                          <StatusBadge tone={SOURCE_TONE[j.source]}>{j.origin}</StatusBadge>
                          <StatusBadge tone={STATUS_TONE[j.status]} withDot>{j.status}</StatusBadge>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                          <span className="font-mono">{j.id}</span> · {j.date} · {j.lines.length} lines
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground hidden sm:block">
                          {j.lines.length} lines · {j.postedBy}{j.reference && ` · ref ${j.reference}`}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-bold tabular-nums">{formatPrice(debits)}</p>
                    </button>

                    {/* Line items */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 px-4 py-3 sm:px-8">
                        {isMobile ? (
                          <ul className="space-y-2">
                            {j.lines.map((l, i) => (
                              <li key={i} className="rounded-lg border border-border bg-card p-2.5">
                                <div className="flex items-baseline justify-between gap-2">
                                  <Link to="/accounting/chart-of-accounts" className="font-mono text-[11px] font-bold text-brand hover:underline dark:text-primary">
                                    {l.account}
                                  </Link>
                                  <p className="text-xs font-bold tabular-nums">
                                    {l.debit > 0 ? formatPrice(l.debit) : ""}
                                    {l.credit > 0 ? <span className="text-rose-600 dark:text-rose-400">({formatPrice(l.credit)})</span> : ""}
                                  </p>
                                </div>
                                <p className="text-xs">{l.accountName}</p>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {l.debit > 0 ? "debit" : "credit"}
                                </p>
                              </li>
                            ))}
                            <li className="flex items-baseline justify-between border-t border-border pt-2 text-xs font-bold">
                              <span>Totals</span>
                              <span className="font-mono tabular-nums">{formatPrice(debits)} / {formatPrice(credits)}</span>
                            </li>
                          </ul>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              <tr>
                                <th className="py-1.5 text-left font-medium">Code</th>
                                <th className="py-1.5 text-left font-medium">Account</th>
                                <th className="py-1.5 text-right font-medium">Debit</th>
                                <th className="py-1.5 text-right font-medium">Credit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {j.lines.map((l, i) => (
                                <tr key={i}>
                                  <td className="py-1.5">
                                    <Link to="/accounting/chart-of-accounts" className="font-mono font-bold text-brand hover:underline dark:text-primary">
                                      {l.account}
                                    </Link>
                                  </td>
                                  <td className="py-1.5">{l.accountName}</td>
                                  <td className="py-1.5 text-right tabular-nums">{l.debit > 0 ? formatPrice(l.debit) : ""}</td>
                                  <td className="py-1.5 text-right tabular-nums text-rose-600 dark:text-rose-400">{l.credit > 0 ? formatPrice(l.credit) : ""}</td>
                                </tr>
                              ))}
                              <tr className="border-t border-border font-bold">
                                <td colSpan={2} className="py-1.5">Totals</td>
                                <td className="py-1.5 text-right tabular-nums">{formatPrice(debits)}</td>
                                <td className="py-1.5 text-right tabular-nums">{formatPrice(credits)}</td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                        {j.status === "posted" && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                reverseEntry(j.id)
                                toast.success(`Reversed ${j.description} with a mirror entry.`)
                                reload()
                              }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Reverse
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Cross-links */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Link to="/accounting/chart-of-accounts" className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
          <FileText className="h-4 w-4 text-brand dark:text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Chart of Accounts</p>
            <p className="truncate text-[11px] text-muted-foreground">The account list every entry references.</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
        <Link to="/accounting/reconciliation" className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
          <Clock className="h-4 w-4 text-brand dark:text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Reconciliation</p>
            <p className="truncate text-[11px] text-muted-foreground">Match Pallio entries against bank statement.</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
        <button
          type="button"
          onClick={() => setTbOpen(true)}
          className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-brand/40 hover:bg-accent/40"
        >
          <Download className="h-4 w-4 text-brand dark:text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Trial balance</p>
            <p className="truncate text-[11px] text-muted-foreground">Sum of all account balances — should net to zero.</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <ManualEntryForm onDone={() => { reload(); setFormOpen(false) }} onCancel={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={tbOpen} onOpenChange={setTbOpen}>
        <DialogContent className="max-w-2xl">
          <TrialBalanceView formatPrice={formatPrice} />
        </DialogContent>
      </Dialog>
    </ReportShell>
  )
}

// The headline ACCT-1 capability: a manual journal that will NOT post
// unless debits === credits. The ledger enforces it too (postEntry throws),
// but the form gates the button + shows a live balance so the cashier/
// bookkeeper sees it before trying.
function ManualEntryForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { formatPrice } = useCurrency()
  const accounts = React.useMemo(() => loadAccounts(), [])
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = React.useState("")
  const [lines, setLines] = React.useState<{ accountId: string; debit: string; credit: string }[]>([
    { accountId: "", debit: "", credit: "" },
    { accountId: "", debit: "", credit: "" },
  ])

  const parsed = lines
    .filter((l) => l.accountId)
    .map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 }))
  const totalDebit = Math.round(parsed.reduce((s, l) => s + l.debit, 0) * 100) / 100
  const totalCredit = Math.round(parsed.reduce((s, l) => s + l.credit, 0) * 100) / 100
  const balanced = isBalanced({ lines: parsed })
  const canPost = balanced && memo.trim().length > 0

  const setLine = (i: number, part: Partial<{ accountId: string; debit: string; credit: string }>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...part } : l)))

  const post = () => {
    if (!canPost) return
    postEntry({ date, memo: memo.trim(), lines: parsed, source: "manual" })
    onDone()
  }

  return (
    <div>
      <p className="text-base font-semibold">New journal entry</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Won't post until debits equal credits — that's the rule that keeps the books trustworthy.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Memo</span>
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="What is this for?" />
        </label>
      </div>

      <div className="mt-3 space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
            <Select value={l.accountId} onValueChange={(v) => setLine(i, { accountId: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input className="h-9 w-24 text-right" type="number" placeholder="Debit" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: "" })} />
            <Input className="h-9 w-24 text-right" type="number" placeholder="Credit" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: "" })} />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLines((p) => [...p, { accountId: "", debit: "", credit: "" }])}
          className="text-xs font-medium text-brand hover:underline dark:text-primary"
        >
          + Add line
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Debits {formatPrice(totalDebit)} · Credits {formatPrice(totalCredit)}</span>
        <span className={cn("font-semibold", balanced ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
          {balanced ? "Balanced" : `Off by ${formatPrice(Math.abs(totalDebit - totalCredit))}`}
        </span>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={post}
          disabled={!canPost}
          title={!canPost ? (balanced ? "Add a memo to post" : "Cannot post: entry not balanced") : undefined}
          aria-label={!canPost ? (balanced ? "Cannot post: memo required" : "Cannot post: entry not balanced") : undefined}
        >
          Post entry
        </Button>
      </div>
    </div>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "success" | "info" | "warning" | "danger" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
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

void ArrowRight

// Trial balance derived live from the ledger — every account with
// activity, plus the totals + a balanced/off indicator. Shown in a
// dialog so the user can sanity-check the books without leaving the
// journal page.
function TrialBalanceView({ formatPrice }: { formatPrice: (n: number) => string }) {
  const tb = React.useMemo(() => trialBalance(), [])
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold">Trial balance</h2>
        <p className="text-[11px] text-muted-foreground">
          Sum of debits + credits across every account with activity. Totals must match — that&apos;s how we know nothing was posted lopsided.
        </p>
      </div>
      <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 text-right font-medium">Debit</th>
              <th className="px-3 py-2 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tb.rows.map((r) => (
              <tr key={r.account.id} className="hover:bg-accent/30">
                <td className="px-3 py-2 font-mono text-xs">{r.account.code}</td>
                <td className="px-3 py-2 text-xs">{r.account.name}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{r.debit ? formatPrice(r.debit) : "—"}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{r.credit ? formatPrice(r.credit) : "—"}</td>
              </tr>
            ))}
            {tb.rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">No posted entries yet.</td></tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-border bg-muted/30 font-bold">
            <tr>
              <td className="px-3 py-2 text-xs uppercase tracking-wider" colSpan={2}>Totals</td>
              <td className="px-3 py-2 text-right text-sm tabular-nums">{formatPrice(tb.totalDebit)}</td>
              <td className="px-3 py-2 text-right text-sm tabular-nums">{formatPrice(tb.totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <StatusBadge tone={tb.balanced ? "success" : "danger"} withDot>
        {tb.balanced ? "Balanced — debits equal credits" : "Off balance — investigate"}
      </StatusBadge>
    </div>
  )
}
