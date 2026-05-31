import * as React from "react"
import { Link } from "react-router-dom"
import {
  Banknote,
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Plus,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
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
import { accountBalance, loadAccounts, seedExampleLedger } from "@/lib/accounting/ledger"

// Chart of accounts — now the REAL ledger chart (lib/accounting/ledger),
// with balances derived from posted journal entries. ACCT-1.

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense"

type Account = {
  code: string
  name: string
  type: AccountType
  parent?: string
  balance: number
  /** Whether transactions can be posted to this account (false for
   *  parent rollup accounts). */
  postable?: boolean
  /** Control accounts (AR, AP, Inventory) are driven by subledgers. */
  systemOwned?: boolean
}

// Derive the page's account rows from the live ledger. Balances come from
// posted entries via accountBalance(), so they can't drift from the books.
function deriveAccounts(): Account[] {
  seedExampleLedger() // idempotent — gives first-time books some data
  return loadAccounts().map((a) => ({
    code: a.code,
    name: a.name,
    type: a.type === "income" ? "revenue" : a.type,
    balance: accountBalance(a.id),
    postable: !a.isControl,
    systemOwned: a.isControl,
  }))
}

const TYPE_META: Record<AccountType, { label: string; icon: typeof Wallet; tone: "info" | "warning" | "brand" | "success" | "danger" }> = {
  asset:     { label: "Assets",      icon: Wallet,    tone: "info"    },
  liability: { label: "Liabilities", icon: Receipt,   tone: "warning" },
  equity:    { label: "Equity",      icon: Building2, tone: "brand"   },
  revenue:   { label: "Revenue",     icon: TrendingUp, tone: "success" },
  expense:   { label: "Expenses",    icon: TrendingDown, tone: "danger" },
}

const STATUS_TONE: Record<"system" | "manual", StatusTone> = {
  system: "info",
  manual: "neutral",
}

type Filter = "all" | AccountType | "system" | "manual"

export default function ChartOfAccounts() {
  const [version, setVersion] = React.useState(0)
  useRegisterPageRefresh(React.useCallback(async () => { setVersion((v) => v + 1); await new Promise((r) => setTimeout(r, 300)) }, []))
  const { formatPrice } = useCurrency()
  // Real chart, derived from the ledger (rebuilt on refresh).
  const ACCOUNTS = React.useMemo(() => deriveAccounts(), [version])
  const [period, setPeriod] = React.useState<Period>("ytd")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [query, setQuery] = React.useState("")
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(["1000", "1200", "1500", "2000"]))

  const toggle = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return ACCOUNTS.filter((a) => {
      if (filter !== "all") {
        if (filter === "system") {
          if (!a.systemOwned) return false
        } else if (filter === "manual") {
          if (a.systemOwned) return false
        } else if (a.type !== filter) return false
      }
      if (!q) return true
      return a.code.includes(q) || a.name.toLowerCase().includes(q)
    })
  }, [filter, query, ACCOUNTS])

  const groupedByType = React.useMemo(() => {
    const groups: Record<AccountType, Account[]> = { asset: [], liability: [], equity: [], revenue: [], expense: [] }
    for (const a of filtered) groups[a.type].push(a)
    return groups
  }, [filtered])

  const totals = React.useMemo(() => {
    const t: Record<AccountType, number> = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 }
    for (const a of ACCOUNTS) if (!a.parent) t[a.type] += a.balance
    return t
  }, [ACCOUNTS])

  const counts: Record<Filter, number> = {
    all:        ACCOUNTS.length,
    asset:      ACCOUNTS.filter((a) => a.type === "asset").length,
    liability:  ACCOUNTS.filter((a) => a.type === "liability").length,
    equity:     ACCOUNTS.filter((a) => a.type === "equity").length,
    revenue:    ACCOUNTS.filter((a) => a.type === "revenue").length,
    expense:    ACCOUNTS.filter((a) => a.type === "expense").length,
    system:     ACCOUNTS.filter((a) => a.systemOwned).length,
    manual:     ACCOUNTS.filter((a) => !a.systemOwned).length,
  }

  const exportRows = ACCOUNTS.map((a) => ({
    code: a.code, name: a.name, type: a.type, parent: a.parent ?? "",
    balance: a.balance, postable: (a.postable ?? !a.parent) ? "yes" : "no",
    source: a.systemOwned ? "system" : "manual",
  }))

  return (
    <ReportShell
      title="Chart of Accounts"
      titleTooltip={
        <>
          The master list of every "bucket" Pallio puts money into when
          something happens — buckets for assets (what you own),
          liabilities (what you owe), equity, revenue, and expenses.
          Your accountant calls this the <strong>Chart of Accounts</strong>.
          Pallio mirrors this structure into QuickBooks / Xero / Sage so
          your books look familiar to any accountant. Rows tagged
          "system" are managed by Pallio (sales at the till, payroll,
          etc.) — don't post manual entries to them.
        </>
      }
      exportFilename={`pallio-coa-${period}`}
      exportRows={exportRows}
      period={period}
      onPeriodChange={setPeriod}
    >
      {/* KPI strip — totals by account type */}
      <section className="grid gap-3 lg:grid-cols-5">
        {(["asset", "liability", "equity", "revenue", "expense"] as const).map((t) => {
          const meta = TYPE_META[t]
          const Icon = meta.icon
          return (
            <Card key={t}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{meta.label}</p>
                  <Icon className={cn("h-4 w-4",
                    meta.tone === "info"    && "text-sky-600 dark:text-sky-300",
                    meta.tone === "warning" && "text-amber-600 dark:text-amber-300",
                    meta.tone === "brand"   && "text-brand dark:text-primary",
                    meta.tone === "success" && "text-emerald-600 dark:text-emerald-400",
                    meta.tone === "danger"  && "text-rose-600 dark:text-rose-400",
                  )} />
                </div>
                <p className={cn(
                  "mt-1 text-xl font-bold tabular-nums",
                  meta.tone === "info"    && "text-sky-600 dark:text-sky-300",
                  meta.tone === "warning" && "text-amber-600 dark:text-amber-300",
                  meta.tone === "brand"   && "text-brand dark:text-primary",
                  meta.tone === "success" && "text-emerald-600 dark:text-emerald-400",
                  meta.tone === "danger"  && "text-rose-600 dark:text-rose-400",
                )}>{formatPrice(totals[t])}</p>
                <p className="text-[10px] text-muted-foreground">{counts[t]} accounts</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* Filter chips + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
          {(["all", "asset", "liability", "equity", "revenue", "expense", "system", "manual"] as const).map((f) => (
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
        <div className="flex gap-2 sm:ml-auto">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code or name…"
              className="pl-9"
            />
          </div>
          <Button
            size="sm"
            disabled
            title="Coming soon — custom account creation arrives with the backend."
            aria-label="Add account (coming soon)"
            className="hidden sm:inline-flex"
          >
            <Plus className="h-3.5 w-3.5" /> Add account
          </Button>
        </div>
      </div>

      {/* Account groups */}
      {(["asset", "liability", "equity", "revenue", "expense"] as const).map((t) => {
        const list = groupedByType[t]
        if (list.length === 0) return null
        const meta = TYPE_META[t]
        const Icon = meta.icon
        return (
          <Card key={t}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4",
                    meta.tone === "info"    && "text-sky-600 dark:text-sky-300",
                    meta.tone === "warning" && "text-amber-600 dark:text-amber-300",
                    meta.tone === "brand"   && "text-brand dark:text-primary",
                    meta.tone === "success" && "text-emerald-600 dark:text-emerald-400",
                    meta.tone === "danger"  && "text-rose-600 dark:text-rose-400",
                  )} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">{meta.label}</h3>
                  <span className="text-[10px] text-muted-foreground">· {list.length} accounts</span>
                </div>
                <p className={cn("text-sm font-bold tabular-nums",
                  meta.tone === "info"    && "text-sky-600 dark:text-sky-300",
                  meta.tone === "warning" && "text-amber-600 dark:text-amber-300",
                  meta.tone === "brand"   && "text-brand dark:text-primary",
                  meta.tone === "success" && "text-emerald-600 dark:text-emerald-400",
                  meta.tone === "danger"  && "text-rose-600 dark:text-rose-400",
                )}>{formatPrice(totals[t])}</p>
              </div>
              <ul className="divide-y divide-border">
                {list.filter((a) => !a.parent).map((parent) => {
                  const children = list.filter((c) => c.parent === parent.code)
                  const isExpanded = expanded.has(parent.code)
                  const hasChildren = children.length > 0
                  return (
                    <React.Fragment key={parent.code}>
                      <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30">
                        {hasChildren ? (
                          <button onClick={() => toggle(parent.code)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent">
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        ) : (
                          <span className="h-5 w-5 shrink-0" />
                        )}
                        <span className="font-mono text-xs font-bold tabular-nums text-muted-foreground">{parent.code}</span>
                        <span className="flex-1 truncate text-sm font-semibold">{parent.name}</span>
                        {parent.systemOwned && <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">System</span>}
                        <span className="font-mono text-sm font-bold tabular-nums">{formatPrice(parent.balance)}</span>
                      </li>
                      {hasChildren && isExpanded && children.map((child) => (
                        <li key={child.code} className="flex items-center gap-3 bg-muted/10 px-4 py-2 pl-12 hover:bg-accent/30">
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">{child.code}</span>
                          <span className="flex-1 truncate text-sm">{child.name}</span>
                          {child.systemOwned && <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">System</span>}
                          <span className="font-mono text-xs tabular-nums">{formatPrice(child.balance)}</span>
                        </li>
                      ))}
                    </React.Fragment>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        )
      })}

      {/* Cross-links */}
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { Icon: FileText, label: "Journal Entries", body: "Every debit + credit Pallio has posted.", href: "/accounting/journal-entries" },
          { Icon: Banknote, label: "Balance Sheet",   body: "Snapshot rolled up from these accounts.", href: "/accounting/balance-sheet" },
          { Icon: Download, label: "Export to QuickBooks", body: "Mirror this CoA into your QuickBooks file.", href: "/settings/integrations/quickbooks" },
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
