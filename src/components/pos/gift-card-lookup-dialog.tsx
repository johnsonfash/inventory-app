import * as React from "react"
import { Gift, Search } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/lists/status-badge"
import { getGiftCard, type GiftCard } from "@/lib/pos/loyalty"
import { useCurrency } from "@/contexts/currency"

// Quick balance check from the till. F7 — operator wants to answer
// "what's on this card?" without standing up a separate sale. Tied
// only to the static gift-card store so it works equally well from
// /pos and customer detail pages.
export function GiftCardLookupDialog({
  open,
  onClose,
  onSellNew,
}: {
  open: boolean
  onClose: () => void
  /** Open the existing sell-a-card flow when the cashier wants to issue one. */
  onSellNew?: () => void
}) {
  const { formatPrice } = useCurrency()
  const [code, setCode] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const [card, setCard] = React.useState<GiftCard | null>(null)

  React.useEffect(() => {
    if (open) {
      setCode("")
      setSubmitted(false)
      setCard(null)
    }
  }, [open])

  const lookup = () => {
    const trimmed = code.trim()
    if (!trimmed) return
    setSubmitted(true)
    setCard(getGiftCard(trimmed) ?? null)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
            <Gift className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold">Check gift card</p>
            <p className="text-[11px] text-muted-foreground">
              Type the card code to see its balance + status.
            </p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Gift card code</span>
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder="GC-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
              className="font-mono"
            />
            <Button type="button" onClick={lookup} disabled={!code.trim()}>
              <Search className="h-4 w-4" /> Check
            </Button>
          </div>
        </label>

        {submitted && !card && (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
            <p className="text-sm font-semibold">No card with that code.</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Double-check the code, or issue a new card if the customer wants to load value.
            </p>
            {onSellNew && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  onClose()
                  onSellNew()
                }}
              >
                Sell new gift card
              </Button>
            )}
          </div>
        )}

        {card && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold">{card.code}</p>
                <StatusBadge tone={statusTone(card.status)} withDot>
                  {card.status}
                </StatusBadge>
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Balance
              </p>
              <p className="text-2xl font-bold tabular-nums">{formatPrice(card.currentBalance)}</p>
              <p className="text-[11px] text-muted-foreground">
                Issued {formatPrice(card.originalAmount)} ·{" "}
                {new Date(card.issuedAt).toLocaleDateString()}
                {card.expiresAt && <> · expires {new Date(card.expiresAt).toLocaleDateString()}</>}
              </p>
              {card.customer?.name || card.customer?.email ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Issued to{" "}
                  <span className="font-medium text-foreground">
                    {card.customer?.name || card.customer?.email}
                  </span>
                </p>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function statusTone(status: GiftCard["status"]): "success" | "warning" | "danger" {
  if (status === "active") return "success"
  if (status === "redeemed") return "warning"
  return "danger"
}
