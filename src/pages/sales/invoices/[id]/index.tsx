import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Mail,
  Plus,
  Printer,
  Receipt,
  Smartphone,
  Tag,
  Wallet,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { InfoTooltip } from "@/components/info-tooltip"
import { EmptyState } from "@/components/lists/empty-state"
import { RecordPaymentModal } from "@/components/sales/record-payment-modal"
import { getInvoice, getOrder, getReceipt } from "@/lib/sales/data"
import type { Invoice, Payment } from "@/lib/sales/types"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

const STATUS_TONE: Record<Invoice["status"], StatusTone> = {
  open: "info",
  partial: "warning",
  paid: "success",
  overdue: "danger",
  void: "neutral",
  refunded: "warning",
}

const METHOD_ICON: Record<Payment["method"], React.ElementType> = {
  card: CreditCard,
  cash: Banknote,
  transfer: Wallet,
  wallet: Smartphone,
  "store-credit": Tag,
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d === 1 ? "1d ago" : `${d}d ago`
}

export default function SalesInvoiceDetail() {
  const params = useParams<{ id: string }>()
  const initial = getInvoice(params.id ?? "")
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))

  // Local copy so the Record-payment modal can mutate without
  // touching the import. A real backend would do this server-side.
  const [invoice, setInvoice] = React.useState<Invoice | undefined>(initial)
  const [modalOpen, setModalOpen] = React.useState(false)
  const { formatPrice: fmtMoney } = useCurrency()

  if (!invoice) {
    return (
      <PageShell title="Invoice" withToolbar={false}>
        <Card>
          <CardContent>
            <EmptyState
              Icon={FileText}
              title="Invoice not found"
              description="It might have been voided or the link is stale."
              action={<Link to="/sales/invoices"><Button>Back to invoices</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const order = invoice.orderId ? getOrder(invoice.orderId) : undefined
  const receipt = invoice.receiptId ? getReceipt(invoice.receiptId) : undefined
  const isPaid = invoice.status === "paid"
  const isRefunded = invoice.status === "refunded"
  const overdueDays = invoice.status === "overdue" ? Math.round((Date.now() - new Date(invoice.dueDate).getTime()) / 86_400_000) : 0

  const [pdfBusy, setPdfBusy] = React.useState(false)
  const onDownloadPdf = async () => {
    setPdfBusy(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])
      const el = document.getElementById("invoice-print-body") as HTMLElement | null
      if (!el) {
        toast.error("Couldn't find invoice body to export.")
        return
      }
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const ratio = pageWidth / canvas.width
      pdf.addImage(imgData, "PNG", 0, 20, pageWidth, canvas.height * ratio)
      pdf.save(`${invoice.number}.pdf`)
      toast.success("Invoice PDF downloaded.")
    } catch {
      toast.error("Couldn't generate PDF. Try Print instead.")
    } finally {
      setPdfBusy(false)
    }
  }

  const recordPayment = (next: Omit<Payment, "id" | "invoiceId" | "recordedById">) => {
    const newPayment: Payment = {
      ...next,
      id: `pay-${invoice.id}-${invoice.payments.length + 1}`,
      invoiceId: invoice.id,
      recordedById: "m-1", // mock — current user
    }
    const payments = [...invoice.payments, newPayment]
    const paid = round(payments.reduce((s, p) => s + p.amountUsd, 0))
    const balance = round(invoice.totalUsd - paid)
    const status: Invoice["status"] = paid >= invoice.totalUsd ? "paid" : paid > 0 ? "partial" : invoice.status
    setInvoice({ ...invoice, payments, paidUsd: paid, balanceUsd: balance, status, receiptId: status === "paid" && !invoice.receiptId ? `rcp-new-${invoice.id}` : invoice.receiptId })
    setModalOpen(false)
    if (status === "paid") {
      toast.success(`Invoice paid · receipt issued to ${invoice.customer.email}.`)
    } else {
      toast.success(`Payment of ${fmtMoney(newPayment.amountUsd)} recorded.`)
    }
  }

  // Pipeline steps. Visual milestones the user has hit.
  const steps = [
    { key: "issued",    label: "Issued",    done: true,                                       at: invoice.issueDate },
    { key: "sent",      label: "Sent",      done: invoice.status !== "void",                  at: invoice.issueDate },
    { key: "partial",   label: "Partial",   done: invoice.paidUsd > 0,                        at: invoice.payments[0]?.paidAt },
    { key: "paid",      label: "Paid",      done: isPaid || isRefunded,                       at: isPaid ? invoice.payments[invoice.payments.length - 1]?.paidAt : undefined },
    { key: "fulfilled", label: "Fulfilled", done: order?.status === "fulfilled",              at: undefined },
  ]

  return (
    <PageShell
      title={`Invoice ${invoice.number}`}
      withToolbar={false}
      titleTooltip={
        <>
          A single invoice you've sent a customer. Use the action bar
          to email it again, share a payment link, print a PDF, mark
          it paid, or apply a credit memo. The audit timeline below
          shows every status change with who did it.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Link to="/sales/invoices" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All invoices
        </Link>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-emerald-50/40 p-5 dark:from-primary/10 dark:to-emerald-950/15">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/20 blur-3xl dark:bg-primary/20" aria-hidden />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{invoice.number}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{invoice.customer.name}</h2>
                <StatusBadge tone={STATUS_TONE[invoice.status]} withDot>{invoice.status}</StatusBadge>
                {overdueDays > 0 && (
                  <StatusBadge tone="danger">overdue {overdueDays}d</StatusBadge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{invoice.customer.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Issued {fmtDate(invoice.issueDate)} · due {fmtDate(invoice.dueDate)}
                {order && (
                  <> · from order <Link to={`/sales/orders`} className="font-semibold text-brand hover:underline dark:text-primary">{order.number}</Link></>
                )}
              </p>
            </div>
            <div className="text-right tabular-nums">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Balance</p>
              <p className={cn("text-3xl font-extrabold", invoice.balanceUsd > 0 ? "text-foreground" : "text-emerald-700 dark:text-emerald-300")}>
                {fmtMoney(invoice.balanceUsd)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">of {fmtMoney(invoice.totalUsd)} total</p>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            {!isPaid && !isRefunded && (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" /> Record payment
              </Button>
            )}
            {isPaid && receipt && (
              <Link to={`/sales/receipts/${receipt.id}`}>
                <Button variant="outline">
                  <Receipt className="h-4 w-4" /> View receipt
                </Button>
              </Link>
            )}
            <Link
              to={`/communications/new?template=tpl-invoice&to=${encodeURIComponent(invoice.customer.email)}`}
            >
              <Button variant="outline"><Mail className="h-4 w-4" /> Email</Button>
            </Link>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={onDownloadPdf} disabled={pdfBusy}>
              <Download className="h-4 w-4" /> {pdfBusy ? "Generating…" : "PDF"}
            </Button>
          </div>
        </section>

        {/* KPI strip */}
        <SummaryStrip
          tiles={[
            { label: "Total",     value: fmtMoney(invoice.totalUsd), tone: "brand", hint: "incl. tax" },
            { label: "Paid",      value: fmtMoney(invoice.paidUsd),  tone: "success", hint: `${invoice.payments.length} payment${invoice.payments.length === 1 ? "" : "s"}` },
            { label: "Balance",   value: fmtMoney(invoice.balanceUsd), tone: invoice.balanceUsd > 0 ? "warning" : "success", hint: invoice.balanceUsd > 0 ? "outstanding" : "settled" },
            { label: "Due date",  value: fmtDate(invoice.dueDate), tone: overdueDays > 0 ? "danger" : "info", hint: overdueDays > 0 ? `${overdueDays} days overdue` : "" },
          ]}
        />

        {/* Status pipeline */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-sm font-semibold md:text-base">Status pipeline</h3>
            <InfoTooltip label="Pipeline" size="xs">
              Visual sequence of milestones — Issued → Sent → Partial → Paid → Fulfilled. Each step is timestamped when reached.
            </InfoTooltip>
          </div>
          <ol className="mt-4 flex items-start gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {steps.map((s, idx) => {
              const next = steps[idx + 1]
              return (
                <li key={s.key} className="flex min-w-[7rem] items-start gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                        s.done
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {s.done ? <Check className="h-3 w-3" /> : <span>{idx + 1}</span>}
                    </span>
                    <p className={cn("text-xs font-semibold", s.done ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
                    {s.at && <p className="text-[10px] text-muted-foreground">{fmtDate(s.at)}</p>}
                  </div>
                  {next && (
                    <span aria-hidden className={cn("mt-3 h-0.5 flex-1", s.done ? "bg-emerald-500/60" : "bg-border")} />
                  )}
                </li>
              )
            })}
          </ol>
        </section>

        {/* Lines + Side payments */}
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Line items */}
          <section id="invoice-print-body" className="rounded-2xl border border-border bg-card">
            <div className="flex items-baseline gap-1.5 border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold md:text-base">Line items</h3>
              <InfoTooltip label="Line items" size="xs">
                Items billed on this invoice. Per-line tax shown when set. Totals match the hero figure.
              </InfoTooltip>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Item</th>
                    <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                    <th className="px-4 py-2.5 text-right font-medium">Unit</th>
                    <th className="px-4 py-2.5 text-right font-medium">Tax</th>
                    <th className="px-4 py-2.5 text-right font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.lines.map((l) => {
                    const sub = l.qty * l.unitPriceUsd
                    const tax = sub * (l.taxRate ?? 0)
                    return (
                      <tr key={l.sku}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{l.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{l.sku}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{l.qty}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(l.unitPriceUsd)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(tax)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmtMoney(sub + tax)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t border-border bg-muted/30">
                  <tr>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground" colSpan={4}>Subtotal</td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums">{fmtMoney(invoice.subtotalUsd)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground" colSpan={4}>Tax</td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums">{fmtMoney(invoice.taxUsd)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-right text-sm font-bold" colSpan={4}>Total</td>
                    <td className="px-4 py-2 text-right text-base font-bold tabular-nums">{fmtMoney(invoice.totalUsd)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {invoice.memo && (
              <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/70">Memo</p>
                <p className="mt-0.5">{invoice.memo}</p>
              </div>
            )}
          </section>

          {/* Payments + Receipt + Order link */}
          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-sm font-semibold md:text-base">Payments</h3>
                <InfoTooltip label="Payments" size="xs">
                  Every payment recorded against this invoice in chronological order.
                  Negative amounts represent refunds.
                </InfoTooltip>
              </div>
              {invoice.payments.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {invoice.payments.map((p) => {
                    const Icon = METHOD_ICON[p.method]
                    const isRefund = p.amountUsd < 0 || (p.note ?? "").toLowerCase().includes("refund")
                    return (
                      <li key={p.id} className="flex items-start gap-3 py-2.5">
                        <span className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          isRefund ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold capitalize">{p.method.replace("-", " ")}</p>
                            <p className={cn("text-sm font-bold tabular-nums", isRefund ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300")}>
                              {isRefund ? "−" : "+"}{fmtMoney(Math.abs(p.amountUsd))}
                            </p>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{relTime(p.paidAt)} · {fmtDate(p.paidAt)}</p>
                          {p.reference && <p className="font-mono text-[10px] text-muted-foreground">ref: {p.reference}</p>}
                          {p.note && <p className="mt-0.5 text-[11px] italic text-muted-foreground">"{p.note}"</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {!isPaid && !isRefunded && (
                <Button className="mt-3 w-full" onClick={() => setModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Record payment
                </Button>
              )}
            </section>

            {/* Receipt */}
            {receipt && (
              <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold tracking-tight">Receipt issued</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{receipt.number}</span> · {fmtMoney(receipt.amountUsd)} · {receipt.paymentMethodSummary}
                    </p>
                    <Link to={`/sales/receipts/${receipt.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline dark:text-primary">
                      Open receipt →
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* Order link */}
            {order && (
              <section className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold">Source order</h3>
                  <InfoTooltip label="Source order" size="xs">
                    This invoice was generated from sales order {order.number}.
                  </InfoTooltip>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold">{order.number}</p>
                    <p className="text-[11px] text-muted-foreground">{order.lines.length} line{order.lines.length === 1 ? "" : "s"} · status: {order.status}</p>
                    {order.expectedFulfillBy && (
                      <p className="text-[11px] text-muted-foreground">
                        <Calendar className="mr-0.5 inline h-3 w-3" /> Fulfil by {fmtDate(order.expectedFulfillBy)}
                      </p>
                    )}
                  </div>
                  <Link to="/sales/orders">
                    <Button size="sm" variant="outline">View</Button>
                  </Link>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      <RecordPaymentModal
        open={modalOpen}
        invoice={invoice}
        onClose={() => setModalOpen(false)}
        onRecord={recordPayment}
      />
    </PageShell>
  )
}

function round(n: number): number { return Math.round(n * 100) / 100 }
