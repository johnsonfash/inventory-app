import * as React from "react"
import { toast } from "sonner"
import { Bell, Calendar, Languages, Palette, Smartphone } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { SwitchField } from "@/components/forms/switch-field"
import { useTWTheme } from "@/components/tw-theme-provider"

export default function Preferences() {
  const { theme, setTheme } = useTWTheme()
  const [submitting, setSubmitting] = React.useState(false)

  return (
    <FormShell
      title="Preferences"
      description="Per-account display, locale, and behaviour settings."
      titleTooltip={
        <>
          Personal tweaks that only affect <em>your</em> view of
          Pallio — colour theme, date format, default landing page,
          keyboard shortcuts. Other team members keep their own
          preferences; nothing here changes the business setup.
        </>
      }
      backHref="/settings"
      onSubmit={async () => {
        setSubmitting(true)
        try {
          await new Promise((r) => setTimeout(r, 400))
          toast.success("Preferences saved.")
        } catch {
          toast.error("Couldn't save preferences — try again.")
        } finally {
          setSubmitting(false)
        }
      }}
      aside={
        <FormAside
          tips={[
            { title: "Theme", body: "System follows your OS appearance. Light/Dark forces a single mode.", Icon: Palette },
            { title: "Locale", body: "Formats dates, numbers, and currency throughout the app.", Icon: Languages },
            { title: "Push", body: "Mobile push requires installing Pallio as a PWA.", Icon: Smartphone },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save preferences" submitting={submitting} cancelHref="/settings" />}
    >
      <FormSection title="Appearance" description="Theme and density" Icon={Palette}>
        <FormGrid cols={2}>
          <FormField label="Theme">
            <Select value={theme} onValueChange={(v) => v && setTheme(v as "light" | "dark" | "system")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Density">
            <Select defaultValue="comfortable">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField span={2}>
            <SwitchField
              label="Reduce motion"
              description="Disable spring animations and route transitions. Useful on slower hardware."
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Locale" description="How dates, numbers, and money are shown" Icon={Languages}>
        <FormGrid cols={3}>
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
          <FormField label="First day of week">
            <Select defaultValue="mon">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mon">Monday</SelectItem>
                <SelectItem value="sun">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Notifications" description="Quick toggles — finer control in Settings → Notifications" Icon={Bell}>
        <div className="flex flex-col gap-2.5">
          <SwitchField label="Email notifications" description="Daily digest of unread alerts." defaultChecked />
          <SwitchField label="Mobile push" description="Real-time alerts on installed Pallio apps." defaultChecked />
          <SwitchField label="Desktop browser notifications" description="Native browser pop-ups while a tab is open." />
        </div>
      </FormSection>

      <FormSection title="Calendar" description="When and how Pallio schedules things" Icon={Calendar}>
        <FormGrid cols={2}>
          <FormField label="Default appointment length">
            <Select defaultValue="30">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Slot increment">
            <Select defaultValue="15">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>
    </FormShell>
  )
}
