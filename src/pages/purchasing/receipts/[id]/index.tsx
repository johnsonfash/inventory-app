import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Box, FileCheck, Printer } from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/lists/empty-state"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"

// Detail stub for a single goods receipt. Same mock roster as the
// list page; a real backend will replace it. Gives the list rows a
// destination so they stop looping back on themselves.

type Status = "draft" | "partial" | "complete"
type Row = { id: string; po: string; vendor: string; items: number; receivedItems: number; date: string; status: Status }

const rows: Row[] = [
  { id: "GR-3041", po: "PO-1042", vendor: "Cobalt Distributors", items: 8, receivedItems: 8, date: "2026-05-19", status: "complete" },
  { id: "GR-3040", po: "PO-1041", vendor: "Glow Co", items: 4, receivedItems: 2, date: "2026-05-18", status: "partial" },
  { id: "GR-3039", po: "PO-1040", vendor: "Acme Supplies", items: 6, receivedItems: 0, date: "2026-05-17", status: "draft" },
  { id: "GR-3038", po: "PO-1038", vendor: "Delta Apparel", items: 24, receivedItems: 24, date: "2026-05-15", status: "complete" },
]

const statusTone: Record<Status, StatusTone> = {
  draft: "neutral",
  partial: "warning",
  complete: "success",
}

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>()
  const receipt = rows.find((r) => r.id.toLowerCase() === (id ?? "").toLowerCase())

  if (!receipt) {
    return (
      <PageShell title="Goods receipt">
        <Card>
          <CardContent>
            <EmptyState
              Icon={FileCheck}
              title="Receipt not found"
              description="It may have been removed or the link is stale."
              action={<Link to="/purchasing/receipts"><Button>Back to receipts</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const pct = Math.round((receipt.receivedItems / Math.max(1, receipt.items)) * 100)

  return (
    <PageShell title={`Receipt ${receipt.id}`} withToolbar={false}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link to="/purchasing/receipts" className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All receipts
        </Link>
        <StatusBadge tone={statusTone[receipt.status]} withDot>{receipt.status}</StatusBadge>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Box className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{receipt.vendor}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono">{receipt.id}</span> · {receipt.po} · {receipt.date}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {receipt.receivedItems}/{receipt.items} received
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => toast("Print lands with backend.")}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        {receipt.status !== "complete" && (
          <Button onClick={() => toast.success(`Marked ${receipt.id} complete`)}>
            <FileCheck className="h-4 w-4" /> Mark complete
          </Button>
        )}
      </div>
    </PageShell>
  )
}
