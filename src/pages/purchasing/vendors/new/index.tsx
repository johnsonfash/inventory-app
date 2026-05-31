import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Building2, CreditCard, MapPin, Tag } from "lucide-react"
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

export default function NewVendor() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = React.useState(false)

  return (
    <FormShell
      title="New vendor"
      description="Contact, address, and payment defaults."
      titleTooltip={
        <>
          Add a supplier you buy stock from. Save their payment
          terms, lead time, and currency once here, and every future
          PO + bill for them pre-fills with the right defaults.
        </>
      }
      backHref="/purchasing/vendors"
      onSubmit={() => {
        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          toast.success("Vendor saved", { description: "Pre-fills will apply to their next PO." })
          navigate("/purchasing/vendors")
        }, 600)
      }}
      aside={
        <FormAside
          tips={[
            { title: "Tax ID", body: "Required for VAT-reclaim in many regions. Capture it once here.", Icon: Tag },
            { title: "Lead time", body: "Default lead time pre-fills PO due dates and reorder suggestions.", Icon: Building2 },
            { title: "Payment terms", body: "Default terms here flow into every PO created for this vendor.", Icon: CreditCard },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save vendor" submitting={submitting} cancelHref="/purchasing/vendors" />}
    >
      <FormSection title="Contact" description="Reach this supplier" Icon={Building2}>
        <FormGrid cols={2}>
          <FormField label="Vendor name" required tooltip="The business name on their invoices to you.">
            <Input placeholder="Cobalt Distributors" required />
          </FormField>
          <FormField
            label="Account manager"
            tooltip="Your day-to-day contact at the supplier — the person you call when an order is late. Shows up on PO emails so they know who to reply to."
          >
            <Input placeholder="Sarah K." />
          </FormField>
          <FormField label="Email" required tooltip="Where Pallio emails purchase orders and queries.">
            <Input type="email" placeholder="sales@cobalt.com" required />
          </FormField>
          <FormField label="Phone" tooltip="WhatsApp-friendly number works best for Nigerian suppliers.">
            <Input type="tel" placeholder="+234 803 555 0100" />
          </FormField>
          <FormField label="Website">
            <Input type="url" placeholder="https://cobalt.com" />
          </FormField>
          <FormField
            label="Tax ID"
            tooltip={
              <>
                The supplier's <strong>TIN</strong> or <strong>VAT</strong>{" "}
                number. Required if you want to reclaim VAT on what you buy
                from them. In Nigeria, you need this to claim input VAT on your
                FIRS filings.
              </>
            }
          >
            <Input placeholder="TIN / VAT number" />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Address" description="Billing and shipping origin" Icon={MapPin}>
        <FormField label="Billing address">
          <Textarea placeholder="Street, City, State, ZIP, Country" />
        </FormField>
      </FormSection>

      <FormSection title="Trading terms" description="PO defaults" Icon={CreditCard}>
        <FormGrid cols={3}>
          <FormField
            label="Payment terms"
            tooltip="How long the supplier gives you to pay after delivery. Pallio applies this to every PO you create for them — you can override per order."
          >
            <Select defaultValue="net30">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate (cash on delivery)</SelectItem>
                <SelectItem value="net7">Net 7</SelectItem>
                <SelectItem value="net14">Net 14</SelectItem>
                <SelectItem value="net30">Net 30</SelectItem>
                <SelectItem value="net60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Currency"
            tooltip="The currency this supplier invoices you in. For foreign suppliers, Pallio converts to your local currency on reports using the exchange rate at the time of the bill."
          >
            <Select defaultValue="NGN">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">NGN</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Default lead time"
            tooltip="Typical number of days from placing an order to the goods arriving. Pallio uses this to suggest when to reorder — too low and you'll run out, too high and you'll over-buy."
          >
            <InputAddon trailing="days">
              <input type="number" defaultValue={14} />
            </InputAddon>
          </FormField>
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
