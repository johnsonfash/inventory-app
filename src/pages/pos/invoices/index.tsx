import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronRight, Download, FileText, Mail, Printer, ReceiptText, Search, ShoppingCart, X } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { listInvoices } from "@/lib/pos/storage"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type MethodKey = "cash" | "card" | "paypal" | "stripe" | "other" | "—"

const METHOD_TONE: Record<MethodKey, StatusTone> = {
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

export default function POSInvoicesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()
  const [query, setQuery] = React.useState("")
  const [method, setMethod] = React.useState<"all" | MethodKey>("all")
  const [invoices, setInvoices] = React.useState(() => listInvoices())
  // Bulk selection (desktop back-office). Keyed by invoice id.
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  useRegisterPageRefresh(
    React.useCallback(async () => {
      setInvoices(listInvoices())
      await new Promise((r) => setTimeout(r, 200))
    }, []),
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices
      .filter((inv) => {
        if (method !== "all") {
          const m = (inv.payments[0]?.method ?? "—") as MethodKey
          if (m !== method) return false
        }
        if (!q) return true
        return (
          inv.number.toLowerCase().includes(q) ||
          (inv.customer?.name || "").toLowerCase().includes(q) ||
          (inv.payments[0]?.method ?? "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [invoices, query, method])

  const today = new Date().setHours(0, 0, 0, 0)
  const todayList = invoices.filter((i) => i.createdAt >= today)
  const todayRevenue = todayList.reduce((s, i) => s + i.total, 0)
  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0)
  const avgTicket = invoices.length === 0 ? 0 : Math.round((totalRevenue / invoices.length) * 100) / 100

  // ---- Bulk actions (POS-5) ----
  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((i) => i.id)))
  const selectedInvoices = invoices.filter((i) => selected.has(i.id))

  const bulkExportCsv = () => {
    const header = ["Number", "Date", "Customer", "Method", "Total"]
    const esc = (c: unknown) => `"${String(c).replace(/"/g, '""')}"`
    const body = selectedInvoices.map((i) =>
      [i.number, new Date(i.createdAt).toISOString(), i.customer?.name || "Walk-in", i.payments[0]?.method || "—", i.total]
        .map(esc)
        .join(","),
    )
    const csv = [header.map(esc).join(","), ...body].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `pallio-invoices-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${selectedInvoices.length} invoice${selectedInvoices.length === 1 ? "" : "s"} to CSV.`)
  }

  const bulkPrint = () => {
    const win = window.open("", "_blank", "width=720,height=900")
    if (!win) return
    const rows = selectedInvoices
      .map(
        (i) =>
          `<tr><td>${i.number}</td><td>${new Date(i.createdAt).toLocaleString()}</td><td>${i.customer?.name || "Walk-in"}</td><td style="text-align:right">${formatPrice(i.total)}</td></tr>`,
      )
      .join("")
    win.document.write(
      `<html><head><title>Invoices</title><style>body{font-family:system-ui,sans-serif;padding:16px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #eee;padding:6px 8px;font-size:13px;text-align:left}</style></head><body><h3>Invoices (${selectedInvoices.length})</h3><table><thead><tr><th>Number</th><th>Date</th><th>Customer</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    )
    win.document.close()
    win.focus()
    win.print()
    setTimeout(() => win.close(), 300)
    toast.success(`Sent ${selectedInvoices.length} invoice${selectedInvoices.length === 1 ? "" : "s"} to print.`)
  }

  const bulkEmail = () =>
    toast.success(`Queued ${selectedInvoices.length} receipt${selectedInvoices.length === 1 ? "" : "s"} to email when the backend is connected.`)

  const counts: Record<"all" | MethodKey, number> = {
    all: invoices.length,
    cash:   invoices.filter((i) => (i.payments[0]?.method ?? "") === "cash").length,
    card:   invoices.filter((i) => (i.payments[0]?.method ?? "") === "card").length,
    paypal: invoices.filter((i) => (i.payments[0]?.method ?? "") === "paypal").length,
    stripe: invoices.filter((i) => (i.payments[0]?.method ?? "") === "stripe").length,
    other:  invoices.filter((i) => (i.payments[0]?.method ?? "") === "other").length,
    "—":    invoices.filter((i) => !i.payments[0]?.method).length,
  }

  return (
    <PageShell
      title="POS Invoices"
      titleTooltip={
        <>
          Invoices generated straight from the till — typically when a
          customer asks for a formal invoice rather than just a
          receipt (B2B walk-in, tax-deduction request, expense claim).
          For invoices created from sales orders, see <strong>Sales →
          Invoices</strong>.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Invoices",     value: String(invoices.length), tone: "brand",   hint: "all time" },
            { label: "Today",        value: String(todayList.length), tone: "info",   hint: formatPrice(todayRevenue) },
            { label: "Avg ticket",   value: formatPrice(avgTicket),  tone: "success", hint: "per invoice" },
            { label: "Total revenue", value: formatPrice(totalRevenue), tone: "warning", hint: "POS only" },
          ]}
        />

        {/* Search + filter chips */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search number, customer, method…"
              className="pl-9"
            />
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
        </div>

        {/* Bulk action bar (POS-5) */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/50 px-3 py-2 dark:bg-primary/10">
            <span className="text-sm font-semibold">{selected.size} selected</span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={bulkExportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
            <Button size="sm" variant="outline" onClick={bulkPrint}><Printer className="h-3.5 w-3.5" /> Print</Button>
            <Button size="sm" variant="outline" onClick={bulkEmail}><Mail className="h-3.5 w-3.5" /> Email</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="h-3.5 w-3.5" /> Clear</Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            Icon={FileText}
            title={invoices.length === 0 ? "No invoices yet" : "No invoices match"}
            description={invoices.length === 0
              ? "Ring up a sale at the till and the invoice will appear here."
              : "Adjust filters or clear the search to broaden the view."}
            action={
              invoices.length === 0 ? (
                <Link to="/pos">
                  <Button><ShoppingCart className="h-4 w-4" /> Open POS</Button>
                </Link>
              ) : null
            }
          />
        ) : isMobile ? (
          // Mobile: card list
          <ul className="space-y-2">
            {filtered.map((i) => {
              const m = (i.payments[0]?.method ?? "—") as MethodKey
              return (
                <li key={i.id}>
                  <Link
                    to={`/pos/invoices/${i.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{i.customer?.name || "Walk-in"}</p>
                        <p className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(i.total)}</p>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          <span className="font-mono">{i.number}</span> · {relTime(i.createdAt)}
                        </span>
                        <StatusBadge tone={METHOD_TONE[m]}>{m}</StatusBadge>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          // Desktop: table
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label="Select all"
                          className="h-4 w-4 accent-[var(--brand)]"
                        />
                      </th>
                      <th className="px-3 py-2.5 font-medium">Number</th>
                      <th className="px-3 py-2.5 font-medium">Date</th>
                      <th className="px-3 py-2.5 font-medium">Customer</th>
                      <th className="px-3 py-2.5 font-medium">Method</th>
                      <th className="px-3 py-2.5 text-right font-medium">Total</th>
                      <th className="px-3 py-2.5 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((i) => {
                      const m = (i.payments[0]?.method ?? "—") as MethodKey
                      return (
                        <tr key={i.id} className={cn("transition-colors hover:bg-accent/30", selected.has(i.id) && "bg-brand-soft/40 dark:bg-primary/10")}>
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selected.has(i.id)}
                              onChange={() => toggleSel(i.id)}
                              aria-label={`Select ${i.number}`}
                              className="h-4 w-4 accent-[var(--brand)]"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <Link to={`/pos/invoices/${i.id}`} className="font-mono text-xs font-bold text-brand hover:underline dark:text-primary">
                              {i.number}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-xs">{i.customer?.name || "Walk-in"}</td>
                          <td className="px-3 py-2.5"><StatusBadge tone={METHOD_TONE[m]}>{m}</StatusBadge></td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">{formatPrice(i.total)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/pos/invoices/${i.id}`)}>
                                <ReceiptText className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/pos/invoices/${i.id}?print=1`)}>
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  )
}
