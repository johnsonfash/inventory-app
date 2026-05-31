import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  Edit3,
  Globe,
  Plus,
  RefreshCcw,
  Send,
  Shield,
  ShieldCheck,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SwitchField } from "@/components/forms/switch-field"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

// Primary receiving (business) accounts — where customer payments
// AND processor settlements LAND. Distinct from
// /settings/payments/accounts which is where outgoing
// (payout/withdrawal) money GOES.

type Status = "verified" | "pending" | "blocked"

type ReceivingAccount = {
  id: string
  bank: string
  shortNumber: string
  accountName: string
  branch?: string
  currency: "NGN" | "USD" | "GBP"
  balance: number
  primary?: boolean
  status: Status
  sources: string[] // settlement provider ids
  swift?: string
  type: "current" | "domiciliary" | "savings" | "virtual"
}

const ACCOUNTS: ReceivingAccount[] = [
  {
    id: "RA-001",
    bank: "GTBank",
    shortNumber: "··· 4218",
    accountName: "Funke Apparel Ltd · Operating",
    branch: "Lekki Phase 1",
    currency: "NGN",
    balance: 6_240_000,
    primary: true,
    status: "verified",
    sources: ["paystack", "flutterwave", "opay"],
    type: "current",
  },
  {
    id: "RA-002",
    bank: "Sterling Bank",
    shortNumber: "··· 7766",
    accountName: "Funke Apparel Ltd · Reserve",
    branch: "Victoria Island",
    currency: "NGN",
    balance: 4_180_000,
    status: "verified",
    sources: ["palmpay"],
    type: "savings",
  },
  {
    id: "RA-003",
    bank: "Stanbic IBTC",
    shortNumber: "··· 1098",
    accountName: "Funke Apparel Ltd · USD Domiciliary",
    branch: "Marina HQ",
    currency: "USD",
    balance: 12_400,
    status: "verified",
    sources: ["stripe", "dhl-express"],
    swift: "SBICNGLX",
    type: "domiciliary",
  },
  {
    id: "RA-004",
    bank: "Pallio Wallet",
    shortNumber: "··· 0001",
    accountName: "Funke Apparel · Virtual NUBAN",
    currency: "NGN",
    balance:   840_000,
    status: "verified",
    sources: ["direct-bank-transfer"],
    type: "virtual",
  },
  {
    id: "RA-005",
    bank: "Wema Bank · ALAT",
    shortNumber: "··· 2244",
    accountName: "Funke Apparel · Lekki Branch",
    branch: "Lekki Phase 1",
    currency: "NGN",
    balance:   320_000,
    status: "pending",
    sources: [],
    type: "current",
  },
]

const STATUS_TONE: Record<Status, StatusTone> = {
  verified: "success",
  pending:  "warning",
  blocked:  "danger",
}

type Settlement = {
  id: string
  date: string
  source: string
  account: string
  amount: number
  fee: number
  net: number
  status: "settled" | "in-transit" | "failed"
}

const SETTLEMENTS: Settlement[] = [
  { id: "STL-20418", date: "Today · 14:22",   source: "Paystack",    account: "GTBank ··· 4218",    amount:  248_400, fee:  3_726, net:  244_674, status: "settled" },
  { id: "STL-20416", date: "Today · 11:08",   source: "Flutterwave", account: "GTBank ··· 4218",    amount:  142_800, fee:  2_142, net:  140_658, status: "settled" },
  { id: "STL-20414", date: "Today · 09:45",   source: "Direct transfer", account: "Virtual ··· 0001", amount:  68_000, fee:      0, net:   68_000, status: "settled" },
  { id: "STL-20410", date: "May 20 · 18:30",  source: "Stripe",      account: "Stanbic USD ··· 1098", amount: 2_840_000, fee: 84_000, net: 2_756_000, status: "in-transit" },
  { id: "STL-20402", date: "May 20 · 12:15",  source: "Paystack",    account: "GTBank ··· 4218",    amount:  412_000, fee:  6_180, net:  405_820, status: "settled" },
  { id: "STL-20398", date: "May 20 · 09:02",  source: "Opay",        account: "GTBank ··· 4218",    amount:   86_400, fee:  1_296, net:   85_104, status: "settled" },
  { id: "STL-20392", date: "May 19 · 16:48",  source: "Palmpay",     account: "Sterling ··· 7766",  amount:   48_000, fee:    720, net:   47_280, status: "failed" },
]

