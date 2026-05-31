import * as React from "react"
import { toast } from "sonner"
import { FileText, Hash, Image as ImageIcon, Languages, MailCheck } from "lucide-react"
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

export default function InvoiceSettings() {
  const [submitting, setSubmitting] = React.useState(false)
  return (
    <FormShell
      title="Invoice settings"
      description="Numbering, defaults, and templating for customer-facing documents."
      titleTooltip={
        <>
          How your invoices look + are numbered. Pick a prefix (e.g.
          <span className="font-mono"> INV- </span>) and Pallio takes
          care of the rest — sequential numbering, your logo on every
          PDF, default payment terms, and the legal text required for
          tax compliance.
        </>
      }
      backHref="/settings"
      onSubmit={async () => {
        setSubmitting(true)
        try {
          await new Promise((r) => setTimeout(r, 500))
          toast.success("Invoice settings saved.")
        } catch {
          toast.error("Couldn't save invoice settings — try again.")
        } finally {
          setSubmitting(false)
        }
      }}
      aside={
        <FormAside
          tips={[
            { title: "Prefix", body: "Once issued, invoice numbers can't be reordered — pick a prefix you'll keep.", Icon: Hash },
            { title: "Logo", body: "Square 512×512 PNG appears in the top-right of the invoice PDF.", Icon: ImageIcon },
            { title: "Footer", body: "Use for tax IDs, return policies, or thank-you notes.", Icon: FileText },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save invoice settings" submitting={submitting} cancelHref="/settings" />}
    >
      <FormSection title="Numbering" description="How invoices are identified" Icon={Hash}>
        <FormGrid cols={3}>
          <FormField label="Prefix" required>
            <Input defaultValue="INV-" required />
          </FormField>
          <FormField label="Next number" required>
            <Input type="number" defaultValue={3308} required />
          </FormField>
          <FormField label="Padding">
            <Select defaultValue="4">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 digits (e.g. INV-001)</SelectItem>
                <SelectItem value="4">4 digits (e.g. INV-0001)</SelectItem>
                <SelectItem value="5">5 digits (e.g. INV-00001)</SelectItem>
                <SelectItem value="6">6 digits</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Format preview" span={3} hint="Read-only — shows how your next invoice number will look.">
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-input bg-muted/30 px-3 py-2 font-mono text-sm tabular-nums text-muted-foreground"
            >
              INV-3308
            </div>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Defaults" description="Applied to every new invoice" Icon={FileText}>
        <FormGrid cols={3}>
          <FormField label="Payment terms">
            <Select defaultValue="net14">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="net7">Net 7</SelectItem>
                <SelectItem value="net14">Net 14</SelectItem>
                <SelectItem value="net30">Net 30</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Default currency">
            <Select defaultValue="USD">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="NGN">NGN</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Language">
            <Select defaultValue="en">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Footer message" span={3} hint="Appears at the bottom of every invoice.">
            <Textarea defaultValue="Thank you for your business! Returns accepted within 30 days." />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Branding" description="Visual style" Icon={ImageIcon}>
        <FormGrid cols={2}>
          <FormField label="Logo">
            <Input type="file" accept="image/*" />
          </FormField>
          <FormField label="Accent colour">
            <Select defaultValue="violet">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="violet">Violet (brand)</SelectItem>
                <SelectItem value="black">Black & white</SelectItem>
                <SelectItem value="emerald">Emerald</SelectItem>
                <SelectItem value="indigo">Indigo</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Delivery" description="How invoices reach customers" Icon={MailCheck}>
        <div className="space-y-2">
          <SwitchField
            label="Send invoice automatically on order fulfilment"
            description="Email lands the moment an order is marked fulfilled."
            defaultChecked
          />
          <SwitchField
            label="Attach PDF copy"
            description="Include a PDF in addition to the in-email preview."
            defaultChecked
          />
          <SwitchField
            label="Reminder when due date approaches"
            description="3 days before, and again on the due date itself."
            defaultChecked
          />
          <SwitchField
            label="Overdue reminders"
            description="Daily after the due date until the invoice is paid."
          />
        </div>
      </FormSection>

      <FormSection title="Localisation" description="Per-region overrides" Icon={Languages}>
        <FormGrid cols={2}>
          <FormField label="Date format">
            <Select defaultValue="mdy">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Number format">
            <Select defaultValue="comma">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comma">1,234.56</SelectItem>
                <SelectItem value="period">1.234,56</SelectItem>
                <SelectItem value="space">1 234.56</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
