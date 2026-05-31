import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowDownToLine,
  Banknote,
  Copy,
  ExternalLink,
  HelpCircle,
  Link2,
  MousePointerClick,
  Share2,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CommissionCalculator } from "@/components/team/commission-calculator"
import { Avatar } from "@/components/avatar"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { MEMBERS } from "@/lib/team/data"

// "My commissions" view for an affiliate marketer signed in to Pallio.
// Distinct from /marketing/commissions, which is the admin view of
// everyone. This page is scoped to ONE affiliate and shows them:
//   - their referral link + code + share buttons
//   - MTD commission stats + clicks + conversion %
//   - recent attributed orders
//   - upcoming payout + recent payout history
//   - a calculator so they can model their own earnings
//
// In the dummy-data world we hard-code Sara Quill (id "m-6") as
// "you". When auth lands, swap this for the auth-context user.

const ME_ID = "m-6"

type AttributedOrder = {
  id: string
  customer: string
  email: string
  amount: number
  commission: number
  status: "pending" | "approved" | "paid" | "rejected"
  daysAgo: number
}

const ATTRIBUTED: AttributedOrder[] = [
  { id: "SO-7901", customer: "Aisha Nwosu",  email: "aisha@personal.io",  amount:  84_000, commission:  8_400, status: "paid",     daysAgo: 1 },
  { id: "SO-7898", customer: "Linda Mensah", email: "linda.m@studio.so",  amount: 312_000, commission: 31_200, status: "approved", daysAgo: 2 },
  { id: "SO-7884", customer: "Daniel Kim",   email: "dk@neuroframe.dev",  amount: 156_000, commission: 15_600, status: "approved", daysAgo: 4 },
  { id: "SO-7871", customer: "Sade Adeyemi", email: "sade@gmail.com",     amount:  44_000, commission:  4_400, status: "pending",  daysAgo: 6 },
  { id: "SO-7860", customer: "Tunde Bello",  email: "tunde@ekopro.com",   amount: 220_000, commission: 22_000, status: "paid",     daysAgo: 12 },
  { id: "SO-7842", customer: "Funke A.",     email: "funke@apparel.com",  amount: 188_000, commission: 18_800, status: "paid",     daysAgo: 18 },
  { id: "SO-7821", customer: "Walk-in",      email: "—",                  amount:  62_000, commission:  6_200, status: "rejected", daysAgo: 22 },
]

const STATUS_TONE: Record<AttributedOrder["status"], StatusTone> = {
  pending:  "warning",
  approved: "info",
  paid:     "success",
  rejected: "neutral",
}

type Payout = { id: string; amount: number; method: string; sentAt: string }
const PAYOUTS: Payout[] = [
  { id: "PO-2026-04", amount: 412_000, method: "Bank transfer · GTBank ****1023", sentAt: "Apr 28, 2026" },
  { id: "PO-2026-03", amount: 318_500, method: "Bank transfer · GTBank ****1023", sentAt: "Mar 30, 2026" },
  { id: "PO-2026-02", amount: 286_000, method: "Bank transfer · GTBank ****1023", sentAt: "Feb 28, 2026" },
]

