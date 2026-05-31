import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CalendarDays, ClipboardList, Plus, Trash2, Truck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { InputAddon } from "@/components/forms/input-addon"
import { useAutoMarkStep } from "@/hooks/use-auto-mark-step"
import { useCurrency } from "@/contexts/currency"
import { kvJson } from "@/lib/storage/kv"

type Line = { id: string; sku: string; qty: number; cost: number }

// Mirror of POSeed exported by /reporting/reorder. Kept inline so this
// page doesn't import a report-only module.
type POSeed = {
  vendorSlug: string
  vendorName: string
  createdAt: number
  source: "reorder-report"
  lines: { sku: string; name: string; qty: number; cost: number }[]
}

const PO_SEED_KEY = "pallio:purchasing:po-draft-seed"

// Vendors the form's Select dropdown knows about. The select stays the
// source of truth — when the seed's slug matches one of these we use
// it, otherwise we fall back to the closest name match (vendors named
// in the reorder report aren't always pre-saved in the form).
const VENDOR_SLUGS = ["cobalt", "delta", "glow", "porcel"] as const

let lineSeq = 0
const newLine = (): Line => ({ id: `L-${++lineSeq}`, sku: "", qty: 1, cost: 0 })

export default function NewPO() {
  useAutoMarkStep("first-po")
  const navigate = useNavigate()
  const [lines, setLines] = React.useState<Line[]>([newLine()])
  const [vendor, setVendor] = React.useState<string>("cobalt")
  const [submitting, setSubmitting] = React.useState(false)
  const { formatPrice, symbol } = useCurrency()

  // F3 micro-fix: consume the reorder-report seed once on mount and
  // clear it so a page refresh doesn't re-hydrate stale data.
  React.useEffect(() => {
    const seed = kvJson.get<POSeed>(PO_SEED_KEY)
    if (!seed) return
    void kvJson.remove(PO_SEED_KEY)
    // Vendor: match the seed's slug if it's in our known list, else
    // fall back to a name-substring match. If neither hits we leave
    // the dropdown alone — the operator can pick manually.
    const slugMatch = (VENDOR_SLUGS as readonly string[]).includes(seed.vendorSlug)
      ? seed.vendorSlug
      : undefined
    if (slugMatch) {
      setVendor(slugMatch)
    } else {
      const nameMatch = VENDOR_SLUGS.find((v) =>
        seed.vendorName.toLowerCase().includes(v),
      )
      if (nameMatch) setVendor(nameMatch)
    }
    if (seed.lines.length > 0) {
      setLines(
        seed.lines.map((l) => ({
          id: `L-${++lineSeq}`,
          sku: l.sku,
          qty: l.qty,
          cost: l.cost,
        })),
      )
    }
    toast.success(`Reorder draft loaded from ${seed.vendorName}.`)
  }, [])

  const subtotal = lines.reduce((s, l) => s + l.qty * l.cost, 0)
  const tax = subtotal * 0.075
  const total = subtotal + tax

  const update = (id: string, patch: Partial<Line>) =>
    setLines((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: string) => setLines((p) => p.filter((l) => l.id !== id))

  return (
    <FormShell
      title="New purchase order"
      description="Order stock from a vendor."
      titleTooltip={
        <>
          Place an order with one of your suppliers. The PO locks in
          the SKUs, quantities, prices, and delivery date you agreed
          — and forms the audit trail when the goods (and bill)
          arrive later. Don't skip it: a bill without a matching PO
          is hard to dispute.
        </>
      }
      backHref="/purchasing/pos"
      onSubmit={() => {
        if (lines.some((l) => !l.sku || l.qty <= 0)) {
          toast.error("Add at least one line with SKU and quantity.")
          return
        }
        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          toast.success("Purchase order created", { description: `${lines.length} line${lines.length === 1 ? "" : "s"} · ${formatPrice(total)}` })
          navigate("/purchasing/pos")
        }, 500)
      }}
      aside={
        <FormAside title="Summary">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax (7.5%)</dt>
              <dd className="font-medium tabular-nums">{formatPrice(tax)}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="text-lg font-bold tabular-nums">{formatPrice(total)}</dd>
            </div>
            <p className="pt-3 text-[11px] text-muted-foreground">
              Vendor default terms apply on save. Items aren't deducted from stock until the PO is marked received.
            </p>
          </dl>
        </FormAside>
      }
      footer={<FormFooter submitLabel="Create PO" submitting={submitting} cancelHref="/purchasing/pos" />}
    >
      <FormSection title="Vendor" Icon={Truck}>
        <FormGrid cols={3}>
          <FormField
            label="Vendor"
            required
            tooltip="The supplier you're buying from. Pallio uses their saved payment terms + lead times to pre-fill the rest of this form."
          >
            <Select value={vendor} onValueChange={setVendor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cobalt">Cobalt Distributors</SelectItem>
                <SelectItem value="delta">Delta Apparel</SelectItem>
                <SelectItem value="glow">Glow Co</SelectItem>
                <SelectItem value="porcel">Porcel Ceramics</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Destination warehouse"
            tooltip="Which store or warehouse the goods should arrive at. Pallio uses this to route the goods-receipt step and update the right location's stock count."
          >
            <Select defaultValue="wh-a">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wh-a">Warehouse A</SelectItem>
                <SelectItem value="wh-b">Warehouse B</SelectItem>
                <SelectItem value="wh-c">Warehouse C</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="PO number"
            hint="Auto-generated if blank."
            tooltip={
              <>
                <strong>Purchase Order number</strong> — a unique reference both
                you and the vendor quote when talking about this order. Leave
                blank and Pallio will assign the next number in sequence
                (e.g. <span className="font-mono">PO-1045</span>).
              </>
            }
          >
            <Input placeholder="PO-1045" />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Schedule" Icon={CalendarDays}>
        <FormGrid cols={3}>
          <FormField
            label="Issue date"
            required
            tooltip="The day you're placing the order. Used as the start date when counting payment terms (e.g. Net 30 = due 30 days from this date)."
          >
            <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </FormField>
          <FormField
            label="Expected delivery"
            tooltip="When you expect the goods to arrive. Pallio uses this to warn you on the dashboard if a PO is overdue."
          >
            <Input type="date" />
          </FormField>
          <FormField
            label="Payment terms"
            tooltip={
              <>
                How long the vendor gives you to pay.
                <ul className="mt-1.5 list-disc pl-4">
                  <li><strong>Immediate</strong> — pay on delivery (cash &amp; carry).</li>
                  <li><strong>Net 7 / 14 / 30 / 60</strong> — pay within that many days of the issue date.</li>
                </ul>
                Most B2B suppliers in Nigeria are Net 30. Pallio pre-fills this from the vendor's saved default.
              </>
            }
          >
            <Select defaultValue="net30">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="net7">Net 7</SelectItem>
                <SelectItem value="net14">Net 14</SelectItem>
                <SelectItem value="net30">Net 30</SelectItem>
                <SelectItem value="net60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection
        title="Line items"
        description="Products to order from the vendor"
        Icon={ClipboardList}
        trailing={
          <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}>
            <Plus className="h-3.5 w-3.5" /> Add line
          </Button>
        }
      >
        <ul className="space-y-3">
          {lines.map((l, idx) => (
            <li key={l.id} className="rounded-xl border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(l.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <FormGrid cols={3}>
                <FormField label="SKU" required span={2}>
                  <Input
                    placeholder="EL-2109"
                    value={l.sku}
                    onChange={(e) => update(l.id, { sku: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Qty" required>
                  <Input
                    type="number"
                    placeholder="0"
                    min={1}
                    value={l.qty === 0 ? "" : l.qty}
                    onChange={(e) => update(l.id, { qty: e.target.value === "" ? 0 : Number(e.target.value) || 0 })}
                    required
                  />
                </FormField>
                <FormField label="Unit cost" required>
                  <InputAddon leading={symbol}>
                    <input
                      type="number"
                      placeholder="0"
                      step="0.01"
                      value={l.cost === 0 ? "" : l.cost}
                      onChange={(e) => update(l.id, { cost: e.target.value === "" ? 0 : Number(e.target.value) || 0 })}
                      required
                    />
                  </InputAddon>
                </FormField>
                <FormField label="Line total" span={2}>
                  <div className="flex h-10 items-center rounded-lg border border-input bg-muted/40 px-3 text-sm font-semibold tabular-nums">
                    {formatPrice(l.qty * l.cost)}
                  </div>
                </FormField>
              </FormGrid>
            </li>
          ))}
        </ul>
      </FormSection>

      <FormSection title="Notes" Icon={ClipboardList}>
        <FormField label="Internal notes" hint="Visible to your team only.">
          <Textarea placeholder="Mark fragile · expedite if possible…" />
        </FormField>
      </FormSection>
    </FormShell>
  )
}
