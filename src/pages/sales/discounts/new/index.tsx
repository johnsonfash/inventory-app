import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CalendarDays, TicketPercent, Users } from "lucide-react"
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
import { InputAddon } from "@/components/forms/input-addon"

export default function NewDiscount() {
  const [submitting, setSubmitting] = React.useState(false)
  const [type, setType] = React.useState<"percent" | "flat">("percent")
  const navigate = useNavigate()

  return (
    <FormShell
      title="New discount code"
      description="Create a redeemable code applied at checkout."
      titleTooltip={
        <>
          Build a promo customers can type at checkout (in-store or
          online) to claim a discount. Pallio tracks every redemption
          + the margin impact, so you can spot a runaway promo before
          it bleeds the business.
        </>
      }
      backHref="/sales/discounts"
      onSubmit={() => {
        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          toast.success("Discount code saved.")
          navigate("/sales/discounts")
        }, 500)
      }}
      aside={
        <FormAside
          tips={[
            { title: "Code", body: "Short codes redeem better (SUMMER20 vs SUMMER-DEAL-2026).", Icon: TicketPercent },
            { title: "Cap", body: "Set a global cap so a viral promo can't bleed margin uncontrollably.", Icon: Users },
            { title: "Schedule", body: "Leave dates blank to keep the code live indefinitely.", Icon: CalendarDays },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save discount" submitting={submitting} cancelHref="/sales/discounts" />}
    >
      <FormSection title="Code" Icon={TicketPercent}>
        <FormGrid cols={3}>
          <FormField
            label="Code"
            required
            hint="Customers type this at checkout."
            tooltip={
              <>
                The redemption code the customer enters to claim the
                discount. Keep it short, memorable, and in CAPS so it's
                easy to type from a phone (e.g.
                <span className="font-mono"> SAVE10 </span>,
                <span className="font-mono"> EID2026 </span>).
              </>
            }
          >
            <Input placeholder="SAVE10" required />
          </FormField>
          <FormField
            label="Type"
            required
            tooltip={
              <>
                <ul className="space-y-1.5">
                  <li><strong>Percent off</strong> — scales with cart size (e.g. 10% off any order).</li>
                  <li><strong>Flat amount</strong> — fixed naira off (e.g. ₦500 off any order).</li>
                </ul>
              </>
            }
          >
            <Select value={type} onValueChange={(v) => v && setType(v as "percent" | "flat")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent off</SelectItem>
                <SelectItem value="flat">Flat amount</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label={type === "percent" ? "Percent" : "Amount"}
            required
            tooltip={type === "percent" ? "How much percent off — usually 5–25%. Watch your margins on the high end." : "How much money off the order, in your business currency."}
          >
            <InputAddon leading={type === "flat" ? "$" : undefined} trailing={type === "percent" ? "%" : undefined}>
              <input type="number" step={type === "percent" ? "1" : "0.01"} placeholder="0" required />
            </InputAddon>
          </FormField>
          <FormField
            label="Description"
            span={3}
            hint="Internal note."
            tooltip="What this code is for — campaign name, channel, who it was negotiated with. Never shown to customers; helps future-you remember why it exists."
          >
            <Textarea placeholder="Eid campaign launch — 10% off any order over ₦5,000." />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Limits" Icon={Users}>
        <FormGrid cols={3}>
          <FormField
            label="Total redemption cap"
            hint="Leave blank for unlimited."
            tooltip="Maximum number of times this code can be used across all customers combined. Useful for first-X-customers-only promos or to protect margin if a code goes viral."
          >
            <Input type="number" placeholder="500" />
          </FormField>
          <FormField
            label="Per customer"
            tooltip="How many times a single customer can use this code. Set to 1 to make it one-time-only per buyer, or higher for repeat-customer rewards."
          >
            <Input type="number" defaultValue={1} />
          </FormField>
          <FormField
            label="Minimum order"
            tooltip="Order must reach this amount before the code is accepted. Helps push customers to larger basket sizes."
          >
            <InputAddon leading="$">
              <input type="number" step="0.01" placeholder="0.00" />
            </InputAddon>
          </FormField>
          <FormField
            label="Audience"
            tooltip={
              <>
                Who can redeem this code.
                <ul className="mt-1.5 list-disc pl-4">
                  <li><strong>New customers</strong> — only people with no prior orders.</li>
                  <li><strong>VIP tier</strong> — your top-tier loyalty members.</li>
                  <li><strong>Wholesale</strong> — B2B accounts on the wholesale price list.</li>
                </ul>
              </>
            }
          >
            <Select defaultValue="all">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                <SelectItem value="new">New customers only</SelectItem>
                <SelectItem value="vip">VIP tier</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Applies to"
            tooltip="What part of the cart the discount affects. Use 'Specific SKU/category' to clear slow-moving stock without discounting your best-sellers."
          >
            <Select defaultValue="cart">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cart">Entire cart</SelectItem>
                <SelectItem value="category">Specific category</SelectItem>
                <SelectItem value="brand">Specific brand</SelectItem>
                <SelectItem value="sku">Specific SKU</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Schedule" Icon={CalendarDays}>
        <FormGrid cols={2}>
          <FormField
            label="Starts"
            tooltip="When the code becomes redeemable. Leave blank to make it live the moment you save."
          >
            <Input type="datetime-local" />
          </FormField>
          <FormField
            label="Ends"
            tooltip="Last moment the code works. Leave blank to keep it live indefinitely (be careful — it won't expire on its own)."
          >
            <Input type="datetime-local" />
          </FormField>
          <FormField span={2}>
            <SwitchField
              label="Combine with other discounts"
              description="Lets customers stack this code on top of automatic price-list discounts (e.g. a VIP getting 10% always, plus 10% from this code = 20%). Off = the higher discount wins."
            />
          </FormField>
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
