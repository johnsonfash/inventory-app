import type { StatusTone } from "@/components/lists/status-badge"

export type ReturnStatus = "approved" | "pending" | "refunded" | "rejected"
export type ReturnRow = {
  id: string
  invoice: string
  customer: string
  amount: number
  reason: string
  status: ReturnStatus
  date: string
}

export const RETURNS: ReturnRow[] = [
  { id: "RET-1041", invoice: "INV-3302", customer: "Linda M.", amount: 92.15, reason: "Damaged", status: "refunded", date: "2026-05-19" },
  { id: "RET-1042", invoice: "INV-3305", customer: "Acme Co", amount: 480.0, reason: "Wrong size", status: "approved", date: "2026-05-18" },
  { id: "RET-1043", invoice: "INV-3303", customer: "NovaApps", amount: 88.0, reason: "Changed mind", status: "pending", date: "2026-05-17" },
  { id: "RET-1040", invoice: "INV-3300", customer: "Zenith Ltd", amount: 220.0, reason: "Defective", status: "rejected", date: "2026-05-14" },
]

export const RETURN_TONE: Record<ReturnStatus, StatusTone> = {
  approved: "info",
  pending: "warning",
  refunded: "success",
  rejected: "danger",
}

export function getReturn(id: string): ReturnRow | undefined {
  return RETURNS.find((r) => r.id === id)
}
