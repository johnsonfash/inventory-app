
import * as React from "react"
import { Input } from "@/components/ui/input"

type Props = {
  captureGlobal?: boolean
  onScan: (code: string) => void
  placeholder?: string
}

export function BarcodeScannerInput({ captureGlobal = true, onScan, placeholder = "Scan barcode..." }: Props) {
  const [value, setValue] = React.useState("")
  const buffer = React.useRef("")

  React.useEffect(() => {
    if (!captureGlobal) return
    const handler = (e: KeyboardEvent) => {
      // Ignore modifiers and typing inside inputs
      const target = e.target as HTMLElement | null
      const isInput =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as HTMLElement).isContentEditable)
      if (isInput) return
      if (e.key === "Enter") {
        const code = buffer.current.trim()
        if (code) onScan(code)
        buffer.current = ""
        return
      }
      if (e.key.length === 1) {
        buffer.current += e.key
      } else if (e.key === "Backspace") {
        buffer.current = buffer.current.slice(0, -1)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [captureGlobal, onScan])

  // Add is disabled when there's nothing to scan — a silent no-op
  // confused cashiers who tapped twice on a misfired scan.
  const canSubmit = value.trim().length > 0

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const code = value.trim()
            if (code) onScan(code)
            setValue("")
          }
        }}
      />
      <button
        type="button"
        disabled={!canSubmit}
        title={canSubmit ? "Add to cart" : "Type or scan a code first"}
        aria-label={canSubmit ? "Add to cart" : "Add (disabled — enter a code first)"}
        className="rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          const code = value.trim()
          if (code) onScan(code)
          setValue("")
        }}
      >
        Add
      </button>
    </div>
  )
}
