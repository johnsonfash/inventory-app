import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Download, Mail, Printer, Receipt as ReceiptIcon } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { getInvoice, getReceipt } from "@/lib/sales/data"
import { useCurrency } from "@/contexts/currency"
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export default function ReceiptDetail() {
  const params = useParams<{ id: string }>()
  const receipt = getReceipt(params.id ?? "")
  const invoice = receipt ? getInvoice(receipt.invoiceId) : undefined
  const { formatPrice: fmtMoney } = useCurrency()
  const [pdfBusy, setPdfBusy] = React.useState(false)
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))

  const onDownloadPdf = async () => {
    if (!receipt) return
    setPdfBusy(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])
      const el = document.getElementById("receipt-print-body") as HTMLElement | null
      if (!el) {
        toast.error("Couldn't find receipt body to export.")
        return
      }
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const ratio = pageWidth / canvas.width
      pdf.addImage(imgData, "PNG", 0, 20, pageWidth, canvas.height * ratio)
      pdf.save(`${receipt.number}.pdf`)
      toast.success("Receipt PDF downloaded.")
    } catch {
      toast.error("Couldn't generate PDF. Try Print instead.")
    } finally {
      setPdfBusy(false)
    }
  }

  if (!receipt || !invoice) {
    return (
      <PageShell title="Receipt" withToolbar={false}>
        <Card>
          <CardContent>
            <EmptyState
              Icon={ReceiptIcon}
              title="Receipt not found"
              description="It might have been voided or the link is stale."
              action={<Link to="/sales/receipts"><Button>Back to receipts</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={`Receipt ${receipt.number}`}
      withToolbar={false}
      titleTooltip={
        <>
          Proof a customer paid you. Pallio prints these
          automatically at every till transaction and after every
          online invoice is settled. Reprint, email, or attach to a
          refund from the action bar.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Link to="/sales/receipts" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All receipts
        </Link>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-50 via-card to-brand-soft/40 p-5 dark:from-emerald-950/15 dark:to-primary/10">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Paid
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{receipt.number}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">{receipt.customer.name}</h2>
              <p className="text-sm text-muted-foreground">{receipt.customer.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Issued {fmtDate(receipt.issuedAt)}</p>
              {receipt.emailedAt && (
                <StatusBadge tone="success" withDot>
                  <Mail className="h-2.5 w-2.5" /> emailed {fmtDate(receipt.emailedAt)}
                </StatusBadge>
              )}
            </div>
            <div className="text-right tabular-nums">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</p>
              <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">{fmtMoney(receipt.amountUsd)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{receipt.paymentMethodSummary}</p>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <Link to={`/communications/new?template=tpl-receipt&to=${encodeURIComponent(receipt.customer.email)}`}>
              <Button variant="outline"><Mail className="h-4 w-4" /> Email customer</Button>
            </Link>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={onDownloadPdf} disabled={pdfBusy}>
              <Download className="h-4 w-4" /> {pdfBusy ? "Generating…" : "PDF"}
            </Button>
          </div>
        </section>

        {/* Receipt body — printable */}
        <section id="receipt-print-body" className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receipt</p>
              <p className="mt-1 font-mono text-sm font-bold">{receipt.number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pallio</p>
              <p className="mt-1 text-sm font-bold">Acme Co</p>
              <p className="text-[11px] text-muted-foreground">200 Congress Ave, Austin, TX 78701</p>
            </div>
          </header>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Billed to</p>
              <p className="mt-1 text-sm font-semibold">{receipt.customer.name}</p>
              <p className="text-xs text-muted-foreground">{receipt.customer.email}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payment</p>
              <p className="mt-1 text-sm font-semibold">{receipt.paymentMethodSummary}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(receipt.issuedAt)}</p>
            </div>
          </div>

          {/* Line items echoed from the invoice */}
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Unit</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.lines.map((l) => (
                <tr key={l.sku}>
                  <td className="py-2.5">
                    <p className="font-medium">{l.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{l.sku}</p>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{l.qty}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtMoney(l.unitPriceUsd)}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{fmtMoney(l.unitPriceUsd * l.qty)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border">
              <tr><td className="py-1.5 text-right text-xs text-muted-foreground" colSpan={3}>Subtotal</td><td className="py-1.5 text-right text-xs tabular-nums">{fmtMoney(invoice.subtotalUsd)}</td></tr>
              <tr><td className="py-1.5 text-right text-xs text-muted-foreground" colSpan={3}>Tax</td><td className="py-1.5 text-right text-xs tabular-nums">{fmtMoney(invoice.taxUsd)}</td></tr>
              <tr><td className="py-2 text-right text-sm font-bold" colSpan={3}>Paid</td><td className="py-2 text-right text-base font-bold tabular-nums">{fmtMoney(receipt.amountUsd)}</td></tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div className="mt-8 border-t border-dashed border-border pt-4 text-center text-[11px] text-muted-foreground">
            <p>Thank you for your business.</p>
            <p className="mt-1">Issued via Pallio · pallio.app</p>
          </div>
        </section>

        {/* Invoice link */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source invoice</p>
              <p className="mt-0.5 font-mono text-sm font-bold">{invoice.number}</p>
              <p className="text-[11px] text-muted-foreground">{invoice.lines.length} line{invoice.lines.length === 1 ? "" : "s"} · paid in full</p>
            </div>
            <Link to={`/sales/invoices/${invoice.id}`}>
              <Button size="sm" variant="outline">Open invoice</Button>
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