export default function AffiliateDashboard() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))
  const { formatPrice, symbol } = useCurrency()

  const me = MEMBERS.find((m) => m.id === ME_ID) ?? MEMBERS[0]
  // Convert mtdSalesUsd dummy fields to local-currency display by
  // pretending 1 USD ≈ 1500 NGN — only matters in the dummy world;
  // real backend will return localised numbers already.
  const FX = 1500
  const mtdSales = (me.mtdSalesUsd ?? 0) * FX
  const mtdCommission = (me.mtdCommissionUsd ?? 0) * FX
  const conv = me.affiliateClicks ? Math.round((ATTRIBUTED.length / me.affiliateClicks) * 10000) / 100 : 0
  const pendingTotal = ATTRIBUTED.filter((a) => a.status !== "paid" && a.status !== "rejected").reduce((s, a) => s + a.commission, 0)
  const referralUrl = `https://pallio.app/r/${me.affiliateCode}`

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  return (
    <PageShell
      title="My commissions"
      withToolbar={false}
      titleTooltip={
        <>
          Your personal affiliate dashboard. Shows clicks on your
          referral link, orders attributed to you, what's payable
          this month, and your full payout history. Pallio updates
          these numbers in real time as customers buy through your
          code.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Hero — avatar + name + code + share */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-brand/30 via-fuchsia-500/15 to-transparent blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-start gap-4">
            <Avatar
              seed={me.email}
              name={me.name}
              size={64}
              className="ring-4 ring-card shadow-lg shadow-brand/20"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{me.name}</h2>
                <span className="inline-flex items-center rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">
                  Affiliate
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{me.email}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm font-bold">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {me.affiliateCode}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(referralUrl, "Referral link")}>
                    <Copy className="h-3.5 w-3.5" /> Copy link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
                        void (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
                          title: "Shop with Pallio",
                          text: `Use my code ${me.affiliateCode} at checkout for a discount.`,
                          url: referralUrl,
                        }).catch(() => {})
                      } else {
                        void copy(referralUrl, "Referral link")
                      }
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </Button>
                </div>
              </div>
              <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{referralUrl}</p>
            </div>
          </div>
        </section>

        {/* KPI band */}
        <SummaryStrip
          tiles={[
            { label: "This month's earnings", value: formatPrice(mtdCommission),  tone: "success", hint: "ready or pending" },
            { label: "Attributed sales (MTD)", value: formatPrice(mtdSales),       tone: "brand",   hint: "what your link drove" },
            { label: "Pending payout",         value: formatPrice(pendingTotal),   tone: "warning", hint: "approved + holding" },
            {
              label: "Click → buy %",
              value: `${conv}%`,
              tone: "info",
              // When clicks exist but no order has converted yet, hint
              // that attribution can lag a few hours rather than letting
              // the 0% read as a data bug.
              hint: conv === 0 && (me.affiliateClicks ?? 0) > 0
                ? `${me.affiliateClicks?.toLocaleString() ?? 0} clicks · attribution may be pending`
                : `${me.affiliateClicks?.toLocaleString() ?? 0} clicks`,
            },
          ]}
        />

        {/* Two columns on desktop: how it works + calculator. */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-baseline gap-2">
                <CardTitle className="text-base">How your commission works</CardTitle>
              </div>
              <CardDescription>
                Pallio attributes every sale that uses your code or referral link.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-2.5">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand dark:bg-primary/15 dark:text-primary">1</span>
                  <span><strong>Share your code or link.</strong> Customers using <span className="font-mono">{me.affiliateCode}</span> at checkout (or arriving via your link) are tagged as yours for 30 days.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand dark:bg-primary/15 dark:text-primary">2</span>
                  <span><strong>Earn 10% on every order.</strong> Calculated on the order subtotal (excl. tax + shipping). Visible the moment the order is paid.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand dark:bg-primary/15 dark:text-primary">3</span>
                  <span><strong>Get paid monthly.</strong> Approved commissions are sent to your saved bank account on the last business day of each month, in NGN.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    <HelpCircle className="h-3 w-3" />
                  </span>
                  <span className="text-xs text-muted-foreground">Refunded or chargeback'd orders reverse their commission. Anything that's still on the customer's return window stays in <em>pending</em>.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <CommissionCalculator totalRevenue={mtdSales} />
        </div>

        {/* Attributed orders */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-base">Recent orders from your link</CardTitle>
              <span className="text-[11px] text-muted-foreground">Last 30 days</span>
            </div>
            <CardDescription>
              Pallio holds the commission until the customer's return window passes.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Order</th>
                    <th className="px-3 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 text-right font-medium">Order value</th>
                    <th className="px-3 py-2.5 text-right font-medium">Your cut</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ATTRIBUTED.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-accent/30">
                      <td className="px-3 py-2.5 font-mono text-xs">{row.id}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar seed={row.email} name={row.customer} size={24} />
                          <span className="truncate font-medium">{row.customer}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatPrice(row.amount)}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{formatPrice(row.commission)}</td>
                      <td className="px-3 py-2.5"><StatusBadge tone={STATUS_TONE[row.status]} withDot>{row.status}</StatusBadge></td>
                      <td className="px-3 py-2.5 text-right text-[11px] text-muted-foreground">{row.daysAgo === 0 ? "today" : row.daysAgo === 1 ? "1d ago" : `${row.daysAgo}d ago`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payouts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-base">Payouts</CardTitle>
              <Link to="/settings/payments/withdrawals/new">
                <Button size="sm" variant="outline">
                  <Banknote className="h-3.5 w-3.5" /> Request early payout
                </Button>
              </Link>
            </div>
            <CardDescription>
              Money Pallio has sent you. Automatic on the last business day of each month — or request early once you cross {symbol}100,000.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {PAYOUTS.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <ArrowDownToLine className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.id}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{formatPrice(p.amount)}</p>
                    <p className="text-[11px] text-muted-foreground">{p.sentAt}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Tips strip */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Tip Icon={MousePointerClick} title="Best-performing time" body="Post your link Wed–Fri evenings. Your click-through hits 3× higher then." />
          <Tip Icon={TrendingUp} title="Bundle gets shared" body="Wholesale customers love seeing what other operators bought — DM them screenshots." />
          <Tip Icon={Sparkles} title="Unlock 12%" body="Drive ₦5M in attributed sales in a calendar year and your rate bumps to 12% automatically." />
        </div>

        {/* Footer help */}
        <Link
          to="/marketing/commissions"
          className="flex items-center gap-2 self-end text-xs font-semibold text-brand hover:underline dark:text-primary"
        >
          See company-wide commission breakdown <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </PageShell>
  )
}

function Tip({ Icon, title, body }: { Icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-xs font-semibold">{title}</p>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

// Keeps tsc quiet about the unused Wallet import — wallet icon was
// reserved for future "balance" tile, leave the import in so swapping
// is a one-liner.
void Wallet
