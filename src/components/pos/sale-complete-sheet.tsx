import * as React from "react"
import { CheckCircle2, Gift, Mail, MessageSquare, Printer, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ReceiptPreview, printInvoiceNode } from "@/components/pos/invoice-print"
import { printInvoiceThermal } from "@/lib/pos/hardware"
import { useCurrency } from "@/contexts/currency"
import type { Invoice } from "@/lib/pos/storage"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  /** Gift-receipt toggle — hides prices, adds return-by date. */
  giftReceipt: boolean
  onGiftReceiptChange: (next: boolean) => void
  /** Start a refund against this sale. */
  onRefund?: () => void
  /** Begin a fresh sale — parent clears cart, focuses scanner. */
  onNewSale?: () => void
}

// Post-charge "Sale complete" surface — replaces the thin Receipt
// dialog that only offered Print + Done. Modeled on Square / Toast /
// Lightspeed: success badge, receipt preview, then a 2x2 grid of
// delivery options (print, email, sms, gift toggle) and a primary
// "New sale" CTA. Centered Dialog per overlay rule — focused decision
// about what to do with this receipt.
export function SaleCompleteSheet({
  open,
  onClose,
  invoice,
  giftReceipt,
  onGiftReceiptChange,
  onRefund,
  onNewSale,
}: Props) {
  const { formatPrice } = useCurrency()
  // Local overrides — used when the attached customer has no email /
  // phone, so the cashier can type one ad-hoc and still send.
  const [emailOverride, setEmailOverride] = React.useState("")
  const [smsOverride, setSmsOverride] = React.useState("")
  // Reset overrides on each new sale.
  React.useEffect(() => {
    if (open) {
      setEmailOverride("")
      setSmsOverride("")
    }
  }, [open, invoice?.id])

  if (!invoice) return null

  const customerEmail = invoice.customer?.email || ""
  const customerPhone = invoice.customer?.phone || ""
  const finalEmail = (emailOverride || customerEmail).trim()
  const finalPhone = (smsOverride || customerPhone).trim()

  const handlePrint = async () => {
    // Thermal first; fall back to browser print if no printer.
    const ok = await printInvoiceThermal(invoice, { gift: giftReceipt })
    if (ok) {
      toast.success("Sent to printer.")
      return
    }
    const node = document.getElementById("sale-complete-receipt-root")
    if (node) {
      printInvoiceNode(node)
      toast.success("Receipt opened in print dialog.")
    }
  }

  const handleEmail = () => {
    if (!finalEmail) return
    const subject = `Receipt ${invoice.number}`
    const body =
      `Thanks for your purchase!\n\n` +
      `Receipt: ${invoice.number}\n` +
      `Total: ${formatPrice(invoice.total)}\n\n` +
      `Reply if you need anything.`
    // OS mailto stub — backend will replace this with a real send.
    window.location.href = `mailto:${encodeURIComponent(finalEmail)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`
    toast.success(`Receipt drafted to ${finalEmail}.`)
  }

  const handleSms = () => {
    if (!finalPhone) return
    const body = `Receipt ${invoice.number} — ${formatPrice(invoice.total)}. Thanks!`
    // sms: link — works on iOS and Android; on desktop it opens the
    // default SMS-capable handler (Messages on macOS, etc).
    window.location.href = `sms:${encodeURIComponent(finalPhone)}?body=${encodeURIComponent(body)}`
    toast.success(`Receipt drafted to ${finalPhone}.`)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {/* Success badge */}
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="mt-2 text-base font-bold">Sale complete</p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{formatPrice(invoice.total)}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{invoice.number}</p>
        </div>

        {/* Compact receipt preview (scrollable inside the dialog) */}
        <div
          id="sale-complete-receipt-root"
          className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-2"
        >
          <ReceiptPreview invoice={invoice} gift={giftReceipt} />
        </div>

        {/* Optional contact fallbacks — only render the input when the
            customer doesn't already have that channel attached. */}
        {!customerEmail && (
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Email receipt to
            </span>
            <Input
              type="email"
              value={emailOverride}
              onChange={(e) => setEmailOverride(e.target.value)}
              placeholder="customer@example.com"
              autoComplete="email"
            />
          </label>
        )}
        {!customerPhone && (
          <label className="mt-2 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              SMS receipt to
            </span>
            <Input
              type="tel"
              value={smsOverride}
              onChange={(e) => setSmsOverride(e.target.value)}
              placeholder="+234…"
              autoComplete="tel"
            />
          </label>
        )}

        {/* 2x2 delivery grid */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ActionTile Icon={Printer} label="Print" onClick={handlePrint} />
          <ActionTile
            Icon={Mail}
            label="Email"
            disabled={!finalEmail}
            disabledHint="Add an email"
            onClick={handleEmail}
          />
          <ActionTile
            Icon={MessageSquare}
            label="SMS"
            disabled={!finalPhone}
            disabledHint="Add a phone"
            onClick={handleSms}
          />
          <ActionTile
            Icon={Gift}
            label={giftReceipt ? "Gift receipt · on" : "Gift receipt"}
            active={giftReceipt}
            onClick={() => onGiftReceiptChange(!giftReceipt)}
          />
        </div>

        {/* Footer: primary New Sale, secondary Refund + Done */}
        <div className="mt-4 flex flex-col gap-2">
          {onNewSale && (
            <Button
              type="button"
              onClick={() => {
                onClose()
                onNewSale()
              }}
              className="w-full"
              size="lg"
            >
              New sale
            </Button>
          )}
          <div className="flex items-center justify-between gap-2">
            {onRefund ? (
              <button
                type="button"
                onClick={onRefund}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Refund this sale
              </button>
            ) : (
              <span />
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ActionTile({
  Icon,
  label,
  onClick,
  disabled,
  disabledHint,
  active,
}: {
  Icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  disabledHint?: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/15 dark:text-primary"
          : "border-border bg-card hover:border-brand/40 hover:bg-accent",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-center leading-tight">{label}</span>
    </button>
  )
}
