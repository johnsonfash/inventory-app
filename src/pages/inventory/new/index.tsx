import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Boxes,
  ImageIcon,
  Lightbulb,
  Package2,
  Tag,
  Truck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddSupplierDialog } from "@/components/dialogs/add-supplier-dialog"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { SwitchField } from "@/components/forms/switch-field"
import { InputAddon } from "@/components/forms/input-addon"
import { CoachMark } from "@/components/onboarding/coach-mark"
import { useAutoMarkStep } from "@/hooks/use-auto-mark-step"

export default function NewItemPage() {
  useAutoMarkStep("first-item")
  const navigate = useNavigate()
  // App Wave 5: first-visit hint pointing at the SKU field.
  const skuRef = React.useRef<HTMLInputElement>(null)
  const [suppliers, setSuppliers] = React.useState(["Cobalt Distributors", "Delta Apparel", "Glow Co"])
  const [supplier, setSupplier] = React.useState<string>("Cobalt Distributors")
  const [trackInventory, setTrackInventory] = React.useState(true)
  const [taxable, setTaxable] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)

  // Controlled state for required fields so we can validate.
  const [itemName, setItemName] = React.useState("")
  const [skuValue, setSkuValue] = React.useState("")
  const [cost, setCost] = React.useState("")
  const [retail, setRetail] = React.useState("")
  const [errors, setErrors] = React.useState<{ name?: string; sku?: string; cost?: string; retail?: string }>({})

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!itemName.trim()) next.name = "Item name is required"
    if (!skuValue.trim()) next.sku = "SKU is required"
    const costNum = Number(cost)
    const retailNum = Number(retail)
    if (!cost.trim() || isNaN(costNum) || costNum < 0) next.cost = "Enter a valid unit cost"
    if (!retail.trim() || isNaN(retailNum) || retailNum < 0) next.retail = "Enter a valid retail price"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // Industry-agnostic pricing warning — flagged but non-blocking. Some
  // operators legitimately run promo loss-leaders, services priced
  // below sourcing cost, etc.
  const marginWarning = React.useMemo(() => {
    const c = Number(cost)
    const r = Number(retail)
    if (!cost.trim() || !retail.trim() || isNaN(c) || isNaN(r)) return null
    if (c > 0 && r <= c) return "Retail price is at or below unit cost — margin will be zero or negative."
    return null
  }, [cost, retail])

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault?.()
    if (!validate()) {
      toast.error("Fix the highlighted fields and try again.")
      return
    }
    if (marginWarning) {
      toast.warning(marginWarning)
    }
    setSubmitting(true)
    // Mock save — replace with real mutation when backend lands.
    setTimeout(() => {
      setSubmitting(false)
      toast.success(`Saved “${itemName.trim()}” (${skuValue.trim()})`)
      navigate("/inventory")
    }, 600)
  }

  return (
    <FormShell
      title="Add product"
      description="Capture everything needed for inventory, purchasing, and the storefront."
      titleTooltip={
        <>
          Create one item that flows everywhere — the till catalog,
          purchase orders to your supplier, the online storefront, and
          every stock report. Don't sweat getting every field perfect;
          most can be tweaked later, but the SKU is for life.
        </>
      }
      backHref="/inventory"
      onSubmit={handleSubmit}
      aside={
        <FormAside
          tips={[
            { title: "SKU naming", body: "Two-letter prefix per category (EL, AP) + 4-digit number reads well in reports.", Icon: Tag },
            { title: "Reorder point", body: "Set this to ~2× your weekly sell-through to leave time for restocks.", Icon: Boxes },
            { title: "Image", body: "Square 400×400 PNG works best in the POS catalog grid.", Icon: ImageIcon },
            { title: "Suppliers", body: "Adding the primary supplier here pre-fills future POs.", Icon: Truck },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save item" submitting={submitting} cancelHref="/inventory" />}
    >
      <FormSection title="Basics" description="Identity and classification" Icon={Package2}>
        <FormGrid cols={2}>
          <FormField label="Item name" required htmlFor="item-name" hint="Shown in catalog, POS, and invoices." error={errors.name}>
            <Input
              id="item-name"
              placeholder="USB‑C Hub 6‑in‑1"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onBlur={() => setErrors((prev) => ({ ...prev, name: itemName.trim() ? undefined : "Item name is required" }))}
              aria-invalid={!!errors.name}
            />
          </FormField>
          <FormField
            label="SKU"
            required
            htmlFor="sku"
            hint="Unique product code. Letters, numbers, dashes."
            error={errors.sku}
            tooltip={
              <>
                <strong>Stock Keeping Unit.</strong> A short code only you use — it's how
                Pallio tells two products apart even if the names look similar. A
                common pattern is a two-letter category prefix plus a number
                (e.g. <span className="font-mono">EL-2109</span> for an
                electronics item). Never reuse a SKU for a different product.
              </>
            }
          >
            <Input
              id="sku"
              ref={skuRef}
              placeholder="EL-2109"
              required
              value={skuValue}
              onChange={(e) => setSkuValue(e.target.value)}
              onBlur={() => setErrors((prev) => ({ ...prev, sku: skuValue.trim() ? undefined : "SKU is required" }))}
              aria-invalid={!!errors.sku}
            />
          </FormField>
          <FormField label="Category" required tooltip="Groups items together in reports and on the storefront — e.g. Electronics, Apparel, Beauty.">
            <Select defaultValue="electronics">
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="apparel">Apparel</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="beauty">Beauty</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Brand" tooltip="The maker of the product (e.g. Samsung, Nike). Leave blank if you make it yourself.">
            <Input placeholder="Cobalt" />
          </FormField>
          <FormField
            label="Unit of measure"
            tooltip={
              <>
                How you sell this item. Use <strong>Pieces</strong> for things
                you sell one at a time (a phone, a shirt), <strong>Box</strong>{" "}
                for a bundled pack, <strong>Kg</strong> for things weighed at the
                till, and <strong>Litre</strong> for liquids.
              </>
            }
          >
            <Select defaultValue="pcs">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="kg">Kilogram (kg)</SelectItem>
                <SelectItem value="lt">Litre (L)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Warranty"
            hint="Optional — e.g. 12 months."
            tooltip="How long after the sale you'll repair or replace the item if it fails. Shows on the customer's receipt + invoice."
          >
            <Input placeholder="12 months" />
          </FormField>
          <FormField
            label="Description"
            span={2}
            tooltip="Free-text notes. The first few lines also appear on your online storefront, so write it like a customer would read it."
          >
            <Textarea placeholder="Internal notes and storefront copy." />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Pricing" description="Cost basis and selling prices" Icon={Tag}>
        <FormGrid cols={3}>
          <FormField
            label="Unit cost"
            required
            hint="What you pay your supplier."
            error={errors.cost}
            tooltip="The amount per piece that the supplier charges you (excluding tax). Pallio uses this to work out your profit and to value your stock on reports."
          >
            <InputAddon leading="$">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                onBlur={() => {
                  const n = Number(cost)
                  setErrors((prev) => ({ ...prev, cost: cost.trim() && !isNaN(n) && n >= 0 ? undefined : "Enter a valid unit cost" }))
                }}
                aria-invalid={!!errors.cost}
              />
            </InputAddon>
          </FormField>
          <FormField
            label="Retail price"
            required
            error={errors.retail ?? (marginWarning && !errors.retail ? marginWarning : undefined)}
            hint={!marginWarning && !errors.retail ? "What a walk-in customer pays." : undefined}
            tooltip="What a walk-in customer pays. This is the price the POS uses by default."
          >
            <InputAddon leading="$">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                required
                value={retail}
                onChange={(e) => setRetail(e.target.value)}
                onBlur={() => {
                  const n = Number(retail)
                  setErrors((prev) => ({ ...prev, retail: retail.trim() && !isNaN(n) && n >= 0 ? undefined : "Enter a valid retail price" }))
                }}
                aria-invalid={!!errors.retail}
              />
            </InputAddon>
          </FormField>
          <FormField
            label="Wholesale price"
            tooltip="Discounted price for bulk / business customers. Pallio uses this automatically when a customer is on the Wholesale tier."
          >
            <InputAddon leading="$">
              <input type="number" step="0.01" placeholder="0.00" />
            </InputAddon>
          </FormField>
          <FormField label="Tax rate" span={3}>
            <SwitchField
              label="Taxable item"
              description="Apply the default tax rate set in Settings → Taxes. Turn this off for items that are zero-rated or exempt (e.g. basic food, books)."
              checked={taxable}
              onCheckedChange={setTaxable}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Stock" description="On-hand and reorder behaviour" Icon={Boxes}>
        <FormGrid cols={2}>
          <FormField
            label="Opening stock"
            hint="Quantity already on hand today."
            tooltip="How many you currently have on your shelves. Pallio uses this as your starting count and increases or decreases it as you sell + receive stock."
          >
            <Input type="number" defaultValue={0} />
          </FormField>
          <FormField
            label="Reorder point"
            hint="Below this, the dashboard alerts you."
            tooltip={
              <>
                Pallio warns you to reorder when your stock falls to this
                number. A good rule of thumb: <strong>set it to about twice
                what you sell in a week</strong>, so you have time to order more
                before you run out.
              </>
            }
          >
            <Input type="number" defaultValue={20} />
          </FormField>
          <FormField
            label="Default location"
            tooltip="Which store or warehouse this item lives in by default. You can move stock between locations later."
          >
            <Select defaultValue="wh-a">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wh-a">Warehouse A</SelectItem>
                <SelectItem value="wh-b">Warehouse B</SelectItem>
                <SelectItem value="wh-c">Warehouse C</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Barcode (optional)"
            tooltip={
              <>
                The number under the printed barcode on the product (a
                <strong> UPC</strong> in the US or <strong>EAN</strong>{" "}
                elsewhere). Scan it at the till to add the item to a sale
                instantly. Leave blank if you'll print your own barcode labels
                later.
              </>
            }
          >
            <Input placeholder="0123456789012" />
          </FormField>
          <FormField span={2}>
            <SwitchField
              label="Track inventory"
              description="Leave on for physical goods. Turn off for services (e.g. haircut, repair) or digital items where there's nothing on a shelf to count."
              checked={trackInventory}
              onCheckedChange={setTrackInventory}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Supplier" description="Where you source it from" Icon={Truck}>
        <FormGrid cols={2}>
          <FormField label="Primary supplier" span={2}>
            <div className="flex items-center gap-2">
              <Select value={supplier} onValueChange={(v) => setSupplier(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AddSupplierDialog
                onCreate={(s) => {
                  setSuppliers((prev) => [...prev, s.name])
                  setSupplier(s.name)
                }}
              />
            </div>
          </FormField>
          <FormField
            label="Supplier SKU"
            hint="Their code for this item."
            tooltip="The code your supplier uses on their invoices and price list. Saving it here means Pallio will recognise the item automatically when you upload a supplier price file."
          >
            <Input placeholder="COB-USB-6IN1" />
          </FormField>
          <FormField
            label="Lead time"
            tooltip="How many days between placing an order with this supplier and the stock arriving. Pallio uses this to suggest when you should reorder."
          >
            <InputAddon trailing="days">
              <input type="number" placeholder="14" />
            </InputAddon>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Media" description="Product image" Icon={ImageIcon}>
        <FormField label="Image" hint="PNG/JPG, square 400×400 recommended.">
          <Input type="file" accept="image/*" />
        </FormField>
      </FormSection>

      <FormSection
        title="Visibility"
        description="Where this item appears"
        Icon={Lightbulb}
      >
        <div className="flex flex-col gap-2.5">
          <SwitchField
            label="Show in POS"
            description="Available in the point-of-sale catalog."
            defaultChecked
          />
          <SwitchField
            label="Show on online storefront"
            description="Synced to the connected web store."
            defaultChecked
          />
          <SwitchField
            label="Show in supplier portal"
            description="Visible to wholesale buyers with portal access."
          />
        </div>
      </FormSection>

      <CoachMark
        id="inv-new-sku"
        anchorRef={skuRef}
        title="The SKU is for life"
        body="A SKU is the unique code you'll scan and search by. Pick a readable pattern (EL-2109) and never reuse it — name and price can change later, the SKU shouldn't."
        placement="top"
      />
    </FormShell>
  )
}
