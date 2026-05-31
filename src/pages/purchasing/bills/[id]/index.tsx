import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Mail, Printer, Receipt, Wallet } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useCurrency } from "@/contexts/currency"

// Detail stub for a single supplier bill. Same mock roster as the
// list page; a real backend will replace it. Gives the list rows a
// destination so they stop looping back on themselves.

type Status = "paid" | "partial" | "unpaid" | "overdue"
type Row = { id: string; po: string; vendor: string; amount: number; status: Status; due: string }

const rows: Row[] = [
  { id: "BILL-9001", po: "PO-1043", vendor: "Cobalt Distributors", amount: 4820.0, status: "paid", due: "May 18" },
  { id: "BILL-9002", po: "PO-1044", vendor: "Glow Co", amount: 1240.0, status: "partial", due: "May 22" },
  { id: "BILL-9003", po: "PO-1045", vendor: "Acme Supplies", amount: 920.0, status: "unpaid", due: "May 25" },
  { id: "BILL-9004", po: "PO-1046", vendor: "Porcel Ceramics", amount: 2110.0, status: "overdue", due: "May 12" },
  { id: "BILL-9005", po: "PO-1047", vendor: "Delta Apparel", amount: 5800.0, status: "paid", due: "May 8" },
]

const tone: Record<Status, StatusTone> = { paid: "success", partial: "info", unpaid: "warning", overdue: "danger" }

export default function BillDetail() {
  const { id } = useParams<{ id: string }>()
  const { formatPrice } = useCurrency()
  const bill = rows.find((r) => r.id.toLowerCase() === (id ?? "").toLowerCase())

  if (!bill) {
    return (
      <PageShell title="Bill">
        <Card>
          <CardContent>
            <EmptyState
              Icon={Receipt}
              title="Bill not found"
              description="It may have been removed or the link is stale."
              action={<Link to="/purchasing/bills"><Button>Back to bills</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell title={`Bill ${bill.id}`} withToolbar={false}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link to="/purchasing/bills" className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All bills
        </Link>
        <StatusBadge tone={tone[bill.status]} withDot>{bill.status}</StatusBadge>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{bill.vendor}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono">{bill.id}</span> · {bill.po} · {bill.status === "overdue" ? `Overdue (was due ${bill.due})` : `Due ${bill.due}`}
              </p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatPrice(bill.amount)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => toast("Email lands with backend.")}>
          <Mail className="h-4 w-4" /> Email
        </Button>
        <Button variant="outline" onClick={() => toast("Print lands with backend.")}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        {bill.status !== "paid" && (
          <Button onClick={() => toast.success(`Marked ${bill.id} as paid`)}>
            <Wallet className="h-4 w-4" /> Record payment
          </Button>
        )}
      </div>
    </PageShell>
  )
}
