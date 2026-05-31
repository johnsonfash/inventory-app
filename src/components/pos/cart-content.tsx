import * as React from "react"
import { Minus, Percent, Plus, Tag, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { lineDiscountValue, lineNet, type CartItem } from "@/lib/pos/storage"
import { modifiersLabel } from "@/lib/pos/variants"
import { Input } from "@/components/ui/input"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

// Sanity cap so a slipped-thumb 99999 doesn't ring up an impossible
// line. Real per-SKU stock limits will flow in once the catalog gains
// on-hand qty per location; until then this is just a guardrail.
const MAX_LINE_QTY = 1000

type Totals = {
  subtotal: number
  /** Sum of all per-line discounts (POS-1). */
  lineDiscountTotal: number
  itemTax: number
  orderTax: number
  shipping: number
  serviceFee: number
  discountValue: number
  /** Gratuity, added at checkout (POS-1). Usually 0 in the cart view. */
  tip: number
  total: number
}

type Props = {
  cart: CartItem[]
  // Cart operations key on the line `id`, not the SKU — variants and
  // modifiers (POS-2) mean the same SKU can appear on multiple lines.
  onUpdateQty: (id: string, next: number) => void
  onRemove: (id: string) => void
  /** Set a per-line discount. POS-1. */
  onLineDiscount?: (id: string, value: number, type: "flat" | "percent") => void
  discount: number
  discountType: "flat" | "percent"
  onDiscountChange: (v: number) => void
  onDiscountTypeChange: (t: "flat" | "percent") => void
  orderTaxPercent: number
  onOrderTaxPercentChange: (v: number) => void
  shipping: number
  onShippingChange: (v: number) => void
  serviceFee: number
  onServiceFeeChange: (v: number) => void
  totals: Totals
  className?: string
}

// Cart body — used inside both the mobile CartSheet and the desktop
// CartPanel. Lines on top, adjustments and totals below.
export function CartContent({
  cart,
  onUpdateQty,
  onRemove,
  onLineDiscount,
  discount,
  discountType,
  onDiscountChange,
  onDiscountTypeChange,
  orderTaxPercent,
  onOrderTaxPercentChange,
  shipping,
  onShippingChange,
  serviceFee,
  onServiceFeeChange,
  totals,
  className,
}: Props) {
  const [showExtras, setShowExtras] = React.useState(false)
  // Which line's discount editor is open (by line id). Kept here (not
  // per-row) so only one editor shows at a time — keeps the mobile cart
  // from ballooning.
  const [discountId, setDiscountId] = React.useState<string | null>(null)
  const { formatPrice, symbol } = useCurrency()

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Lines */}
      <ul className="space-y-2">
        {cart.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No items yet — tap a product in the catalog to add it.
          </li>
        ) : (
          cart.map((c) => {
            const lineDisc = lineDiscountValue(c)
            const net = lineNet(c)
            const editing = discountId === c.id
            const modLabel = modifiersLabel(c.modifiers)
            return (
              <li key={c.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {c.name}
                      {c.variantLabel && (
                        <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                          {c.variantLabel}
                        </span>
                      )}
                      {c.custom && (
                        <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          Custom
                        </span>
                      )}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{c.sku}</p>
                    {modLabel && (
                      <p className="truncate text-[11px] text-muted-foreground">+ {modLabel}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {onLineDiscount && (
                      <button
                        type="button"
                        onClick={() => setDiscountId(editing ? null : c.id)}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent hover:text-foreground",
                          lineDisc > 0 || editing
                            ? "text-brand dark:text-primary"
                            : "text-muted-foreground",
                        )}
                        aria-label={`Discount ${c.name}`}
                        title="Line discount"
                      >
                        <Tag className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(c.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={`Remove ${c.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(c.id, c.qty - 1)}
                      className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-accent"
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      placeholder="0"
                      value={c.qty === 0 ? "" : c.qty}
                      min={0}
                      max={MAX_LINE_QTY}
                      onChange={(e) => {
                        if (e.target.value === "") {
                          onUpdateQty(c.id, 0)
                          return
                        }
                        const raw = Number(e.target.value) || 0
                        const next = Math.min(MAX_LINE_QTY, Math.max(0, raw))
                        if (raw > MAX_LINE_QTY) {
                          toast.warning(`Capped at ${MAX_LINE_QTY} per line.`)
                        }
                        onUpdateQty(c.id, next)
                      }}
                      className="h-8 w-12 border-0 bg-transparent text-center text-sm tabular-nums outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQty(c.id, c.qty + 1)}
                      className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-accent"
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    {lineDisc > 0 ? (
                      <>
                        <p className="text-sm font-semibold tabular-nums">{formatPrice(net)}</p>
                        <p className="text-[10px] tabular-nums text-muted-foreground">
                          <span className="line-through">{formatPrice(c.qty * c.price)}</span>
                          <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                            −{formatPrice(lineDisc)}
                          </span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold tabular-nums">{formatPrice(c.qty * c.price)}</p>
                        <p className="text-[10px] tabular-nums text-muted-foreground">{formatPrice(c.price)} ea</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Inline line-discount editor */}
                {onLineDiscount && editing && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-muted/40 p-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <Percent className="h-3 w-3" /> Line discount
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="inline-flex h-8 rounded-md border border-input bg-background">
                        <button
                          type="button"
                          onClick={() => onLineDiscount(c.id, c.lineDiscount || 0, "flat")}
                          className={cn(
                            "px-2 text-xs",
                            (c.lineDiscountType ?? "flat") === "flat"
                              ? "bg-accent font-semibold"
                              : "text-muted-foreground",
                          )}
                        >
                          {symbol}
                        </button>
                        <button
                          type="button"
                          onClick={() => onLineDiscount(c.id, c.lineDiscount || 0, "percent")}
                          className={cn(
                            "border-l border-input px-2 text-xs",
                            c.lineDiscountType === "percent"
                              ? "bg-accent font-semibold"
                              : "text-muted-foreground",
                          )}
                        >
                          %
                        </button>
                      </div>
                      <Input
                        autoFocus
                        className="h-8 w-20 text-right text-xs"
                        type="number"
                        placeholder="0"
                        value={c.lineDiscount ? c.lineDiscount : ""}
                        onChange={(e) =>
                          onLineDiscount(
                            c.id,
                            e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0),
                            c.lineDiscountType ?? "flat",
                          )
                        }
                        min={0}
                        step="0.01"
                      />
                    </div>
                  </div>
                )}
              </li>
            )
          })
        )}
      </ul>

      {/* Totals */}
      <div className="rounded-xl border border-border bg-background p-3">
        <Row label="Subtotal" value={formatPrice(totals.subtotal)} muted />

        {totals.lineDiscountTotal > 0 && (
          <Row label="Line discounts" value={`−${formatPrice(totals.lineDiscountTotal)}`} muted />
        )}

        {/* Order-level discount inline */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Order discount</span>
          <div className="flex items-center gap-1.5">
            <div className="inline-flex h-8 rounded-md border border-input">
              <button
                type="button"
                onClick={() => onDiscountTypeChange("flat")}
                className={cn(
                  "px-2 text-xs",
                  discountType === "flat" ? "bg-accent font-semibold" : "text-muted-foreground",
                )}
              >
                {symbol}
              </button>
              <button
                type="button"
                onClick={() => onDiscountTypeChange("percent")}
                className={cn(
                  "px-2 text-xs border-l border-input",
                  discountType === "percent" ? "bg-accent font-semibold" : "text-muted-foreground",
                )}
              >
                %
              </button>
            </div>
            <Input
              className="h-8 w-20 text-right text-xs"
              type="number"
              placeholder="0"
              value={discount === 0 ? "" : discount}
              onChange={(e) => onDiscountChange(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0))}
              min={0}
              step="0.01"
            />
          </div>
        </div>

        {totals.discountValue > 0 && (
          <Row label="Order discount applied" value={`−${formatPrice(totals.discountValue)}`} muted />
        )}
        <Row label="Item tax" value={formatPrice(totals.itemTax)} muted />

        <button
          type="button"
          onClick={() => setShowExtras((v) => !v)}
          className="mt-2 text-[11px] font-medium text-brand hover:underline dark:text-primary"
        >
          {showExtras ? "Hide" : "Add"} order tax / shipping / service fee
        </button>

        {showExtras && (
          <div className="mt-2 space-y-2">
            <ExtraRow
              label="Order tax %"
              value={orderTaxPercent}
              onChange={(v) => onOrderTaxPercentChange(Math.max(0, v))}
              step="0.1"
            />
            <ExtraRow
              label="Shipping"
              prefix={symbol}
              value={shipping}
              onChange={(v) => onShippingChange(Math.max(0, v))}
              step="0.01"
            />
            <ExtraRow
              label="Service fee"
              prefix={symbol}
              value={serviceFee}
              onChange={(v) => onServiceFeeChange(Math.max(0, v))}
              step="0.01"
            />
          </div>
        )}

        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-2.5">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-xl font-bold tabular-nums">{formatPrice(totals.total)}</span>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={muted ? "text-muted-foreground" : "font-medium"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function ExtraRow({
  label,
  value,
  onChange,
  prefix,
  step,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  prefix?: string
  step?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="inline-flex items-center gap-1">
        {prefix && <span className="text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          placeholder="0"
          value={value === 0 ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value) || 0)}
          min={0}
          step={step}
          className="h-8 w-20 text-right text-xs"
        />
      </div>
    </div>
  )
}
