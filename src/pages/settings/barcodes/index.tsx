import * as React from "react"
import { toast } from "sonner"
import { Printer, Ruler, ScanLine, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { SwitchField } from "@/components/forms/switch-field"
import { InputAddon } from "@/components/forms/input-addon"

export default function Barcodes() {
  const [submitting, setSubmitting] = React.useState(false)
  return (
    <FormShell
      title="Barcode settings"
      description="Symbology, label layout, and default printer assignment."
      titleTooltip={
        <>
          How Pallio prints + scans barcodes. The
          <strong> symbology</strong> is the encoding standard (UPC-A
          in the US, EAN-13 elsewhere, Code 128 for in-house SKUs).
          Pick the one your scanner is set up for; everything else
          (size, content, font) is just cosmetic.
        </>
      }
      backHref="/settings"
      onSubmit={async () => {
        setSubmitting(true)
        try {
          await new Promise((r) => setTimeout(r, 500))
          toast.success("Barcode settings saved.")
        } catch {
          toast.error("Couldn't save barcode settings — try again.")
        } finally {
          setSubmitting(false)
        }
      }}
      aside={
        <FormAside
          tips={[
            { title: "Symbology", body: "Code 128 covers most retail SKUs. EAN-13 is required for grocery / FMCG.", Icon: ScanLine },
            { title: "Label size", body: "Defaults assume the Zebra ZD420 — change if you're on a different printer.", Icon: Ruler },
            { title: "Print on receive", body: "Auto-prints labels when stock is received from a PO.", Icon: Printer },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save barcode settings" submitting={submitting} cancelHref="/settings" />}
    >
      <FormSection title="Symbology" description="Barcode encoding standard" Icon={ScanLine}>
        <FormGrid cols={2}>
          <FormField label="Default symbology" required>
            <Select defaultValue="code128">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="code128">Code 128 (alphanumeric, most flexible)</SelectItem>
                <SelectItem value="code39">Code 39 (legacy)</SelectItem>
                <SelectItem value="ean13">EAN-13 (retail / FMCG)</SelectItem>
                <SelectItem value="upc-a">UPC-A (US retail)</SelectItem>
                <SelectItem value="qr">QR (high data density)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Fallback for short SKUs">
            <Select defaultValue="auto">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (pad to symbology spec)</SelectItem>
                <SelectItem value="code128">Force Code 128</SelectItem>
                <SelectItem value="ean8">EAN-8</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Label layout" description="Size and content of printed labels" Icon={Ruler}>
        <FormGrid cols={3}>
          <FormField label="Width">
            <InputAddon trailing="mm">
              <input type="number" defaultValue={50} />
            </InputAddon>
          </FormField>
          <FormField label="Height">
            <InputAddon trailing="mm">
              <input type="number" defaultValue={25} />
            </InputAddon>
          </FormField>
          <FormField label="Orientation">
            <Select defaultValue="landscape">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">Landscape</SelectItem>
                <SelectItem value="portrait">Portrait</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Label template" span={3}>
            <Select defaultValue="standard">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (SKU + barcode + price)</SelectItem>
                <SelectItem value="minimal">Minimal (barcode only)</SelectItem>
                <SelectItem value="full">Full (logo + name + SKU + barcode + price)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Behaviour" description="When labels print" Icon={Printer}>
        <div className="space-y-2">
          <SwitchField
            label="Print on receive"
            description="Auto-prints labels when stock is received from a PO."
            defaultChecked
          />
          <SwitchField
            label="Print on item creation"
            description="Print a single label when a new SKU is added."
          />
          <SwitchField
            label="Re-print on price change"
            description="Print new labels when retail price changes by more than 10%."
            defaultChecked
          />
        </div>
      </FormSection>

      <FormSection title="Defaults" description="Where labels go" Icon={Sparkles}>
        <FormGrid cols={2}>
          <FormField label="Default printer">
            <Select defaultValue="zebra">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="zebra">Zebra ZD420 — WH-A</SelectItem>
                <SelectItem value="zebra-b">Zebra ZD220 — WH-B</SelectItem>
                <SelectItem value="dymo">Dymo LabelWriter — Downtown</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Per-item override">
            <Input placeholder="None — leave blank" />
          </FormField>
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
