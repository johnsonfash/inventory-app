import * as React from "react"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SwitchField } from "@/components/forms/switch-field"
import { loadPosSettings, savePosSettings, type PosSettings } from "@/lib/pos/settings"
import type { PriceTier } from "@/lib/pos/pricing-tiers"
import {
  loadReceiptSettings,
  saveReceiptSettings,
  type ReceiptSettings,
} from "@/lib/pos/receipt-settings"
import { canThermalPrint, listPrinters, openCashDrawer } from "@/lib/pos/hardware"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type Mode = "retail" | "restaurant" | "services" | "auto"

type Props = {
  open: boolean
  onClose: () => void
  mode: Mode
  onModeChange: (m: Mode) => void
  /** Price tier for this sale (POS-2). */
  tier?: string
  tiers?: PriceTier[]
  onTierChange?: (id: string) => void
  salesperson: string
  onSalespersonChange: (s: string) => void
  channel: string
  onChannelChange: (c: string) => void
  location: string
  locations: string[]
  onLocationChange: (l: string) => void
  cashier: string
  cashiers: string[]
  onCashierChange: (c: string) => void
  globalScan: boolean
  onGlobalScanChange: (v: boolean) => void
}

export function PosSettingsSheet({
  open,
  onClose,
  mode,
  onModeChange,
  tier,
  tiers,
  onTierChange,
  salesperson,
  onSalespersonChange,
  channel,
  onChannelChange,
  location,
  locations,
  onLocationChange,
  cashier,
  cashiers,
  onCashierChange,
  globalScan,
  onGlobalScanChange,
}: Props) {
  // Manager-override rules persist across sessions (lib/pos/settings).
  // Local mirror so edits feel instant; each change writes through.
  const [pos, setPos] = React.useState<PosSettings>(() => loadPosSettings())
  const patchPos = (part: Partial<PosSettings>) => {
    setPos((p) => ({ ...p, ...part }))
    savePosSettings(part)
  }

  // Receipt + printer customization (POS-3).
  const [receipt, setReceipt] = React.useState<ReceiptSettings>(() => loadReceiptSettings())
  const patchReceipt = (part: Partial<ReceiptSettings>) => {
    setReceipt((r) => ({ ...r, ...part }))
    saveReceiptSettings(part)
  }
  const [printers, setPrinters] = React.useState<{ name: string }[]>([])
  // Track an in-flight cash-drawer kick so the operator can't double-tap
  // the button while the printer is still chewing the command.
  const [drawerOpening, setDrawerOpening] = React.useState(false)
  React.useEffect(() => {
    if (open && canThermalPrint()) listPrinters().then(setPrinters)
  }, [open])

  const onLogoFile = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => patchReceipt({ logoDataUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="POS settings"
      description="Mode, location, and cashier for this session"
    >
      <div className="flex flex-col gap-3 pb-3">
        <FieldRow label="Business mode">
          <Select value={mode} onValueChange={(v) => v && onModeChange(v as Mode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="services">Services / Salon</SelectItem>
              <SelectItem value="auto">Auto / Parts</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        {tiers && onTierChange && (
          <FieldRow label="Price tier">
            <Select value={tier} onValueChange={(v) => v && onTierChange(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.adjustPercent !== 0 ? ` (${t.adjustPercent > 0 ? "+" : ""}${t.adjustPercent}%)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        )}

        <FieldRow label="Location">
          <Select value={location} onValueChange={(v) => v && onLocationChange(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Cashier">
          <Select value={cashier} onValueChange={(v) => v && onCashierChange(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {cashiers.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Salesperson">
          <Input
            value={salesperson}
            onChange={(e) => onSalespersonChange(e.target.value)}
            placeholder="Name"
          />
        </FieldRow>

        <FieldRow label="Channel">
          <Select value={channel} onValueChange={(v) => v && onChannelChange(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="In-Store">In-Store</SelectItem>
              <SelectItem value="Phone">Phone</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <div className="pt-2">
          <SwitchField
            label="Global barcode capture"
            description="Listen for keyboard-wedge scanner input anywhere on the page."
            checked={globalScan}
            onCheckedChange={onGlobalScanChange}
          />
        </div>

        {/* Manager overrides — when the till asks for a manager's PIN. */}
        <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold">Manager overrides</p>
          <p className="mb-3 text-[11px] text-muted-foreground">
            When a cashier action needs a manager's OK. The PIN is a quick gate for now —
            real per-person approval arrives with accounts.
          </p>
          <div className="flex flex-col gap-3">
            <FieldRow label="Manager PIN">
              <Input
                inputMode="numeric"
                value={pos.managerPin}
                onChange={(e) => patchPos({ managerPin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="4-6 digits"
              />
            </FieldRow>
            <FieldRow label="Ask for approval above this discount %">
              <Input
                type="number"
                min={0}
                value={pos.discountApprovalPercent}
                onChange={(e) => patchPos({ discountApprovalPercent: Math.max(0, Number(e.target.value) || 0) })}
              />
            </FieldRow>
            <FieldRow label="Ask for approval to void a line worth more than">
              <Input
                type="number"
                min={0}
                value={pos.voidApprovalAmount}
                onChange={(e) => patchPos({ voidApprovalAmount: Math.max(0, Number(e.target.value) || 0) })}
              />
            </FieldRow>
            <SwitchField
              label="Capture a reason on void"
              description="Cashier picks why a line was removed (typo, customer cancelled, out of stock…)."
              checked={pos.requireVoidReason}
              onCheckedChange={(v) => patchPos({ requireVoidReason: v })}
            />
          </div>
        </div>

        {/* Receipt + printer (POS-3) */}
        <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold">Receipt &amp; printer</p>
          <p className="mb-3 text-[11px] text-muted-foreground">
            What prints on the receipt header + footer, and which printer it goes to.
          </p>
          <div className="flex flex-col gap-3">
            <FieldRow label="Business name">
              <Input
                value={receipt.businessName}
                onChange={(e) => patchReceipt({ businessName: e.target.value })}
                placeholder="Shown at the top (defaults to Pallio)"
              />
            </FieldRow>
            <FieldRow label="Address">
              <Input
                value={receipt.address}
                onChange={(e) => patchReceipt({ address: e.target.value })}
                placeholder="Street, city"
              />
            </FieldRow>
            <FieldRow label="Footer / return policy">
              <Input
                value={receipt.footer}
                onChange={(e) => patchReceipt({ footer: e.target.value })}
                placeholder="Thanks! Returns within 30 days with receipt."
              />
            </FieldRow>
            <FieldRow label="Social / website">
              <Input
                value={receipt.social}
                onChange={(e) => patchReceipt({ social: e.target.value })}
                placeholder="@yourshop · yourshop.pallio.shop"
              />
            </FieldRow>
            <FieldRow label="Logo">
              <div className="flex items-center gap-2">
                {receipt.logoDataUrl && (
                  <img src={receipt.logoDataUrl} alt="" className="h-9 w-9 rounded object-contain" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                  className="text-xs"
                />
                {receipt.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => patchReceipt({ logoDataUrl: undefined })}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                )}
              </div>
            </FieldRow>
            <FieldRow label="Paper width">
              <Select value={receipt.paperSize} onValueChange={(v) => v && patchReceipt({ paperSize: v as ReceiptSettings["paperSize"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mm80">80mm</SelectItem>
                  <SelectItem value="Mm58">58mm</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Gift receipt return window (days)">
              <Input
                type="number"
                min={0}
                value={receipt.giftReturnDays}
                onChange={(e) => patchReceipt({ giftReturnDays: Math.max(0, Number(e.target.value) || 0) })}
              />
            </FieldRow>

            {canThermalPrint() ? (
              <>
                <FieldRow label="Thermal printer">
                  <Select
                    value={receipt.printerName ?? ""}
                    onValueChange={(v) => v && patchReceipt({ printerName: v })}
                  >
                    <SelectTrigger><SelectValue placeholder={printers.length ? "Choose a printer" : "No printers found"} /></SelectTrigger>
                    <SelectContent>
                      {printers.map((p) => (
                        <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <SwitchField
                  label="Open cash drawer on cash sales"
                  description="Sends a drawer-kick to the receipt printer after a cash payment."
                  checked={receipt.autoKickDrawer}
                  onCheckedChange={(v) => patchReceipt({ autoKickDrawer: v })}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={drawerOpening}
                  onClick={async () => {
                    setDrawerOpening(true)
                    try {
                      const ok = await openCashDrawer()
                      toast[ok ? "success" : "error"](
                        ok ? "Drawer opened." : "No drawer / printer connected.",
                      )
                    } finally {
                      setDrawerOpening(false)
                    }
                  }}
                >
                  {drawerOpening ? "Opening…" : "Open drawer"}
                </Button>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Thermal printing + cash drawer are available in the desktop and Android apps.
                On the web the browser print dialog is used.
              </p>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
