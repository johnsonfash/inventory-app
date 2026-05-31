import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Banknote, Building2, Edit3, Plus, Search, Trash2 } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"

type Row = {
  id: string
  bank: string
  accountNumber: string
  accountName: string
  location: string
  cashier: string
  status: "verified" | "pending" | "disabled"
}

const SEED_ACCOUNTS: Row[] = [
  { id: "VA-001", bank: "Mercury Bank", accountNumber: "0321 4482 1023", accountName: "Pallio Ops — Austin", location: "Downtown Austin", cashier: "Mia Chen", status: "verified" },
  { id: "VA-002", bank: "Mercury Bank", accountNumber: "0321 4482 5581", accountName: "Pallio Ops — Austin 2", location: "Downtown Austin", cashier: "Alex Larson", status: "verified" },
  { id: "VA-003", bank: "Wise", accountNumber: "9011 2255 0042", accountName: "Pallio Atlanta", location: "East DC", cashier: "Priya Patel", status: "pending" },
  { id: "VA-004", bank: "Mercury Bank", accountNumber: "0321 9201 4421", accountName: "Pallio West Hub", location: "West Hub", cashier: "Daniel Kim", status: "disabled" },
]

const statusTone: Record<Row["status"], StatusTone> = {
  verified: "success",
  pending: "warning",
  disabled: "neutral",
}

export default function PaymentAccounts() {
  const [query, setQuery] = React.useState("")
  const [rows, setRows] = React.useState<Row[]>(SEED_ACCOUNTS)
  const [editing, setEditing] = React.useState<Row | null>(null)
  const [editDraft, setEditDraft] = React.useState<Row | null>(null)
  const [savingEdit, setSavingEdit] = React.useState(false)
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const onEdit = (r: Row) => {
    setEditing(r)
    setEditDraft({ ...r })
  }
  const saveEdit = async () => {
    if (!editDraft) return
    setSavingEdit(true)
    try {
      await new Promise((r) => setTimeout(r, 350))
      setRows((prev) => prev.map((x) => (x.id === editDraft.id ? editDraft : x)))
      toast.success(`${editDraft.bank} updated`, { description: editDraft.accountName })
      setEditing(null)
      setEditDraft(null)
    } catch {
      toast.error("Couldn't save changes", { description: "Try again in a moment." })
    } finally {
      setSavingEdit(false)
    }
  }
  const onDelete = (r: Row) => {
    setRows((prev) => prev.filter((x) => x.id !== r.id))
    toast(`${r.bank} account removed`, {
      description: r.accountName,
      action: { label: "Undo", onClick: () => setRows((prev) => [r, ...prev]) },
    })
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) => r.bank.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.cashier.toLowerCase().includes(q),
    )
  }, [query, rows])

  const verified = rows.filter((r) => r.status === "verified").length
  const banks = new Set(rows.map((r) => r.bank)).size

  return (
    <PageShell
      title="Payout Accounts"
      withToolbar={false}
      titleTooltip={
        <>
          Bank accounts Pallio is allowed to <strong>send money
          OUT to</strong> — payroll, commission payouts, vendor
          bills, withdrawals. Distinct from <Link to="/settings/payments/business-accounts" className="font-semibold text-brand hover:underline dark:text-primary">Receiving Accounts</Link> which is where money LANDS. Different accounts can be set as default per location.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Accounts", value: String(rows.length), tone: "brand", hint: "configured" },
            { label: "Verified", value: String(verified), tone: "success", hint: "live" },
            { label: "Banks", value: String(banks), tone: "info", hint: "distinct" },
            { label: "Locations", value: String(new Set(rows.map((r) => r.location)).size), tone: "warning", hint: "covered" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by bank, location, or cashier…" className="pl-9" />
          </div>
          <Link to="/settings/payments/accounts/new" className="inline-flex">
            <Button><Plus className="h-4 w-4" /> Add account</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              Icon={Banknote}
              title={query.trim() ? `No accounts match "${query.trim()}"` : "No accounts yet"}
              description={query.trim() ? "Try a different filter, or clear the search to see every account." : "Add an account to start sending payouts."}
              action={query.trim() ? (
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>Clear search</Button>
              ) : undefined}
            />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{r.bank}</p>
                    <StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{r.accountNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{r.accountName}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    <StatusBadge tone="info">{r.location}</StatusBadge>
                    <span>· {r.cashier}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => onEdit(r)}><Edit3 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                  <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => onDelete(r)} className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) { setEditing(null); setEditDraft(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit payout account</DialogTitle>
            <DialogDescription>Update the bank details Pallio sends settlement money to.</DialogDescription>
          </DialogHeader>
          {editDraft && (
            <div className="flex flex-col gap-3 py-1">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-foreground/80">Bank</span>
                <Input value={editDraft.bank} onChange={(e) => setEditDraft({ ...editDraft, bank: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-foreground/80">Account name</span>
                <Input value={editDraft.accountName} onChange={(e) => setEditDraft({ ...editDraft, accountName: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-foreground/80">Account number</span>
                <Input value={editDraft.accountNumber} onChange={(e) => setEditDraft({ ...editDraft, accountNumber: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-foreground/80">Status</span>
                <Select value={editDraft.status} onValueChange={(v) => setEditDraft({ ...editDraft, status: v as Row["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">verified</SelectItem>
                    <SelectItem value="pending">pending</SelectItem>
                    <SelectItem value="disabled">disabled</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditing(null); setEditDraft(null) }} disabled={savingEdit}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit || !editDraft?.bank.trim() || !editDraft?.accountName.trim()}>
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
