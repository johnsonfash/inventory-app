import * as React from "react"
import { Link } from "react-router-dom"
import { DollarSign, Plus, Search, TagsIcon } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { loadAllCatalog } from "@/lib/pos/storage"
import { loadTiers, type PriceTier } from "@/lib/pos/pricing-tiers"

type Row = {
  id: string
  name: string
  audience: "Retail" | "Wholesale" | "VIP" | "Staff"
  basis: "cost+" | "msrp-" | "fixed"
  rule: string
  items: number
  status: "active" | "draft" | "archived"
}

const audienceTone: Record<Row["audience"], StatusTone> = {
  Retail: "brand",
  Wholesale: "info",
  VIP: "warning",
  Staff: "success",
}
const statusTone: Record<Row["status"], StatusTone> = { active: "success", draft: "neutral", archived: "warning" }

// Price lists ARE the POS price tiers (lib/pos/pricing-tiers) — the same
// tiers a cashier applies at the till — shown here against the live
// catalogue count. One source of truth, no parallel mock.
function audienceFor(tier: PriceTier): Row["audience"] {
  if (/wholesale|trade|b2b/i.test(tier.name)) return "Wholesale"
  if (/member|vip|loyal/i.test(tier.name)) return "VIP"
  if (/employee|staff/i.test(tier.name)) return "Staff"
  return "Retail"
}

function derivePriceLists(): Row[] {
  const itemCount = loadAllCatalog().length
  return loadTiers().map((t) => ({
    id: t.id,
    name: `${t.name} price`,
    audience: audienceFor(t),
    basis: "msrp-",
    rule: t.adjustPercent === 0 ? "List price" : `List ${t.adjustPercent > 0 ? "+" : "−"} ${Math.abs(t.adjustPercent)}%`,
    items: itemCount,
    status: "active" as const,
  }))
}

function safeDerivePriceLists(): { rows: Row[]; error: string | null } {
  try {
    return { rows: derivePriceLists(), error: null }
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : "Could not load price tiers" }
  }
}

export default function PriceLists() {
  const [query, setQuery] = React.useState("")
  const initial = React.useMemo(() => safeDerivePriceLists(), [])
  const [rows, setRows] = React.useState<Row[]>(initial.rows)
  const [loadError, setLoadError] = React.useState<string | null>(initial.error)
  useRegisterPageRefresh(React.useCallback(async () => {
    const next = safeDerivePriceLists()
    setRows(next.rows)
    setLoadError(next.error)
    await new Promise((r) => setTimeout(r, 300))
  }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.audience.toLowerCase().includes(q))
  }, [query, rows])

  const active = rows.filter((r) => r.status === "active").length
  const draft = rows.filter((r) => r.status === "draft").length

  return (
    <PageShell
      title="Price lists"
      withToolbar
      titleTooltip={
        <>
          Named sets of prices you switch between per customer tier —
          Retail, Wholesale, VIP. Assigning a price list to a customer
          means Pallio automatically uses the right price at checkout
          without staff doing mental maths.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Price lists", value: String(rows.length), tone: "brand", hint: "defined" },
            { label: "Active", value: String(active), tone: "success", hint: "live" },
            { label: "Audiences", value: String(new Set(rows.map((r) => r.audience)).size), tone: "info", hint: "covered" },
            { label: "Drafts", value: String(draft), tone: "warning", hint: "in progress" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or audience…" className="pl-9" />
          </div>
          <Link to="/inventory/price-lists/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> New price list</Button>
          </Link>
        </div>

        {loadError ? (
          <Card><CardContent className="p-0">
            <EmptyState
              Icon={TagsIcon}
              title="Couldn't load price tiers"
              description={loadError}
            />
          </CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState Icon={TagsIcon} title="No price lists match" description="Try a different name." />
          </CardContent></Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                  <DollarSign className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <StatusBadge tone={statusTone[r.status]} withDot>{r.status}</StatusBadge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <StatusBadge tone={audienceTone[r.audience]}>{r.audience}</StatusBadge>
                    <span className="font-mono">{r.rule}</span>
                    <span>· {r.items.toLocaleString()} items</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
