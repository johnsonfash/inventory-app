import * as React from "react"
import { toast } from "sonner"
import { Bell, Mail, Monitor, Smartphone } from "lucide-react"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { SwitchField } from "@/components/forms/switch-field"

type Channel = "email" | "push" | "desktop"
const CHANNELS: { value: Channel; label: string; Icon: typeof Mail }[] = [
  { value: "email", label: "Email", Icon: Mail },
  { value: "push", label: "Push", Icon: Smartphone },
  { value: "desktop", label: "Desktop", Icon: Monitor },
]

type Topic = {
  key: string
  label: string
  description: string
  defaults: Record<Channel, boolean>
}

const TOPICS: { group: string; items: Topic[] }[] = [
  {
    group: "Inventory",
    items: [
      { key: "low-stock", label: "Low stock alerts", description: "When an item dips below its reorder point.", defaults: { email: true, push: true, desktop: true } },
      { key: "oos", label: "Out of stock", description: "When stock hits zero.", defaults: { email: true, push: true, desktop: true } },
      { key: "expiry", label: "Approaching expiry", description: "Batch expiry within 30 days.", defaults: { email: true, push: false, desktop: false } },
    ],
  },
  {
    group: "Sales & POS",
    items: [
      { key: "order", label: "New orders", description: "Each new sales order created.", defaults: { email: false, push: true, desktop: true } },
      { key: "refund", label: "Refunds + returns", description: "When a customer files a return.", defaults: { email: true, push: true, desktop: true } },
      { key: "void", label: "Voided transactions", description: "Cashier voids a POS sale before completion.", defaults: { email: false, push: false, desktop: true } },
    ],
  },
  {
    group: "Purchasing",
    items: [
      { key: "po-received", label: "PO received", description: "Vendor marks a PO as delivered.", defaults: { email: true, push: true, desktop: true } },
      { key: "po-overdue", label: "PO overdue", description: "An open PO passes its expected date.", defaults: { email: true, push: true, desktop: false } },
    ],
  },
  {
    group: "Billing",
    items: [
      { key: "invoice-due", label: "Invoice due soon", description: "Customer invoices coming due in 3 days.", defaults: { email: true, push: false, desktop: false } },
      { key: "bill-due", label: "Vendor bill due", description: "Bills owed by us coming due.", defaults: { email: true, push: false, desktop: false } },
    ],
  },
  {
    group: "System",
    items: [
      { key: "announcements", label: "Product updates", description: "New features and release notes.", defaults: { email: true, push: false, desktop: false } },
      { key: "maintenance", label: "Scheduled maintenance", description: "Heads-up before planned downtime.", defaults: { email: true, push: true, desktop: true } },
    ],
  },
]

export default function NotificationSettings() {
  const [matrix, setMatrix] = React.useState<Record<string, Record<Channel, boolean>>>(() => {
    const m: Record<string, Record<Channel, boolean>> = {}
    for (const g of TOPICS) for (const t of g.items) m[t.key] = { ...t.defaults }
    return m
  })
  const [submitting, setSubmitting] = React.useState(false)

  const set = (topic: string, channel: Channel, v: boolean) =>
    setMatrix((p) => ({ ...p, [topic]: { ...p[topic]!, [channel]: v } }))

  return (
    <FormShell
      title="Notification settings"
      description="Pick the events you want to hear about, and how."
      titleTooltip={
        <>
          Granular control over which events trigger which channels
          (email, SMS, push, in-app). Quiet hours pause everything
          except critical alerts. Tune this down once your team grows
          — too many pings is the fastest way to make people ignore
          all of them.
        </>
      }
      backHref="/settings"
      onSubmit={async () => {
        setSubmitting(true)
        try {
          await new Promise((r) => setTimeout(r, 400))
          toast.success("Notification preferences saved.")
        } catch {
          toast.error("Couldn't save notification preferences — try again.")
        } finally {
          setSubmitting(false)
        }
      }}
      aside={
        <FormAside
          tips={[
            { title: "Channels", body: "Each event can fire on email, push, and/or desktop independently.", Icon: Bell },
            { title: "Mobile push", body: "Requires installing Pallio as a PWA or a Capacitor app.", Icon: Smartphone },
            { title: "Desktop", body: "Browser notification permission must be granted in your OS.", Icon: Monitor },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save notification preferences" submitting={submitting} cancelHref="/settings" />}
    >
      {TOPICS.map((g) => (
        <FormSection key={g.group} title={g.group} Icon={Bell}>
          {/* Channel header */}
          <div className="mb-1 hidden grid-cols-[1fr_repeat(3,80px)] items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <span />
            {CHANNELS.map((c) => (
              <span key={c.value} className="text-center">
                {c.label}
              </span>
            ))}
          </div>
          <ul className="divide-y divide-border">
            {g.items.map((t) => (
              <li key={t.key} className="grid items-center gap-2 py-3 md:grid-cols-[1fr_repeat(3,80px)]">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 md:contents">
                  {CHANNELS.map((c) => (
                    <div key={c.value} className="flex flex-col items-center gap-1 md:gap-0">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:hidden">
                        {c.label}
                      </span>
                      <SwitchToggle
                        checked={matrix[t.key]?.[c.value] ?? false}
                        onChange={(v) => set(t.key, c.value, v)}
                      />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </FormSection>
      ))}

      <FormSection title="Quiet hours" description="Pause non-critical notifications overnight" Icon={Smartphone}>
        <SwitchField
          label="Enable quiet hours"
          description="Mute push + desktop alerts between 10pm and 7am (your timezone)."
          defaultChecked
        />
      </FormSection>
    </FormShell>
  )
}

// A minimal toggle reusable inline. Matches Switch styling.
function SwitchToggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="relative h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-brand peer-checked:dark:bg-primary">
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  )
}
