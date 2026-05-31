import * as React from "react"
import { Link } from "react-router-dom"
import { Plus, Search, ShieldCheck } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { loadAllCatalog } from "@/lib/pos/storage"
import { deriveWarranty } from "@/lib/inventory/derive"

type Row = { code: string; name: string; durationMonths: number; coverage: string; skus: number; status: "active" | "draft" }

const statusTone: Record<Row["status"], StatusTone> = { active: "success", draft: "neutral" }

// Derived from the POS catalog: warranty tiers the live items fall into,
// with item counts. Items deriveWarranty to "—" (food, services, etc.)
// carry no warranty and are excluded.
function deriveWarranties(): Row[] {
  const counts = new Map<string, number>()
  for (const c of loadAllCatalog()) {
    const w = deriveWarranty(c)
    if (w === "—") continue
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  const COVERAGE: Record<number, string> = {
    24: "Defects + accidental damage",
    12: "Manufacturer defects",
    6: "Defects only",
  }
  return Array.from(counts.entries())
    .map(([label, skus]) => {
      const months = parseInt(label, 10) || 12
      return {
        code: `W${months}`,
        name: `${months}-month`,
        durationMonths: months,
        coverage: COVERAGE[months] ?? "Manufacturer defects",
        skus,
        status: "active" as const,
      }
    })
    .sort((a, b) => b.durationMonths - a.durationMonths)
}

export default function Warranties() {
  const [query, setQuery] = React.useState("")
  const [rows, setRows] = React.useState<Row[]>(() => deriveWarranties())
  useRegisterPageRefresh(React.useCallback(async () => { setRows(deriveWarranties()); await new Promise((r) => setTimeout(r, 300)) }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
  }, [query, rows])

  const totalSkus = rows.reduce((s, r) => s + r.skus, 0)
  const active = rows.filter((r) => r.status === "active").length
  const finiteRows = rows.filter((r) => r.durationMonths < 1000)
  const avgLength = finiteRows.length > 0
    ? Math.round(finiteRows.reduce((s, r) => s + r.durationMonths, 0) / finiteRows.length)
    : 0
  const avgLengthDisplay = finiteRows.length > 0 ? `${avgLength}mo` : "—"

  return (
    <PageShell
      title="Warranties"
      withToolbar
      titleTooltip={
        <>
          Manufacturer or store guarantees on items — e.g. "12-month
          replacement on electronics." Pallio prints the warranty on
          the customer's receipt and flags returns of covered items so
          you can reclaim against the supplier.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Plans", value: String(rows.length), tone: "brand", hint: "defined" },
            { label: "Active", value: String(active), tone: "success", hint: "live" },
            { label: "Items covered", value: totalSkus.toLocaleString(), tone: "info", hint: "all plans" },
            { label: "Avg length", value: avgLengthDisplay, tone: "warning", hint: "excl. lifetime" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plans…" className="pl-9" />
          </div>
          <Link to="/inventory/warranties/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> Add plan</Button>
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={ShieldCheck} title="No plans match" description="Try a different name or code." />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.code} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{r.name} <span className="text-muted-foreground font-mono">({r.code})</span></p>
                    <StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{r.coverage}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {r.durationMonths >= 1000 ? "Lifetime" : `${r.durationMonths} months`} · {r.skus.toLocaleString()} items
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
