
import * as React from "react"
import { Link, useSearchParams, useParams } from "react-router-dom"
import { ArrowLeft, ChevronRight, Gift, Mail, Printer, RotateCcw, Share2, Sparkles, Wallet } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { InvoicePreview, printInvoiceNode } from "@/components/pos/invoice-print"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/lists/status-badge"
import { getInvoiceById, listReturns } from "@/lib/pos/storage"
import { loadLoyaltyRules } from "@/lib/pos/loyalty"
import { useShare } from "@/hooks/use-share"
import { useCurrency } from "@/contexts/currency"

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const [search] = useSearchParams()
  const invoice = getInvoiceById(params.id ?? "")
  const ref = React.useRef<HTMLDivElement>(null)
  const share = useShare()
  const { formatPrice } = useCurrency()
  const refundsAgainst = React.useMemo(
    () => (invoice ? listReturns().filter((r) => r.invoiceId === invoice.id) : []),
    [invoice],
  )

  React.useEffect(() => {
    if (search.get("print") === "1" && ref.current) {
      printInvoiceNode(ref.current)
    }
  }, [search])

  if (!invoice) {
    return (
      <PageShell title="Invoice">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Invoice not found.</CardContent>
        </Card>
      </PageShell>
    )
  }

  const onShare = async () => {
    // Construct an absolute URL so external apps that follow the
    // link (Mail, Messages, Slack) land on the right invoice. Works
    // both on web (uses location.origin) and native (same — the
    // Capacitor build runs under https://localhost so links resolve
    // to the deployed pallio.app via the universal link config).
    const origin = window.location.origin.includes("localhost")
      ? "https://pallio.app"
      : window.location.origin
    const url = `${origin}/pos/invoices/${invoice.id}`
    const total = formatPrice(invoice.total)
    const customer = invoice.customer?.name ?? "Walk-in"
    const res = await share({
      title: `Invoice ${invoice.number}`,
      text: `Invoice ${invoice.number} — ${customer} — ${total}`,
      url,
      dialogTitle: "Share invoice",
    })
    if (res.kind === "copied") toast.success("Invoice link copied")
    else if (res.kind === "shared") toast.success("Shared via system dialog")
    else if (res.kind === "unavailable") toast.error("Sharing not available on this device")
    // 'cancelled' is silent — user backed out intentionally.
  }

  return (
    <PageShell
      title={`Invoice ${invoice.number}`}
      titleTooltip={
        <>
          A formal invoice generated at the till — printed copy plus
          PDF email to the customer. Different from the regular
          /sales/invoices flow because POS invoices are paid in full
          at the moment of issue.
        </>
      }
    >
      {/* Back link + at-a-glance meta */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link to="/pos/invoices" className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All invoices
        </Link>
        <div className="flex items-center gap-2">
          <StatusBadge tone="info">{invoice.payments[0]?.method ?? "—"}</StatusBadge>
          <span className="text-muted-foreground">{new Date(invoice.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Metadata strip */}
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <MetaTile label="Customer"   value={invoice.customer?.name || "Walk-in"} />
        <MetaTile label="Items"      value={String(invoice.items.reduce((s, i) => s + i.qty, 0))} />
        <MetaTile label="Total"      value={formatPrice(invoice.total)} highlight />
        <MetaTile label="Refunded"   value={refundsAgainst.length > 0 ? formatPrice(refundsAgainst.reduce((s, r) => s + r.totalRefund, 0)) : "—"} />
      </div>

      <div ref={ref}>
        <InvoicePreview invoice={invoice} />
      </div>

      {/* F7: loyalty + value-instrument summary. Inline rows, kept
          small — the invoice preview above already shows the totals. */}
      {(() => {
        const rules = loadLoyaltyRules()
        const hasCustomerLoyalty =
          rules.earnEnabled && (invoice.customer?.email || invoice.customer?.phone)
        const pointsEarned = hasCustomerLoyalty
          ? Math.floor(invoice.total * rules.pointsPerCurrencyUnit)
          : 0
        const giftCardTenders = invoice.payments.filter((p) => p.method === "gift-card")
        const storeCreditTotal = invoice.payments
          .filter((p) => p.method === "store-credit")
          .reduce((s, p) => s + p.amount, 0)
        if (
          pointsEarned <= 0 &&
          giftCardTenders.length === 0 &&
          storeCreditTotal <= 0
        ) {
          return null
        }
        return (
          <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-muted/30 p-3 text-xs">
            {pointsEarned > 0 && (
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand dark:text-primary" />
                <span className="text-muted-foreground">
                  +<span className="font-semibold text-foreground">{pointsEarned}</span> loyalty points earned
                </span>
              </div>
            )}
            {giftCardTenders.map((p, idx) => (
              <div key={`gc-${idx}`} className="flex items-center gap-2">
                <Gift className="h-3.5 w-3.5 text-brand dark:text-primary" />
                <span className="text-muted-foreground">
                  Gift card applied: <span className="font-mono font-semibold text-foreground">✦{(p.reference || "").slice(-4) || "????"}</span> ({formatPrice(p.amount)})
                </span>
              </div>
            ))}
            {storeCreditTotal > 0 && (
              <div className="flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-brand dark:text-primary" />
                <span className="text-muted-foreground">
                  Store credit applied: <span className="font-semibold text-foreground">{formatPrice(storeCreditTotal)}</span>
                </span>
              </div>
            )}
          </div>
        )
      })()}

      {/* Related returns */}
      {refundsAgainst.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Returns against this invoice
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {refundsAgainst.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/pos/returns/${r.id}`}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300">
                    <RotateCcw className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold">{r.number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.items.length} item(s) · {new Date(r.createdAt).toLocaleDateString()} · {r.method}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    −{formatPrice(r.totalRefund)}
                  </p>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Link to={`/pos/returns/new?invoiceId=${encodeURIComponent(invoice.id)}`}>
          <Button variant="outline">
            <RotateCcw className="h-4 w-4" /> Start return
          </Button>
        </Link>
        <Link
          to={`/communications/new?template=tpl-invoice${invoice.customer?.email ? `&to=${encodeURIComponent(invoice.customer.email)}` : ""}`}
        >
          <Button variant="outline">
            <Mail className="h-4 w-4" /> Send via email
          </Button>
        </Link>
        <Button variant="outline" onClick={onShare}>
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button onClick={() => ref.current && printInvoiceNode(ref.current)}>
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>
    </PageShell>
  )
}

function MetaTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={highlight ? "mt-1 text-base font-bold tabular-nums text-brand dark:text-primary" : "mt-1 text-sm font-semibold tabular-nums"}>{value}</p>
    </div>
  )
}
