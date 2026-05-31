import * as React from "react"
import { Edit3, Plus, Search, Tags, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { InfoTooltip } from "@/components/info-tooltip"
import { AddTaxRateDialog, type QuickTaxRate } from "@/components/dialogs/add-tax-rate-dialog"
import { useAutoMarkStep } from "@/hooks/use-auto-mark-step"

type Row = {
  id: string
  name: string
  rate: number
  scope: "global" | "category" | "region"
  appliesTo: string
  default: boolean
  active: boolean
}

const SEED_TAX_RATES: Row[] = [
  { id: "TX-1", name: "Nigerian VAT",     rate: 7.5,  scope: "global",   appliesTo: "All taxable items",       default: true,  active: true },
  { id: "TX-2", name: "Zero-rated",       rate: 0,    scope: "category", appliesTo: "Basic food · Books",      default: false, active: true },
  { id: "TX-3", name: "WHT — Services",   rate: 5,    scope: "category", appliesTo: "Professional services",   default: false, active: true },
  { id: "TX-4", name: "Ghana VAT",        rate: 12.5, scope: "region",   appliesTo: "Ghana stores",            default: false, active: true },
  { id: "TX-5", name: "Kenya VAT",        rate: 16,   scope: "region",   appliesTo: "Nairobi Boutique",        default: false, active: false },
]

const scopeTone: Record<Row["scope"], StatusTone> = {
  global: "brand",
  category: "info",
  region: "warning",
}

export default function TaxRates() {
  useAutoMarkStep("tax")
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")

  const [rows, setRows] = React.useState<Row[]>(SEED_TAX_RATES)
  const [addOpen, setAddOpen] = React.useState(false)
  const [editRow, setEditRow] = React.useState<Row | null>(null)
  const [deleteRow, setDeleteRow] = React.useState<Row | null>(null)

  const handleCreate = (r: QuickTaxRate) => {
    setRows((prev) => {
      // Only one rate can be the default — clear the others if this one claims it.
      const base = r.default ? prev.map((x) => ({ ...x, default: false })) : prev
      return [{ id: `TX-${Math.floor(100 + Math.random() * 900)}`, ...r, active: true }, ...base]
    })
  }

  const handleEdit = (r: QuickTaxRate) => {
    if (!editRow) return
    setRows((prev) => {
      const base = r.default ? prev.map((x) => ({ ...x, default: false })) : prev
      return base.map((x) => (x.id === editRow.id ? { ...x, ...r } : x))
    })
    setEditRow(null)
  }

  const confirmDelete = () => {
    if (!deleteRow) return
    setRows((prev) => prev.filter((x) => x.id !== deleteRow.id))
    toast.success("Tax rate removed", { description: deleteRow.name })
    setDeleteRow(null)
  }

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.appliesTo.toLowerCase().includes(q),
    )
  }, [query, rows])

  const active = rows.filter((r) => r.active).length
  const defaultRate = rows.find((r) => r.default)?.rate ?? 0
  const avgRate = rows.reduce((s, r) => s + r.rate, 0) / rows.length

  return (
    <PageShell
      title="Tax rates"
      withToolbar={false}
      titleTooltip={
        <>
          Define the VAT / GST / sales-tax rules Pallio applies at
          checkout, on invoices, and across reports. Nigerian standard
          is 7.5%. Add zero-rated categories for exempt items (basic
          food, books) and regional overrides for cross-border sales.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-sm font-semibold md:text-base">How Pallio uses these rates</h2>
            <InfoTooltip label="Tax rates" size="xs">
              Every taxable item on a sale, invoice, or PO gets one of
              these rates applied. The <strong>Default</strong> rate
              kicks in when no other matches; <strong>category</strong>{" "}
              rates override the default for items in that category;
              <strong> regional</strong> rates override both when the
              sale happens at a specific location.
            </InfoTooltip>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Nigeria's standard VAT is <strong>7.5%</strong> (set by FIRS).
            Add reduced or zero rates for exempt items like basic food.
            Selling across borders? Add a regional rate per country.
          </p>
        </div>

        <SummaryStrip
          tiles={[
            { label: "Active rates", value: String(active), tone: "success", hint: "live" },
            { label: "Default rate", value: `${defaultRate}%`, tone: "brand", hint: "fallback" },
            { label: "Average", value: `${avgRate.toFixed(1)}%`, tone: "info", hint: "blended" },
            { label: "Total", value: String(rows.length), tone: "warning", hint: "configured" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rates or scope…" className="pl-9" />
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add rate</Button>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={Tags} title="No rates match" description="Add a rate to start applying it to items or regions." />
          </CardContent></Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id} className={`rounded-2xl border ${r.active ? "border-border" : "border-dashed border-border opacity-60"} bg-card p-3`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                    <Tags className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{r.name}</p>
                      <p className="shrink-0 text-base font-bold tabular-nums">{r.rate}%</p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{r.appliesTo}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <StatusBadge tone={scopeTone[r.scope]}>{r.scope}</StatusBadge>
                      {r.default && <StatusBadge tone="success">default</StatusBadge>}
                      {!r.active && <StatusBadge tone="neutral">inactive</StatusBadge>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 text-right font-medium">Rate</th>
                  <th className="px-3 py-2.5 font-medium">
                    <span className="inline-flex items-baseline gap-1">
                      Scope
                      <InfoTooltip label="Scope" size="xs">
                        <ul className="space-y-1.5">
                          <li><strong>Global</strong> — applies to every taxable item unless something more specific overrides.</li>
                          <li><strong>Category</strong> — applies only to items in a given category (e.g. all books at 0%).</li>
                          <li><strong>Region</strong> — applies only to sales at a specific store / country (e.g. Ghana VAT for the Accra branch).</li>
                        </ul>
                      </InfoTooltip>
                    </span>
                  </th>
                  <th className="px-3 py-2.5 font-medium">Applies to</th>
                  <th className="px-3 py-2.5 font-medium">
                    <span className="inline-flex items-baseline gap-1">
                      Flags
                      <InfoTooltip label="Flags" size="xs">
                        <strong>Default</strong> = the rate Pallio uses
                        when no category or region rule matches.
                        <br />
                        <strong>Inactive</strong> = paused; no new sales
                        will use it, but historical records keep their
                        original rate.
                      </InfoTooltip>
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className={r.active ? "transition-colors hover:bg-accent/30" : "opacity-60 transition-colors hover:bg-accent/30"}>
                    <td className="px-3 py-2.5 font-medium">{r.name}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{r.rate}%</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={scopeTone[r.scope]} withDot>{r.scope}</StatusBadge></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.appliesTo}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {r.default && <StatusBadge tone="success">default</StatusBadge>}
                        {!r.active && <StatusBadge tone="neutral">inactive</StatusBadge>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEditRow(r)}><Edit3 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                        <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => setDeleteRow(r)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddTaxRateDialog open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} />
      <AddTaxRateDialog
        open={editRow !== null}
        onClose={() => setEditRow(null)}
        onCreate={handleEdit}
        mode="edit"
        initial={editRow ? {
          name: editRow.name,
          rate: editRow.rate,
          scope: editRow.scope,
          appliesTo: editRow.appliesTo,
          default: editRow.default,
        } : undefined}
      />

      <Dialog open={deleteRow !== null} onOpenChange={(v) => !v && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tax rate?</DialogTitle>
            <DialogDescription>
              {deleteRow ? <>This removes <strong>{deleteRow.name}</strong> ({deleteRow.rate}%). Historical records keep their original rate.</> : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
