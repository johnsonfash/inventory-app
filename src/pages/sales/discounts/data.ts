import type { StatusTone } from "@/components/lists/status-badge"

export type DiscountStatus = "active" | "scheduled" | "expired"
export type DiscountRow = {
  code: string
  type: "percent" | "flat"
  value: number
  uses: number
  cap?: number
  status: DiscountStatus
}

export const SEED_DISCOUNTS: DiscountRow[] = [
  { code: "SUMMER20", type: "percent", value: 20, uses: 142, cap: 500, status: "active" },
  { code: "WELCOME10", type: "percent", value: 10, uses: 412, status: "active" },
  { code: "BLACKFRI", type: "percent", value: 30, uses: 0, cap: 1000, status: "scheduled" },
  { code: "VIP25", type: "flat", value: 25, uses: 84, cap: 200, status: "active" },
  { code: "WINTER15", type: "percent", value: 15, uses: 220, status: "expired" },
]

export const DISCOUNT_TONE: Record<DiscountStatus, StatusTone> = {
  active: "success",
  scheduled: "info",
  expired: "neutral",
}

export function getDiscount(code: string): DiscountRow | undefined {
  return SEED_DISCOUNTS.find((d) => d.code.toLowerCase() === code.toLowerCase())
}
