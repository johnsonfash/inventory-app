import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { ArrowRight, Check, CreditCard, Download, Loader2, Sparkles, Zap } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/lists/status-badge"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"

// Account subscription + AI-credit metering. Mirrors the marketing
// pricing model (Starter/Growth/Scale + credit allowance + add-ons).
// Mock today; backend wires to api/billing (see docs/BACKEND_PLAN.md).

const PLAN = { name: "Growth", price: "₦5,000", cycle: "mo", renews: "Jun 5, 2026" }
const CREDITS = { included: 1000, used: 740 }
const PACKS = [
  { credits: "500", price: "₦1,000" },
  { credits: "2,000", price: "₦3,500" },
  { credits: "10,000", price: "₦15,000" },
]
const ADDONS = [
  { name: "Extra location", detail: "2 active", price: "+₦1,000 / mo" },
  { name: "WhatsApp Business API", detail: "Connected", price: "+₦2,500 / mo" },
]
const INVOICES = [
  { id: "PAL-2026-05", date: "May 5, 2026", amount: "₦6,500", status: "paid" as const },
  { id: "PAL-2026-04", date: "Apr 5, 2026", amount: "₦5,000", status: "paid" as const },
  { id: "PAL-2026-03", date: "Mar 5, 2026", amount: "₦5,000", status: "paid" as const },
]

export default function BillingSettings() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 350)) }, []))
  const remaining = Math.max(0, CREDITS.included - CREDITS.used)
  const pct = Math.min(100, Math.round((CREDITS.used / CREDITS.included) * 100))
  const [pendingPack, setPendingPack] = React.useState<string | null>(null)
  const [pendingInvoice, setPendingInvoice] = React.useState<string | null>(null)

  const buyPack = async (credits: string, price: string) => {
    setPendingPack(credits)
    try {
      await new Promise((r) => setTimeout(r, 700))
      toast.success(`${credits} credits added`, { description: `${price} charged to your card.` })
    } catch {
      toast.error("Couldn't complete purchase", { description: "Try again or check your payment method." })
    } finally {
      setPendingPack(null)
    }
  }

  const downloadInvoice = async (id: string) => {
    setPendingInvoice(id)
    try {
      await new Promise((r) => setTimeout(r, 600))
      toast.success(`${id} downloaded`)
    } catch {
      toast.error(`Couldn't download ${id}`, { description: "Try again in a moment." })
    } finally {
      setPendingInvoice(null)
    }
  }

  return (
    <PageShell
      title="Billing & credits"
      withToolbar={false}
      titleTooltip="Your Pallio subscription, AI-credit balance, add-ons, and invoices. The plan price is flat; AI features (assistant, ad copy + video, bulk sends) run on credits you can top up any time."
    >
      <div className="flex flex-col gap-4">
        {/* Plan */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight">{PLAN.name} plan</h2>
                    <StatusBadge tone="success" withDot>active</StatusBadge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{PLAN.price}</strong>/{PLAN.cycle} · renews {PLAN.renews}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/pricing"><Button variant="outline" size="sm">Change plan</Button></Link>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled
                  title="Card management arrives with the billing backend."
                  aria-label="Manage payment method (coming with billing backend)"
                >
                  <CreditCard className="h-3.5 w-3.5" /> Card ··· 4242
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI credits */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Zap className="h-4 w-4 text-brand dark:text-primary" /> AI credits
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">{remaining} of {CREDITS.included} left this month</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className={pct > 85 ? "h-full bg-rose-500" : "h-full bg-brand dark:bg-primary"} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Powers the AI assistant, ad copy + video generation, bulk descriptions and SMS/email blasts. Allowance resets on {PLAN.renews}.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {PACKS.map((p) => (
                <button
                  key={p.credits}
                  type="button"
                  onClick={() => buyPack(p.credits, p.price)}
                  disabled={pendingPack !== null}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    {pendingPack === p.credits && <Loader2 className="h-3 w-3 animate-spin" />}
                    {p.credits} credits
                  </span>
                  <span className="text-sm tabular-nums text-brand dark:text-primary">{p.price}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add-ons */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold">Add-ons</h3>
            <ul className="mt-2 divide-y divide-border">
              {ADDONS.map((a) => (
                <li key={a.name} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">{a.detail}</p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{a.price}</span>
                </li>
              ))}
            </ul>
            <Link to="/pricing#addons" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline dark:text-primary">
              Browse add-ons <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold">Invoices</h3>
            <ul className="mt-2 divide-y divide-border">
              {INVOICES.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold">{inv.id}</p>
                    <p className="text-[11px] text-muted-foreground">{inv.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums">{inv.amount}</span>
                    <StatusBadge tone="success"><Check className="mr-0.5 inline h-3 w-3" />{inv.status}</StatusBadge>
                    <Button size="sm" variant="ghost" onClick={() => downloadInvoice(inv.id)} disabled={pendingInvoice !== null} aria-label="Download invoice">
                      {pendingInvoice === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
