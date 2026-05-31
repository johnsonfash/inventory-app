import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Plus, Search, TicketPercent } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { AddDiscountDialog, type QuickDiscount } from "@/components/dialogs/add-discount-dialog"
import { SEED_DISCOUNTS, DISCOUNT_TONE as tone, type DiscountRow as Row } from "./data"

export default function Discounts() {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")

  const [rows, setRows] = React.useState<Row[]>(SEED_DISCOUNTS)
  const [addOpen, setAddOpen] = React.useState(false)

  const handleCreate = (d: QuickDiscount) => {
    setRows((prev) => [{ ...d, uses: 0, status: "active" }, ...prev])
  }

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.code.toLowerCase().includes(q))
  }, [query, rows])

  const active = rows.filter((r) => r.status === "active").length
  const totalUses = rows.reduce((s, r) => s + r.uses, 0)
  const scheduled = rows.filter((r) => r.status === "scheduled").length

  return (
    <PageShell
      title="Discounts"
      withToolbar
      titleTooltip={
        <>
          Promo codes customers can type at checkout — percent off,
          flat amount, audience-restricted. Each row shows live
          redemption count and how much margin you're giving away so
          you can spot runaway promos.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Active codes", value: String(active), tone: "success", hint: "live now" },
            { label: "Total uses", value: totalUses.toLocaleString(), tone: "brand", hint: "redemptions" },
            { label: "Scheduled", value: String(scheduled), tone: "info", hint: "queued" },
            { label: "All codes", value: String(rows.length), tone: "warning", hint: "tracked" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code…" className="pl-9" />
          </div>
          <Button className="hidden md:inline-flex" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> New discount
          </Button>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              Icon={TicketPercent}
              title="No codes match"
              description="Try a different code prefix or create a new one."
              action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New discount</Button>}
            />
          </CardContent></Card>
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.code}>
                <Link to={`/sales/discounts/${encodeURIComponent(r.code)}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <TicketPercent className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-mono font-semibold">{r.code}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {r.type === "percent" ? `${r.value}%` : `$${r.value}`} off
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{r.uses} uses{r.cap ? ` · cap ${r.cap}` : ""}</span>
                      <StatusBadge tone={tone[r.status]}>{r.status}</StatusBadge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Code</th>
                  <th className="px-3 py-2.5 font-medium">Discount</th>
                  <th className="px-3 py-2.5 text-right font-medium">Uses</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cap</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.code} className="transition-colors hover:bg-accent/30">
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold">{r.code}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.type === "percent" ? `${r.value}%` : `$${r.value}`}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.uses}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{r.cap ?? "—"}</td>
                    <td className="px-3 py-2.5"><StatusBadge tone={tone[r.status]} withDot>{r.status}</StatusBadge></td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="ghost" asChild><Link to={`/sales/discounts/${encodeURIComponent(r.code)}`}>Open</Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MobileFab onClick={() => setAddOpen(true)} label="New discount" Icon={Plus} />

      <AddDiscountDialog open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} />
    </PageShell>
  )
}
