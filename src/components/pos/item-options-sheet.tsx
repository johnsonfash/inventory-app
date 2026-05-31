import * as React from "react"
import { Check } from "lucide-react"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { Button } from "@/components/ui/button"
import type { CatalogItem } from "@/lib/pos/storage"
import {
  modifiersTotal,
  variantLabel,
  variantUnitPrice,
  type SelectedModifier,
  type Variant,
} from "@/lib/pos/variants"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

export type ItemSelection = { variant?: Variant; modifiers?: SelectedModifier[] }

type Props = {
  item: CatalogItem | null
  onClose: () => void
  onConfirm: (item: CatalogItem, sel: ItemSelection) => void
}

// Shown when a catalog item has variants and/or modifiers. The cashier
// picks one value per axis + any modifiers; the running price updates
// live. Required groups gate the "Add" button. POS-2.
export function ItemOptionsSheet({ item, onClose, onConfirm }: Props) {
  const { formatPrice } = useCurrency()
  const [axisChoice, setAxisChoice] = React.useState<Record<string, string>>({})
  // selected[groupId] = set of option names
  const [mods, setMods] = React.useState<Record<string, string[]>>({})

  // Reset whenever a new item opens; default single-value axes + the
  // first option of any required single-select group.
  React.useEffect(() => {
    if (!item) return
    const ax: Record<string, string> = {}
    for (const a of item.variantAxes ?? []) if (a.values.length === 1) ax[a.name] = a.values[0]!
    const md: Record<string, string[]> = {}
    for (const g of item.modifierGroups ?? []) {
      if (g.required && !g.multiSelect && g.options[0]) md[g.id] = [g.options[0].name]
    }
    setAxisChoice(ax)
    setMods(md)
  }, [item])

  if (!item) return null

  const axes = item.variantAxes ?? []
  const groups = item.modifierGroups ?? []

  // Resolve the chosen variant: the one whose axisValues match every
  // picked axis. Only resolvable once all axes are chosen.
  const allAxesChosen = axes.every((a) => axisChoice[a.name])
  const chosenVariant: Variant | undefined =
    axes.length > 0 && allAxesChosen
      ? item.variants?.find((v) => axes.every((a) => v.axisValues[a.name] === axisChoice[a.name]))
      : undefined

  const selectedModifiers: SelectedModifier[] = groups.flatMap((g) =>
    (mods[g.id] ?? []).map((name) => {
      const opt = g.options.find((o) => o.name === name)!
      return { groupId: g.id, name, priceDelta: opt?.priceDelta ?? 0 }
    }),
  )

  const unitPrice =
    variantUnitPrice(item.price, chosenVariant) + modifiersTotal(selectedModifiers)

  // Required groups must have a pick; axes must all be chosen.
  const requiredOk =
    allAxesChosen && groups.every((g) => !g.required || (mods[g.id]?.length ?? 0) > 0)

  const toggleMod = (groupId: string, name: string, multi: boolean) => {
    setMods((prev) => {
      const cur = prev[groupId] ?? []
      if (multi) {
        return { ...prev, [groupId]: cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name] }
      }
      return { ...prev, [groupId]: cur.includes(name) ? [] : [name] }
    })
  }

  return (
    <BottomSheet
      open={!!item}
      onClose={onClose}
      drawerBreakpoint={1024}
      title={item.name}
      description={chosenVariant ? variantLabel(chosenVariant, axes) : "Choose options"}
      maxHeightVh={86}
      footer={
        <div className="flex flex-col gap-1.5 pb-3">
          {!requiredOk && (
            <p className="text-center text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Choose all required options to continue.
            </p>
          )}
          <Button
            type="button"
            className="w-full"
            disabled={!requiredOk}
            aria-disabled={!requiredOk}
            title={requiredOk ? undefined : "Pick all required options first"}
            onClick={() => {
              onConfirm(item, { variant: chosenVariant, modifiers: selectedModifiers })
              onClose()
            }}
          >
            Add · {formatPrice(unitPrice)}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {axes.map((a) => (
          <div key={a.name}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {a.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {a.values.map((val) => {
                const active = axisChoice[a.name] === val
                // Disable a value when no in-stock variant exists for the
                // current combination (best-effort; single-axis is exact).
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAxisChoice((p) => ({ ...p, [a.name]: val }))}
                    className={cn(
                      "rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "border-brand bg-brand text-brand-foreground dark:border-primary dark:bg-primary dark:text-primary-foreground"
                        : "border-border bg-card hover:bg-accent",
                    )}
                  >
                    {val}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {groups.map((g) => (
          <div key={g.id}>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.name}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-muted-foreground">
                {g.required ? "Required" : g.multiSelect ? "Pick any" : "Optional"}
              </span>
            </p>
            <div className="flex flex-col gap-1.5">
              {g.options.map((o) => {
                const active = (mods[g.id] ?? []).includes(o.name)
                return (
                  <button
                    key={o.name}
                    type="button"
                    onClick={() => toggleMod(g.id, o.name, g.multiSelect)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors",
                      active ? "border-brand bg-brand-soft dark:border-primary dark:bg-primary/15" : "border-border bg-card hover:bg-accent",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border",
                          active ? "border-brand bg-brand text-brand-foreground dark:border-primary dark:bg-primary" : "border-border",
                        )}
                      >
                        {active && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      {o.name}
                    </span>
                    {o.priceDelta !== 0 && (
                      <span className="tabular-nums text-muted-foreground">
                        {o.priceDelta > 0 ? "+" : ""}
                        {formatPrice(o.priceDelta)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}
