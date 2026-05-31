import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ShieldCheck, Sparkles } from "lucide-react"
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

const PERMISSION_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "Inventory",
    items: [
      { key: "inventory.read", label: "View items + stock" },
      { key: "inventory.write", label: "Create / edit items + adjust stock" },
      { key: "inventory.delete", label: "Delete items" },
    ],
  },
  {
    group: "POS + Sales",
    items: [
      { key: "pos.use", label: "Run POS sales" },
      { key: "pos.void", label: "Void / refund completed transactions" },
      { key: "sales.read", label: "View sales orders + invoices" },
      { key: "sales.write", label: "Create / edit sales orders + invoices" },
    ],
  },
  {
    group: "Purchasing",
    items: [
      { key: "purchasing.read", label: "View POs + bills + vendors" },
      { key: "purchasing.write", label: "Create / edit POs + bills" },
    ],
  },
  {
    group: "Reports + Settings",
    items: [
      { key: "reports.read", label: "View reports" },
      { key: "reports.export", label: "Export CSV / PDF" },
      { key: "settings.access", label: "Open Settings" },
      { key: "settings.users", label: "Manage users + roles" },
      { key: "settings.billing", label: "Manage billing + payment processors" },
    ],
  },
]

const PRESETS = {
  blank: {} as Record<string, boolean>,
  admin: Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.items.map((p) => [p.key, true]))) as Record<string, boolean>,
  manager: {
    "inventory.read": true,
    "inventory.write": true,
    "pos.use": true,
    "pos.void": true,
    "sales.read": true,
    "sales.write": true,
    "purchasing.read": true,
    "purchasing.write": true,
    "reports.read": true,
    "reports.export": true,
    "settings.access": true,
  } as Record<string, boolean>,
  viewer: {
    "inventory.read": true,
    "sales.read": true,
    "purchasing.read": true,
    "reports.read": true,
  } as Record<string, boolean>,
}

export default function NewRole() {
  const navigate = useNavigate()
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>(PRESETS.blank)
  const [submitting, setSubmitting] = React.useState(false)

  const grantedCount = Object.values(permissions).filter(Boolean).length

  return (
    <FormShell
      title="New role"
      description="Group permissions into a reusable scope that you can assign to users."
      titleTooltip={
        <>
          A named bundle of permissions (e.g. "Floor manager",
          "Affiliate", "Bookkeeper"). Build the bundle once, then
          assign the role to as many team members as you like — they
          all inherit the same access. Easier than ticking every
          permission per person.
        </>
      }
      backHref="/settings/roles"
      onSubmit={async () => {
        setSubmitting(true)
        try {
          await new Promise((r) => setTimeout(r, 500))
          toast.success("Role saved.")
          navigate("/settings/roles")
        } catch {
          toast.error("Couldn't save role — try again.")
        } finally {
          setSubmitting(false)
        }
      }}
      aside={
        <FormAside
          tips={[
            { title: "Presets", body: "Start from Admin, Manager, or Viewer to save time — then tweak.", Icon: Sparkles },
            { title: "Granted", body: `${grantedCount} of ${PERMISSION_GROUPS.flatMap((g) => g.items).length} permissions selected.`, Icon: ShieldCheck },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save role" submitting={submitting} cancelHref="/settings/roles" />}
    >
      <FormSection title="Identity" Icon={ShieldCheck}>
        <FormGrid cols={2}>
          <FormField label="Role name" required>
            <Input placeholder="Floor Lead" required />
          </FormField>
          <FormField label="Starting preset" hint="Quickly seed the permission matrix.">
            <Select
              defaultValue="blank"
              onValueChange={(v) => {
                const next = PRESETS[v as keyof typeof PRESETS] ?? PRESETS.blank
                setPermissions({ ...next })
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Blank</SelectItem>
                <SelectItem value="admin">Admin (all permissions)</SelectItem>
                <SelectItem value="manager">Manager (most permissions)</SelectItem>
                <SelectItem value="viewer">Viewer (read-only)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Description" span={2}>
            <Textarea placeholder="What this role is for — appears under the role name in the user list." />
          </FormField>
        </FormGrid>
      </FormSection>

      {PERMISSION_GROUPS.map((g) => (
        <FormSection key={g.group} title={g.group} Icon={ShieldCheck}>
          <div className="space-y-1.5">
            {g.items.map((p) => (
              <SwitchField
                key={p.key}
                label={p.label}
                description={p.key}
                checked={!!permissions[p.key]}
                onCheckedChange={(v) => setPermissions((prev) => ({ ...prev, [p.key]: v }))}
              />
            ))}
          </div>
        </FormSection>
      ))}
    </FormShell>
  )
}
