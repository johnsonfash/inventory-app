import type { StatusTone } from "@/components/lists/status-badge"

export type ShipmentStatus = "label" | "in-transit" | "delivered" | "returned"
export type ShipmentRow = {
  id: string
  order: string
  carrier: string
  tracking: string
  status: ShipmentStatus
  eta: string
}

export const SHIPMENTS: ShipmentRow[] = [
  { id: "SH-2104", order: "SO-7842", carrier: "DHL", tracking: "JD0102942", status: "delivered", eta: "Delivered May 19" },
  { id: "SH-2105", order: "SO-7849", carrier: "FedEx", tracking: "742992128", status: "in-transit", eta: "Arriving May 22" },
  { id: "SH-2106", order: "SO-7846", carrier: "UPS", tracking: "1Z999AA8", status: "label", eta: "Awaiting pickup" },
  { id: "SH-2102", order: "SO-7820", carrier: "DHL", tracking: "JD0100214", status: "returned", eta: "Returned" },
]

export const SHIPMENT_TONE: Record<ShipmentStatus, StatusTone> = {
  label: "neutral",
  "in-transit": "info",
  delivered: "success",
  returned: "warning",
}

export function getShipment(id: string): ShipmentRow | undefined {
  return SHIPMENTS.find((s) => s.id === id)
}
