import * as React from "react"
import { toast } from "sonner"
import { Printer, ScanLine, Search, Tag } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/currency"
import { loadAllCatalog } from "@/lib/pos/storage"

type Item = { sku: string; name: string; price: number; checked: boolean; qty: number }

// Label candidates are the live catalogue items — print a barcode/price
// sticker for any of them. First item pre-checked for convenience.
function deriveLabelItems(): Item[] {
  return loadAllCatalog().map((c, i) => ({
    sku: c.sku,
    name: c.name,
    price: c.price,
    checked: i === 0,
    qty: 1,
  }))
}

export default function LabelPrint() {
  const [items, setItems] = React.useState<Item[]>(() => deriveLabelItems())
  const [query, setQuery] = React.useState("")
  const [template, setTemplate] = React.useState<"standard" | "minimal" | "full">("standard")
  const { formatPrice } = useCurrency()

  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
  }, [items, query])

  const selected = items.filter((i) => i.checked)
  const totalLabels = selected.reduce((s, i) => s + i.qty, 0)

  const setQty = (sku: string, qty: number) =>
    setItems((p) => p.map((i) => (i.sku === sku ? { ...i, qty: Math.max(1, qty) } : i)))

  const toggle = (sku: string) =>
    setItems((p) => p.map((i) => (i.sku === sku ? { ...i, checked: !i.checked } : i)))

  const print = () => {
    if (totalLabels === 0) return
    // Hand off to the browser's native print dialog. Once a label
    // printer is configured (Settings → Printers), the backend will
    // route this through the thermal-printer plugin instead.
    toast.success(`Queued ${totalLabels} label${totalLabels === 1 ? "" : "s"} for printing`)
    if (typeof window !== "undefined") {
      try { window.print() } catch { /* print blocked — toast already informed user */ }
    }
  }

  return (
    <PageShell
      title="Print labels"
      withToolbar={false}
      titleTooltip={
        <>
          Print barcode stickers for items that didn't come with one —
          house-brand goods, repackaged bulk, custom bundles. The
          barcodes scan in the POS, on shipments, and during stock
          counts.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Selected", value: String(selected.length), tone: "brand", hint: "SKUs" },
            { label: "Labels to print", value: String(totalLabels), tone: "info", hint: "total" },
            { label: "Template", value: template, tone: "warning", hint: "active" },
            { label: "Default printer", value: "Zebra ZD420", tone: "success", hint: "WH-A" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search SKU or name…" className="pl-9" />
          </div>
          <Select value={template} onValueChange={(v) => v && setTemplate(v as "standard" | "minimal" | "full")}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="minimal">Minimal (barcode only)</SelectItem>
              <SelectItem value="full">Full (logo + price)</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={totalLabels === 0} onClick={print}>
            <Printer className="h-4 w-4" /> Print {totalLabels || ""}
          </Button>
        </div>

        <ul className="space-y-2">
          {filtered.map((i) => (
            <li
              key={i.sku}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card p-3 transition-colors",
                i.checked ? "border-brand/40 bg-brand-soft/30 dark:bg-primary/10" : "border-border",
              )}
            >
              <input
                type="checkbox"
                checked={i.checked}
                onChange={() => toggle(i.sku)}
                className="h-4 w-4 accent-violet-600"
              />
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Tag className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{i.sku} · {formatPrice(i.price)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[10px] uppercase text-muted-foreground">Qty</span>
                <Input
                  type="number"
                  placeholder="0"
                  min={1}
                  value={i.qty === 0 ? "" : i.qty}
                  onChange={(e) => setQty(i.sku, e.target.value === "" ? 0 : Number(e.target.value) || 1)}
                  className="h-9 w-16 text-center"
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <ScanLine className="h-4 w-4" />
          Use a connected barcode scanner to instantly select items by scanning them.
        </div>
      </div>
    </PageShell>
  )
}