export default function BusinessAccounts() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))
  const { formatPrice } = useCurrency()
  const [sweepEnabled, setSweepEnabled] = React.useState(true)
  const [sweepThreshold, setSweepThreshold] = React.useState(5_000_000)

  const totalNGN = ACCOUNTS.filter((a) => a.currency === "NGN").reduce((s, a) => s + a.balance, 0)
  const totalUSD = ACCOUNTS.filter((a) => a.currency === "USD").reduce((s, a) => s + a.balance, 0)
  const verified = ACCOUNTS.filter((a) => a.status === "verified").length
  const settledToday = SETTLEMENTS.filter((s) => s.date.startsWith("Today") && s.status === "settled").reduce((acc, s) => acc + s.net, 0)

  const copy = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  const [pendingId, setPendingId] = React.useState<string | null>(null)

  const makePrimary = async (bank: string, id: string) => {
    setPendingId(id)
    try {
      await new Promise((r) => setTimeout(r, 400))
      toast.success(`${bank} set as primary receiving account.`)
    } catch {
      toast.error("Couldn't set as primary", { description: "Try again in a moment." })
    } finally {
      setPendingId(null)
    }
  }

  const verifyAccount = async (id: string) => {
    setPendingId(id)
    try {
      await new Promise((r) => setTimeout(r, 400))
      toast.success("Verification email sent to your bank.")
    } catch {
      toast.error("Couldn't start verification", { description: "Try again in a moment." })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <PageShell
      title="Receiving Accounts"
      withToolbar={false}
      titleTooltip={
        <>
          The bank accounts your business <strong>receives</strong>{" "}
          money INTO — customer transfers, Paystack /
          Flutterwave / Stripe settlements, payment-link payments.
          Distinct from <Link to="/settings/payments/accounts" className="font-semibold text-brand hover:underline dark:text-primary">Payout Accounts</Link>, which is where money <strong>goes out</strong> (payroll, commissions, withdrawals).
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* KPI strip */}
        <SummaryStrip
          tiles={[
            { label: "NGN balance",       value: formatPrice(totalNGN), tone: "brand",   hint: `${ACCOUNTS.filter((a) => a.currency === "NGN").length} accounts` },
            { label: "USD balance",       value: `$${totalUSD.toLocaleString()}`, tone: "success", hint: "domiciliary" },
            { label: "Verified",          value: String(verified),        tone: "info",    hint: `of ${ACCOUNTS.length}` },
            { label: "Settled today",     value: formatPrice(settledToday), tone: "warning", hint: "net of fees" },
          ]}
        />

        {/* Primary account hero */}
        {(() => {
          const primary = ACCOUNTS.find((a) => a.primary)
          if (!primary) return null
          return (
            <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-card p-5 dark:from-primary/15">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-brand/30 via-emerald-500/15 to-transparent blur-3xl" aria-hidden />
              <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-emerald-500 text-white shadow-sm">
                    <Star className="h-5 w-5 fill-current" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Primary receiving account</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight md:text-2xl">{primary.bank} · {primary.shortNumber}</h2>
                      <StatusBadge tone="success" withDot>verified</StatusBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                      {primary.accountName}{primary.branch && ` · ${primary.branch}`}
                    </p>
                    <p className="mt-2 text-3xl font-bold tabular-nums md:text-4xl">{formatPrice(primary.balance)}</p>
                    <p className="text-[11px] text-muted-foreground">{primary.sources.length} settlement sources route here</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(primary.shortNumber.replace(/[^0-9]/g, ""), "Account number")}>
                    <Copy className="h-3.5 w-3.5" /> Copy details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Live balance refresh arrives with the billing backend."
                  >
                    <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                </div>
              </div>
            </section>
          )
        })()}

        {/* All accounts grid */}
        <section>
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="text-sm font-semibold md:text-base">All receiving accounts</h3>
              <p className="text-[11px] text-muted-foreground">Customers + processors land funds here. Choose one as primary for invoices + Paystack settlement.</p>
            </div>
            <Button
              size="sm"
              disabled
              title="Add receiving account form arrives with the billing backend."
            >
              <Plus className="h-3.5 w-3.5" /> Add account
            </Button>
          </div>
          <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ACCOUNTS.map((a) => (
              <li key={a.id}>
                <Card className={cn(a.primary && "border-brand/40 ring-1 ring-brand/30 dark:ring-primary/30")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                        {a.type === "virtual" ? <Wallet className="h-4 w-4" /> : a.type === "domiciliary" ? <Globe className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-bold">{a.bank}</p>
                          {a.primary && <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand dark:bg-primary/15 dark:text-primary"><Star className="h-2 w-2 fill-current" /> Primary</span>}
                          <StatusBadge tone={STATUS_TONE[a.status]} withDot>{a.status}</StatusBadge>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">{a.accountName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{a.shortNumber}{a.swift && ` · SWIFT ${a.swift}`}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold tabular-nums">
                      {a.currency === "USD" ? `$${a.balance.toLocaleString()}` : a.currency === "GBP" ? `£${a.balance.toLocaleString()}` : formatPrice(a.balance)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {a.type === "current" && "Current account"}
                      {a.type === "savings" && "Savings account"}
                      {a.type === "domiciliary" && `${a.currency} domiciliary`}
                      {a.type === "virtual" && "Virtual NUBAN · Pallio Wallet"}
                    </p>
                    {a.sources.length > 0 && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Settles from</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {a.sources.map((s) => (
                            <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex gap-1.5">
                      {!a.primary && a.status === "verified" && (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => makePrimary(a.bank, a.id)} disabled={pendingId === a.id}>
                          <Star className="h-3 w-3" /> {pendingId === a.id ? "Saving…" : "Make primary"}
                        </Button>
                      )}
                      {a.status === "pending" && (
                        <Button size="sm" className="flex-1" onClick={() => verifyAccount(a.id)} disabled={pendingId === a.id}>
                          <Shield className="h-3 w-3" /> {pendingId === a.id ? "Sending…" : "Verify"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Edit"
                        disabled
                        title="Inline edit arrives with the billing backend."
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* Settlements feed + Auto-sweep settings */}
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          {/* Recent settlements */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-sm font-semibold md:text-base">Recent settlements</h3>
                  <p className="text-[11px] text-muted-foreground">Processor → bank account · the moment funds become spendable.</p>
                </div>
                <Link to="/settings/payments/withdrawals" className="text-[11px] font-semibold text-brand hover:underline dark:text-primary">View all →</Link>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {SETTLEMENTS.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      s.status === "settled"   && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                      s.status === "in-transit" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                      s.status === "failed"    && "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                    )}>
                      {s.status === "settled"   && <ArrowDownLeft className="h-3.5 w-3.5" />}
                      {s.status === "in-transit" && <RefreshCcw className="h-3.5 w-3.5" />}
                      {s.status === "failed"    && <AlertTriangle className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{s.source}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{s.date} · {s.account}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold tabular-nums", s.status === "failed" && "text-rose-600 dark:text-rose-400")}>{formatPrice(s.net)}</p>
                      <p className="text-[10px] text-muted-foreground">fee {formatPrice(s.fee)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Auto-sweep rules */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold md:text-base">Auto-sweep</h3>
              <p className="text-[11px] text-muted-foreground">Automatically move surplus cash from primary into your reserve so it earns interest.</p>
              <div className="mt-3">
                <SwitchField
                  label="Sweep when over threshold"
                  description={`Daily check at 9pm. Anything above the threshold sweeps to Sterling Reserve ··· 7766.`}
                  checked={sweepEnabled}
                  onCheckedChange={setSweepEnabled}
                />
              </div>
              {sweepEnabled && (
                <div className="mt-3 rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sweep threshold</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{formatPrice(sweepThreshold)}</p>
                  <input
                    type="range"
                    min={1_000_000}
                    max={20_000_000}
                    step={500_000}
                    value={sweepThreshold}
                    onChange={(e) => setSweepThreshold(parseInt(e.target.value, 10))}
                    className="mt-2 w-full accent-brand dark:accent-primary"
                  />
                  <div className="flex justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
                    <span>₦1M</span>
                    <span>₦20M</span>
                  </div>
                  <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px]">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">Yield · 11.2% p.a.</p>
                    <p className="mt-0.5 text-muted-foreground">Estimated ₦{((primaryBalance() - sweepThreshold) * 0.112 / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month in interest at current balance.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Money flow diagram */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold md:text-base">How money flows through Pallio</h3>
            <p className="text-[11px] text-muted-foreground">From customer payment to your bank — and back out to payroll, vendors, taxes.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FlowCard
                Icon={ArrowDown}
                tone="brand"
                title="Money in"
                items={[
                  "Card payments → Paystack / Flutterwave",
                  "Bank transfers → Virtual NUBAN",
                  "Wallets → Opay / PalmPay",
                  "International → Stripe (USD)",
                ]}
              />
              <FlowCard
                Icon={Building2}
                tone="success"
                title="Receiving accounts (here)"
                items={[
                  "Settlements LAND here · T+1 daily",
                  `Primary: GTBank ${ACCOUNTS[0]!.shortNumber}`,
                  `${ACCOUNTS.length} accounts across 3 currencies`,
                  "Auto-sweep surplus to reserve",
                ]}
              />
              <FlowCard
                Icon={Send}
                tone="warning"
                title="Money out"
                items={[
                  "Payroll → staff bank accounts",
                  "Commission Payouts → reps + affiliates",
                  "Bills → vendors A/P",
                  "Tax Filings → FIRS portal",
                ]}
                href="/settings/payments/accounts"
                hrefLabel="Manage payout accounts →"
              />
            </div>
          </CardContent>
        </Card>

        {/* Integrations powering settlement */}
        <section>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold md:text-base">Settlement integrations</h3>
            <Link to="/settings/integrations" className="text-[11px] font-semibold text-brand hover:underline dark:text-primary">Browse all →</Link>
          </div>
          <p className="text-[11px] text-muted-foreground">Each connection settles into one of the accounts above. Configure where in the integration's detail page.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <ConnectionCard providerId="paystack"    reason="Cards + transfers + USSD. Settles to NGN primary T+1." />
            <ConnectionCard providerId="flutterwave" reason="Cards + mobile money. Settles to NGN primary T+1." />
            <ConnectionCard providerId="opay"        reason="Opay wallet. Instant settlement to NGN primary." />
            <ConnectionCard providerId="palmpay"     reason="PalmPay wallet. Settles to Sterling reserve." />
            <ConnectionCard providerId="stripe"      reason="International cards. Settles to USD domiciliary T+2." />
          </div>
        </section>

        {/* Cross-links */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { Icon: ArrowUpRight, label: "Payout Accounts",     body: "Where money LEAVES the business.", href: "/settings/payments/accounts" },
            { Icon: TrendingUp,   label: "Withdrawals",          body: "Move funds between accounts.", href: "/settings/payments/withdrawals" },
            { Icon: CheckCircle2, label: "Bank Reconciliation",   body: "Match Pallio entries to bank statement.", href: "/accounting/reconciliation" },
          ].map((q) => (
            <Link key={q.label} to={q.href} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
              <q.Icon className="h-4 w-4 text-brand dark:text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{q.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{q.body}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  )
}

function primaryBalance() {
  return ACCOUNTS.find((a) => a.primary)?.balance ?? 0
}

function FlowCard({ Icon, tone, title, items, href, hrefLabel }: {
  Icon: typeof ArrowDown
  tone: "brand" | "success" | "warning"
  title: string
  items: string[]
  href?: string
  hrefLabel?: string
}) {
  return (
    <div className={cn(
      "flex flex-col gap-2 rounded-2xl border p-4",
      tone === "brand"   && "border-brand/30 bg-brand-soft/30 dark:bg-primary/10",
      tone === "success" && "border-emerald-500/30 bg-emerald-500/5",
      tone === "warning" && "border-amber-500/30 bg-amber-500/5",
    )}>
      <div className="flex items-center gap-2">
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          tone === "brand"   && "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
          tone === "success" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          tone === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-bold">{title}</p>
      </div>
      <ul className="space-y-1 text-[11px]">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-foreground/40" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
      {href && hrefLabel && (
        <Link to={href} className="mt-1 text-[11px] font-semibold text-brand hover:underline dark:text-primary">{hrefLabel}</Link>
      )}
    </div>
  )
}

void CreditCard; void ShieldCheck
