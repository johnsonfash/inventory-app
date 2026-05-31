import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ArrowDownToLine, Building2, ShieldCheck, Wallet } from "lucide-react"
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
import { useAutoMarkStep } from "@/hooks/use-auto-mark-step"
import { useCurrency, formatPriceFor } from "@/contexts/currency"

export default function NewWithdrawal() {
  useAutoMarkStep("first-withdrawal")
  const [submitting, setSubmitting] = React.useState(false)
  const { formatPrice, symbol } = useCurrency()
  const navigate = useNavigate()

  const onSubmit = async () => {
    setSubmitting(true)
    try {
      // Mock latency — when backend lands swap for api.post('/withdrawals', ...).
      await new Promise((r) => setTimeout(r, 500))
      toast.success("Withdrawal requested", { description: "We'll email you when funds land." })
      navigate("/settings/payments/withdrawals")
    } catch {
      toast.error("Couldn't request withdrawal", { description: "Check the amount and account, then try again." })
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <FormShell
      title="New withdrawal"
      description="Initiate a payout from the Pallio balance to one of your bank accounts."
      titleTooltip={
        <>
          Pull money out of your Pallio settlement balance into a
          verified bank account. Transfers run on Nigerian banking
          hours; cut-off is 4 pm WAT for same-day arrival.
        </>
      }
      backHref="/settings/payments/withdrawals"
      onSubmit={onSubmit}
      aside={
        <FormAside
          tips={[
            { title: "Available", body: `${formatPrice(48210)} available right now. Withdrawals settle in 1-2 business days.`, Icon: Wallet },
            { title: "Approval", body: `Withdrawals over ${formatPrice(5000)} require a manager-role co-signer.`, Icon: ShieldCheck },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Request payout" submitting={submitting} cancelHref="/settings/payments/withdrawals" />}
    >
      <FormSection title="Destination" Icon={Building2}>
        <FormField label="Withdrawal account" required>
          <Select defaultValue="VA-001">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="VA-001">Mercury Bank · 1023 — Pallio Ops Austin</SelectItem>
              <SelectItem value="VA-002">Mercury Bank · 5581 — Pallio Ops Austin 2</SelectItem>
              <SelectItem value="VA-003">Wise · 0042 — Pallio Atlanta</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      <FormSection title="Amount" Icon={ArrowDownToLine}>
        <FormGrid cols={3}>
          <FormField label="Amount" required>
            <InputAddon leading={symbol}>
              <input type="number" step="0.01" placeholder="0.00" required />
            </InputAddon>
          </FormField>
          <FormField label="Currency">
            <Select defaultValue="USD">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Method">
            <Select defaultValue="ach">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ach">ACH (free, 1-2 days)</SelectItem>
                <SelectItem value="wire">Wire ({formatPriceFor(25)} fee, same day)</SelectItem>
                <SelectItem value="instant">Instant (1.5% fee, minutes)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Reference" span={3} hint="Appears on your bank statement.">
            <Input placeholder="Pallio payout · weekly" />
          </FormField>
          <FormField label="Memo (internal)" span={3}>
            <Textarea placeholder="Internal context — not sent to the bank." />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Behaviour" Icon={ShieldCheck}>
        <SwitchField label="Recurring weekly" description="Automatically request the same withdrawal every Monday." />
        <SwitchField label="Send confirmation email" defaultChecked />
      </FormSection>
    </FormShell>
  )
}
