import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, FileMinus, Printer } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useCurrency } from "@/contexts/currency"

// Detail stub for a single vendor credit. Same mock roster as the
// list page; a real backend will replace it. Gives the list rows a
// destination so they stop looping back on themselves.

type Status = "open" | "applied" | "expired"
type Row = { id: string; vendor: string; amount: number; reason: string; date: string; status: Status }

const rows: Row[] = [
  { id: "VC-2001", vendor: "Cobalt Distributors", amount: 120, reason: "Overbilling on PO-1042", date: "2026-05-19", status: "open" },
  { id: "VC-2002", vendor: "Glow Co", amount: 320, reason: "Damaged shipment refund", date: "2026-05-17", status: "applied" },
  { id: "VC-2003", vendor: "Acme Supplies", amount: 84, reason: "Short shipment", date: "2026-05-12", status: "open" },
  { id: "VC-2004", vendor: "Porcel Ceramics", amount: 56, reason: "Holiday promo rebate", date: "2026-04-30", status: "expired" },
]

const statusTone: Record<Status, StatusTone> = {
  open: "warning",
  applied: "success",
  expired: "neutral",
}

export default function VendorCreditDetail() {
  const { id } = useParams<{ id: string }>()
  const { formatPrice } = useCurrency()
  const credit = rows.find((r) => r.id.toLowerCase() === (id ?? "").toLowerCase())

  if (!credit) {
    return (
      <PageShell title="Vendor credit">
        <Card>
          <CardContent>
            <EmptyState
              Icon={FileMinus}
              title="Credit not found"
              description="It may have been removed or the link is stale."
              action={<Link to="/purchasing/vendor-credits"><Button>Back to vendor credits</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell title={`Vendor credit ${credit.id}`} withToolbar={false}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link to="/purchasing/vendor-credits" className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All vendor credits
        </Link>
        <StatusBadge tone={statusTone[credit.status]} withDot>{credit.status}</StatusBadge>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{credit.vendor}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono">{credit.id}</span> · {credit.date}
              </p>
              <p className="mt-3 text-sm">{credit.reason}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatPrice(credit.amount)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => toast("Print lands with backend.")}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        {credit.status === "open" && (
          <Button onClick={() => toast.success(`Applied ${credit.id} to next bill`)}>
            <CheckCircle2 className="h-4 w-4" /> Apply to bill
          </Button>
        )}
      </div>
    </PageShell>
  )
}
