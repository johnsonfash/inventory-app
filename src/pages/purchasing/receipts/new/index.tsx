import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Box, CalendarDays, FileCheck, Truck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { SwitchField } from "@/components/forms/switch-field"

export default function NewReceipt() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = React.useState(false)
  return (
    <FormShell
      title="New goods receipt"
      description="Record inbound stock against a purchase order."
      titleTooltip={
        <>
          The boxes just arrived from your supplier. Logging the
          receipt tells Pallio to bump your on-hand count, start the
          return-window clock, and auto-flag any shortage versus the
          PO so you can claim a vendor credit straight away.
        </>
      }
      backHref="/purchasing/receipts"
      onSubmit={() => {
        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          toast.success("Receipt saved", { description: "On-hand stock and PO status updated." })
          navigate("/purchasing/receipts")
        }, 500)
      }}
      aside={
        <FormAside
          tips={[
            { title: "Partial receipts", body: "Receive a subset of lines now and finish the rest later — the PO stays open.", Icon: Box },
            { title: "Discrepancy", body: "Flag mismatched qty here. Triggers a vendor-credit suggestion in Purchasing.", Icon: FileCheck },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save receipt" submitting={submitting} cancelHref="/purchasing/receipts" />}
    >
      <FormSection title="PO + dates" Icon={Truck}>
        <FormGrid cols={3}>
          <FormField
            label="Purchase order"
            required
            tooltip="Which order the goods arrived against. Pallio uses this to compare what was ordered vs what arrived and flag any shortages."
          >
            <Select defaultValue="PO-1042">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PO-1042">PO-1042 · Cobalt Distributors</SelectItem>
                <SelectItem value="PO-1041">PO-1041 · Glow Co</SelectItem>
                <SelectItem value="PO-1040">PO-1040 · Delta Apparel</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Receipt date" required tooltip="The day the goods physically arrived at your location. Pallio uses this to age inventory and trigger return-window timers.">
            <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </FormField>
          <FormField
            label="Received by"
            tooltip="Who signed for the delivery. Important when there's a dispute — Pallio shows this on the receipt audit log."
          >
            <Select defaultValue="mia">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mia">Mia Chen</SelectItem>
                <SelectItem value="alex">Alex Larson</SelectItem>
                <SelectItem value="priya">Priya Patel</SelectItem>
                <SelectItem value="tunde">Tunde Bello</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Lines" description="Confirm received quantities" Icon={Box}>
        <FormGrid cols={3}>
          <FormField label="SKU" required span={2} tooltip="The product code on the box. Scan the barcode for fastest entry — Pallio matches it against the linked PO automatically.">
            <Input placeholder="EL-2109" required />
          </FormField>
          <FormField
            label="Received qty"
            required
            tooltip="How many units actually showed up. If less than the ordered qty, Pallio opens a vendor-credit task so you get a refund or replacement."
          >
            <Input type="number" min={1} defaultValue={20} required />
          </FormField>
          <FormField
            label="Lot / batch (optional)"
            span={2}
            tooltip={
              <>
                Manufacturer's batch number — printed on the box near the
                expiry date. Capturing it means you can do a targeted
                recall (e.g. only batch <span className="font-mono">B-1223</span>{" "}
                was contaminated) instead of pulling every unit.
              </>
            }
          >
            <Input placeholder="B-1223" />
          </FormField>
          <FormField
            label="Expiry (optional)"
            tooltip="For perishables — Pallio flags items nearing expiry on the dashboard so you can discount + clear them before they have to be written off."
          >
            <Input type="date" />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Behaviour" Icon={CalendarDays}>
        <SwitchField
          label="Auto-close PO"
          description="If this receipt brings every line to fully-received, mark the PO as complete and stop nagging you about it on the dashboard."
          defaultChecked
        />
        <SwitchField
          label="Print labels for received items"
          description="Pallio sends a print job to your default label printer so newly-received stock has a scannable barcode before it hits the shelf."
        />
        <SwitchField
          label="Flag discrepancies"
          description="When received qty ≠ ordered qty, Pallio opens a vendor-credit task automatically. Highly recommended — it's how you get money back for shortages."
          defaultChecked
        />
        <FormField
          label="Notes"
          tooltip="Damage on arrival, wrong items, courier complaints. Future-you (and your supplier) will thank you for the detail."
        >
          <Textarea placeholder="Any discrepancies or damage notes…" />
        </FormField>
      </FormSection>
    </FormShell>
  )
}
