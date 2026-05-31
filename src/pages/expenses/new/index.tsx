import * as React from "react"
import { Paperclip, Receipt, Tag } from "lucide-react"
import { toast } from "sonner"
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

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024 // 8MB — matches the hint

export default function NewExpense() {
  const [submitting, setSubmitting] = React.useState(false)
  const [receiptName, setReceiptName] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const onReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) { setReceiptName(null); return }
    if (file.size > MAX_RECEIPT_BYTES) {
      toast.error("Receipt too large", { description: "Max 8MB. Try a compressed photo or PDF." })
      e.target.value = ""
      setReceiptName(null)
      return
    }
    setReceiptName(file.name)
  }

  return (
    <FormShell
      title="Record expense"
      description="Operating cost entry — affects the P&L immediately."
      titleTooltip={
        <>
          Log money you spent running the business — rent, logistics,
          NEPA bill, fuel, marketing spend, staff reimbursement. Each
          entry hits your P&amp;L immediately under the category you
          pick. Attach the receipt photo so tax season is painless.
        </>
      }
      backHref="/expenses"
      onSubmit={() => {
        setSubmitting(true)
        setTimeout(() => setSubmitting(false), 500)
      }}
      aside={
        <FormAside
          tips={[
            { title: "Receipts", body: "Attach a receipt photo or PDF for tax season exports.", Icon: Paperclip },
            { title: "Category", body: "Categories appear in the Expenses report. Add new ones in Settings.", Icon: Tag },
            { title: "Reimbursable", body: "Flag to track expenses owed back to staff.", Icon: Receipt },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save expense" submitting={submitting} cancelHref="/expenses" />}
    >
      <FormSection title="Details" description="What was the spend?" Icon={Receipt}>
        <FormGrid cols={3}>
          <FormField
            label="Category"
            required
            tooltip="Buckets expenses on your Profit-and-Loss report so you can see, for example, how much you spent on marketing this quarter. Pick the closest match — you can add your own categories in Settings."
          >
            <Select defaultValue="logistics">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="logistics">Logistics</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Vendor / payee"
            tooltip="Who you paid (DHL, NEPA, the landlord). Optional, but lets Pallio total all spend with a given supplier across the year."
          >
            <Input placeholder="DHL" />
          </FormField>
          <FormField label="Date" required tooltip="The day money actually left your account. Used to place the expense on the right week / month / quarter in reports.">
            <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </FormField>
          <FormField label="Amount" required tooltip="The full amount you paid, including tax.">
            <InputAddon leading="$">
              <input type="number" step="0.01" placeholder="0.00" required />
            </InputAddon>
          </FormField>
          <FormField label="Currency" tooltip="What currency you paid in. If it's not your business currency, Pallio converts at today's rate for the P&L.">
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
          <FormField
            label="Payment method"
            tooltip="How you paid. Useful when you reconcile against bank statements at month-end — Pallio can filter expenses by card vs cash vs transfer."
          >
            <Select defaultValue="card">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="transfer">Bank transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Description"
            span={3}
            hint="Optional. Shows in the activity log."
            tooltip="One-line context so future-you can remember what this was. Tax auditors also like it ('PO-1042 express shipping' is much better than just 'shipping')."
          >
            <Textarea placeholder="Express shipping for PO-1042." />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Receipt" Icon={Paperclip}>
        <FormGrid cols={1}>
          <FormField
            label="Attach receipt"
            hint="PNG, JPG, or PDF — max 8MB."
            tooltip="A photo of the paper receipt or the email PDF. Pallio stores it forever — when the tax man comes asking, this is your proof the expense is real."
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={onReceiptChange}
            />
            {receiptName && (
              <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                Attached: <span className="font-medium text-foreground">{receiptName}</span>
              </p>
            )}
          </FormField>
          <FormField>
            <SwitchField
              label="Reimbursable expense"
              description="The employee paid out of their own pocket; the business owes them back. Pallio adds this to their reimbursable balance, which shows up on the next payroll run."
            />
          </FormField>
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
