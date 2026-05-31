import * as React from "react"
import { Link } from "react-router-dom"
import {
  Bot,
  Crown,
  Eye,
  Megaphone,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { InfoTooltip } from "@/components/info-tooltip"
import { MEMBERS, ROLES as ROLE_DEFS } from "@/lib/team/data"
import type { RoleKey } from "@/lib/team/types"
import { cn } from "@/lib/utils"

const ROLE_ICON: Record<RoleKey, typeof Crown> = {
  owner: Crown,
  manager: Shield,
  cashier: UserCog,
  "sales-rep": TrendingUp,
  marketer: Megaphone,
  affiliate: Sparkles,
  viewer: Eye,
  custom: ShieldCheck,
}

const ROLE_TONE_BG: Record<RoleKey, string> = {
  owner: "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
  manager: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  cashier: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  "sales-rep": "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  marketer: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  affiliate: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  viewer: "bg-muted text-muted-foreground",
  custom: "bg-muted text-muted-foreground",
}

const ROLE_TONE_BADGE: Record<RoleKey, StatusTone> = {
  owner: "brand",
  manager: "info",
  cashier: "success",
  "sales-rep": "warning",
  marketer: "info",
  affiliate: "warning",
  viewer: "neutral",
  custom: "neutral",
}

// Detailed permission matrix — derived from each role's coarse perm
// summary plus a few explicit fine-grained scopes the manager-style
// rows can't capture (audit log, delete items, void POS, billing).
type Permission = { key: string; group: string; description: string; allowed: Record<RoleKey, boolean> }

const PERMISSIONS: Permission[] = [
  { key: "inventory.read",    group: "Inventory", description: "View items, stock + movements",       allowed: { owner: true, manager: true,  cashier: true,  "sales-rep": true,  marketer: true,  affiliate: false, viewer: true,  custom: false } },
  { key: "inventory.write",   group: "Inventory", description: "Create / edit items + adjust stock",  allowed: { owner: true, manager: true,  cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: false, custom: false } },
  { key: "inventory.delete",  group: "Inventory", description: "Permanently delete items",            allowed: { owner: true, manager: false, cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: false, custom: false } },
  { key: "pos.use",           group: "POS",       description: "Run sales at the register",           allowed: { owner: true, manager: true,  cashier: true,  "sales-rep": true,  marketer: false, affiliate: false, viewer: false, custom: false } },
  { key: "pos.void",          group: "POS",       description: "Void or refund a completed sale",     allowed: { owner: true, manager: true,  cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: false, custom: false } },
  { key: "purchasing.read",   group: "Purchasing", description: "View POs, bills, vendors",           allowed: { owner: true, manager: true,  cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: true,  custom: false } },
  { key: "purchasing.write",  group: "Purchasing", description: "Create / edit POs + bills",          allowed: { owner: true, manager: true,  cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: false, custom: false } },
  { key: "marketing.read",    group: "Marketing", description: "View ad campaigns",                   allowed: { owner: true, manager: true,  cashier: false, "sales-rep": false, marketer: true,  affiliate: false, viewer: true,  custom: false } },
  { key: "marketing.manage",  group: "Marketing", description: "Create / edit ad campaigns",          allowed: { owner: true, manager: true,  cashier: false, "sales-rep": false, marketer: true,  affiliate: false, viewer: false, custom: false } },
  { key: "reports.read",      group: "Reports",   description: "View any report",                     allowed: { owner: true, manager: true,  cashier: false, "sales-rep": true,  marketer: true,  affiliate: true,  viewer: true,  custom: false } },
  { key: "reports.export",    group: "Reports",   description: "Export CSV / PDF",                    allowed: { owner: true, manager: true,  cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: false, custom: false } },
  { key: "team.read",         group: "Team",      description: "See the team list + member detail",   allowed: { owner: true, manager: true,  cashier: false, "sales-rep": true,  marketer: false, affiliate: false, viewer: true,  custom: false } },
  { key: "team.manage",       group: "Team",      description: "Invite, suspend, remove members",     allowed: { owner: true, manager: false, cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: false, custom: false } },
  { key: "settings.read",     group: "Settings",  description: "Open the Settings area",              allowed: { owner: true, manager: true,  cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: true,  custom: false } },
  { key: "settings.users",    group: "Settings",  description: "Manage users + roles",                allowed: { owner: true, manager: false, cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: false, custom: false } },
  { key: "settings.billing",  group: "Settings",  description: "Change billing + payment processors", allowed: { owner: true, manager: false, cashier: false, "sales-rep": false, marketer: false, affiliate: false, viewer: false, custom: false } },
]

const grouped = PERMISSIONS.reduce<Record<string, Permission[]>>((acc, p) => {
  (acc[p.group] ??= []).push(p)
  return acc
}, {})

// Live count members per role from the same mock data the team hub
// uses, so the cards stay in sync.
function memberCount(role: RoleKey): number {
  return MEMBERS.filter((m) => m.role === role).length
}

const ROLES_TO_SHOW: RoleKey[] = ["owner", "manager", "cashier", "sales-rep", "marketer", "affiliate", "viewer"]

export default function RolesSettings() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const total = ROLES_TO_SHOW.reduce((s, r) => s + memberCount(r), 0)
  const ownersCount = memberCount("owner")
  const customCount = memberCount("custom")

  return (
    <PageShell
      title="Roles & permissions"
      withToolbar={false}
      titleTooltip={
        <>
          Who can do what. Roles bundle <strong>permissions</strong>{" "}
          (specific actions like "view P&L", "delete invoice",
          "approve PO") into named profiles you assign to teammates.
          Use the built-ins (Owner / Manager / Cashier / Sales Rep /
          Marketer / Affiliate / Viewer) or design your own.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryStrip
          tiles={[
            { label: "Roles", value: String(ROLES_TO_SHOW.length), tone: "brand", hint: "+ Custom" },
            { label: "Members", value: String(total), tone: "info", hint: "across roles" },
            { label: "Owners", value: String(ownersCount), tone: "warning", hint: "uncapped admin" },
            { label: "Custom roles", value: String(customCount), tone: "neutral", hint: "ad-hoc scopes" },
          ]}
        />

        {/* Role cards */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-base font-semibold tracking-tight md:text-lg">Standard roles</h3>
            <InfoTooltip label="Standard roles" size="xs">
              Each role is a preset bundle of permissions. Assign one to a
              member; they get exactly that scope. Need something one role
              doesn't cover? Make a Custom role.
            </InfoTooltip>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES_TO_SHOW.map((key) => {
              const def = ROLE_DEFS.find((r) => r.key === key)!
              const Icon = ROLE_ICON[key]
              const count = memberCount(key)
              return (
                <div key={key} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-brand/40">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", ROLE_TONE_BG[key])}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold">{def.name}</p>
                        {def.external && (
                          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            external
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{def.tagline}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      <span className="font-bold tabular-nums text-foreground">{count}</span> member{count === 1 ? "" : "s"}
                    </span>
                    <StatusBadge tone={ROLE_TONE_BADGE[key]}>{def.key}</StatusBadge>
                  </div>
                </div>
              )
            })}
            {/* Add new role */}
            <Link to="/settings/roles/new" className="flex items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/40 p-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground">
              <Plus className="h-4 w-4" /> New custom role
            </Link>
          </div>
        </section>

        {/* Permission matrix */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 md:px-5 md:py-4">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <p className="text-sm font-semibold md:text-base">Permission matrix</p>
                <InfoTooltip label="Permission matrix" size="xs">
                  What each role can do. Standard rows are read-only here;
                  edit a Custom role from <code>/settings/roles/new</code> to
                  flip individual scopes.
                </InfoTooltip>
              </div>
              <p className="text-[11px] text-muted-foreground md:text-sm">
                Read-only — built-in roles can't be edited. Make a Custom role to tweak scopes.
              </p>
            </div>
            <Link to="/settings/roles/new">
              <Button size="sm"><Plus className="h-3.5 w-3.5" /> New role</Button>
            </Link>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Permission</th>
                  {ROLES_TO_SHOW.map((r) => (
                    <th key={r} className="px-2 py-2.5 text-center font-medium" title={ROLE_DEFS.find((x) => x.key === r)?.name}>
                      {ROLE_DEFS.find((x) => x.key === r)?.name.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([group, perms], gi) => (
                  <React.Fragment key={group}>
                    <tr>
                      <td colSpan={ROLES_TO_SHOW.length + 1} className={cn(
                        "bg-background/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                        gi > 0 && "border-t border-border",
                      )}>{group}</td>
                    </tr>
                    {perms.map((p) => (
                      <tr key={p.key} className="border-t border-border transition-colors hover:bg-accent/20">
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{p.description}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{p.key}</p>
                        </td>
                        {ROLES_TO_SHOW.map((r) => (
                          <td key={r} className="px-2 py-2.5 text-center">
                            {p.allowed[r] ? (
                              <span aria-label="Allowed" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                                <span className="text-[10px] font-bold">✓</span>
                              </span>
                            ) : (
                              <span aria-label="Denied" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <span className="text-[10px]">·</span>
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Affiliate panel */}
        <section className="rounded-2xl border border-border bg-gradient-to-br from-amber-50 via-card to-fuchsia-50/30 p-5 dark:from-amber-950/15 dark:to-fuchsia-950/15">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight md:text-base">Affiliate program</h3>
                  <InfoTooltip label="Affiliates" size="xs">
                    External partners with a unique referral link. Their
                    sales attribute back automatically; commissions accrue
                    at the rate set on the invite + are paid out from
                    Settings → Payments → Withdrawals.
                  </InfoTooltip>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Invite influencers, content partners, or referrers — they get a code, you get attribution.
                </p>
              </div>
            </div>
            <Link to="/settings/users/new?role=affiliate">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> Invite affiliate
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}

// keep unused-import warnings off for icons we may surface in
// custom-role editing later.
const _used = { Bot, Store, Users }
void _used
