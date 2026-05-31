import * as React from "react"
import { ShieldCheck, X } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { verifyManagerPin } from "@/lib/pos/settings"
import { cn } from "@/lib/utils"

export type PinRequest = {
  /** Plain-English line shown to the cashier, e.g. "Apply a 30% discount". */
  action: string
  /** Called once the correct manager PIN is entered. */
  onApprove: () => void
  /** Optional: called if the cashier backs out. */
  onCancel?: () => void
}

// Manager-override gate. The parent sets a `request` when an action
// crosses a threshold (deep discount, high-value void); this dialog
// collects the PIN and only fires `onApprove` on a match. Keypad-first
// so it works on a touch till without a keyboard. POS-1.
export function ManagerPinDialog({
  request,
  onClose,
}: {
  request: PinRequest | null
  onClose: () => void
}) {
  const [pin, setPin] = React.useState("")
  const [error, setError] = React.useState(false)

  // Reset whenever a new request comes in.
  React.useEffect(() => {
    setPin("")
    setError(false)
  }, [request])

  if (!request) return null

  const submit = (code: string) => {
    if (verifyManagerPin(code)) {
      request.onApprove()
      onClose()
    } else {
      setError(true)
      setPin("")
    }
  }

  const press = (digit: string) => {
    setError(false)
    // No auto-submit — a phantom-tap during a 4-digit auto-confirm would
    // burn a wrong attempt and reset the keypad with no explanation.
    // Manager taps OK (or hits Enter on hardware keyboard) when ready.
    setPin((p) => (p + digit).slice(0, 6))
  }

  const cancel = () => {
    request.onCancel?.()
    onClose()
  }

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && cancel()}>
      <DialogContent className="max-w-xs">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="mt-2 text-base font-semibold">Manager approval</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{request.action}</p>

          {/* PIN dots */}
          <div className="mt-4 flex items-center gap-2">
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-3 w-3 rounded-full border transition-colors",
                  i < pin.length
                    ? "border-brand bg-brand dark:border-primary dark:bg-primary"
                    : "border-border",
                  error && "border-rose-500",
                )}
              />
            ))}
          </div>
          {error && (
            <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
              Wrong PIN — try again.
            </p>
          )}

          {/* Keypad */}
          <div className="mt-4 grid w-full grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => press(d)}
                className="rounded-xl border border-border bg-card py-3 text-lg font-semibold tabular-nums transition-colors hover:bg-accent active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin((p) => p.slice(0, -1))}
              aria-label="Delete"
              className="rounded-xl border border-border bg-card py-3 text-muted-foreground transition-colors hover:bg-accent active:scale-95"
            >
              <X className="mx-auto h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => press("0")}
              className="rounded-xl border border-border bg-card py-3 text-lg font-semibold tabular-nums transition-colors hover:bg-accent active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => submit(pin)}
              className="rounded-xl bg-brand py-3 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 active:scale-95 dark:bg-primary dark:text-primary-foreground"
            >
              OK
            </button>
          </div>

          <Button type="button" variant="ghost" className="mt-3 w-full" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
