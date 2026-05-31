import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronRight, Plus, Printer, ReceiptText, RotateCcw, Search } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { MobileFab } from "@/components/mobile/mobile-fab"
import { listReturns, type ReturnRecord } from "@/lib/pos/storage"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type MethodKey = ReturnRecord["method"]

const METHOD_TONE: Record<MethodKey | "—", StatusTone> = {
  cash:   "warning",
  card:   "info",
  paypal: "brand",
  stripe: "brand",
  other:  "neutral",
  "—":    "neutral",
}

function relTime(ms: number) {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function POSReturnsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const [query, setQuery] = React.useState("")
  const [method, setMethod] = React.useState<"all" | MethodKey>("all")
  const [returns, setReturns] = React.useState(() => listReturns())

  useRegisterPageRefresh(
    React.useCallback(async () => {
      setReturns(listReturns())
      await new Promise((r) => setTimeout(r, 200))
    }, []),
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return returns
      .filter((r) => {
        if (method !== "all" && r.method !== method) return false
        if (!q) return true
        return (
          r.number.toLowerCase().includes(q) ||
          r.invoiceNumber.toLowerCase().includes(q) ||
          (r.customer?.name || "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [returns, query, method])

  const today = new Date().setHours(0, 0, 0, 0)
  const todayList  = returns.filter((r) => r.createdAt >= today)
  const todayValue = todayList.reduce((s, r) => s + r.totalRefund, 0)
  const totalValue = returns.reduce((s, r) => s + r.totalRefund, 0)
  const avgValue   = returns.length === 0 ? 0 : Math.round((totalValue / returns.length) * 100) / 100

  const counts: Record<"all" | MethodKey, number> = {
    all:    returns.length,
    cash:   returns.filter((r) => r.method === "cash").length,
    card:   returns.filter((r) => r.method === "card").length,
    paypal: returns.filter((r) => r.method === "paypal").length,
    stripe: returns.filter((r) => r.method === "stripe").length,
    other:  returns.filter((r) => r.method === "other").length,
  }

  return (
    <PageShell
      title="POS Returns"
      titleTooltip={
        <>
          Refunds and exchanges processed at the till — searchable by
          return number, original invoice, or customer. Start a new
          return with the <strong>+ New return</strong> button or
          from any past invoice's detail view.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Returns",       value: String(returns.length), tone: "brand",   hint: "all time" },
            { label: "Today",         value: String(todayList.length), tone: "info",  hint: formatPrice(todayValue) },
            { label: "Avg refund",    value: formatPrice(avgValue),   tone: "warning", hint: "per return" },
            { label: "Total refunded", value: formatPrice(totalValue), tone: "danger", hint: "POS only" },
          ]}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search return #, invoice #, or customer…"
              className="pl-9"
            />
          </div>
          {/* Desktop only — mobile uses the MobileFab below. Don't add
              another "+" button on mobile or the FAB becomes redundant. */}
          <Link to="/pos/returns/new" className="hidden md:inline-flex">
            <Button><Plus className="h-4 w-4" /> New return</Button>
          </Link>
        </div>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:px-0">
          {(["all", "cash", "card", "paypal", "stripe", "other"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                method === m
                  ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {m}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", method === m ? "bg-white/20" : "bg-muted")}>
                {counts[m]}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            Icon={RotateCcw}
            title={returns.length === 0 ? "No returns yet" : "No returns match"}
            description={returns.length === 0
              ? "Start a return from any past invoice to issue a refund or exchange."
              : "Adjust filters or clear the search to broaden the view."}
            action={
              returns.length === 0 ? (
                <Link to="/pos/returns/new">
                  <Button><Plus className="h-4 w-4" /> Start a return</Button>
                </Link>
              ) : null
            }
          />
        ) : isMobile ? (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/pos/returns/${r.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                    <RotateCcw className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{r.customer?.name || "Walk-in"}</p>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        −{formatPrice(r.totalRefund)}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">
                        <span className="font-mono">{r.number}</span> · for{" "}
                        <span className="font-mono">{r.invoiceNumber}</span> · {relTime(r.createdAt)}
                      </span>
                      <StatusBadge tone={METHOD_TONE[r.method]}>{r.method}</StatusBadge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Return</th>
                      <th className="px-3 py-2.5 font-medium">Original invoice</th>
                      <th className="px-3 py-2.5 font-medium">Date</th>
                      <th className="px-3 py-2.5 font-medium">Customer</th>
                      <th className="px-3 py-2.5 font-medium">Method</th>
                      <th className="px-3 py-2.5 text-right font-medium">Refund</th>
                      <th className="px-3 py-2.5 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-accent/30">
                        <td className="px-3 py-2.5">
                          <Link to={`/pos/returns/${r.id}`} className="font-mono text-xs font-bold text-brand hover:underline dark:text-primary">
                            {r.number}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link to={`/pos/invoices?q=${encodeURIComponent(r.invoiceNumber)}`} className="font-mono text-xs text-muted-foreground hover:underline">
                            {r.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-xs">{r.customer?.name || "Walk-in"}</td>
                        <td className="px-3 py-2.5"><StatusBadge tone={METHOD_TONE[r.method]}>{r.method}</StatusBadge></td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
                          −{formatPrice(r.totalRefund)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/pos/returns/${r.id}`)}>
                              <ReceiptText className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/pos/returns/${r.id}?print=1`)}>
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <MobileFab href="/pos/returns/new" label="New return" />
    </PageShell>
  )
}
