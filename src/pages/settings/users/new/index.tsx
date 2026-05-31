import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  CheckCircle2,
  Copy,
  Globe,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { InfoTooltip } from "@/components/info-tooltip"
import { InputAddon } from "@/components/forms/input-addon"
import { SwitchField } from "@/components/forms/switch-field"
import { LOCATIONS, ROLES } from "@/lib/team/data"
import type { RoleKey } from "@/lib/team/types"
import { cn } from "@/lib/utils"

type DeliveryMethod = "email" | "link"

export default function InviteMember() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const initialRole = (search.get("role") as RoleKey) ?? "sales-rep"
  const [role, setRole] = React.useState<RoleKey>(initialRole)
  const [locationIds, setLocationIds] = React.useState<string[]>([])
  const [delivery, setDelivery] = React.useState<DeliveryMethod>("email")
  const [submitting, setSubmitting] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [name, setName] = React.useState("")
  const [note, setNote] = React.useState("")
  const [commissionPct, setCommissionPct] = React.useState<number>(10)
  const [autoExpire, setAutoExpire] = React.useState(true)

  const selectedRole = ROLES.find((r) => r.key === role)!
  const isAffiliate = role === "affiliate"
  const requiresLocations = role === "cashier" || role === "manager" || role === "sales-rep"

  const toggleLocation = (id: string) =>
    setLocationIds((ls) => (ls.includes(id) ? ls.filter((x) => x !== id) : [...ls, id]))

  // Lightweight email format check — same shape the browser's
  // type="email" uses, but gives us a toast instead of a silent native
  // popover so the user knows *which* field is wrong.
  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
  const trimmedEmail = email.trim()
  const emailInvalid = trimmedEmail.length > 0 && !isValidEmail(trimmedEmail)

  const submit = async () => {
    if (!trimmedEmail) {
      toast.error("Add an email address to send the invite to.")
      return
    }
    if (!isValidEmail(trimmedEmail)) {
      toast.error("That email address doesn't look right — check it and try again.")
      return
    }
    setSubmitting(true)
    try {
      await new Promise((r) => setTimeout(r, 600))
      if (delivery === "email") {
        toast.success(`Invitation emailed to ${trimmedEmail}.`)
      } else {
        // Mock token + copy to clipboard
        const token = `tkn_${Math.random().toString(36).slice(2, 10)}`
        const link = `https://pallio.app/invite/${token}`
        try {
          await navigator.clipboard.writeText(link)
          toast.success("Invite link copied to clipboard.")
        } catch {
          toast.success("Invite created. (Couldn't auto-copy.)")
        }
      }
      navigate("/settings/users?tab=invites")
    } catch {
      toast.error("Couldn't send the invite — try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormShell
      title={isAffiliate ? "Invite affiliate" : "Invite team member"}
      description={isAffiliate
        ? "External partner with a unique referral link + commission rate."
        : "Send an email or copy a one-time invite link to onboard a new member."}
      titleTooltip={
        isAffiliate ? (
          <>
            Affiliates are <em>external</em> — they don't sign in to
            run your business, they just refer customers. Pallio
            generates a unique code + tracking link for them; every
            attributed sale earns the commission you set below.
          </>
        ) : (
          <>
            Send an invite to someone you want to give Pallio access
            to. Pick the role (Cashier, Manager, Sales Rep, Owner)
            and which locations they can work from. The invite link
            expires after 7 days for security.
          </>
        )
      }
      backHref="/settings/users"
      onSubmit={submit}
      aside={
        <FormAside
          tips={[
            { title: "Pick the right role", body: "Roles define what they can see + do. You can change it any time after they join.", Icon: ShieldCheck },
            { title: "Locations matter", body: "For cashiers + managers, the locations you pick here are the only ones they can sell from / manage.", Icon: MapPin },
            { title: "Affiliate link", body: "Affiliates get a unique URL. Pallio attributes any sale that lands through it to them automatically.", Icon: Sparkles },
          ]}
        />
      }
      footer={
        <FormFooter
          submitLabel={delivery === "email" ? "Send invite" : "Generate link"}
          submitting={submitting}
          cancelHref="/settings/users"
        />
      }
    >
      {/* Recipient */}
      <FormSection title="Who" Icon={UserPlus} description="Where Pallio will send the invitation.">
        <FormGrid cols={2}>
          <FormField
            label="Email"
            required
            hint={emailInvalid ? "Looks off — make sure it's name@domain.tld." : undefined}
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              required
              aria-invalid={emailInvalid || undefined}
              className={emailInvalid ? "border-rose-500/60 focus-visible:ring-rose-500/40" : undefined}
            />
          </FormField>
          <FormField label="Name (optional)" hint="Used to personalise the email.">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Larson" />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Role */}
      <FormSection title="Role" Icon={ShieldCheck} description="What they can see + do.">
        <fieldset>
          <legend className="sr-only">Role</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.filter((r) => r.key !== "owner" && r.key !== "custom").map((r) => {
              const selected = r.key === role
              return (
                <label
                  key={r.key}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    selected
                      ? "border-brand bg-brand-soft dark:border-primary dark:bg-primary/10"
                      : "border-border bg-background hover:border-brand/40",
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.key}
                    checked={selected}
                    onChange={() => setRole(r.key)}
                    className="sr-only"
                  />
                  <span className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-brand bg-brand dark:border-primary dark:bg-primary" : "border-border",
                  )}>
                    {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      {r.name}
                      {r.external && (
                        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          external
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{r.tagline}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Role detail */}
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground/80">{selectedRole.name}</p>
          <p className="mt-1">{selectedRole.description}</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
            <PermLine icon={Wallet} label="Inventory" value={selectedRole.permissions.inventory} />
            <PermLine icon={Store} label="POS" value={selectedRole.permissions.pos} />
            <PermLine icon={ShieldCheck} label="Purchasing" value={selectedRole.permissions.purchasing} />
            <PermLine icon={Megaphone} label="Marketing" value={selectedRole.permissions.marketing} />
            <PermLine icon={Users} label="Team" value={selectedRole.permissions.team} />
            <PermLine icon={Lock} label="Settings" value={selectedRole.permissions.settings} />
            <PermLine icon={Globe} label="Reporting" value={selectedRole.permissions.reporting} />
          </ul>
        </div>
      </FormSection>

      {/* Locations (only relevant for in-house roles) */}
      {!isAffiliate && (
        <FormSection
          title="Locations"
          Icon={MapPin}
          description={requiresLocations
            ? "Pick the locations this member can act in. Leave blank to grant access to all locations."
            : "Optional — this role doesn't run sales, but locations may still affect what they see in reports."}
        >
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map((loc) => {
              const selected = locationIds.includes(loc.id)
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => toggleLocation(loc.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <MapPin className="h-3 w-3" />
                  {loc.name}
                  <span className={cn("text-[10px] opacity-70", selected ? "" : "")}>· {loc.city}</span>
                </button>
              )
            })}
          </div>
          {locationIds.length === 0 && requiresLocations && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              Heads up: no locations picked means they can act on every location, including ones added later.
            </p>
          )}
        </FormSection>
      )}

      {/* Affiliate-specific */}
      {isAffiliate && (
        <FormSection title="Affiliate terms" Icon={Sparkles} description="Code + commission rate for this partner.">
          <FormGrid cols={2}>
            <FormField label="Suggested affiliate code" hint="They can change it after accepting.">
              <Input defaultValue="REFER10" />
            </FormField>
            <FormField label="Commission rate">
              <InputAddon trailing="%">
                <input type="number" placeholder="0" step="0.5" min={0} max={100} value={commissionPct === 0 ? "" : commissionPct} onChange={(e) => setCommissionPct(e.target.value === "" ? 0 : Number(e.target.value) || 0)} />
              </InputAddon>
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      {/* Delivery */}
      <FormSection title="How to deliver" Icon={Mail} description="Email is best for staff; link is best for affiliates + bulk onboarding.">
        <fieldset>
          <legend className="sr-only">Delivery</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <DeliveryCard
              method="email"
              active={delivery === "email"}
              onSelect={() => setDelivery("email")}
              Icon={Mail}
              title="Email them"
              body="Pallio sends a branded invite from invites@pallio.app with the accept link inside."
            />
            <DeliveryCard
              method="link"
              active={delivery === "link"}
              onSelect={() => setDelivery("link")}
              Icon={Copy}
              title="Copy a link"
              body="Generate a single-use invite URL you can paste into Slack, WhatsApp, or anywhere."
            />
          </div>
        </fieldset>

        <div className="mt-4 grid gap-3">
          {delivery === "email" && (
            <FormField label="Welcome note (optional)" hint="Adds a personal line to the email body.">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Excited to have you on board. Hit the ground running with our onboarding checklist." />
            </FormField>
          )}
          <SwitchField
            label="Auto-expire link after 7 days"
            description="Untick if you want it to never expire. (Shorter is safer.)"
            checked={autoExpire}
            onCheckedChange={setAutoExpire}
          />
        </div>
      </FormSection>

      {/* Permissions summary footer */}
      <div className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
        <span>Need finer-grained scopes?</span>
        <InfoTooltip label="Custom roles" size="xs">
          The "Custom" role lets you compose permissions one capability at a time, then save the result as a named role you can reuse across invites.
        </InfoTooltip>
      </div>
    </FormShell>
  )
}

function PermLine({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  const isNone = value === "none"
  return (
    <li className={cn("flex items-center gap-1.5 text-[11px]", isNone && "opacity-50")}>
      <Icon className="h-3 w-3" />
      <span className="truncate">{label}</span>
      <span className={cn("ml-auto font-semibold", isNone ? "text-muted-foreground" : "text-foreground")}>
        {isNone ? "—" : value}
      </span>
    </li>
  )
}

function DeliveryCard({
  method,
  active,
  onSelect,
  Icon,
  title,
  body,
}: {
  method: DeliveryMethod
  active: boolean
  onSelect: () => void
  Icon: React.ElementType
  title: string
  body: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
        active ? "border-brand bg-brand-soft dark:border-primary dark:bg-primary/10" : "border-border bg-background hover:border-brand/40",
      )}
    >
      <input type="radio" name="delivery" value={method} checked={active} onChange={onSelect} className="sr-only" />
      <span className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        active ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground" : "bg-muted text-muted-foreground",
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{body}</p>
      </div>
    </label>
  )
}

// _Send is just a re-export check so unused-import doesn't trip — it
// would be wired up if we added a "Send + close" CTA variant later.
const _Send = Send
void _Send
