import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight, ShoppingCart } from "lucide-react"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type Props = {
  itemCount: number
  total: number
  onOpen: () => void
}

// Persistent mobile POS cart bar — visible above the bottom nav at
// all times. Two visual modes:
//
//   EMPTY (itemCount === 0): muted card-style strip with a hint
//     ("Tap items to start ringing up"). Stays out of the way but
//     advertises that the cart exists.
//   FILLED (itemCount > 0): brand-gradient action bar with item
//     count badge + total + "Charge →" CTA. Reads as the page's
//     primary action.
//
// Tap either state → opens the full CartSheet.
//
// Portalled to document.body so its `position: fixed` resolves
// against the viewport. Otherwise an ancestor with a non-`none`
// transform (the AppFrame's <main> always has `translateY(0)` even
// when no pull-to-refresh is happening) would become the containing
// block and the bar would scroll with the catalog content.
export function FloatingCart({ itemCount, total, onOpen }: Props) {
  const { formatPrice } = useCurrency()
  const filled = itemCount > 0
  if (typeof document === "undefined") return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] lg:hidden">
      <AnimatePresence mode="wait">
        <motion.button
          key={filled ? "filled" : "empty"}
          type="button"
          onClick={onOpen}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
          className={cn(
            "pointer-events-auto group relative mx-auto md:ml-[calc(120px+20%)] md:mr-auto flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-left transition-transform active:scale-[0.98]",
            filled
              ? "bg-linear-to-r from-brand via-brand to-fuchsia-600 text-brand-foreground shadow-2xl shadow-brand/40 dark:from-primary dark:via-primary dark:to-fuchsia-600 dark:text-primary-foreground"
              : "border border-border bg-card/95 text-foreground backdrop-blur-md shadow-lg",
          )}
        >
          {/* Cart icon + qty badge (empty: muted, filled: white). */}
          <span
            className={cn(
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              filled ? "bg-white/15" : "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            {filled && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold tabular-nums text-brand shadow-sm dark:text-primary">
                {itemCount}
              </span>
            )}
          </span>

          {/* Label + total */}
          <span className="min-w-0 flex-1">
            {filled ? (
              <>
                <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  {itemCount === 1 ? "1 item · charge" : `${itemCount} items · charge`}
                </span>
                <span className="block text-base font-bold tabular-nums leading-tight">
                  {formatPrice(total)}
                </span>
              </>
            ) : (
              <>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-brand dark:text-primary">
                  Cart · empty
                </span>
                <span className="block text-sm font-bold leading-tight text-foreground">
                  Tap a product to start ringing up
                </span>
              </>
            )}
          </span>

          {/* CTA affordance */}
          {filled ? (
            <span className="flex h-11 items-center gap-1 rounded-xl bg-white/15 px-3 text-xs font-bold uppercase tracking-wider">
              Charge
              <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </motion.button>
      </AnimatePresence>
    </div>,
    document.body,
  )
}
