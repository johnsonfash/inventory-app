import * as React from "react"
import { PackagePlus, ScanLine } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCurrency } from "@/contexts/currency"

export type CustomItemDraft = {
  name: string
  price: number
  taxRate?: number
  /** Set for the "not found" flow so the new item keeps the scanned code. */
  sku?: string
  /** True when the cashier chose to also save it to the catalog. */
  saveToCatalog?: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (draft: CustomItemDraft) => void
  /** When set, this is the "scanned a code we don't recognise" flow:
   *  the dialog explains it and lets the cashier save the new item to
   *  the catalog. When undefined, it's a plain open/custom item. */
  scannedCode?: string
  /** Pre-fill the tax rate (fraction, e.g. 0.075) from the active mode. */
  defaultTaxRate?: number
}

// Handles two closely-related till flows with one form (POS-1):
//   1. "+ Custom" — ring in an open item not in the catalog (no stock).
//   2. Item-not-found — a scan/SKU didn't match; quick-add it, with the
//      option to also save it to the catalog so the next scan matches.
export function CustomItemDialog({ open, onClose, onSubmit, scannedCode, defaultTaxRate }: Props) {
  const { symbol } = useCurrency()
  const isNotFound = scannedCode !== undefined
  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [taxPct, setTaxPct] = React.useState("")
  const [saveToCatalog, setSaveToCatalog] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setName("")
    setPrice("")
    setTaxPct(defaultTaxRate ? String(Math.round(defaultTaxRate * 1000) / 10) : "")
    setSaveToCatalog(isNotFound) // default to "yes, remember it" when scanned
  }, [open, defaultTaxRate, isNotFound])

  const priceNum = Number(price) || 0
  const valid = name.trim().length > 0 && priceNum > 0

  const submit = () => {
    if (!valid) return
    const taxRate = taxPct.trim() === "" ? defaultTaxRate : Math.max(0, Number(taxPct) || 0) / 100
    onSubmit({
      name: name.trim(),
      price: priceNum,
      taxRate,
      sku: scannedCode,
      saveToCatalog: isNotFound ? saveToCatalog : false,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
            {isNotFound ? <ScanLine className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-base font-semibold">
              {isNotFound ? "Not in catalog" : "Custom item"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isNotFound ? (
                <>Code <span className="font-mono">{scannedCode}</span> isn't a known product. Add it with a price.</>
              ) : (
                "Ring in a one-off item with a price you type now. Doesn't touch stock."
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Item name</span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gift wrap, Repair labour"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Price</span>
              <div className="flex h-10 items-center rounded-lg border border-input bg-background pl-3">
                <span className="text-sm text-muted-foreground">{symbol}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min={0.01}
                  step="0.01"
                  className="h-full w-full bg-transparent px-2 text-sm outline-none"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              {price !== "" && priceNum <= 0 && (
                <p className="mt-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                  Price must be greater than 0.
                </p>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Tax % (opt)</span>
              <Input
                type="number"
                value={taxPct}
                onChange={(e) => setTaxPct(e.target.value)}
                placeholder="0"
                min={0}
                step="0.1"
              />
            </label>
          </div>

          {isNotFound && (
            <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={saveToCatalog}
                onChange={(e) => setSaveToCatalog(e.target.checked)}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              <span>Also save to catalog so the next scan finds it</span>
            </label>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {isNotFound ? "Skip" : "Cancel"}
          </Button>
          <Button type="button" onClick={submit} disabled={!valid}>
            Add to cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
