import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  Bell,
  Camera,
  Globe,
  Languages,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User2,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { SwitchField } from "@/components/forms/switch-field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar } from "@/components/avatar"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"

// Personal "My profile" page — distinct from the team-admin view at
// /settings/users/:id. That one is where managers edit *someone
// else's* role + permissions. This one is the signed-in user's own
// account: their name, photo, contact, language, notification
// preferences. Mirrors the user-menu items so the popover can deep-
// link to a sane destination.

const ME = {
  name: "Mia Chen",
  email: "mia@funkeapparel.com",
  phone: "+234 803 555 0119",
  role: "Manager",
  joinedYear: 2024,
}

export default function ProfilePage() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))
  const [saving, setSaving] = React.useState(false)

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success("Profile updated.")
    }, 500)
  }

  return (
    <PageShell
      title="My profile"
      withToolbar={false}
      titleTooltip={
        <>
          Your personal account inside Pallio — avatar, name,
          contact, language, notification preferences, security. For
          business-wide settings (logo, tax ID, currency), head to
          Settings → Business details.
        </>
      }
    >
      <form onSubmit={onSave} className="flex flex-col gap-4">
        {/* Hero — avatar + name + role + change-photo */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-brand/25 via-fuchsia-500/15 to-transparent blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-4">
            <div className="relative">
              <Avatar
                seed={ME.email}
                name={ME.name}
                size={88}
                className="ring-4 ring-card shadow-lg shadow-brand/20"
              />
              <button
                type="button"
                disabled
                aria-label="Change photo"
                title="Photo upload arrives with the backend."
                className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-60 shadow-md"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight">{ME.name}</h2>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{ME.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand dark:bg-primary/15 dark:text-primary">
                  {ME.role}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Member since {ME.joinedYear}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Personal info */}
        <FormSection title="Personal info" description="How Pallio addresses you and reaches you." Icon={User2}>
          <FormGrid cols={2}>
            <FormField
              label="Full name"
              required
              tooltip="The name shown on receipts you ring up, on the team roster, and in shared chat. Use your real name so customers know who they're talking to."
            >
              <Input defaultValue={ME.name} required />
            </FormField>
            <FormField
              label="Email"
              required
              tooltip="Used for sign-in + receipts of your own actions. Changing it is the only way to switch the account this avatar belongs to."
            >
              <Input type="email" defaultValue={ME.email} required />
            </FormField>
            <FormField
              label="Phone"
              tooltip="Used for SMS sign-in codes + on-call alerts. Pallio never shares this with customers."
            >
              <Input type="tel" defaultValue={ME.phone} />
            </FormField>
            <FormField
              label="Role"
              tooltip="Set by an Owner or Manager. To change roles, ask whoever invited you, or open Settings → Users & Roles."
            >
              <Input defaultValue={ME.role} disabled />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Locale */}
        <FormSection title="Locale" description="Language, time zone, regional defaults." Icon={Globe}>
          <FormGrid cols={3}>
            <FormField label="Language" tooltip="Translates the Pallio interface for you. Reports + invoices still use your business default.">
              <Select defaultValue="en">
                <SelectTrigger>
                  <span className="inline-flex items-center gap-2"><Languages className="h-3.5 w-3.5 text-muted-foreground" /><SelectValue /></span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="yo">Yoruba</SelectItem>
                  <SelectItem value="ig">Igbo</SelectItem>
                  <SelectItem value="ha">Hausa</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Time zone" tooltip="Pallio shows dates + times in this zone for you specifically. Other team members see their own zone.">
              <Select defaultValue="africa-lagos">
                <SelectTrigger>
                  <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><SelectValue /></span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="africa-lagos">Africa / Lagos (WAT)</SelectItem>
                  <SelectItem value="africa-accra">Africa / Accra (GMT)</SelectItem>
                  <SelectItem value="africa-nairobi">Africa / Nairobi (EAT)</SelectItem>
                  <SelectItem value="europe-london">Europe / London</SelectItem>
                  <SelectItem value="us-eastern">US Eastern</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Currency display" tooltip="Override the business default — useful if you want to see prices in your home currency for personal reference.">
              <Select defaultValue="business">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Match business currency</SelectItem>
                  <SelectItem value="NGN">NGN — Naira</SelectItem>
                  <SelectItem value="USD">USD — Dollar</SelectItem>
                  <SelectItem value="GBP">GBP — Pound</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Notifications */}
        <FormSection title="Notifications" description="What Pallio is allowed to interrupt you about." Icon={Bell}>
          <div className="flex flex-col gap-2.5">
            <SwitchField
              label="Email notifications"
              description="Sales receipts of your own actions, mentions in chat, weekly summary."
              defaultChecked
            />
            <SwitchField
              label="Push notifications"
              description="Stock alerts + new orders. Requires the Pallio mobile app installed."
              defaultChecked
            />
            <SwitchField
              label="Low-stock alerts"
              description="Pings you when any item dips below its reorder point."
              defaultChecked
            />
            <SwitchField
              label="Daily digest"
              description="One end-of-day summary email (sales, refunds, low stock). Off by default — turn it on if you prefer batched updates over real-time pings."
            />
            <SwitchField
              label="Marketing tips from Pallio"
              description="Occasional emails on new features + best practice. Easy to unsubscribe."
            />
          </div>
        </FormSection>

        {/* Connected accounts — quick view + connect Google. The
            full management UI (Apple / Microsoft / GitHub, disconnect)
            lives in Security; this card surfaces the most common case
            (Google) right inside Profile because that's where users
            look for it first. */}
        <FormSection title="Connected accounts" description="Sign in with Google instead of typing a password every time." Icon={ShieldCheck}>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border" aria-hidden>
              {/* Google "G" wordmark — colour blocks. Avoids shipping the
                  Google logo asset (licensed) while still being
                  recognisable at a glance. */}
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path fill="#4285F4" d="M22 12.2c0-.8-.07-1.4-.2-2H12v3.8h5.6c-.1.9-.7 2.3-2 3.3l-.02.13 2.9 2.25.2.02C20.5 17.9 22 15.3 22 12.2"/>
                <path fill="#34A853" d="M12 22c2.6 0 4.8-.86 6.4-2.34l-3.05-2.36c-.83.58-1.94.98-3.35.98a5.8 5.8 0 0 1-5.5-4l-.11.01-3 2.34-.04.1A10 10 0 0 0 12 22"/>
                <path fill="#FBBC05" d="M6.5 14.28A6 6 0 0 1 6.18 12c0-.8.14-1.56.32-2.28l-.01-.15L3.45 7.2l-.09.05A10 10 0 0 0 2 12c0 1.6.38 3.13 1.06 4.46z"/>
                <path fill="#EA4335" d="M12 5.8c2.04 0 3.42.88 4.2 1.62l3.07-3A9.9 9.9 0 0 0 12 2 10 10 0 0 0 3.06 7.55l3.13 2.43A5.78 5.78 0 0 1 12 5.8"/>
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Google</p>
              <p className="truncate text-[11px] text-muted-foreground">{ME.email} · used for sign-in</p>
            </div>
            <Link to="/settings/security">
              <Button size="sm" variant="outline">Manage</Button>
            </Link>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Apple, Microsoft, and GitHub are also supported. Manage all four in <Link to="/settings/security" className="font-semibold text-brand hover:underline dark:text-primary">Security</Link>.
          </p>
        </FormSection>

        {/* Security shortcuts */}
        <FormSection title="Security" description="Sign-in protection." Icon={ShieldCheck}>
          <div className="grid gap-2 md:grid-cols-2">
            <Link
              to="/settings/security"
              className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Password + 2FA</p>
                <p className="text-[11px] text-muted-foreground">Rotate password, set up authenticator app.</p>
              </div>
            </Link>
            <Link
              to="/settings/notifications"
              className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
            >
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Notification rules</p>
                <p className="text-[11px] text-muted-foreground">Fine-tune which events trigger which channels.</p>
              </div>
            </Link>
            <a
              href={`mailto:${ME.email}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
            >
              <Mail className="h-4 w-4 text-sky-600 dark:text-sky-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Email yourself a recovery link</p>
                <p className="text-[11px] text-muted-foreground">Useful if you ever lose this device.</p>
              </div>
            </a>
            <a
              href={`tel:${ME.phone}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
            >
              <Phone className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Verify phone</p>
                <p className="text-[11px] text-muted-foreground">SMS sign-in works once verified.</p>
              </div>
            </a>
          </div>
        </FormSection>

        {/* Danger zone */}
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">Sign out everywhere</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ends every Pallio session for this account — phone, web, desktop. You'll be prompted to sign in again on each device.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toast.success("Signed out on all devices.")}
            className="mt-3 border-rose-500/40 text-rose-600 dark:text-rose-400"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out everywhere
          </Button>
        </section>

        {/* Save bar — plain in-flow row. The original sticky+negative-
            margin design extended past `<main>`'s padding, broke the
            AppFrame's `overflow-hidden` height contract on desktop,
            and made the whole document scroll (sidebar pushed up,
            blank space below). Regular row scrolls naturally with the
            page. */}
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Link to="/dashboard"><Button type="button" variant="ghost">Cancel</Button></Link>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        </div>
      </form>
    </PageShell>
  )
}
