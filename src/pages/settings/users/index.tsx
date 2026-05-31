import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Copy,
  Laptop,
  MapPin,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { EmptyState } from "@/components/lists/empty-state"
import { InfoTooltip } from "@/components/info-tooltip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useIsMobile } from "@/hooks/use-mobile"
import { INVITES, LOCATIONS, MEMBERS, ROLE_BY_KEY, SESSIONS } from "@/lib/team/data"
import type { Member, RoleKey } from "@/lib/team/types"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/currency"
import { useAutoMarkStep } from "@/hooks/use-auto-mark-step"

type Tab = "active" | "invites" | "affiliates" | "sessions"

const TAB_LABELS: Record<Tab, string> = {
  active: "Active",
  invites: "Pending invites",
  affiliates: "Affiliates",
  sessions: "Sessions",
}

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

function locName(id: string): string {
  return LOCATIONS.find((l) => l.id === id)?.name ?? id
}

function relTime(iso?: string): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60_000)
  if (min < 1) return "now"
  if (min < 60) return `${min}m ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d === 1 ? "1d ago" : `${d}d ago`
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

export default function TeamHub() {
  useAutoMarkStep("users")
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))
  const [tab, setTab] = React.useState<Tab>("active")
  const [query, setQuery] = React.useState("")
  const isMobile = useIsMobile()
  const { formatPrice } = useCurrency()

  const activeMembers = React.useMemo(
    () => MEMBERS.filter((m) => m.role !== "affiliate"),
    [],
  )
  const affiliates = React.useMemo(
    () => MEMBERS.filter((m) => m.role === "affiliate"),
    [],
  )

  const filteredActive = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activeMembers
    return activeMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || ROLE_BY_KEY[m.role].name.toLowerCase().includes(q),
    )
  }, [activeMembers, query])

  const filteredAffiliates = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return affiliates
    return affiliates.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.affiliateCode ?? "").toLowerCase().includes(q),
    )
  }, [affiliates, query])

  const totalSalesMTD = MEMBERS.reduce((s, m) => s + (m.mtdSalesUsd ?? 0), 0)
  const totalCommissionMTD = MEMBERS.reduce((s, m) => s + (m.mtdCommissionUsd ?? 0), 0)

  return (
    <PageShell
      title="Team"
      withToolbar={false}
      titleTooltip={
        <>
          Every person with access to your Pallio account — staff,
          managers, sales reps, marketers, and external affiliates.
          Manage role assignments, location access, pending invites,
          and active sessions from here.
        </>
      }
      mobileTrailing={
        <Link to="/settings/users/new">
          <button
            type="button"
            aria-label="Invite member"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 hover:bg-accent active:bg-accent/70"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Active members", value: String(activeMembers.length), tone: "brand", hint: "humans on staff" },
            { label: "Affiliates", value: String(affiliates.length), tone: "warning", hint: "external partners" },
            { label: "Pending invites", value: String(INVITES.length), tone: "info", hint: "awaiting accept" },
            { label: "MTD commissions", value: formatPrice(totalCommissionMTD), tone: "success", hint: "across team" },
          ]}
        />

        {/* Tabs + search + invite CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
            {(["active", "invites", "affiliates", "sessions"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  tab === t
                    ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {TAB_LABELS[t]}
                {t === "invites" && INVITES.length > 0 && (
                  <span className={cn(
                    "ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]",
                    tab === t ? "bg-white/25" : "bg-muted",
                  )}>{INVITES.length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="pl-9" />
            </div>
            <Link to="/settings/users/new" className="hidden sm:inline-flex">
              <Button><UserPlus className="h-4 w-4" /> Invite</Button>
            </Link>
          </div>
        </div>

        {/* Tab content */}
        {tab === "active" && (
          <ActiveTab members={filteredActive} isMobile={isMobile} formatPrice={formatPrice} />
        )}
        {tab === "invites" && (
          <InvitesTab />
        )}
        {tab === "affiliates" && (
          <AffiliatesTab members={filteredAffiliates} totalSales={totalSalesMTD} formatPrice={formatPrice} />
        )}
        {tab === "sessions" && (
          <SessionsTab />
        )}
      </div>
    </PageShell>
  )
}

// ----------- Active tab -----------
function ActiveTab({ members, isMobile, formatPrice }: { members: Member[]; isMobile: boolean; formatPrice: (n: number | null | undefined) => string }) {
  if (members.length === 0) {
    return (
      <EmptyState
        Icon={Users}
        title="No members match"
        description="Try a different name, email, or role."
      />
    )
  }
  if (isMobile) {
    return <ul className="space-y-2">{members.map((m) => <li key={m.id}><MemberRow member={m} /></li>)}</ul>
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Role</th>
            <th className="px-4 py-2.5 font-medium">Locations</th>
            <th className="px-4 py-2.5 text-right font-medium">MTD sales</th>
            <th className="px-4 py-2.5 text-right font-medium">Last active</th>
            <th className="px-4 py-2.5 text-right font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((m) => {
            const role = ROLE_BY_KEY[m.role]
            return (
              <tr key={m.id} className="transition-colors hover:bg-accent/30">
                <td className="px-4 py-2.5">
                  <Link to={`/settings/users/${m.id}`} className="flex items-center gap-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold", avatarTint(m.name))}>
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge tone={ROLE_TONE[m.role]}>{role.name}</StatusBadge>
                    {m.status === "suspended" && (
                      <StatusBadge tone="danger" withDot>suspended</StatusBadge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {m.locationIds.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">All locations</span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1">
                      {m.locationIds.map((id) => (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px]">
                          <MapPin className="h-2.5 w-2.5" /> {locName(id)}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {m.mtdSalesUsd != null ? formatPrice(m.mtdSalesUsd) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right text-[11px] text-muted-foreground">{relTime(m.lastActiveAt)}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link to={`/settings/users/${m.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand/80 dark:text-primary">
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MemberRow({ member }: { member: Member }) {
  const role = ROLE_BY_KEY[member.role]
  return (
    <Link to={`/settings/users/${member.id}`} className="block rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold", avatarTint(member.name))}>
          {initials(member.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{member.name}</p>
            <StatusBadge tone={ROLE_TONE[member.role]}>{role.name}</StatusBadge>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">{member.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            {member.locationIds.length === 0 ? (
              <span>All locations</span>
            ) : (
              member.locationIds.map((id) => (
                <span key={id} className="inline-flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />
                  {locName(id)}
                </span>
              ))
            )}
            <span>· last active {relTime(member.lastActiveAt)}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  )
}

