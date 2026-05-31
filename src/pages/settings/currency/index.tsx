import * as React from "react"
import { toast } from "sonner"
import { CheckCircle2, DollarSign, Save } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InfoTooltip } from "@/components/info-tooltip"
import { SUPPORTED_CURRENCIES, useCurrency, type CurrencyCode } from "@/contexts/currency"
import { cn } from "@/lib/utils"

// Org-wide currency picker. Persists to kv (pallio:currency); the
// CurrencyProvider re-derives the global symbol + formatter as soon
// as setCurrency() settles. Mirrors jax/beauty's CurrencySettings.

export default function CurrencySettings() {
  const { currency: activeCurrency, setCurrency } = useCurrency()
  const [selected, setSelected] = React.useState<CurrencyCode>(activeCurrency)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setSelected(activeCurrency)
  }, [activeCurrency])

  const dirty = selected !== activeCurrency

  const onSave = async () => {
    setSaving(true)
    try {
      await setCurrency(selected)
      toast.success(`Now showing prices in ${selected}.`)
    } catch {
      // Longer duration so the error sticks around if the user
      // navigates away immediately — currency save errors are rare
      // enough that we shouldn't let them slip past unnoticed.
      toast.error("Couldn't save currency — try again.", { duration: 8000 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell
      title="Currency"
      withToolbar={false}
      titleTooltip={
        <>
          The money symbol + formatting Pallio uses everywhere —
          receipts, invoices, KPIs, reports. Defaults to NGN for
          Nigerian businesses; pick your home currency once and the
          whole app updates instantly.
        </>
      }
    >
      <div className="flex max-w-2xl flex-col gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold md:text-base">
              <DollarSign className="h-4 w-4 text-brand dark:text-primary" />
              Display currency
              <InfoTooltip label="Display currency" size="xs">
                Sets the symbol shown across the entire app — items, invoices, receipts, reports, the dashboard, and outbound emails. Stored locally for now; will sync to your organisation when the backend ships.
              </InfoTooltip>
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick the currency you want Pallio to use everywhere. We support {SUPPORTED_CURRENCIES.length} options.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Big symbol preview */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-soft to-emerald-50 text-xl font-bold text-brand dark:from-primary/10 dark:to-emerald-950/30 dark:text-primary">
                {SUPPORTED_CURRENCIES.find((c) => c.code === selected)?.symbol}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold">
                  {SUPPORTED_CURRENCIES.find((c) => c.code === selected)?.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  Example: <span className="font-semibold tabular-nums text-foreground">
                    {SUPPORTED_CURRENCIES.find((c) => c.code === selected)?.symbol}
                    {(12_500).toLocaleString()}
                  </span>{" "}— this is how amounts will render in {selected}.
                </p>
              </div>
              {dirty && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  unsaved
                </span>
              )}
            </div>

            {/* Dropdown */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground/80">Pick a currency</p>
              <Select value={selected} onValueChange={(v) => setSelected(v as CurrencyCode)}>
                <SelectTrigger className="w-full sm:w-96">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="inline-flex w-full items-center gap-3">
                        <span className="inline-flex w-8 font-mono text-xs font-bold text-muted-foreground">{c.symbol}</span>
                        <span className="font-semibold">{c.code}</span>
                        <span className="text-muted-foreground">— {c.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grid of options (visual cross-check) */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SUPPORTED_CURRENCIES.map((c) => {
                const isSelected = c.code === selected
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelected(c.code)}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "border-brand bg-brand-soft dark:border-primary dark:bg-primary/10"
                        : "border-border bg-card hover:border-brand/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold",
                        isSelected
                          ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                          : "bg-muted text-foreground/80 group-hover:bg-accent",
                      )}
                    >
                      {c.symbol}
                    </span>
                    <span className="min-w-0">
                      <p className="text-xs font-bold">{c.code}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{c.label}</p>
                    </span>
                    {isSelected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-brand dark:text-primary" />}
                  </button>
                )
              })}
            </div>

            <Button onClick={onSave} disabled={!dirty || saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save currency"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
