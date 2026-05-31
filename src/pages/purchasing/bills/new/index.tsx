import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CalendarDays, Paperclip, Receipt, Wallet } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { InputAddon } from "@/components/forms/input-addon"
import { SwitchField } from "@/components/forms/switch-field"

export default function NewBill() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = React.useState(false)
  return (
    <FormShell
      title="New vendor bill"
      description="Record an invoice received from a supplier."
      titleTooltip={
        <>
          Log a bill your supplier sent you. Link it to the matching
          PO so Pallio can flag over-billing automatically. Once
          recorded, Bills shows up in AP aging — Pallio reminds you
          before the due date so you don't ding your credit.
        </>
      }
      backHref="/purchasing/bills"
      onSubmit={() => {
        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          toast.success("Bill saved", { description: "Added to AP aging — Pallio reminds you before it's due." })
          navigate("/purchasing/bills")
        }, 500)
      }}
      aside={
        <FormAside
          tips={[
            { title: "Link to PO", body: "Linking auto-matches line items and prevents over-billing.", Icon: Receipt },
            { title: "Attachment", body: "Drag in the PDF you received from the vendor for the record.", Icon: Paperclip },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save bill" submitting={submitting} cancelHref="/purchasing/bills" />}
    >
      <FormSection title="Vendor + reference" Icon={Receipt}>
        <FormGrid cols={3}>
          <FormField label="Vendor" required tooltip="Which supplier sent you this bill. Pallio uses their saved payment terms + currency to pre-fill the rest.">
            <Select defaultValue="cobalt">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cobalt">Cobalt Distributors</SelectItem>
                <SelectItem value="delta">Delta Apparel</SelectItem>
                <SelectItem value="glow">Glow Co</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Bill number"
            required
            hint="From the vendor's invoice."
            tooltip="The invoice number the vendor put on their bill to you (often top-right of the PDF). Quoting it back keeps your records and theirs matched if there's ever a dispute."
          >
            <Input placeholder="COB-99021" required />
          </FormField>
          <FormField
            label="Linked PO"
            hint="Optional — match against an existing purchase order."
            tooltip="Link to the purchase order you sent this vendor. Pallio compares the bill's line items + amounts against the PO and warns if they don't match — protects you from being over-billed."
          >
            <Select>
              <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PO-1042">PO-1042</SelectItem>
                <SelectItem value="PO-1041">PO-1041</SelectItem>
                <SelectItem value="PO-1040">PO-1040</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Dates + amount" Icon={CalendarDays}>
        <FormGrid cols={3}>
          <FormField label="Bill date" required tooltip="The date printed on the vendor's invoice. Counts as day 1 of the payment terms (Net 30 = 30 days from this date).">
            <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </FormField>
          <FormField label="Due date" required tooltip="When you must pay by. Pallio fills this from the vendor's payment terms but you can override (e.g. they gave you an early-pay discount).">
            <Input type="date" required />
          </FormField>
          <FormField label="Currency" tooltip="Currency on the vendor's invoice. Pallio converts to your business currency on the P&L using the bill-date exchange rate.">
            <Select defaultValue="NGN">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">NGN</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Subtotal" tooltip="Pre-tax total of all line items on the bill.">
            <InputAddon leading="$">
              <input type="number" step="0.01" placeholder="0.00" />
            </InputAddon>
          </FormField>
          <FormField label="Tax" tooltip="VAT charged by the vendor. Pallio tracks this separately as 'input tax' you can reclaim on your next VAT filing.">
            <InputAddon leading="$">
              <input type="number" step="0.01" placeholder="0.00" />
            </InputAddon>
          </FormField>
          <FormField label="Total" required tooltip="Subtotal + Tax. The amount you actually owe.">
            <InputAddon leading="$">
              <input type="number" step="0.01" placeholder="0.00" required />
            </InputAddon>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Attachment + flags" Icon={Wallet}>
        <FormGrid cols={1}>
          <FormField label="Attach invoice PDF" hint="Max 8MB." tooltip="Drop in the original PDF the vendor sent. Pallio stores it with the bill so audits + disputes are one click away.">
            <Input type="file" accept="application/pdf,image/*" />
          </FormField>
          <SwitchField label="Hold for review" description="Parks the bill so it doesn't show up in AP aging or payment runs until a manager taps Approve. Useful for bills that need a second pair of eyes." />
          <SwitchField label="Pay automatically" description="When the due date arrives, Pallio attempts payment via the vendor's saved default method (bank transfer / card). Combine with 'Hold for review' off for hands-free settlement." />
          <FormField label="Notes" tooltip="Anything internal — discounts negotiated, partial shipments, follow-up needed. Never shown to the vendor.">
            <Textarea placeholder="Anything internal about this bill…" />
          </FormField>
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
