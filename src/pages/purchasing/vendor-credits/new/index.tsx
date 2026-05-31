import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CalendarDays, FileMinus, Wallet } from "lucide-react"
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
import { useCurrency, formatPriceFor } from "@/contexts/currency"

export default function NewVendorCredit() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = React.useState(false)
  const { symbol } = useCurrency()
  return (
    <FormShell
      title="New vendor credit"
      description="Record a credit memo from a supplier — applied to future bills."
      titleTooltip={
        <>
          The supplier owes you money back — usually from
          over-billing, a damaged shipment, or a rebate. Logging the
          credit here means Pallio knocks it off their next bill
          automatically, so you pay less rather than chasing a
          refund.
        </>
      }
      backHref="/purchasing/vendor-credits"
      onSubmit={() => {
        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          toast.success("Vendor credit saved", { description: "It'll be applied automatically to the vendor's next bill." })
          navigate("/purchasing/vendor-credits")
        }, 500)
      }}
      aside={
        <FormAside
          tips={[
            { title: "Apply to bill", body: "Linking to an open bill auto-reduces what's owed.", Icon: Wallet },
            { title: "Expiry", body: "Some vendors void unused credits after a window — set it here so we remind you.", Icon: CalendarDays },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save credit" submitting={submitting} cancelHref="/purchasing/vendor-credits" />}
    >
      <FormSection title="Source" Icon={FileMinus}>
        <FormGrid cols={3}>
          <FormField
            label="Vendor"
            required
            tooltip="The supplier issuing the credit. Their open bills appear in the 'Apply to bill' dropdown below so you can knock the credit off something they're already owed."
          >
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
            label="Credit memo #"
            required
            tooltip={
              <>
                The reference number the vendor put on the credit-memo
                document they sent you. Quoting it back keeps your books
                and theirs synced — and protects you if they later try to
                reverse the credit.
              </>
            }
          >
            <Input placeholder="CM-4471" required />
          </FormField>
          <FormField
            label="Reason"
            tooltip={
              <>
                Why the vendor is giving you money back.
                <ul className="mt-1.5 list-disc pl-4">
                  <li><strong>Overbilling</strong> — they charged you too much on an invoice.</li>
                  <li><strong>Damaged shipment</strong> — product arrived broken.</li>
                  <li><strong>Short shipment</strong> — fewer units than ordered.</li>
                  <li><strong>Rebate</strong> — volume / loyalty discount they're paying out.</li>
                </ul>
                Pallio summarises these in vendor scorecards.
              </>
            }
          >
            <Select defaultValue="overbilling">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="overbilling">Overbilling</SelectItem>
                <SelectItem value="damaged">Damaged shipment</SelectItem>
                <SelectItem value="short">Short shipment</SelectItem>
                <SelectItem value="rebate">Rebate / promo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Amount + apply" Icon={Wallet}>
        <FormGrid cols={3}>
          <FormField label="Credit amount" required tooltip="How much the vendor owes you back. Use a positive number — Pallio treats it as a reduction to your AP automatically.">
            <InputAddon leading={symbol}>
              <input type="number" step="0.01" placeholder="0.00" required />
            </InputAddon>
          </FormField>
          <FormField
            label="Apply to bill"
            hint="Optional — leave blank to add to vendor balance."
            tooltip={
              <>
                Pick a specific open bill to knock the credit off
                straight away. Leave blank and the credit sits as a
                'balance' on the vendor's account — used automatically
                on their next bill, until depleted.
              </>
            }
          >
            <Select>
              <SelectTrigger><SelectValue placeholder="(vendor balance)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BILL-9001">BILL-9001 · {formatPriceFor(4820)}</SelectItem>
                <SelectItem value="BILL-9002">BILL-9002 · {formatPriceFor(1240)}</SelectItem>
                <SelectItem value="BILL-9003">BILL-9003 · {formatPriceFor(920)}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Expiry"
            tooltip="Some vendors void unused credits after 6–12 months. Pop the date here and Pallio nudges you to use it before it lapses."
          >
            <Input type="date" />
          </FormField>
          <FormField
            label="Notes"
            span={3}
            tooltip="What happened, who agreed it (named contact + date), and a link to any email or photo evidence. Crucial when there's later a dispute."
          >
            <Textarea placeholder="What happened, who agreed, supporting reference…" />
          </FormField>
          <FormField span={3}>
            <SwitchField
              label="Notify vendor"
              description="Email the vendor a confirmation that the credit has been recorded. Useful so they don't accidentally re-issue the same memo."
            />
          </FormField>
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
