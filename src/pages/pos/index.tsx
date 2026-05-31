import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { PageShell } from "@/components/page-shell"
import { BarcodeScannerInput } from "@/components/pos/barcode-scanner-input"
import { CartPanel } from "@/components/pos/cart-panel"
import { CartSheet } from "@/components/pos/cart-sheet"
import { CatalogGrid } from "@/components/pos/catalog-grid"
import { CheckoutSheet } from "@/components/pos/checkout-sheet"
import { CustomItemDialog, type CustomItemDraft } from "@/components/pos/custom-item-dialog"
import { FloatingCart } from "@/components/pos/floating-cart"
import { InvoicePreview, printInvoiceNode } from "@/components/pos/invoice-print"
import { SaleCompleteSheet } from "@/components/pos/sale-complete-sheet"
import { ItemOptionsSheet, type ItemSelection } from "@/components/pos/item-options-sheet"
import { ManagerPinDialog, type PinRequest } from "@/components/pos/manager-pin-dialog"
import { PosSettingsSheet } from "@/components/pos/pos-settings-sheet"
import { VoidLineDialog, type VoidTarget } from "@/components/pos/void-line-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useCurrency } from "@/contexts/currency"
import { useAutoMarkStep } from "@/hooks/use-auto-mark-step"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  findVirtualAccount,
  listCashiersForLocation,
  listLocations,
} from "@/lib/payments/virtual-accounts"
import {
  addCatalogItem,
  cartLineKey,
  genId,
  genInvoiceNumber,
  getDraft,
  lineDiscountValue,
  lineNet,
  loadCatalog,
  saveDraft,
  saveInvoice,
  seedPosDemo,
  type CartItem,
  type CatalogItem,
  type Invoice,
  type PaymentLine,
} from "@/lib/pos/storage"
import { loadPosSettings, type VoidEntry, type VoidReason } from "@/lib/pos/settings"
import {
  createGiftCard,
  earnPoints,
  loyaltyIdFor,
  redeemGiftCard,
  redeemPointsForCredit,
  useStoreCredit,
} from "@/lib/pos/loyalty"
import { SellGiftCardDialog } from "@/components/pos/sell-gift-card-dialog"
import { RecallQuoteDialog } from "@/components/pos/recall-quote-dialog"
import { loadTiers, tierMultiplier } from "@/lib/pos/pricing-tiers"
import {
  canCameraScan,
  openCashDrawer,
  scanWithCamera,
} from "@/lib/pos/hardware"
import { loadReceiptSettings } from "@/lib/pos/receipt-settings"
import { closeOpenOrder, getOpenOrder } from "@/lib/pos/venue"
import { postInvoiceToLedger } from "@/lib/accounting/auto-post"
import { db } from "@/lib/db/index"
import { CoachMark } from "@/components/onboarding/coach-mark"
import type { AuditEntry } from "@/lib/pos/storage"
import type { Order } from "@/lib/sales/types"
import { modifiersTotal, variantLabel, variantUnitPrice } from "@/lib/pos/variants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Barcode,
  ChevronRight,
  ClipboardList,
  FileText,
  Flame,
  Gift,
  Layers,
  LayoutGrid,
  Printer,
  RotateCcw,
  Settings2
} from "lucide-react"
import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

type Mode = "retail" | "restaurant" | "services" | "auto"

