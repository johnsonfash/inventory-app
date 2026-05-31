import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type Sale = {
  id: string
  customer: string
  amount: number
  status: "paid" | "pending" | "refunded"
  method: "card" | "cash" | "transfer"
  agoMinutes: number
}

const sales: Sale[] = [
  { id: "INV-2041", customer: "Aisha N.", amount: 248.5, status: "paid", method: "card", agoMinutes: 8 },
  { id: "INV-2040", customer: "Walk-in", amount: 64.2, status: "paid", method: "cash", agoMinutes: 22 },
  { id: "INV-2039", customer: "Daniel K.", amount: 1284.0, status: "paid", method: "transfer", agoMinutes: 56 },
  { id: "INV-2038", customer: "Linda M.", amount: 92.15, status: "pending", method: "card", agoMinutes: 71 },
  { id: "INV-2037", customer: "Walk-in", amount: 35.0, status: "refunded", method: "cash", agoMinutes: 124 },
]

const statusUI = {
  paid: { Icon: CheckCircle2, classes: "text-emerald-600 dark:text-emerald-400" },
  pending: { Icon: Clock, classes: "text-amber-600 dark:text-amber-400" },
  refunded: { Icon: XCircle, classes: "text-rose-600 dark:text-rose-400" },
} as const

function relTime(min: number) {
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function RecentSalesCard() {
  const { formatPrice } = useCurrency()
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
            <CreditCard className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">Recent sales</CardTitle>
            <CardDescription>Latest transactions from POS and Sales</CardDescription>
          </div>
          <Link
            to="/pos/transactions"
            className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline-flex items-center gap-1"
          >
            All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-border">
          {sales.map((s) => {
            const SU = statusUI[s.status]
            return (
              <li key={s.id}>
                <Link
                  to="/pos/transactions"
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 transition-colors hover:bg-accent/30 -mx-2 px-2 rounded-lg"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted",
                      SU.classes,
                    )}
                  >
                    <SU.Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{s.customer}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(s.amount)}</p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate capitalize">
                        {s.method} · <span className="font-mono">{s.id}</span>
                      </span>
                      <span>{relTime(s.agoMinutes)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