// ----------- Invites tab -----------
function InvitesTab() {
  // Track which invite the operator is about to revoke. Centred dialog
  // forces a deliberate confirm — the invite link becomes dead on click,
  // and the invitee can't tell why their link stopped working.
  const [revokeInviteId, setRevokeInviteId] = React.useState<string | null>(null)
  const revokingInvite = INVITES.find((i) => i.id === revokeInviteId)
  const confirmRevokeInvite = () => {
    if (!revokingInvite) return
    try {
      toast.success(`Invite to ${revokingInvite.email} revoked`, { description: "The link no longer works." })
      setRevokeInviteId(null)
    } catch {
      toast.error("Couldn't revoke invite. Try again.")
    }
  }
  if (INVITES.length === 0) {
    return (
      <EmptyState
        Icon={UserPlus}
        title="No pending invites"
        description="Invite a teammate or affiliate to get started."
        action={
          <Link to="/settings/users/new">
            <Button><UserPlus className="h-4 w-4" /> Invite member</Button>
          </Link>
        }
      />
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {INVITES.map((inv) => {
        const role = ROLE_BY_KEY[inv.role]
        const link = `https://pallio.app/invite/${inv.token}`
        const expiresIn = Math.round((new Date(inv.expiresAt).getTime() - Date.now()) / 86_400_000)
        const expiringSoon = expiresIn <= 1
        const copy = async () => {
          try {
            await navigator.clipboard.writeText(link)
            toast.success("Invite link copied")
          } catch {
            toast.error("Couldn't copy — check clipboard permissions")
          }
        }
        return (
          <li key={inv.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserPlus className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{inv.email}</p>
                  <StatusBadge tone={ROLE_TONE[inv.role]}>{role.name}</StatusBadge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Invited by <span className="font-medium text-foreground/80">{inv.invitedBy}</span> · {relTime(inv.invitedAt)}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {inv.locationIds.length > 0 && inv.locationIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {locName(id)}
                    </span>
                  ))}
                  <StatusBadge tone={expiringSoon ? "danger" : "neutral"}>
                    {expiringSoon ? "expires < 24h" : `expires in ${expiresIn}d`}
                  </StatusBadge>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="h-3.5 w-3.5" /> Copy link
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.success(`Invite resent to ${inv.email}`)}>
                <RefreshCw className="h-3.5 w-3.5" /> Resend email
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto text-rose-600 dark:text-rose-400" onClick={() => setRevokeInviteId(inv.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Revoke
              </Button>
            </div>
          </li>
        )
      })}

      <Dialog open={revokeInviteId !== null} onOpenChange={(v) => !v && setRevokeInviteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this invite?</DialogTitle>
            <DialogDescription>
              The link sent to <strong>{revokingInvite?.email}</strong> will stop working immediately. If they still need access, send a fresh invite.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeInviteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRevokeInvite}>Revoke invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ul>
  )
}