export default function PointOfSale() {
  useAutoMarkStep("first-sale")
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const draftIdFromUrl = search.get("draftId")
  const orderIdFromUrl = search.get("orderId")
  const isMobile = useIsMobile(1024);
  const { formatPrice } = useCurrency()

  React.useEffect(() => {
    seedPosDemo()
  }, [])

  // ----- Session settings -----
  const [mode, setMode] = React.useState<Mode>("retail")
  const [salesperson, setSalesperson] = React.useState("Alice")
  const [channel, setChannel] = React.useState("In-Store")
  const [globalScan, setGlobalScan] = React.useState(true)
  const [location, setLocation] = React.useState(() => listLocations()[0] || "HQ")
  const [cashier, setCashier] = React.useState(() => listCashiersForLocation(location)[0] || "Alice")

  const catalog = React.useMemo(() => loadCatalog(mode), [mode])

  // ----- Cart + customer -----
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [customer, setCustomer] = React.useState<{ name?: string; email?: string; phone?: string }>({})

  // ----- Pricing adjustments -----
  const [discount, setDiscount] = React.useState(0)
  const [discountType, setDiscountType] = React.useState<"flat" | "percent">("flat")
  const [orderTaxPercent, setOrderTaxPercent] = React.useState(0)
  const [shipping, setShipping] = React.useState(0)
  const [serviceFee, setServiceFee] = React.useState(0)

  // ----- Tip (added at checkout) -----
  const [tip, setTip] = React.useState(0)

  // ----- Payments -----
  const [payments, setPayments] = React.useState<PaymentLine[]>([{ method: "cash", amount: 0 }])

  // ----- Voids (transaction-scoped audit; not persisted in POS-1) -----
  const [voids, setVoids] = React.useState<VoidEntry[]>([])

  // ----- Price tier (POS-2) + cashier audit trail -----
  const tiers = React.useMemo(() => loadTiers(), [])
  const [tierId, setTierId] = React.useState("retail")
  const activeTier = tiers.find((t) => t.id === tierId)
  const [audit, setAudit] = React.useState<AuditEntry[]>([])
  const logAudit = React.useCallback(
    (action: AuditEntry["action"], detail?: string) =>
      setAudit((prev) => [...prev, { at: Date.now(), by: cashier || salesperson || "Cashier", action, detail }]),
    [cashier, salesperson],
  )

  // ----- Sheets / dialogs -----
  const [cartOpen, setCartOpen] = React.useState(false)
  const [mobileScanOpen, setMobileScanOpen] = React.useState(false)
  const [mobileOverflowOpen, setMobileOverflowOpen] = React.useState(false)
  const [checkoutOpen, setCheckoutOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [receiptOpen, setReceiptOpen] = React.useState(false)
  const [lastInvoice, setLastInvoice] = React.useState<Invoice | null>(null)
  const [giftReceipt, setGiftReceipt] = React.useState(false)

  // ----- POS-1 dialogs: manager PIN, custom item, item-not-found, void -----
  const [pinRequest, setPinRequest] = React.useState<PinRequest | null>(null)
  const [customItemOpen, setCustomItemOpen] = React.useState(false)
  const [notFoundCode, setNotFoundCode] = React.useState<string | null>(null)
  const [voidTarget, setVoidTarget] = React.useState<VoidTarget | null>(null)
  // POS-2: item with variants/modifiers awaiting an options pick.
  const [optionsItem, setOptionsItem] = React.useState<CatalogItem | null>(null)
  const [sellGiftCardOpen, setSellGiftCardOpen] = React.useState(false)
  const [recallOpen, setRecallOpen] = React.useState(false)
  // POS-4: the open order (table/tab) being settled, if we arrived via
  // /pos?orderId=. Cleared (and the spot freed) once the sale completes.
  const [activeOrderId, setActiveOrderId] = React.useState<string | null>(null)
  // POS-6: first-visit coach mark anchor for the new Tables affordance.
  const tablesChipRef = React.useRef<HTMLButtonElement>(null)
  // Bumped after a loyalty mutation so the checkout sheet re-reads kv.
  const [, setLoyaltyTick] = React.useState(0)

  // ----- Restore draft if `?draftId=...` was passed in -----
  React.useEffect(() => {
    if (!draftIdFromUrl) return
    const d = getDraft(draftIdFromUrl)
    if (!d) return
    setCart(d.items)
    setDiscount(d.discount || 0)
    setDiscountType(d.discountType || "flat")
    setOrderTaxPercent(d.orderTaxPercent || 0)
    setShipping(d.shipping || 0)
    setServiceFee(d.serviceFee || 0)
    setCustomer(d.customer || {})
    if (d.meta?.location) setLocation(d.meta.location)
    if (d.meta?.salesperson) setSalesperson(d.meta.salesperson)
    if (d.meta?.channel) setChannel(d.meta.channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftIdFromUrl])

  // ----- Settle an open order (table/tab) passed via `?orderId=...` -----
  React.useEffect(() => {
    if (!orderIdFromUrl) return
    const o = getOpenOrder(orderIdFromUrl)
    if (!o) return
    setCart(o.lines.map((l) => ({ ...l })))
    setCustomer(o.customer || {})
    setActiveOrderId(o.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdFromUrl])

  // ----- Cart mutations -----
  // A line is identified by its `id`. Lines merge only when product +
  // variant + modifiers all match (cartLineKey). POS-2.
  const addCartLine = React.useCallback(
    (item: CatalogItem, sel?: ItemSelection, qty = 1) => {
      const variant = sel?.variant
      const modifiers = sel?.modifiers && sel.modifiers.length ? sel.modifiers : undefined
      // listPrice = pre-tier unit price; the stored price applies the tier.
      const listPrice =
        Math.round((variantUnitPrice(item.price, variant) + modifiersTotal(modifiers)) * 100) / 100
      const unitPrice = Math.round(listPrice * tierMultiplier(activeTier) * 100) / 100
      const sku = variant?.sku ?? item.sku
      const key = cartLineKey(item.sku, variant?.sku, modifiers)
      setCart((prev) => {
        const idx = prev.findIndex((p) => cartLineKey(p.sku, p.variantSku, p.modifiers) === key)
        if (idx === -1) {
          return [
            {
              id: genId("line"),
              sku,
              name: item.name,
              price: unitPrice,
              listPrice,
              taxRate: item.taxRate,
              qty,
              variantSku: variant?.sku,
              variantLabel: variant ? variantLabel(variant, item.variantAxes) : undefined,
              modifiers,
            },
            ...prev,
          ]
        }
        const copy = prev.slice()
        copy[idx] = { ...copy[idx]!, qty: copy[idx]!.qty + qty }
        return copy
      })
    },
    [activeTier],
  )

  // Switch price tier: reprice every catalogue line from its listPrice.
  // Custom / gift-card lines (no listPrice) are left alone.
  const onTierChange = (id: string) => {
    setTierId(id)
    const mult = tierMultiplier(tiers.find((t) => t.id === id))
    setCart((prev) =>
      prev.map((p) =>
        p.listPrice != null ? { ...p, price: Math.round(p.listPrice * mult * 100) / 100 } : p,
      ),
    )
    logAudit("tier", tiers.find((t) => t.id === id)?.name)
  }

  // Tap a catalog tile: items with variants/modifiers open the options
  // sheet; everything else drops straight into the cart.
  const onCatalogTap = React.useCallback(
    (item: CatalogItem) => {
      if ((item.variantAxes?.length ?? 0) > 0 || (item.modifierGroups?.length ?? 0) > 0) {
        setOptionsItem(item)
      } else {
        addCartLine(item)
      }
    },
    [addCartLine],
  )

  const addByBarcode = (code: string) => {
    const found =
      catalog.find((p) => p.barcode && p.barcode === code) ||
      catalog.find((p) => p.sku.toLowerCase() === code.toLowerCase()) ||
      catalog.find((p) => p.name.toLowerCase().includes(code.toLowerCase()))
    if (found) onCatalogTap(found)
    else setNotFoundCode(code)
  }

  const updateQty = (id: string, next: number) => {
    setCart((prev) =>
      prev.map((p) => (p.id === id ? { ...p, qty: Math.max(0, next) } : p)).filter((p) => p.qty > 0),
    )
  }

  const clearCart = () => {
    setCart([])
    setDiscount(0)
    setShipping(0)
    setServiceFee(0)
    setOrderTaxPercent(0)
    setTip(0)
    setDiscountType("flat")
    setPayments([{ method: "cash", amount: 0 }])
    setCustomer({})
    setVoids([])
    setAudit([])
  }

  // ----- Custom / open item (POS-1) -----
  const addCustomItem = (draft: CustomItemDraft) => {
    const sku = draft.sku || `CUSTOM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    if (draft.saveToCatalog) {
      addCatalogItem(mode, { sku, name: draft.name, price: draft.price, taxRate: draft.taxRate })
    }
    setCart((prev) => [
      {
        id: genId("ci"),
        sku,
        name: draft.name,
        price: draft.price,
        taxRate: draft.taxRate,
        qty: 1,
        // Items saved to the catalog become real products; only mark the
        // throwaway ones as custom so reporting can tell them apart.
        custom: !draft.saveToCatalog,
      },
      ...prev,
    ])
  }

  // ----- Recall a quote/order into the cart (POS-2). -----
  const recallQuote = (order: Order) => {
    setCart(
      order.lines.map((l) => ({
        id: genId("line"),
        sku: l.sku,
        name: l.name,
        price: l.unitPriceUsd,
        listPrice: l.unitPriceUsd,
        taxRate: l.taxRate,
        qty: l.qty,
      })),
    )
    setCustomer({ name: order.customer.name, email: order.customer.email })
    logAudit("recall", order.number)
    toast.success(`Loaded ${order.number} into the cart.`)
  }

  // ----- Sell a gift card (POS-2). Card issued on sale completion. -----
  const addGiftCardLine = (amount: number) => {
    setCart((prev) => [
      {
        id: genId("gc"),
        sku: "GIFTCARD",
        name: "Gift card",
        price: amount,
        taxRate: 0,
        qty: 1,
        giftCard: true,
      },
      ...prev,
    ])
  }

  // ----- Line discount with manager-override gate (POS-1) -----
  const setLineDiscount = (id: string, value: number, type: "flat" | "percent") => {
    const line0 = cart.find((p) => p.id === id)
    const apply = () => {
      setCart((prev) =>
        prev.map((p) => (p.id === id ? { ...p, lineDiscount: value, lineDiscountType: type } : p)),
      )
      if (value > 0) logAudit("discount", `${line0?.name ?? "line"} · ${value}${type === "percent" ? "%" : ""}`)
    }
    const settings = loadPosSettings()
    // Gate deep percentage discounts. A flat amount is gated by the share
    // it represents of the line so a "₦5000 off a ₦6000 line" still asks.
    const line = cart.find((p) => p.id === id)
    const pct =
      type === "percent"
        ? value
        : line && line.qty * line.price > 0
          ? (value / (line.qty * line.price)) * 100
          : 0
    if (pct >= settings.discountApprovalPercent && value > 0) {
      setPinRequest({
        action: `Apply a ${Math.round(pct)}% discount to ${line?.name ?? "this line"}`,
        onApprove: apply,
      })
      return
    }
    apply()
  }

  // ----- Void / remove a line, capturing a reason (POS-1) -----
  const recordVoid = (item: CartItem, reason: VoidReason, approvedBy?: string) => {
    setVoids((prev) => [
      ...prev,
      { sku: item.sku, name: item.name, qty: item.qty, value: lineNet(item), reason, approvedBy, at: Date.now() },
    ])
    logAudit("void", `${item.name} · ${reason}${approvedBy ? ` (approved by ${approvedBy})` : ""}`)
    setCart((prev) => prev.filter((p) => p.id !== item.id))
  }

  const requestRemove = (id: string) => {
    const item = cart.find((p) => p.id === id)
    if (!item) return
    const settings = loadPosSettings()
    if (!settings.requireVoidReason) {
      // No reason needed — but a high-value line still needs a manager.
      if (lineNet(item) > settings.voidApprovalAmount) {
        setPinRequest({
          action: `Void ${item.name} (${formatPrice(lineNet(item))})`,
          onApprove: () => recordVoid(item, "mistake", "manager"),
        })
      } else {
        recordVoid(item, "mistake")
      }
      return
    }
    // Capture a reason first; the dialog's confirm chains into the
    // manager gate when the line is above the threshold.
    setVoidTarget({ id: item.id, name: item.name, value: lineNet(item) })
  }

  const confirmVoid = (reason: VoidReason, note?: string) => {
    const target = voidTarget
    if (!target) return
    const item = cart.find((p) => p.id === target.id)
    if (!item) return
    const settings = loadPosSettings()
    const finish = (approvedBy?: string) => recordVoid(item, reason, approvedBy)
    if (lineNet(item) > settings.voidApprovalAmount) {
      setPinRequest({
        action: `Void ${item.name} (${formatPrice(lineNet(item))})${note ? ` — ${note}` : ""}`,
        onApprove: () => finish("manager"),
      })
    } else {
      finish()
    }
  }

  const holdSale = () => {
    if (cart.length === 0) return
    const id = genId("draft")
    saveDraft({
      id,
      createdAt: Date.now(),
      note: `Held sale with ${cart.length} item(s)`,
      items: cart,
      discount,
      discountType,
      orderTaxPercent,
      shipping,
      serviceFee,
      customer,
      meta: { location, salesperson, channel },
    })
    setCartOpen(false)
    navigate("/pos/drafts")
  }

  // ----- Totals -----
  // subtotal is gross (before any discount); line discounts come off
  // next, then the order-level discount applies to what remains. Item
  // tax is charged on the post-line-discount amount (lineNet) — that's
  // the legally correct base and what Square/Toast do.
  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0)
  const lineDiscountTotal = cart.reduce((s, i) => s + lineDiscountValue(i), 0)
  const netAfterLine = Math.max(0, subtotal - lineDiscountTotal)
  const discountValue =
    discountType === "percent" ? (netAfterLine * (discount || 0)) / 100 : Math.min(netAfterLine, discount || 0)
  const afterDiscount = Math.max(0, netAfterLine - discountValue)
  const itemTax = cart.reduce((s, i) => s + (i.taxRate || 0) * lineNet(i), 0)
  const orderTax = Math.round(((orderTaxPercent || 0) / 100) * afterDiscount * 100) / 100
  // `total` is pre-tip; the checkout sheet adds the tip on top.
  const total = Math.max(
    0,
    Math.round((afterDiscount + itemTax + orderTax + (shipping || 0) + (serviceFee || 0)) * 100) / 100,
  )

  const totals = {
    subtotal,
    lineDiscountTotal: Math.round(lineDiscountTotal * 100) / 100,
    itemTax: Math.round(itemTax * 100) / 100,
    orderTax,
    shipping,
    serviceFee,
    discountValue: Math.round(discountValue * 100) / 100,
    tip,
    total,
  }

  // ----- Payment helpers -----
  const addPayment = () => setPayments((ps) => [...ps, { method: "card", amount: 0 }])
  // POS-4: append a pre-filled payment line for an even-split share.
  const addShare = (amount: number) => setPayments((ps) => [...ps, { method: "cash", amount }])
  const removePayment = (idx: number) => setPayments((ps) => ps.filter((_, i) => i !== idx))
  const updatePayment = (idx: number, part: Partial<PaymentLine>) =>
    setPayments((ps) =>
      ps.map((p, i) =>
        i === idx ? { ...p, ...part, amount: Number(part.amount ?? p.amount) || 0 } : p,
      ),
    )

  // ----- Finalize a sale (full settle, or layaway/partial). POS-1/2. -----
  const finalizeSale = (partial: boolean) => {
    const grandTotal = Math.round((total + (tip || 0)) * 100) / 100
    const paidRaw = payments.reduce((s, p) => s + (Number.isFinite(p.amount) ? p.amount : 0), 0)
    if (partial) {
      if (paidRaw <= 0) return // a layaway needs a deposit
    } else if (paidRaw < grandTotal) {
      return // button is disabled in this case anyway
    }
    const change = partial ? 0 : Math.max(0, Math.round((paidRaw - grandTotal) * 100) / 100)
    const augmented: PaymentLine[] = payments.map((p) => ({ ...p }))
    if (change > 0) {
      const cashIdx = augmented.findIndex((p) => p.method === "cash")
      if (cashIdx >= 0) augmented[cashIdx]!.reference = `Change: ${formatPrice(change)}`
    }
    const paid = partial ? Math.round(paidRaw * 100) / 100 : grandTotal
    const balance = partial ? Math.max(0, Math.round((grandTotal - paidRaw) * 100) / 100) : 0
    if (partial) logAudit("partial", `Deposit ${formatPrice(paid)}, balance ${formatPrice(balance)}`)

    const invoice: Invoice = {
      id: genId("inv"),
      number: genInvoiceNumber(),
      createdAt: Date.now(),
      customer,
      items: cart,
      subtotal,
      discount: discount || 0,
      discountType,
      orderTaxPercent: orderTaxPercent || 0,
      itemTax: totals.itemTax,
      orderTax,
      shipping: shipping || 0,
      serviceFee: serviceFee || 0,
      tip: tip || 0,
      total: grandTotal,
      payments: augmented,
      status: partial ? "partial" : "paid",
      paid,
      balance,
      tierName: activeTier && activeTier.id !== "retail" ? activeTier.name : undefined,
      audit: audit.length ? audit : undefined,
      meta: { location, salesperson, channel },
    }
    saveInvoice(invoice)
    // POS-5: queue for cloud sync (no-op on web; drains when online + backend).
    void db.enqueue("invoice", invoice)
    // ACCT-2: a fully-paid sale auto-posts a balanced journal entry so the
    // books + statements stay live. Idempotent; partial sales wait.
    if (!partial) postInvoiceToLedger(invoice)

    // Settle the value instruments that were tendered (gift card / store
    // credit) regardless of partial — the customer actually used them.
    for (const p of augmented) {
      if (p.method === "gift-card" && p.reference) redeemGiftCard(p.reference, p.amount)
      if (p.method === "store-credit") {
        const id = loyaltyIdFor(customer)
        if (id) useStoreCredit(id, p.amount)
      }
    }

    // Points + issued gift cards only land once the sale is paid in full.
    if (!partial) {
      const earned = earnPoints(customer, grandTotal)
      if (earned > 0) toast.success(`${customer.name || "Customer"} earned ${earned} points.`)
      const issued: string[] = []
      for (const line of cart) {
        if (!line.giftCard) continue
        for (let i = 0; i < line.qty; i++) {
          issued.push(createGiftCard({ amount: line.price, customer }).code)
        }
      }
      if (issued.length) toast.success(`Gift card${issued.length > 1 ? "s" : ""} issued: ${issued.join(", ")}`)
    } else {
      toast.success(`Saved — ${formatPrice(balance)} balance owed on ${invoice.number}.`)
    }

    // POS-3: kick the cash drawer after a cash sale (no-op on web).
    if (loadReceiptSettings().autoKickDrawer && augmented.some((p) => p.method === "cash" && p.amount > 0)) {
      void openCashDrawer()
    }

    // POS-4: a fully-paid open order (table/tab) is closed and its spot freed.
    if (!partial && activeOrderId) {
      closeOpenOrder(activeOrderId)
      setActiveOrderId(null)
    }

    setGiftReceipt(false)
    setLastInvoice(invoice)
    setCheckoutOpen(false)
    setCartOpen(false)
    setReceiptOpen(true)
    clearCart()
  }

  const onConfirmPayment = () => finalizeSale(false)
  const onSavePartial = () => finalizeSale(true)

  // POS-2: convert a customer's points into store credit at the till.
  const onRedeemPoints = (id: string, points: number) => {
    const { credit } = redeemPointsForCredit(id, points)
    if (credit > 0) {
      setLoyaltyTick((t) => t + 1)
      toast.success(`Redeemed ${points} points for ${formatPrice(credit)} store credit.`)
    }
  }

  const va = findVirtualAccount(location, cashier)
  const itemCount = cart.reduce((s, c) => s + c.qty, 0)

  return (
    <PageShell
      title="Point of sale"
      withToolbar={false}
      titleTooltip={
        <>
          The till. Tap items from the catalog to build a cart, scan a
          barcode for the fastest entry, then take payment (cash,
          card, transfer, or split). Every sale rung up here updates
          stock and the dashboard instantly. Drafts let you park a
          cart and resume later.
        </>
      }
      mobileTrailing={
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="POS settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 hover:bg-accent active:bg-accent/70"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      }
    >
      <div className="flex flex-col md:gap-4">
        {/* Layout: the catalog column (chips + scan card on desktop +
            catalog grid) and the cart panel share the SAME row, so
            both shrink with `1fr` as the viewport narrows.  The chips
            and scan card now live INSIDE the 1fr column instead of
            spanning the whole page width — this way the scan card,
            search input, and catalog all line up at the same width
            and resize in lockstep. */}
        <div className="grid gap-4 lg:grid-cols-[1fr_clamp(320px,28%,420px)]">
          {/* Catalog column.
              Mobile: gap-3 between children (just CatalogGrid is
                visible since chips + scan card are hidden).
              Desktop: gap-0 — the sticky wrapper below (chips + scan
                card) handles its own padding to butt against the
                CatalogGrid's sticky search bar. A flex `gap` between
                the wrapper and CatalogGrid would be transparent
                space where scrolling products bleed through. */}
          <div className="flex min-w-0 flex-col gap-3 md:gap-0">
            {/* Padding-area cover — a thin sticky bg-background bar
                that fills main's p-5 top padding region. Without
                this, scrolling product images visibly pass THROUGH
                the 20px band between the page header and the chips
                row (main's scrollport extends through its padding).
                Inline marginTop guarantees the negative offset
                regardless of Tailwind's purge pass — the element is
                hidden on mobile so the style has no effect there. */}
            {/* <div
              className="hidden md:sticky md:top-0 md:z-30 md:block md:h-5 md:bg-background"
              style={{ marginTop: "-1.25rem" }}
              aria-hidden
            /> */}

            {/* Sticky chips + scan card. bg-background covers the
                wrapper's box (chips row + gap + scan card) so the
                inter-element gaps don't leak product images either. */}
            <div className="hidden md:sticky md:-top-5 md:z-30 md:flex md:flex-col md:gap-4 md:bg-background md:pb-3">
              <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                <PosQuickChip Icon={LayoutGrid} label="Tables" onClick={() => navigate("/pos/venue")} anchorRef={tablesChipRef} />
                <PosQuickChip Icon={Flame} label="Prep" onClick={() => navigate("/pos/prep")} />
                <PosQuickChip Icon={Layers} label="Drafts" onClick={() => navigate("/pos/drafts")} />
                <PosQuickChip Icon={ClipboardList} label="Invoices" onClick={() => navigate("/pos/invoices")} />
                <PosQuickChip Icon={RotateCcw} label="Returns" onClick={() => navigate("/pos/returns")} />
                <PosQuickChip Icon={FileText} label="Recall quote" onClick={() => setRecallOpen(true)} />
                <PosQuickChip Icon={Gift} label="Gift card" onClick={() => setSellGiftCardOpen(true)} />
                <PosQuickChip Icon={Settings2} label={`${mode} · ${location}`} onClick={() => setSettingsOpen(true)} />
              </div>

              <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <Barcode className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <BarcodeScannerInput captureGlobal={globalScan} onScan={addByBarcode} />
                  </div>
                </div>
                <Input
                  placeholder="…or type SKU / name and press Enter"
                  className="mt-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value.trim()
                      if (v) {
                        addByBarcode(v)
                          ; (e.target as HTMLInputElement).value = ""
                      }
                    }
                  }}
                />
              </div>
            </div>

            <CatalogGrid
              catalog={catalog}
              onAdd={onCatalogTap}
              businessMode={mode}
              cart={cart}
              onScanRequest={() => setMobileScanOpen(true)}
              onOverflowRequest={() => setMobileOverflowOpen(true)}
              onCustomRequest={() => setCustomItemOpen(true)}
            />
          </div>

          <aside className="hidden min-w-0 lg:block">
            <CartPanel
              cart={cart}
              customer={customer}
              onCustomerChange={setCustomer}
              onUpdateQty={updateQty}
              onRemove={requestRemove}
              onLineDiscount={setLineDiscount}
              onClearCart={clearCart}
              onHold={holdSale}
              onCharge={() => setCheckoutOpen(true)}
              discount={discount}
              discountType={discountType}
              onDiscountChange={setDiscount}
              onDiscountTypeChange={setDiscountType}
              orderTaxPercent={orderTaxPercent}
              onOrderTaxPercentChange={setOrderTaxPercent}
              shipping={shipping}
              onShippingChange={setShipping}
              serviceFee={serviceFee}
              onServiceFeeChange={setServiceFee}
              totals={totals}
            />
          </aside>
        </div>

        {/* Invoice preview button on desktop */}
        <div className="hidden justify-end md:flex">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            disabled={cart.length === 0}
          >
            <FileText className="h-4 w-4" /> Invoice preview
          </Button>
        </div>
      </div>

      {/* Mobile floating cart pill */}
      {isMobile && (
        <FloatingCart itemCount={itemCount} total={total} onOpen={() => setCartOpen(true)} />
      )}

      {/* Mobile scan sheet — focuses the barcode input + accepts SKU
          type-ahead. Same flow as desktop, just sheet-presented. */}
      <BottomSheet
        open={mobileScanOpen}
        onClose={() => setMobileScanOpen(false)}
        drawerBreakpoint={1024}
        title="Scan or type"
        description="Point your camera at a barcode or type a SKU."
        maxHeightVh={60}
      >
        <div className="flex flex-col gap-3 pb-3">
          {canCameraScan() && (
            <Button
              type="button"
              className="w-full"
              onClick={async () => {
                const code = await scanWithCamera()
                if (code) {
                  addByBarcode(code)
                  setMobileScanOpen(false)
                }
              }}
            >
              <Barcode className="h-4 w-4" /> Scan with camera
            </Button>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
              <Barcode className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <BarcodeScannerInput
                captureGlobal={globalScan}
                onScan={(code) => {
                  // Brief acknowledgement toast so the cashier sees the
                  // scan was received even when the lookup is async or
                  // the options sheet doesn't open (item-not-found
                  // dialog opens instead, etc).
                  toast.success(`Scanned ${code}`, { duration: 1200 })
                  addByBarcode(code)
                  setMobileScanOpen(false)
                }}
              />
            </div>
          </div>
          <Input
            autoFocus
            placeholder="Type SKU / name + Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim()
                if (v) {
                  addByBarcode(v)
                  setMobileScanOpen(false)
                }
              }
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Tip: hold a hardware scanner over the code — Pallio reads the global keystroke stream when no field is focused.
          </p>
        </div>
      </BottomSheet>

      {/* Mobile overflow sheet — drafts / invoices / returns / mode. */}
      <BottomSheet
        open={mobileOverflowOpen}
        onClose={() => setMobileOverflowOpen(false)}
        drawerBreakpoint={1024}
        title="POS actions"
        description={`Mode: ${mode} · ${location}`}
        maxHeightVh={60}
      >
        <ul className="mb-3 divide-y divide-border rounded-xl border border-border bg-card">
          {[
            { Icon: LayoutGrid, label: "Tables & tabs", hint: "Open orders by table / chair / bay.", onClick: () => { setMobileOverflowOpen(false); navigate("/pos/venue") } },
            { Icon: Flame, label: "Prep queue", hint: "Fired items waiting to be made.", onClick: () => { setMobileOverflowOpen(false); navigate("/pos/prep") } },
            { Icon: Layers, label: "Drafts", hint: "Held carts you can resume.", onClick: () => { setMobileOverflowOpen(false); navigate("/pos/drafts") } },
            { Icon: ClipboardList, label: "Invoices", hint: "Past sales + receipts.", onClick: () => { setMobileOverflowOpen(false); navigate("/pos/invoices") } },
            { Icon: RotateCcw, label: "Returns", hint: "Process refunds + exchanges.", onClick: () => { setMobileOverflowOpen(false); navigate("/pos/returns") } },
            { Icon: FileText, label: "Recall quote", hint: "Load a saved quote / order.", onClick: () => { setMobileOverflowOpen(false); setRecallOpen(true) } },
            { Icon: Gift, label: "Sell gift card", hint: "Issue a prepaid card.", onClick: () => { setMobileOverflowOpen(false); setSellGiftCardOpen(true) } },
            { Icon: Settings2, label: `Settings · ${mode}`, hint: location, onClick: () => { setMobileOverflowOpen(false); setSettingsOpen(true) } },
            { Icon: FileText, label: "Invoice preview", hint: cart.length === 0 ? "Add items first." : "Preview before charging.", onClick: () => { if (cart.length > 0) { setMobileOverflowOpen(false); setPreviewOpen(true) } } },
          ].map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={a.onClick}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                  <a.Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{a.hint}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* Mobile sheets */}
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        customer={customer}
        onCustomerChange={setCustomer}
        onUpdateQty={updateQty}
        onRemove={requestRemove}
        onLineDiscount={setLineDiscount}
        onClearCart={clearCart}
        onHold={holdSale}
        discount={discount}
        discountType={discountType}
        onDiscountChange={setDiscount}
        onDiscountTypeChange={setDiscountType}
        orderTaxPercent={orderTaxPercent}
        onOrderTaxPercentChange={setOrderTaxPercent}
        shipping={shipping}
        onShippingChange={setShipping}
        serviceFee={serviceFee}
        onServiceFeeChange={setServiceFee}
        totals={totals}
        onCharge={() => {
          setCartOpen(false)
          setCheckoutOpen(true)
        }}
      />

      <CheckoutSheet
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        total={total}
        tip={tip}
        onTipChange={setTip}
        tipSuggested={mode === "restaurant" || mode === "services"}
        payments={payments}
        onAddPayment={addPayment}
        onRemovePayment={removePayment}
        onUpdatePayment={updatePayment}
        onConfirm={onConfirmPayment}
        onSavePartial={onSavePartial}
        onAddShare={addShare}
        virtualAccount={va ?? null}
        customer={customer}
        onRedeemPoints={onRedeemPoints}
      />

      <PosSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        onModeChange={setMode}
        tier={tierId}
        tiers={tiers}
        onTierChange={onTierChange}
        salesperson={salesperson}
        onSalespersonChange={setSalesperson}
        channel={channel}
        onChannelChange={setChannel}
        location={location}
        locations={listLocations()}
        onLocationChange={(l) => {
          setLocation(l)
          setCashier(listCashiersForLocation(l)[0] || "")
        }}
        cashier={cashier}
        cashiers={listCashiersForLocation(location)}
        onCashierChange={setCashier}
        globalScan={globalScan}
        onGlobalScanChange={setGlobalScan}
      />

      {/* Invoice preview (desktop) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Invoice preview</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const node = document.getElementById("invoice-print-root")
                  if (node) printInvoiceNode(node)
                }}
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button type="button" onClick={() => setPreviewOpen(false)}>Close</Button>
            </div>
          </div>
          <div id="invoice-print-root">
            <InvoicePreview
              invoice={{
                id: "preview",
                number: genInvoiceNumber(),
                createdAt: Date.now(),
                customer,
                items: cart,
                subtotal,
                discount: discount || 0,
                discountType,
                orderTaxPercent,
                itemTax,
                orderTax,
                shipping,
                serviceFee,
                total,
                payments: payments.map((p) => ({ ...p })),
                meta: { location, salesperson, channel },
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog after a successful sale */}
      <SaleCompleteSheet
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        invoice={lastInvoice}
        giftReceipt={giftReceipt}
        onGiftReceiptChange={setGiftReceipt}
        onRefund={
          lastInvoice
            ? () => {
                setReceiptOpen(false)
                navigate(`/pos/returns/new?invoiceId=${encodeURIComponent(lastInvoice.id)}`)
              }
            : undefined
        }
        onNewSale={() => {
          // Cart was already cleared on completion; just close the
          // sheet so the cashier lands back on the catalog ready to
          // ring up the next customer.
          setReceiptOpen(false)
        }}
      />


      {/* POS-1: custom/open item */}
      <CustomItemDialog
        open={customItemOpen}
        onClose={() => setCustomItemOpen(false)}
        onSubmit={addCustomItem}
        defaultTaxRate={catalog[0]?.taxRate}
      />

      {/* POS-1: scanned/typed code not in the catalog */}
      <CustomItemDialog
        open={notFoundCode !== null}
        scannedCode={notFoundCode ?? undefined}
        onClose={() => setNotFoundCode(null)}
        onSubmit={addCustomItem}
        defaultTaxRate={catalog[0]?.taxRate}
      />

      {/* POS-2: variant / modifier picker */}
      <ItemOptionsSheet
        item={optionsItem}
        onClose={() => setOptionsItem(null)}
        onConfirm={(item, sel) => addCartLine(item, sel)}
      />

      {/* POS-1: void-with-reason */}
      <VoidLineDialog target={voidTarget} onConfirm={confirmVoid} onClose={() => setVoidTarget(null)} />

      {/* POS-2: sell a gift card */}
      <SellGiftCardDialog
        open={sellGiftCardOpen}
        onClose={() => setSellGiftCardOpen(false)}
        onConfirm={addGiftCardLine}
      />

      {/* POS-2: recall a quote/order into the cart */}
      <RecallQuoteDialog open={recallOpen} onClose={() => setRecallOpen(false)} onRecall={recallQuote} />

      {/* POS-1: manager-override PIN gate */}
      <ManagerPinDialog request={pinRequest} onClose={() => setPinRequest(null)} />

      {/* POS-6: first-visit hint for table/tab service (desktop) */}
      <CoachMark
        id="pos-tables-intro"
        anchorRef={tablesChipRef}
        title="New: tables & tabs"
        body="Run table or counter service — open a tab, fire items to the prep queue, split the bill. Works for restaurants, salons, workshops, and more."
        placement="bottom"
      />
    </PageShell>
  )
}

function PosQuickChip({
  Icon,
  label,
  onClick,
  className,
  anchorRef,
}: {
  Icon: React.ElementType
  label: string
  onClick: () => void
  className?: string
  anchorRef?: React.Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={anchorRef}
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="capitalize">{label}</span>
    </button>
  )
}
