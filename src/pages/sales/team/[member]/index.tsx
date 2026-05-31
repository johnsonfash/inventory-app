import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ChevronRight, DollarSign, MessageSquare, Receipt, ShoppingCart, TrendingUp } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { StatusBadge } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { RoleGuard } from "@/components/auth/role-guard"
import { salesForMember } from "@/lib/pos/storage"
import { useCurrency } from "@/contexts/currency"

function initialsOf(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("")
}

function avatarTint(name: string) {
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

export default function MemberDetailPage() {
  const params = useParams<{ member: string }>()
  const member = decodeURIComponent(params.member ?? "")
  const data = salesForMember(member)
  const { formatPrice } = useCurrency()
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 400)) }, []))

  const avg = data.count ? data.revenue / data.count : 0
  const recent = data.list.slice(0, 25)

  return (
    <RoleGuard permission="view:team:detail">
      <PageShell
        title={member}
        withToolbar={false}
        titleTooltip={
          <>
            Personal performance + history for one team member.
            Numbers cover the period you pick from the chips —
            revenue rung up, units moved, commission earned, attainment
            vs target. Use this in 1:1s to celebrate wins or coach
            slow weeks.
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Link to="/sales/team" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> All team
          </Link>

          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-card p-5 dark:from-primary/15">
            <div className="relative flex items-center gap-4">
              <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${avatarTint(member)}`}>
                {initialsOf(member)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">{member}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {data.count} invoices · {formatPrice(data.revenue)} lifetime
                </p>
              </div>
              <Link to="/sales/team/chat">
                <Button variant="outline" size="sm" className="bg-card">
                  <MessageSquare className="h-4 w-4" /> Message
                </Button>
              </Link>
            </div>
          </div>

          <SummaryStrip
            tiles={[
              { label: "Sales", value: String(data.count), tone: "brand", hint: "invoices" },
              { label: "Revenue", value: formatPrice(data.revenue), tone: "success", hint: "total" },
              { label: "Avg order", value: formatPrice(avg), tone: "info", hint: "per sale" },
              { label: "Commission (5%)", value: formatPrice(data.revenue * 0.05), tone: "warning", hint: "estimated" },
            ]}
          />

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-semibold tracking-tight md:text-lg">Recent invoices</h3>
            {recent.length === 0 ? (
              <EmptyState
                Icon={Receipt}
                title="No invoices yet"
                description="Sales attributed to this rep will appear here."
                action={
                  <Link to="/sales/invoices/new">
                    <Button size="sm"><Receipt className="h-3.5 w-3.5" /> Create first invoice</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-2">
                {recent.map((i) => (
                  <li key={i.id}>
                    <Link
                      to={`/sales/invoices/${i.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <Receipt className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            <span className="font-mono">{i.number}</span>
                          </p>
                          <p className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(i.total)}</p>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span>{new Date(i.createdAt).toLocaleString()}</span>
                          <div className="flex items-center gap-1">
                            {i.meta?.channel && <StatusBadge tone="info">{i.meta.channel}</StatusBadge>}
                            {i.meta?.location && <StatusBadge tone="neutral">{i.meta.location}</StatusBadge>}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Reserved for future inline trend */}
          <div className="hidden">
            <DollarSign />
            <ShoppingCart />
            <TrendingUp />
          </div>
        </div>
      </PageShell>
    </RoleGuard>
  )
}
