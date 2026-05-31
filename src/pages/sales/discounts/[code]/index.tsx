import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Copy, TicketPercent } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { useCurrency } from "@/contexts/currency"
import { getDiscount, DISCOUNT_TONE } from "../data"

export default function DiscountDetail() {
  const params = useParams<{ code: string }>()
  const code = decodeURIComponent(params.code ?? "")
  const discount = getDiscount(code)
  const { formatPrice } = useCurrency()
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))

  if (!discount) {
    return (
      <PageShell title="Discount" withToolbar={false}>
        <Card>
          <CardContent>
            <EmptyState
              Icon={TicketPercent}
              title="Discount not found"
              description="It might have been removed or the link is stale."
              action={<Link to="/sales/discounts"><Button>Back to discounts</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const valueLabel = discount.type === "percent" ? `${discount.value}% off` : `${formatPrice(discount.value)} off`

  return (
    <PageShell
      title={`Discount ${discount.code}`}
      withToolbar={false}
      titleTooltip={
        <>
          One promo code — type, value, redemption count, and live
          status. Use the action bar to copy the code, pause it, or
          share it with marketing.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Link to="/sales/discounts" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All discounts
        </Link>

        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-card p-5 dark:from-primary/15">
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <TicketPercent className="h-5 w-5" />
              </span>
              <p className="mt-2 font-mono text-2xl font-bold tracking-tight">{discount.code}</p>
              <p className="mt-1 text-sm text-muted-foreground">{valueLabel}</p>
            </div>
            <div className="text-right tabular-nums">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Redemptions</p>
              <p className="text-3xl font-extrabold">{discount.uses}</p>
              {discount.cap !== undefined && (
                <p className="text-[11px] text-muted-foreground">cap {discount.cap}</p>
              )}
              <div className="mt-1"><StatusBadge tone={DISCOUNT_TONE[discount.status]} withDot>{discount.status}</StatusBadge></div>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(discount.code).catch(() => {})
                toast.success("Code copied")
              }}
            >
              <Copy className="h-4 w-4" /> Copy code
            </Button>
          </div>
        </section>

        <SummaryStrip
          tiles={[
            { label: "Type", value: discount.type === "percent" ? "Percent" : "Flat", tone: "brand", hint: valueLabel },
            { label: "Uses", value: String(discount.uses), tone: "info", hint: discount.cap ? `of ${discount.cap}` : "no cap" },
            { label: "Status", value: discount.status, tone: "neutral", hint: "live state" },
          ]}
        />
      </div>
    </PageShell>
  )
}
