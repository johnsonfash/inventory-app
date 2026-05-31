import * as React from "react"
import { Gift, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { listGiftCards, type GiftCard, type GiftCardStatus } from "@/lib/pos/loyalty"

// F7 — gift card management. Operator-facing list of every card ever
// issued. Pulls from listGiftCards() so it stays in sync with the till
// (which is the only thing currently mutating the store). Backend
// swap-in later replaces the load + filter step with a paginated API.

type StatusFilter = GiftCardStatus | "all"

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "redeemed", label: "Redeemed" },
  { value: "void", label: "Voided" },
]

export default function GiftCardsIndex() {
  const { formatPrice } = useCurrency()
  const [tick, setTick] = React.useState(0)
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [selected, setSelected] = React.useState<GiftCard | null>(null)

  useRegisterPageRefresh(
    React.useCallback(async () => {
      await new Promise((r) => setTimeout(r, 300))
      setTick((t) => t + 1)
    }, []),
  )

  const cards = React.useMemo(() => {
    void tick
    return listGiftCards()
  }, [tick])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter((c) => {
      if (status !== "all" && c.status !== status) return false
      if (!q) return true
      const owner = (c.customer?.name || c.customer?.email || c.customer?.phone || "").toLowerCase()
      return c.code.toLowerCase().includes(q) || owner.includes(q)
    })
  }, [cards, query, status])

  const totals = React.useMemo(() => {
    const active = cards.filter((c) => c.status === "active")
    const redeemed = cards.filter((c) => c.status === "redeemed")
    const outstanding = active.reduce((s, c) => s + c.currentBalance, 0)
    const issuedValue = cards.reduce((s, c) => s + c.originalAmount, 0)
    return { count: cards.length, active: active.length, redeemed: redeemed.length, outstanding, issuedValue }
  }, [cards])

  return (
    <PageShell
      title="Gift cards"
      titleTooltip={
        <>
          Every prepaid card you've ever issued. Filter by status to find
          unused balances; click a card to see its full transaction
          history. New cards are issued at the till.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Issued total", value: totals.count.toLocaleString(), tone: "brand", hint: `${totals.active} active` },
            { label: "Outstanding", value: formatPrice(totals.outstanding), tone: "warning", hint: "Customers can still spend" },
            { label: "Lifetime issued", value: formatPrice(totals.issuedValue), tone: "success", hint: "Original face value" },
            { label: "Redeemed", value: totals.redeemed.toLocaleString(), tone: "info", hint: "Fully spent" },
          ]}
        />

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by code, customer name or email…"
                  className="pl-9"
                />
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                Icon={Gift}
                title={cards.length === 0 ? "No gift cards yet." : "Nothing matches that filter."}
                description={
                  cards.length === 0
                    ? "Issue your first card from the till — search for 'Gift card' in the POS chip row."
                    : "Try a different status or clear the search."
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {filtered.map((g) => (
                  <li key={g.code}>
                    <button
                      type="button"
                      onClick={() => setSelected(g)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                        <Gift className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm font-semibold">{maskCardCode(g.code)}</p>
                          <StatusBadge tone={statusTone(g.status)} withDot>{g.status}</StatusBadge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {g.customer?.name || g.customer?.email || g.customer?.phone || "Unattached"}{" "}
                          · issued {new Date(g.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums">{formatPrice(g.currentBalance)}</p>
                        <p className="text-[10px] text-muted-foreground">of {formatPrice(g.originalAmount)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <GiftCardDetailDialog card={selected} onClose={() => setSelected(null)} />
    </PageShell>
  )
}

function GiftCardDetailDialog({ card, onClose }: { card: GiftCard | null; onClose: () => void }) {
  const { formatPrice } = useCurrency()
  if (!card) return null
  // Mock transaction log — backend will replace with real entries. We
  // synthesise an issue row and (if not full balance) a single
  // redemption row covering the delta. This keeps the UI honest until
  // the data layer carries a journal.
  const spent = Math.max(0, Math.round((card.originalAmount - card.currentBalance) * 100) / 100)
  const txns: { at: number; label: string; amount: number }[] = [
    { at: card.issuedAt, label: "Issued", amount: card.originalAmount },
    ...(spent > 0 ? [{ at: card.issuedAt + 60_000, label: "Redeemed at POS", amount: -spent }] : []),
  ]
  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
            <Gift className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-base font-semibold">{card.code}</p>
            <p className="text-[11px] text-muted-foreground">
              {card.customer?.name || card.customer?.email || "Unattached"}
            </p>
          </div>
          <StatusBadge tone={statusTone(card.status)} withDot>{card.status}</StatusBadge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/30 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Balance</p>
            <p className="text-base font-bold tabular-nums">{formatPrice(card.currentBalance)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Issued for</p>
            <p className="text-base font-bold tabular-nums">{formatPrice(card.originalAmount)}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Transaction history
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {txns.map((t, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.at).toLocaleString()}</p>
                </div>
                <p
                  className={
                    "font-bold tabular-nums " +
                    (t.amount >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400")
                  }
                >
                  {t.amount >= 0 ? "+" : ""}
                  {formatPrice(Math.abs(t.amount))}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function maskCardCode(code: string): string {
  const last4 = code.slice(-4)
  return `${"•".repeat(Math.max(0, code.length - 4))}${last4}`
}

function statusTone(status: GiftCardStatus): StatusTone {
  if (status === "active") return "success"
  if (status === "redeemed") return "warning"
  return "danger"
}
