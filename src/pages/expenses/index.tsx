import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Building2, ChevronRight, Plus, Receipt, Search, Wallet } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { AddExpenseDialog, type QuickExpense } from "@/components/dialogs/add-expense-dialog"
import { useCurrency } from "@/contexts/currency"

type Row = { id: string; category: string; vendor: string; amount: number; date: string; method: "card" | "cash" | "transfer" }

const SEED_EXPENSES: Row[] = [
  { id: "EXP-1042", category: "Logistics", vendor: "DHL", amount: 482, date: "2026-05-19", method: "card" },
  { id: "EXP-1041", category: "Marketing", vendor: "Meta Ads", amount: 1240, date: "2026-05-18", method: "card" },
  { id: "EXP-1040", category: "Rent", vendor: "WeWork", amount: 4200, date: "2026-05-17", method: "transfer" },
  { id: "EXP-1039", category: "Utilities", vendor: "ConEd", amount: 312, date: "2026-05-16", method: "transfer" },
  { id: "EXP-1038", category: "Payroll", vendor: "ADP", amount: 18400, date: "2026-05-15", method: "transfer" },
  { id: "EXP-1037", category: "Logistics", vendor: "USPS", amount: 84, date: "2026-05-14", method: "card" },
]

const CATEGORIES = ["All", "Logistics", "Marketing", "Rent", "Utilities", "Payroll", "Other"] as const

const categoryTone: Record<string, StatusTone> = {
  Logistics: "info",
  Marketing: "brand",
  Rent: "neutral",
  Utilities: "warning",
  Payroll: "danger",
  Other: "neutral",
}

export default function Expenses() {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState<(typeof CATEGORIES)[number]>("All")

  const { formatPrice } = useCurrency()

  // Seed from the mock list, keep in state so a quick-log shows instantly.
  const [rows, setRows] = React.useState<Row[]>(SEED_EXPENSES)
  const [addOpen, setAddOpen] = React.useState(false)

  const handleCreate = (e: QuickExpense) => {
    const id = `EXP-${Math.floor(1000 + Math.random() * 9000)}`
    setRows((prev) => [{ id, ...e }, ...prev])
    // Mirror the desktop button: confirm the entry landed so the
    // mobile FAB flow doesn't leave the user wondering.
    toast.success("Expense logged", { description: `${id} · ${formatPrice(e.amount)}` })
  }

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    let list = rows
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        r.id.toLowerCase().includes(q) ||
        r.vendor.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q),
      )
    }
    if (category !== "All") list = list.filter((r) => r.category === category)
    return list
  }, [query, category, rows])

  const total = rows.reduce((s, r) => s + r.amount, 0)
  const largest = rows.reduce((a, b) => (a.amount > b.amount ? a : b))
  const thisMonth = rows.filter((r) => r.date.startsWith("2026-05")).reduce((s, r) => s + r.amount, 0)

  return (
    <PageShell
      title="Expenses"
      withToolbar
      titleTooltip={
        <>
          Money flowing <em>out</em> of the business — rent, logistics,
          utilities, marketing spend, staff reimbursements. Categorise
          each one so your Profit & Loss report can show where the
          money actually went.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "This month", value: formatPrice(thisMonth), tone: "warning", hint: "spent" },
            { label: "Largest", value: formatPrice(largest.amount), tone: "brand", hint: largest.category },
            { label: "Categories", value: String(new Set(rows.map((r) => r.category)).size), tone: "info", hint: "active" },
            { label: "Entries", value: String(rows.length), tone: "success", hint: "logged" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID, vendor, or category…" className="pl-9" />
          </div>
          <Button className="hidden md:inline-flex" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Log expense
          </Button>
        </div>

        {/* Category pills */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:px-0">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (category === c
                  ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground")
              }
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              Icon={Receipt}
              title="No expenses match"
              description="Adjust filters or log a new expense."
              action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Log expense</Button>}
            />
          </CardContent></Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{r.vendor}</p>
                      <p className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(r.amount)}</p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span><span className="font-mono">{r.id}</span> · {r.date}</span>
                      <StatusBadge tone={categoryTone[r.category] ?? "neutral"}>{r.category}</StatusBadge>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            <li className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-center text-xs">
              <span className="text-muted-foreground">Total · </span>
              <span className="font-semibold tabular-nums">{formatPrice(filtered.reduce((s, r) => s + r.amount, 0))}</span>
            </li>
          </ul>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Vendor</th>
                  <th className="px-3 py-2.5 font-medium">Method</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5 font-mono text-xs">{r.id}</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={categoryTone[r.category] ?? "neutral"}>{r.category}</StatusBadge></td>
                    <td className="px-3 py-2.5 font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {r.vendor}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-muted-foreground">{r.method}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.date}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatPrice(r.amount)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild><Link to="/expenses"><ChevronRight className="h-3.5 w-3.5" /></Link></Button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td colSpan={5} className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-muted-foreground">Total</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(filtered.reduce((s, r) => s + r.amount, 0))}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MobileFab onClick={() => setAddOpen(true)} label="Add expense" />

      <AddExpenseDialog open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} />
    </PageShell>
  )
}
