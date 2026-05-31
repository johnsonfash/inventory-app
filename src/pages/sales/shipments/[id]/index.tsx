import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, ExternalLink, Mail, Printer, Truck } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { SummaryStrip } from "@/components/lists/summary-strip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { getShipment, SHIPMENT_TONE } from "../data"

export default function ShipmentDetail() {
  const params = useParams<{ id: string }>()
  const shipment = getShipment(params.id ?? "")
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))

  if (!shipment) {
    return (
      <PageShell title="Shipment" withToolbar={false}>
        <Card>
          <CardContent>
            <EmptyState
              Icon={Truck}
              title="Shipment not found"
              description="It might have been voided or the link is stale."
              action={<Link to="/sales/shipments"><Button>Back to shipments</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={`Shipment ${shipment.id}`}
      withToolbar={false}
      titleTooltip={
        <>
          One outbound parcel — carrier, tracking number, live status,
          and ETA. Use the action bar to copy the tracking number,
          email the customer, or print the packing slip.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Link to="/sales/shipments" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All shipments
        </Link>

        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-card to-card p-5 dark:from-primary/15">
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">{shipment.id}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">{shipment.carrier}</h2>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{shipment.tracking}</p>
              <p className="mt-1 text-xs text-muted-foreground">{shipment.eta}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
              <div className="mt-1"><StatusBadge tone={SHIPMENT_TONE[shipment.status]} withDot>{shipment.status}</StatusBadge></div>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(shipment.tracking).catch(() => {})
                toast.success("Tracking number copied")
              }}
            >
              <ExternalLink className="h-4 w-4" /> Copy tracking
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print slip
            </Button>
            <Button variant="outline" onClick={() => toast.success("Customer notified with the latest tracking update.")}>
              <Mail className="h-4 w-4" /> Email update
            </Button>
          </div>
        </section>

        <SummaryStrip
          tiles={[
            { label: "Carrier", value: shipment.carrier, tone: "brand", hint: shipment.tracking },
            { label: "Status", value: shipment.status, tone: "info", hint: shipment.eta },
            { label: "Order", value: shipment.order, tone: "neutral", hint: "linked sale" },
          ]}
        />

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source order</p>
              <p className="mt-0.5 font-mono text-sm font-bold">{shipment.order}</p>
            </div>
            <Link to="/sales/orders">
              <Button size="sm" variant="outline">Open order</Button>
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