// ----------- Affiliates tab -----------
function AffiliatesTab({ members, totalSales, formatPrice }: { members: Member[]; totalSales: number; formatPrice: (n: number | null | undefined) => string }) {
  if (members.length === 0) {
    return (
      <EmptyState
        Icon={Users}
        title="No affiliates yet"
        description="Invite an external partner to start tracking referred sales."
        action={
          <Link to="/settings/users/new?role=affiliate">
            <Button><UserPlus className="h-4 w-4" /> Invite affiliate</Button>
          </Link>
        }
      />
    )
  }
  const affiliateSalesShare = (members.reduce((s, m) => s + (m.mtdSalesUsd ?? 0), 0) / Math.max(1, totalSales)) * 100
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-baseline gap-1.5">
          <h3 className="text-sm font-semibold md:text-base">Active affiliates</h3>
          <InfoTooltip label="Affiliates" size="xs">
            External partners with a unique referral link. Pallio
            attributes sales when a customer arrives via that link
            and pays commission at the rate set on the invite.
          </InfoTooltip>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {members.length} affiliates driving {affiliateSalesShare.toFixed(0)}% of MTD revenue.
        </p>

        <ul className="mt-4 divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex items-start gap-3 py-3">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold", avatarTint(m.name))}>
                {initials(m.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/settings/users/${m.id}`} className="truncate text-sm font-semibold hover:underline">
                    {m.name}
                  </Link>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">{m.affiliateCode}</code>
                </div>
                <p className="text-[11px] text-muted-foreground">{m.email}</p>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="uppercase text-muted-foreground">Clicks</p>
                    <p className="font-bold tabular-nums">{m.affiliateClicks?.toLocaleString() ?? "—"}</p>
                  </div>
                  <div>
                    <p className="uppercase text-muted-foreground">MTD sales</p>
                    <p className="font-bold tabular-nums">{m.mtdSalesUsd != null ? formatPrice(m.mtdSalesUsd) : "—"}</p>
                  </div>
                  <div>
                    <p className="uppercase text-muted-foreground">Commission</p>
                    <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {m.mtdCommissionUsd != null ? formatPrice(m.mtdCommissionUsd) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ----------- Sessions tab -----------
function SessionsTab() {
  // Revoking a session signs the device out next API hit — operator
  // sometimes mis-clicks on a teammate's laptop they actually trust, so
  // confirm before firing.
  const [revokeSessionId, setRevokeSessionId] = React.useState<string | null>(null)
  const revokingSession = SESSIONS.find((s) => s.id === revokeSessionId)
  const revokingSessionMember = revokingSession ? MEMBERS.find((m) => m.id === revokingSession.memberId) : undefined
  const confirmRevokeSession = () => {
    if (!revokingSession) return
    try {
      toast.success(`Signed out ${revokingSession.device}`, {
        description: revokingSessionMember ? `${revokingSessionMember.name}'s device will be signed out on next sync.` : undefined,
      })
      setRevokeSessionId(null)
    } catch {
      toast.error("Couldn't revoke session. Try again.")
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-1.5">
        <h3 className="text-sm font-semibold md:text-base">Active sessions</h3>
        <InfoTooltip label="Sessions" size="xs">
          Every device currently signed into your organization. Revoke
          anything you don't recognise — the device is signed out the
          next time it tries to reach the API.
        </InfoTooltip>
      </div>
      <ul className="flex flex-col gap-2">
        {SESSIONS.map((s) => {
          const member = MEMBERS.find((m) => m.id === s.memberId)
          if (!member) return null
          const Device = s.device.toLowerCase().includes("iphone") || s.device.toLowerCase().includes("android") ? Smartphone : Laptop
          return (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                  <Device className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{member.name} · {s.device}</p>
                    {s.current && (
                      <StatusBadge tone="success" withDot>this device</StatusBadge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {s.approxLocation && <>{s.approxLocation} · </>}signed in {relTime(s.startedAt)} · last seen {relTime(s.lastSeenAt)}
                  </p>
                </div>
                {!s.current && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 dark:text-rose-400"
                    onClick={() => setRevokeSessionId(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Activity className="mr-1.5 inline h-3.5 w-3.5" />
        Every sign-in attempt + revocation is logged. Audit trail lands when the real backend ships.
      </div>

      <Dialog open={revokeSessionId !== null} onOpenChange={(v) => !v && setRevokeSessionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this session?</DialogTitle>
            <DialogDescription>
              <strong>{revokingSessionMember?.name ?? "This member"}</strong>'s {revokingSession?.device ?? "device"} will be signed out on its next API call. They can sign back in with their credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeSessionId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRevokeSession}>Revoke session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
