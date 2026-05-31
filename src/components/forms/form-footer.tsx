import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  /** Primary action label (the right-most button). */
  submitLabel?: string
  /** Disable the primary action. */
  submitDisabled?: boolean
  /** Show a spinner / "Saving…" label on the primary action. */
  submitting?: boolean
  /** Native title attribute on the submit button — handy for explaining
   *  why a disabled submit can't be clicked yet. */
  submitTooltip?: string
  /** Cancel destination. Defaults to history back. */
  cancelHref?: string
  /** Hide the Cancel button entirely. */
  hideCancel?: boolean
  /** Optional left-side slot (e.g. "Save draft" secondary action). */
  leading?: React.ReactNode
  className?: string
}

// Sticky-on-mobile footer for form actions. Cancel on the left
// (defaults to history back), primary submit on the right.
export function FormFooter({
  submitLabel = "Save",
  submitDisabled,
  submitting,
  submitTooltip,
  cancelHref,
  hideCancel,
  leading,
  className,
}: Props) {
  const navigate = useNavigate()
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        className,
      )}
    >
      <div className="flex items-center gap-2">{leading}</div>
      <div className="flex items-center gap-2">
        {!hideCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (cancelHref) navigate(cancelHref)
              else navigate(-1)
            }}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitDisabled || submitting} title={submitTooltip}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  )
}
