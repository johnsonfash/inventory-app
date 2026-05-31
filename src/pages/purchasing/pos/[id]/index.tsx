import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, Mail, Printer, Truck } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useCurrency } from "@/contexts/currency"

// Detail stub for a single purchase order. Same mock roster as the
// list page; a real backend swaps the data source. Kept minimal —
// the goal here is that the list rows go somewhere coherent instead
// of looping back to themselves.

type POStatus = "draft" | "pending" | "partial" | "received" | "cancelled"

type PO = {
  id: string
  vendor: string
  items: number
  total: number
  status: POStatus
  due: string
  overdue: boolean
}

const pos: PO[] = [
  { id: "PO-1042", vendor: "Cobalt Distributors", items: 8, total: 4820, status: "pending", due: "May 22", overdue: false },
  { id: "PO-1041", vendor: "Glow Co", items: 4, total: 1240, status: "partial", due: "May 20", overdue: false },
  { id: "PO-1040", vendor: "Acme Supplies", items: 6, total: 920, status: "pending", due: "May 25", overdue: false },
  { id: "PO-1039", vendor: "Porcel Ceramics", items: 12, total: 2110, status: "draft", due: "May 14", overdue: true },
  { id: "PO-1038", vendor: "Delta Apparel", items: 24, total: 5800, status: "received", due: "May 12", overdue: false },
  { id: "PO-1037", vendor: "Cobalt Distributors", items: 2, total: 318, status: "cancelled", due: "May 10", overdue: false },
]

const statusTone: Record<POStatus, StatusTone> = {
  draft: "neutral",
  pending: "warning",
  partial: "info",
  received: "success",
  cancelled: "danger",
}

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { formatPrice } = useCurrency()
  const po = pos.find((p) => p.id.toLowerCase() === (id ?? "").toLowerCase())

  if (!po) {
    return (
      <PageShell title="Purchase order">
        <Card>
          <CardContent>
            <EmptyState
              Icon={Truck}
              title="PO not found"
              description="It may have been removed or the link is stale."
              action={<Link to="/purchasing/pos"><Button>Back to purchase orders</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell title={`Purchase order ${po.id}`} withToolbar={false}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link to="/purchasing/pos" className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All purchase orders
        </Link>
        <StatusBadge tone={statusTone[po.status]} withDot>{po.status}</StatusBadge>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{po.vendor}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono">{po.id}</span> · {po.items} items · {po.overdue ? `Overdue · was due ${po.due}` : `Due ${po.due}`}
              </p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatPrice(po.total)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => toast.success(`Closed ${po.id}`)}>
          <CheckCircle2 className="h-4 w-4" /> Close
        </Button>
        <Button variant="outline" onClick={() => toast("Email lands with backend.")}>
          <Mail className="h-4 w-4" /> Email vendor
        </Button>
        <Button variant="outline" onClick={() => toast("Print lands with backend.")}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button onClick={() => navigate(`/purchasing/receipts/new?po=${encodeURIComponent(po.id)}`)}>
          <Truck className="h-4 w-4" /> Receive goods
        </Button>
      </div>
    </PageShell>
  )
}
