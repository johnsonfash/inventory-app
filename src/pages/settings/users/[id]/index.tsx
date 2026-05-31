import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import {
  Activity,
  ArrowLeft,
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Edit3,
  Globe,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { InfoTooltip } from "@/components/info-tooltip"
import { EmptyState } from "@/components/lists/empty-state"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import {
  ROLE_BY_KEY,
  getMemberById,
  locationsForMember,
  sessionsForMember,
} from "@/lib/team/data"
import type { RoleKey } from "@/lib/team/types"
import { cn } from "@/lib/utils"
import { useCurrency, formatPriceFor } from "@/contexts/currency"

const ROLE_TONE: Record<RoleKey, StatusTone> = {
  owner: "brand",
  manager: "info",
  cashier: "success",
  "sales-rep": "warning",
  marketer: "info",
  affiliate: "warning",
  viewer: "neutral",
  custom: "neutral",
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("")
}
function avatarTint(name: string): string {
  const palette = [
    "bg-brand/15 text-brand dark:bg-primary/20 dark:text-primary",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palette[h % palette.length]!
}
function rel(iso?: string): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.round(d / 30)
  return `${mo}mo ago`
}

// Mock activity entries for the timeline. In a real backend these
// would come from an audit log filtered by memberId.
const ACTIVITY_BY_MEMBER: Record<string, { text: string; minutesAgo: number; kind: "sale" | "edit" | "auth" | "refund" }[]> = {
  "m-1": [
    { text: `Closed sale INV-2174 (${formatPriceFor(120)} — Aisha N.)`, minutesAgo: 2,   kind: "sale" },
    { text: "Edited stock on EL-2109 (+24)",          minutesAgo: 60,  kind: "edit" },
    { text: "Signed in from MacBook · Chrome",        minutesAgo: 120, kind: "auth" },
    { text: `Refunded RT-118 (${formatPriceFor(24)})`,                  minutesAgo: 540, kind: "refund" },
  ],
  "m-2": [
    { text: `Closed sale INV-2168 (${formatPriceFor(86)} — Wholesale)`, minutesAgo: 45, kind: "sale" },
    { text: "Added customer BrightLane",              minutesAgo: 200,kind: "edit" },
  ],
}

export default function MemberDetail() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const id = params.id ?? ""
  const member = getMemberById(id)
  const { formatPrice } = useCurrency()
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))

  // Local UI state for the action-button confirm dialogs. Member mutations
  // are mock-only until the backend lands — `localStatus` lets the suspend /
  // reinstate flow visibly toggle without backend persistence.
  const [editOpen, setEditOpen] = React.useState(false)
  const [resetOpen, setResetOpen] = React.useState(false)
  const [suspendOpen, setSuspendOpen] = React.useState(false)
  const [removeOpen, setRemoveOpen] = React.useState(false)
  const [revokeSessionId, setRevokeSessionId] = React.useState<string | null>(null)
  const [revokedSessionIds, setRevokedSessionIds] = React.useState<Set<string>>(() => new Set())
  const [localStatus, setLocalStatus] = React.useState<import("@/lib/team/types").MemberStatus | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editEmail, setEditEmail] = React.useState("")

  if (!member) {
    return (
      <PageShell title="Member" withToolbar={false}>
        <Card>
          <CardContent>
            <EmptyState
              Icon={Users}
              title="Member not found"
              description="They might have been removed or the link is stale."
              action={<Link to="/settings/users"><Button>Back to team</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const role = ROLE_BY_KEY[member.role]
  const locations = locationsForMember(member)
  const sessions = sessionsForMember(member.id)
  const activity = ACTIVITY_BY_MEMBER[member.id] ?? []
  const isAffiliate = member.role === "affiliate"
  const effectiveStatus = localStatus ?? member.status

  const copyAffiliateLink = async () => {
    if (!member.affiliateCode) return
    const link = `https://pallio.app/r/${member.affiliateCode}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success("Referral link copied")
    } catch {
      toast.error("Couldn't copy")
    }
  }

  const firstName = member.name.split(" ")[0]
  const confirmReset = () => {
    toast.success("Password reset link sent", { description: `Emailed to ${member.email}` })
    setResetOpen(false)
  }
  const confirmSuspend = () => {
    const next = effectiveStatus === "suspended" ? "active" : "suspended"
    setLocalStatus(next)
    toast.success(next === "suspended" ? `${firstName} suspended` : `${firstName} reinstated`)
    setSuspendOpen(false)
  }
  const confirmRemove = () => {
    toast.success(`${firstName} removed from team`)
    setRemoveOpen(false)
    navigate("/settings/users")
  }
  const confirmRevoke = () => {
    if (!revokeSessionId) return
    setRevokedSessionIds((prev) => {
      const next = new Set(prev)
      next.add(revokeSessionId)
      return next
    })
    toast.success("Session revoked")
    setRevokeSessionId(null)
  }
  const openEdit = () => {
    setEditName(member.name)
    setEditEmail(member.email)
    setEditOpen(true)
  }
  const confirmEdit = () => {
    if (!editName.trim()) return
    toast.success("Member updated", { description: editName.trim() })
    setEditOpen(false)
  }

  return (
    <PageShell
      title={member.name}
      withToolbar={false}
      titleTooltip={
        <>
          Admin view of one team member — role, locations they can
          access, permission overrides, active sessions, audit
          history. For <em>your own</em> profile (name, photo,
          email), use Settings → Profile instead.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Link to="/settings/users" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All team
        </Link>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-emerald-50/40 p-5 dark:from-primary/10 dark:to-emerald-950/15">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/20 blur-3xl dark:bg-primary/20" aria-hidden />
          <div className="relative flex flex-wrap items-start gap-4">
            <span className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold", avatarTint(member.name))}>
              {initials(member.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">{member.name}</h2>
                <StatusBadge tone={ROLE_TONE[member.role]}>{role.name}</StatusBadge>
                {effectiveStatus === "suspended" && (
                  <StatusBadge tone="danger" withDot>suspended</StatusBadge>
                )}
                {isAffiliate && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    external
                  </span>
                )}
              </div>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {member.email}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Joined {rel(member.joinedAt)} · last active {rel(member.lastActiveAt)}
              </p>
              {locations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {locations.map((l) => (
                    <span key={l.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px]">
                      <MapPin className="h-2.5 w-2.5" /> {l.name} · {l.city}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAffiliate && (
                <Button size="sm" variant="outline" onClick={copyAffiliateLink}>
                  <Copy className="h-3.5 w-3.5" /> Referral link
                </Button>
              )}
              <Link to="/sales/team/chat">
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-3.5 w-3.5" /> Message
                </Button>
              </Link>
              <Button size="sm" onClick={openEdit}>
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <SummaryStrip
          tiles={
            isAffiliate
              ? [
                  { label: "Referral clicks", value: (member.affiliateClicks ?? 0).toLocaleString(), tone: "info",    hint: "all-time" },
                  { label: "MTD sales",       value: formatPrice(member.mtdSalesUsd ?? 0), tone: "brand",   hint: "attributed" },
                  { label: "Commission",      value: formatPrice(member.mtdCommissionUsd ?? 0), tone: "success", hint: "this month" },
                  { label: "Code",            value: member.affiliateCode ?? "—", tone: "warning", hint: "their link" },
                ]
              : [
                  { label: "MTD sales",       value: formatPrice(member.mtdSalesUsd ?? 0), tone: "brand",   hint: "this month" },
                  { label: "Commission",      value: formatPrice(member.mtdCommissionUsd ?? 0), tone: "success", hint: "at current rate" },
                  { label: "Sessions",        value: String(sessions.length), tone: "info", hint: "active devices" },
                  { label: "Status",          value: effectiveStatus, tone: effectiveStatus === "active" ? "success" : "danger", hint: "" },
                ]
          }
        />

        {/* 2-col layout: permissions + activity */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          {/* Permissions */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-sm font-semibold md:text-base">Permissions</h3>
              <InfoTooltip label="Permissions" size="xs">
                Summary of what {member.name.split(" ")[0]} can see and do in Pallio.
                Edit via Settings → Roles → {role.name}, or change their role above.
              </InfoTooltip>
            </div>
            <p className="text-[11px] text-muted-foreground">{role.tagline}</p>

            <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <PermissionTile Icon={ShoppingCart} label="POS"        value={role.permissions.pos} />
              <PermissionTile Icon={CreditCard}   label="Inventory"  value={role.permissions.inventory} />
              <PermissionTile Icon={ShieldCheck}  label="Purchasing" value={role.permissions.purchasing} />
              <PermissionTile Icon={Globe}        label="Reporting"  value={role.permissions.reporting} />
              <PermissionTile Icon={Megaphone}    label="Marketing"  value={role.permissions.marketing} />
              <PermissionTile Icon={Users}        label="Team"       value={role.permissions.team} />
              <PermissionTile Icon={Lock}         label="Settings"   value={role.permissions.settings} className="col-span-2" />
            </ul>

            <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
              {role.description}
            </p>
          </section>

          {/* Activity */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-sm font-semibold md:text-base">Recent activity</h3>
              <InfoTooltip label="Activity" size="xs">
                Last actions {member.name.split(" ")[0]} took. The full
                audit trail (every sign-in, edit, sale, refund, permission
                change) lands when the backend ships.
              </InfoTooltip>
            </div>
            {activity.length === 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">No recorded activity yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {activity.map((e, idx) => {
                  const Icon = e.kind === "sale" ? ShoppingCart : e.kind === "refund" ? CreditCard : e.kind === "auth" ? Smartphone : Edit3
                  const tone = e.kind === "sale" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : e.kind === "refund" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    : e.kind === "auth" ? "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  return (
                    <li key={idx} className="flex items-start gap-3">
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tone)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-relaxed">{e.text}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{rel(new Date(Date.now() - e.minutesAgo * 60_000).toISOString())}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Commission rate — only for roles that earn commission */}
        {(isAffiliate || member.role === "marketer" || member.role === "manager") && (
          <CommissionSettings member={member} isAffiliate={isAffiliate} />
        )}

        {/* Sessions */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-sm font-semibold md:text-base">Sessions</h3>
            <InfoTooltip label="Sessions" size="xs">
              Devices currently signed in as {member.name.split(" ")[0]}. Revoke anything you don't recognise.
            </InfoTooltip>
          </div>
          {sessions.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No active sessions.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {sessions.map((s) => {
                const Device = s.device.toLowerCase().includes("iphone") || s.device.toLowerCase().includes("android") ? Smartphone : Activity
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Device className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.device}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.approxLocation && <>{s.approxLocation} · </>} last seen {rel(s.lastSeenAt)}
                      </p>
                    </div>
                    {s.current ? (
                      <StatusBadge tone="success" withDot>this device</StatusBadge>
                    ) : revokedSessionIds.has(s.id) ? (
                      <StatusBadge tone="neutral">revoked</StatusBadge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 dark:text-rose-400"
                        onClick={() => setRevokeSessionId(s.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">Manage access</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Use these with care — both immediately revoke {member.name.split(" ")[0]}'s ability to use Pallio.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setResetOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Reset password
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSuspendOpen(true)}>
              {effectiveStatus === "suspended" ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Reinstate</>
              ) : (
                <><Award className="h-3.5 w-3.5" /> Suspend</>
              )}
            </Button>
            <Button size="sm" variant="outline" className="border-rose-500/40 text-rose-600 dark:text-rose-400" onClick={() => setRemoveOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Remove from team
            </Button>
          </div>
        </section>

        {/* Spacer / future-feature note */}
        <p className="text-[10px] text-muted-foreground">
          <CalendarDays className="mr-1 inline h-3 w-3" />
          Full audit log + permission change history land with the real backend.
        </p>
      </div>

      {/* Edit member */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>
              Update {firstName}'s name or email. To change their role, use the role picker on the access section.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-foreground/80">Name</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-foreground/80">Email</span>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={confirmEdit} disabled={!editName.trim()}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send password reset link?</DialogTitle>
            <DialogDescription>
              {firstName} will receive an email at <strong>{member.email}</strong> with a link to set a new password. Active sessions stay signed in until they sign out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={confirmReset}>Send reset link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / reinstate */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {effectiveStatus === "suspended" ? `Reinstate ${firstName}?` : `Suspend ${firstName}?`}
            </DialogTitle>
            <DialogDescription>
              {effectiveStatus === "suspended"
                ? `${firstName} will regain access to Pallio immediately.`
                : `${firstName} will be signed out of every device and blocked from signing in until reinstated.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button
              variant={effectiveStatus === "suspended" ? "default" : "destructive"}
              onClick={confirmSuspend}
            >
              {effectiveStatus === "suspended" ? "Reinstate" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from team */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {firstName} from the team?</DialogTitle>
            <DialogDescription>
              This permanently revokes {firstName}'s access. Past sales, invoices, and audit entries are preserved under their name.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke session */}
      <Dialog open={revokeSessionId !== null} onOpenChange={(v) => !v && setRevokeSessionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this session?</DialogTitle>
            <DialogDescription>
              The device will be signed out immediately. {firstName} can sign back in with their credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeSessionId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRevoke}>Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

function PermissionTile({
  Icon,
  label,
  value,
  className,
}: {
  Icon: React.ElementType
  label: string
  value: string
  className?: string
}) {
  const isNone = value === "none"
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2",
        isNone && "opacity-60",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold capitalize">{isNone ? "No access" : value}</p>
      </div>
    </li>
  )
}

// Per-person commission rate settings — affiliates earn % of attributed
// sales, sales-managers + marketers earn % of branch / campaign revenue.
// Pallio supports a base rate + per-category overrides + a one-off
// performance bonus pool.
type CommissionMember = {
  name: string
  email: string
  role: string
  affiliateCode?: string
}

function CommissionSettings({ member, isAffiliate }: { member: CommissionMember; isAffiliate: boolean }) {
  // Local state seeded from "what the backend would return". Sales
  // roles default to 5%, affiliates to 10%.
  const [baseRate, setBaseRate] = React.useState(isAffiliate ? 10 : 5)
  const [overrides, setOverrides] = React.useState<Array<{ category: string; rate: number }>>(
    isAffiliate
      ? [
          { category: "Apparel",      rate: 12 },
          { category: "Beauty",       rate: 15 },
          { category: "Wholesale",    rate:  4 },
        ]
      : [
          { category: "Apparel",      rate: 7 },
          { category: "Electronics",  rate: 4 },
        ],
  )
  const [bonusPool, setBonusPool]   = React.useState(0)
  const [excludeRefunds, setExcludeRefunds] = React.useState(true)
  const [waitDays, setWaitDays] = React.useState(7)

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold md:text-base">Commission settings</h3>
          <p className="text-[11px] text-muted-foreground">
            What {member.name.split(" ")[0]} earns per attributable sale. Changes apply to <strong>future</strong> orders only — past commissions stay at their original rate.
          </p>
        </div>
        <Button size="sm" onClick={() => toast.success(`${member.name.split(" ")[0]}'s commission settings saved.`)}>
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
      </div>

      {/* Base rate + bonus pool */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Base rate</span>
            <span className="text-xl font-bold tabular-nums">{baseRate}%</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Applied to every attributable sale unless a category override below kicks in.</p>
          <input
            type="range"
            min={0}
            max={isAffiliate ? 30 : 15}
            step={0.5}
            value={baseRate}
            onChange={(e) => setBaseRate(parseFloat(e.target.value))}
            className="mt-2.5 w-full accent-brand dark:accent-primary"
          />
          <div className="flex justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
            <span>0%</span><span>{isAffiliate ? "30%" : "15%"}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Performance bonus pool</span>
            <span className="text-base font-bold tabular-nums">{bonusPool > 0 ? `₦${bonusPool.toLocaleString()}` : "Off"}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">One-off lump sum paid alongside the next commission payout. Approve in <Link to="/accounting/commissions" className="font-semibold text-brand hover:underline dark:text-primary">Commission Payouts</Link>.</p>
          <input
            type="number"
            min={0}
            step={10000}
            value={bonusPool === 0 ? "" : bonusPool}
            onChange={(e) => setBonusPool(e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value || "0", 10)))}
            placeholder="0"
            className="mt-2.5 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Category overrides */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category overrides</p>
          <button
            type="button"
            onClick={() => setOverrides([...overrides, { category: "", rate: baseRate }])}
            className="text-[11px] font-semibold text-brand hover:underline dark:text-primary"
          >
            + Add override
          </button>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Earn more on high-margin categories, less on bulk / wholesale. Empty list = base rate applies everywhere.</p>
        {overrides.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {overrides.map((o, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <select
                  value={o.category}
                  onChange={(e) => setOverrides(overrides.map((x, idx) => idx === i ? { ...x, category: e.target.value } : x))}
                  className="min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus:border-brand"
                >
                  {["Apparel", "Beauty", "Electronics", "Home & lifestyle", "Wholesale", "Food & dining", "Services", "Auto"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="0"
                    min={0}
                    max={50}
                    step={0.5}
                    value={o.rate === 0 ? "" : o.rate}
                    onChange={(e) => setOverrides(overrides.map((x, idx) => idx === i ? { ...x, rate: e.target.value === "" ? 0 : parseFloat(e.target.value || "0") } : x))}
                    className="w-20 rounded-md border border-input bg-transparent px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-brand"
                  />
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOverrides(overrides.filter((_, idx) => idx !== i))}
                  aria-label="Remove override"
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-[11px] text-muted-foreground">No category overrides — flat {baseRate}% across everything.</p>
        )}
      </div>

      {/* Rules */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Exclude refunded orders</p>
            <p className="text-[11px] text-muted-foreground">Don't earn commission on orders later refunded.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={excludeRefunds}
            onClick={() => setExcludeRefunds(!excludeRefunds)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
              excludeRefunds ? "bg-brand dark:bg-primary" : "bg-muted",
            )}
          >
            <span className={cn(
              "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
              excludeRefunds ? "translate-x-5" : "translate-x-1",
            )} />
          </button>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Holding period</span>
            <span className="text-sm font-bold tabular-nums">{waitDays} days</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Days after the order before commission moves from pending → approved.</p>
          <input
            type="range"
            min={0}
            max={30}
            value={waitDays}
            onChange={(e) => setWaitDays(parseInt(e.target.value, 10))}
            className="mt-2 w-full accent-brand dark:accent-primary"
          />
        </div>
      </div>

      {/* Affiliate-only: referral link snippet */}
      {isAffiliate && member.affiliateCode && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referral link · earns {baseRate}%</p>
          <p className="mt-1 break-all font-mono text-xs">
            https://pallio.app/r/{member.affiliateCode}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Share anywhere — every sale attributed to this code accrues commission here.</p>
        </div>
      )}
    </section>
  )
}
