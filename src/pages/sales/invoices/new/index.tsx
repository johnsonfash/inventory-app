import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { FileText, User, Wallet } from "lucide-react"
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

export default function NewInvoice() {
  const [submitting, setSubmitting] = React.useState(false)
  const [subtotal, setSubtotal] = React.useState("")
  const [tax, setTax] = React.useState("")
  const [total, setTotal] = React.useState("")
  const navigate = useNavigate()

  // Cheap sanity check: subtotal + tax should equal total (within
  // a 1-cent rounding tolerance). Real backend will recompute from
  // line items, but in the meantime this catches typos before save.
  const totalsMismatch = React.useMemo(() => {
    const s = Number(subtotal)
    const t = Number(tax)
    const g = Number(total)
    if (!Number.isFinite(s) || !Number.isFinite(t) || !Number.isFinite(g)) return false
    if (g === 0 && s === 0 && t === 0) return false
    return Math.abs(s + t - g) > 0.01
  }, [subtotal, tax, total])

  return (
    <FormShell
      title="New invoice"
      description="Bill a customer for products or services rendered."
      titleTooltip={
        <>
          Send a customer a formal request for payment. Pallio
          numbers it, emails the PDF + a one-tap payment link
          (Paystack / Flutterwave / transfer), and tracks the status
          until they pay. Reuse the line items from a sales order to
          save time.
        </>
      }
      backHref="/sales/invoices"
      onSubmit={() => {
        if (totalsMismatch) {
          toast.error("Subtotal + tax doesn't match total.", {
            description: "Fix the amounts before saving — they need to add up.",
          })
          return
        }
        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          toast.success("Invoice created.")
          navigate("/sales/invoices")
        }, 500)
      }}
      aside={
        <FormAside
          tips={[
            { title: "From order", body: "Invoicing existing sales orders auto-pulls line items + customer.", Icon: FileText },
            { title: "Numbering", body: "Prefix + padding come from Settings → Invoice. Next number is auto.", Icon: FileText },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Create invoice" submitting={submitting} cancelHref="/sales/invoices" />}
    >
      <FormSection title="Customer" Icon={User}>
        <FormGrid cols={2}>
          <FormField label="Customer" required tooltip="Who you're billing. Their saved email, payment terms, and price list pre-fill the rest of the invoice.">
            <Select defaultValue="nova">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nova">NovaApps</SelectItem>
                <SelectItem value="bright">BrightLane</SelectItem>
                <SelectItem value="acme">Acme Co</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Linked order"
            hint="Optional — pre-fill line items from a sales order."
            tooltip="Pick a sales order to copy its items + totals into this invoice. Keeps the SO and invoice linked so payment received here marks the order paid."
          >
            <Select>
              <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SO-7842">SO-7842 · NovaApps</SelectItem>
                <SelectItem value="SO-7849">SO-7849 · BrightLane</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Amounts" Icon={Wallet}>
        <FormGrid cols={3}>
          <FormField label="Issue date" required tooltip="The day you're sending this invoice. Used as the start date for counting payment terms (Net 30 means 30 days from this date).">
            <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </FormField>
          <FormField
            label="Due date"
            required
            tooltip="The day the customer must pay by. Auto-set from the customer's payment terms but you can override it. Pallio flags an invoice as 'overdue' the day after this."
          >
            <Input type="date" required />
          </FormField>
          <FormField label="Currency" tooltip="The currency the customer pays in. Pallio shows both the customer's currency and your home currency on reports.">
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
          <FormField label="Subtotal" tooltip="Sum of all line items before tax. If you're using line items, Pallio fills this automatically.">
            <InputAddon leading="$">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
              />
            </InputAddon>
          </FormField>
          <FormField label="Tax" tooltip="VAT or sales tax on the subtotal. Pallio applies the default rate from Settings → Taxes unless you override it.">
            <InputAddon leading="$">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
            </InputAddon>
          </FormField>
          <FormField
            label="Total"
            required
            tooltip="Subtotal + Tax. This is what the customer actually pays."
            hint={totalsMismatch ? "Subtotal + tax doesn't equal total." : undefined}
          >
            <InputAddon leading="$">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                required
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                aria-invalid={totalsMismatch || undefined}
              />
            </InputAddon>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Delivery" Icon={FileText}>
        <FormGrid cols={1}>
          <FormField label="Memo" hint="Shown on the invoice PDF." tooltip="A short message to the customer — thank-you note, payment instructions, bank details, etc. Appears at the bottom of the PDF invoice.">
            <Textarea placeholder="Thanks for your business!" />
          </FormField>
          <SwitchField label="Email to customer immediately" description="Pallio attaches the invoice PDF + a one-click payment link (Paystack, Flutterwave, transfer) and sends it as soon as you save." defaultChecked />
          <SwitchField label="Attach receipt" description="Bundle a 'paid in full' receipt with the invoice. Useful when the customer has already paid and you're sending the invoice for their records." />
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
