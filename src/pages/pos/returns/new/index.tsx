import * as React from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowLeft,
  Banknote,
  Building2,
  CreditCard,
  Minus,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Smartphone,
  type LucideIcon,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/lists/status-badge"
import {
  adjustStock,
  getInvoiceById,
  getInvoiceByNumber,
  genId,
  genReturnNumber,
  saveReturn,
  RETURN_REASONS,
  type Invoice,
  type ReturnReason,
  type ReturnRecord,
} from "@/lib/pos/storage"
import { db } from "@/lib/db/index"
import { postReturnToLedger } from "@/lib/accounting/auto-post"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type Method = ReturnRecord["method"]

const METHODS: { value: Method; label: string; Icon: LucideIcon }[] = [
  { value: "cash",   label: "Cash",   Icon: Banknote },
  { value: "card",   label: "Card",   Icon: CreditCard },
  { value: "paypal", label: "PayPal", Icon: Smartphone },
  { value: "stripe", label: "Stripe", Icon: Smartphone },
  { value: "other",  label: "Other",  Icon: Building2 },
]

export default function NewReturnPage() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const invoiceId = search.get("invoiceId") || ""
  const invoiceNumberParam = search.get("invoiceNumber") || ""

  const [invoice, setInvoice] = React.useState<Invoice | null>(null)
  const [qtys, setQtys] = React.useState<Record<string, number>>({})
  const [method, setMethod] = React.useState<Method>("card")
  const [reference, setReference] = React.useState("")
  const [reason, setReason] = React.useState<ReturnReason | null>(null)
  const [reasonNote, setReasonNote] = React.useState("")
  const [lookup, setLookup] = React.useState("")
  const [lookupError, setLookupError] = React.useState<string | null>(null)
  const { formatPrice } = useCurrency()

  // Pre-select the original payment method so "refund to the card they
  // paid with" is the default — the cashier overrides only when needed.
  // POS-1.
  const originalMethod = (inv: Invoice): Method => {
    const lines = inv.payments ?? []
    if (lines.length === 0) return "card"
    const dominant = [...lines].sort((a, b) => b.amount - a.amount)[0]
    return (dominant?.method as Method) ?? "card"
  }

  const loadInvoice = React.useCallback((inv: Invoice) => {
    setInvoice(inv)
    setMethod(originalMethod(inv))
    const init: Record<string, number> = {}
    for (const it of inv.items) init[it.sku] = 0
    setQtys(init)
  }, [])

  React.useEffect(() => {
    const inv = invoiceId
      ? getInvoiceById(invoiceId)
      : invoiceNumberParam
        ? getInvoiceByNumber(invoiceNumberParam)
        : undefined
    if (inv) loadInvoice(inv)
  }, [invoiceId, invoiceNumberParam, loadInvoice])

  const runLookup = (e: React.FormEvent) => {
    e.preventDefault()
    const num = lookup.trim()
    if (!num) return
    const inv = getInvoiceByNumber(num)
    if (!inv) {
      setLookupError(`Invoice "${num}" not found — check the number and try again.`)
      return
    }
    setLookupError(null)
    loadInvoice(inv)
  }

  // ---------- Empty state (no invoice loaded) ----------
  if (!invoice) {
    return (
      <PageShell
        title="POS — New Return"
        withToolbar={false}
        titleTooltip={
          <>
            Look up the customer's original receipt to start a return
            at the till. Invoice number, customer name, or the last 4
            of the card all work.
          </>
        }
      >
        <div className="mb-3">
          <Link to="/pos/returns" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> All returns
          </Link>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <Receipt className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-lg font-bold">Find the original invoice</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Returns are matched to a past sale so refund amount,
                taxes, and items all flow correctly. Enter the invoice
                number from the receipt to begin.
              </p>

              <form onSubmit={runLookup} className="mt-4 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={lookup}
                    onChange={(e) => { setLookup(e.target.value); setLookupError(null) }}
                    placeholder="e.g. POS-20251121-0042"
                    className="pl-9"
                  />
                </div>
                <Button type="submit" className="shrink-0">Find invoice</Button>
              </form>

              {lookupError && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {lookupError}
                </p>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Don't have the number? Browse{" "}
                <Link to="/pos/invoices" className="font-semibold text-brand hover:underline dark:text-primary">past invoices</Link>{" "}
                or{" "}
                <Link to="/pos/transactions" className="font-semibold text-brand hover:underline dark:text-primary">transactions</Link>{" "}
                and tap the row to start a return from there.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  // ---------- Loaded state ----------
  const subtotal = invoice.items.reduce((s, it) => s + (qtys[it.sku] || 0) * it.price, 0)
  const tax = invoice.items.reduce((s, it) => s + (qtys[it.sku] || 0) * it.price * (it.taxRate || 0), 0)
  const totalRefund = Math.max(0, Math.round((subtotal + tax) * 100) / 100)
  const anyQty = Object.values(qtys).some((q) => q > 0)
  const soldUnits = invoice.items.reduce((s, it) => s + it.qty, 0)
  const returnUnits = Object.values(qtys).reduce((s, q) => s + q, 0)

  const bump = (sku: string, delta: number, max: number) => {
    setQtys((q) => {
      const next = Math.max(0, Math.min(max, (q[sku] || 0) + delta))
      return { ...q, [sku]: next }
    })
  }
  const returnAll = () => {
    const next: Record<string, number> = {}
    for (const it of invoice.items) next[it.sku] = it.qty
    setQtys(next)
  }
  const clearAll = () => {
    const next: Record<string, number> = {}
    for (const it of invoice.items) next[it.sku] = 0
    setQtys(next)
  }

  function submitReturn() {
    if (!invoice) return
    if (!anyQty) {
      toast.error("Select at least one quantity to return.")
      return
    }
    if (!reason) {
      toast.error("Pick a reason for the return.")
      return
    }
    const rec: ReturnRecord = {
      id: genId("ret"),
      number: genReturnNumber(),
      createdAt: Date.now(),
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      customer: invoice.customer,
      items: invoice.items
        .filter((it) => (qtys[it.sku] || 0) > 0)
        .map((it) => ({ sku: it.sku, name: it.name, price: it.price, qty: qtys[it.sku] || 0 })),
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      totalRefund,
      method,
      reference: reference || undefined,
      reason,
      reasonNote: reason === "other" ? reasonNote.trim() || undefined : undefined,
    }
    saveReturn(rec)
    // POS-5: credit returned units back to stock + queue the return for sync.
    for (const it of rec.items) adjustStock(it.sku, it.qty)
    void db.enqueue("return", rec)
    // ACCT-2: post the refund to the ledger (reverses part of the sale).
    postReturnToLedger(rec)
    toast.success(`Return ${rec.number} created · ${formatPrice(totalRefund)} refunded.`)
    navigate(`/pos/returns/${rec.id}`)
  }

  return (
    <PageShell
      title="POS — New Return"
      withToolbar={false}
      titleTooltip={
        <>
          Customer's at the till bringing something back. Pick the
          items + refund method (cash, original card, transfer, store
          credit), confirm, done in under a minute.
        </>
      }
    >
      {/* Back link */}
      <div className="mb-3">
        <Link to="/pos/returns" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All returns
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {/* Invoice context strip */}
        <div className="grid gap-2 sm:grid-cols-4">
          <Tile label="Original invoice" value={invoice.number} mono />
          <Tile label="Customer" value={invoice.customer?.name || "Walk-in"} />
          <Tile label="Date" value={new Date(invoice.createdAt).toLocaleDateString()} />
          <Tile label="Original total" value={formatPrice(invoice.total)} />
        </div>

        {/* Items to return */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-baseline justify-between gap-2 p-4">
              <div>
                <h3 className="text-sm font-semibold md:text-base">Items to return</h3>
                <p className="text-[11px] text-muted-foreground">
                  {returnUnits} of {soldUnits} unit{soldUnits === 1 ? "" : "s"} selected.
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={clearAll} disabled={!anyQty}>Clear</Button>
                <Button size="sm" variant="outline" onClick={returnAll}>Return all</Button>
              </div>
            </div>
            <ul className="divide-y divide-border border-t border-border">
              {invoice.items.map((it) => {
                const q = qtys[it.sku] || 0
                return (
                  <li key={it.sku} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{it.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        <span className="font-mono">{it.sku}</span> · {formatPrice(it.price)} each · sold {it.qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => bump(it.sku, -1, it.qty)}
                        disabled={q <= 0}
                        aria-label="Decrease"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        type="number"
                        min={0}
                        max={it.qty}
                        placeholder="0"
                        value={q === 0 ? "" : q}
                        onChange={(e) =>
                          setQtys((s) => ({
                            ...s,
                            [it.sku]:
                              e.target.value === ""
                                ? 0
                                : Math.min(it.qty, Math.max(0, Number(e.target.value) || 0)),
                          }))
                        }
                        className="h-8 w-14 text-center tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => bump(it.sku, +1, it.qty)}
                        disabled={q >= it.qty}
                        aria-label="Increase"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="w-20 shrink-0 text-right text-sm font-bold tabular-nums">
                      {formatPrice(q * it.price)}
                    </p>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Reason for return — required (POS-1) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold md:text-base">Reason for return</h3>
            <p className="text-[11px] text-muted-foreground">
              Helps you spot patterns — faulty batches, sizing issues, items that get sent back a lot.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {RETURN_REASONS.map((r) => {
                const active = reason === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      active
                        ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
            {reason === "other" && (
              <Input
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Add a short note"
                className="mt-3"
              />
            )}
          </CardContent>
        </Card>

        {/* Refund method + reference */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold md:text-base">Refund method</h3>
            <p className="text-[11px] text-muted-foreground">Where the money goes back to. Default matches the original payment when possible.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {METHODS.map((m) => {
                const Icon = m.Icon
                const active = method === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      active
                        ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {m.label}
                  </button>
                )
              })}
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reference (optional)
              </span>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. card auth code, transfer ref"
              />
            </label>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-1 text-sm">
              <SumRow label="Subtotal" value={formatPrice(Math.round(subtotal * 100) / 100)} />
              <SumRow label="Tax" value={formatPrice(Math.round(tax * 100) / 100)} />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="text-base font-bold">Refund total</span>
                <span className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  −{formatPrice(totalRefund)}
                </span>
              </div>
              <div className="pt-1">
                <StatusBadge tone="info">
                  {method.toUpperCase()}{reference ? ` · ${reference}` : ""}
                </StatusBadge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 bg-background py-2 md:static">
          <Button variant="outline" onClick={() => navigate("/pos/returns")}>Cancel</Button>
          <Button onClick={submitReturn} disabled={totalRefund <= 0 || !reason}>
            <RotateCcw className="h-4 w-4" /> Create return · {formatPrice(totalRefund)}
          </Button>
        </div>
      </div>
    </PageShell>
  )
}

function Tile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-sm font-semibold", mono && "font-mono")}>{value}</p>
    </div>
  )
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
