import * as React from "react"
import { toast } from "sonner"
import { Boxes, Download, FileText, Loader2, Package, Receipt, ShoppingCart, Truck, Users } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"

type Dataset = { key: string; label: string; rows: number; Icon: typeof Package }

const DATASETS: Dataset[] = [
  { key: "products",  label: "Products & inventory", rows: 1284, Icon: Package },
  { key: "customers", label: "Customers",            rows: 942,  Icon: Users },
  { key: "orders",    label: "Orders & invoices",    rows: 3107, Icon: ShoppingCart },
  { key: "receipts",  label: "Payments & receipts",  rows: 2980, Icon: Receipt },
  { key: "purchasing",label: "Vendors & purchase orders", rows: 418, Icon: Truck },
  { key: "ledger",    label: "Accounting ledger (GL)", rows: 6621, Icon: FileText },
]

export default function DataExportSettings() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 300)) }, []))
  const [format, setFormat] = React.useState<"csv" | "json" | "xlsx">("csv")
  const [pending, setPending] = React.useState<string | null>(null)

  const download = async (label: string) => {
    setPending(label)
    try {
      // Mock generation latency — real file download lands with the backend.
      await new Promise((r) => setTimeout(r, 600))
      toast.success(`${label} export prepared`, { description: `Your .${format} file will download as soon as the backend ships.` })
    } catch {
      toast.error(`Couldn't prepare ${label} export`, { description: "Try again in a moment." })
    } finally {
      setPending(null)
    }
  }

  return (
    <PageShell
      title="Export data"
      withToolbar={false}
      titleTooltip="Your data is yours. Export any dataset — or everything — as CSV, JSON or Excel. Real file generation lands with the backend; the picker + flow are wired here."
    >
      <div className="flex flex-col gap-4">
        {/* Format + export-all */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Format</span>
              <div className="inline-flex gap-1 rounded-lg border border-border p-0.5">
                {(["csv", "json", "xlsx"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFormat(f)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold uppercase transition-colors ${format === f ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => download("full account")} disabled={pending !== null}>
              {pending === "full account" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export everything
            </Button>
          </CardContent>
        </Card>

        {/* Per-dataset */}
        <div className="grid gap-3 sm:grid-cols-2">
          {DATASETS.map((d) => (
            <Card key={d.key}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                  <d.Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.label}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{d.rows.toLocaleString()} records</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(d.label)} disabled={pending !== null}>
                  {pending === d.label ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Boxes className="h-3.5 w-3.5" /> Need a scheduled or automated export? Set one up under Automations.
        </p>
      </div>
    </PageShell>
  )
}
