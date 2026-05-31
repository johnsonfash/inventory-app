import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Mail, PackageMinus, Printer, RotateCcw } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { getReturn, RETURN_TONE } from "../data"

export default function ReturnDetail() {
  const params = useParams<{ id: string }>()
  const ret = getReturn(params.id ?? "")
  const { formatPrice } = useCurrency()
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))

  if (!ret) {
    return (
      <PageShell title="Return" withToolbar={false}>
        <Card>
          <CardContent>
            <EmptyState
              Icon={RotateCcw}
              title="Return not found"
              description="It might have been removed or the link is stale."
              action={<Link to="/sales/returns"><Button>Back to returns</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={`Return ${ret.id}`}
      withToolbar={false}
      titleTooltip={
        <>
          One Return Merchandise Authorisation. Pallio tracks the
          reason, refund status, and the original invoice — so you can
          restock, refund, or reject from one place.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Link to="/sales/returns" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All returns
        </Link>

        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-rose-50 via-card to-card p-5 dark:from-rose-950/15">
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                <PackageMinus className="h-5 w-5" />
              </span>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{ret.id}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">{ret.customer}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Reason: {ret.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">Filed {ret.date}</p>
            </div>
            <div className="text-right tabular-nums">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</p>
              <p className="text-3xl font-extrabold">{formatPrice(ret.amount)}</p>
              <div className="mt-1"><StatusBadge tone={RETURN_TONE[ret.status]} withDot>{ret.status}</StatusBadge></div>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={() => toast.success("Customer notified about return status.")}>
              <Mail className="h-4 w-4" /> Email customer
            </Button>
            {ret.status === "pending" && (
              <Button onClick={() => toast.success("Refund will run once the backend ships.")}>
                Approve refund
              </Button>
            )}
          </div>
        </section>

        <SummaryStrip
          tiles={[
            { label: "Amount", value: formatPrice(ret.amount), tone: "brand", hint: "to refund" },
            { label: "Status", value: ret.status, tone: "info", hint: ret.reason },
            { label: "Invoice", value: ret.invoice, tone: "neutral", hint: "original" },
          ]}
        />

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original invoice</p>
              <p className="mt-0.5 font-mono text-sm font-bold">{ret.invoice}</p>
            </div>
            <Link to="/sales/invoices">
              <Button size="sm" variant="outline">Open invoice</Button>
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
