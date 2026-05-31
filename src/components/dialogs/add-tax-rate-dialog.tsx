import * as React from "react"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SwitchField } from "@/components/forms/switch-field"
import { toast } from "sonner"

export type QuickTaxRate = {
  name: string
  rate: number
  scope: "global" | "category" | "region"
  appliesTo: string
  default: boolean
}

const SCOPE_HINT: Record<QuickTaxRate["scope"], string> = {
  global: "All taxable items",
  category: "e.g. Basic food · Books",
  region: "e.g. Ghana stores",
}

// Add a tax rate. There's no full-page form for this — the overlay is the
// whole create flow — so no "More details" link. Centred modal on desktop,
// bottom drawer on mobile. Pass `initial` to use the same overlay as an
// edit form — the surface stays identical so the user doesn't context-switch.
export function AddTaxRateDialog({
  open,
  onClose,
  onCreate,
  initial,
  mode = "add",
}: {
  open: boolean
  onClose: () => void
  onCreate: (r: QuickTaxRate) => void
  initial?: QuickTaxRate
  mode?: "add" | "edit"
}) {
  const [name, setName] = React.useState("")
  const [rate, setRate] = React.useState("")
  const [scope, setScope] = React.useState<QuickTaxRate["scope"]>("global")
  const [appliesTo, setAppliesTo] = React.useState("")
  const [isDefault, setIsDefault] = React.useState(false)

  const numericRate = Number(rate)
  const valid = name.trim().length > 0 && rate.trim().length > 0 && numericRate >= 0

  React.useEffect(() => {
    if (!open) return
    setName(initial?.name ?? "")
    setRate(initial ? String(initial.rate) : "")
    setScope(initial?.scope ?? "global")
    setAppliesTo(initial?.appliesTo ?? "")
    setIsDefault(initial?.default ?? false)
  }, [open, initial])

  const submit = () => {
    if (!valid) return
    onCreate({
      name: name.trim(),
      rate: numericRate,
      scope,
      appliesTo: appliesTo.trim() || SCOPE_HINT[scope].replace(/^e\.g\. /, ""),
      default: isDefault,
    })
    toast.success(mode === "edit" ? "Tax rate updated" : "Tax rate added", { description: `${name.trim()} · ${numericRate}%` })
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit tax rate" : "Add tax rate"}
      description="VAT / GST / sales-tax rule applied at checkout, on invoices, and in reports."
      maxHeightVh={84}
      footer={
        <div className="flex items-center justify-end gap-2 pb-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={submit} disabled={!valid}>{mode === "edit" ? "Save changes" : "Add rate"}</Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-3 pb-1"
      >
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-foreground/80">Name</span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nigerian VAT"
              required
            />
          </label>
          <label className="flex w-24 flex-col gap-1.5 text-xs">
            <span className="font-semibold text-foreground/80">Rate</span>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min={0}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="7.5"
                className="pr-6"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-foreground/80">Scope</span>
          <Select value={scope} onValueChange={(v) => setScope(v as QuickTaxRate["scope"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global — every taxable item</SelectItem>
              <SelectItem value="category">Category — specific item groups</SelectItem>
              <SelectItem value="region">Region — a store or country</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-foreground/80">Applies to</span>
          <Input
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value)}
            placeholder={SCOPE_HINT[scope]}
          />
        </label>
        <SwitchField
          label="Make this the default rate"
          description="Used when no category or region rule matches."
          checked={isDefault}
          onCheckedChange={setIsDefault}
        />
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </BottomSheet>
  )
}
