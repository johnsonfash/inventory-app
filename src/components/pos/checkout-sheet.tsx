import * as React from "react"
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Gift,
  HandCoins,
  Plus,
  Smartphone,
  Sparkles,
  Split,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import type { PaymentLine } from "@/lib/pos/storage"
import { getGiftCard, getLoyalty, loyaltyIdFor } from "@/lib/pos/loyalty"
import { BottomSheet } from "@/components/mobile/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type PaymentMethod = PaymentLine["method"]

// The five steps the checkout walks through. 'method' is the landing
// surface; 'cash' / 'card' are single-tender shortcuts; 'split' opens
// the multi-tender editor; 'other' surfaces gift-card / store-credit /
// virtual-account in a compact list.
type Step = "method" | "cash" | "card" | "split" | "other"

// Other-step methods (no cash/card — those have their own steps).
const OTHER_METHODS: { value: PaymentMethod; label: string; Icon: LucideIcon; hint: string }[] = [
  { value: "gift-card",     label: "Gift card",     Icon: Gift,       hint: "Look up balance + apply" },
  { value: "store-credit",  label: "Store credit",  Icon: Wallet,     hint: "Customer's stored balance" },
  { value: "other",         label: "Bank transfer", Icon: Building2,  hint: "Account number + reference" },
  { value: "paypal",        label: "PayPal",        Icon: Smartphone, hint: "Send a payment link" },
  { value: "stripe",        label: "Stripe",        Icon: Smartphone, hint: "Send a payment link" },
]

// Method pills used inside split-bill payment lines.
const SPLIT_METHODS: { value: PaymentMethod; label: string; Icon: LucideIcon }[] = [
  { value: "cash",         label: "Cash",         Icon: Banknote },
  { value: "card",         label: "Card",         Icon: CreditCard },
  { value: "gift-card",    label: "Gift card",    Icon: Gift },
  { value: "store-credit", label: "Store credit", Icon: Wallet },
  { value: "paypal",       label: "PayPal",       Icon: Smartphone },
  { value: "stripe",       label: "Stripe",       Icon: Smartphone },
  { value: "other",        label: "Other",        Icon: Building2 },
]

// Tip percentages offered as one-tap presets. Applied to the pre-tip
// total. POS-1.
const TIP_PRESETS = [10, 15, 20]

type Props = {
  open: boolean
  onClose: () => void
  /** Total BEFORE tip. The sheet adds any tip on top. */
  total: number
  tip: number
  onTipChange: (next: number) => void
  /** Show tip presets up-front (food / services). Other modes get a
   *  compact "Add a tip" toggle so retail isn't nagged. */
  tipSuggested?: boolean
  payments: PaymentLine[]
  onAddPayment: () => void
  onRemovePayment: (idx: number) => void
  onUpdatePayment: (idx: number, part: Partial<PaymentLine>) => void
  onConfirm: () => void
  /** Save as a layaway / partial sale with a balance owed (POS-2). */
  onSavePartial?: () => void
  /** Append a pre-filled payment line for an even split share (POS-4). */
  onAddShare?: (amount: number) => void
  /** Optional virtual-account display info (bank + account number). */
  virtualAccount?: { bank: string; accountNumber: string; accountName: string } | null
  /** Attached customer — drives store-credit + loyalty (POS-2). */
  customer?: { name?: string; email?: string; phone?: string }
  /** Redeem the customer's points into store credit. POS-2. */
  onRedeemPoints?: (id: string, points: number) => void
  /** Optional initial step — quick-pay contexts can jump straight to
   *  'cash' / 'card' / 'split'. Defaults to 'method'. */
  initialStep?: Step
}

export function CheckoutSheet({
  open,
  onClose,
  total,
  tip,
  onTipChange,
  tipSuggested,
  payments,
  onAddPayment,
  onRemovePayment,
  onUpdatePayment,
  onConfirm,
  onSavePartial,
  onAddShare,
  virtualAccount,
  customer,
  onRedeemPoints,
  initialStep = "method",
}: Props) {
  const { formatPrice, symbol, cashDenominations } = useCurrency()
  const grandTotal = Math.round((total + (tip || 0)) * 100) / 100
  const paid = payments.reduce((s, p) => s + (Number.isFinite(p.amount) ? p.amount : 0), 0)
  const remaining = Math.max(0, Math.round((grandTotal - paid) * 100) / 100)
  // Loyalty / store-credit for the attached customer (re-read each render
  // so a points redemption reflects immediately).
  const loyaltyId = loyaltyIdFor(customer)
  const account = loyaltyId ? getLoyalty(loyaltyId) : undefined
  const change = Math.max(0, Math.round((paid - grandTotal) * 100) / 100)
  const fullyPaid = paid >= grandTotal && grandTotal > 0

  // ----- Step machine -----
  const [step, setStep] = React.useState<Step>(initialStep)
  // Reset to the initial step every time the sheet re-opens — so a new
  // sale doesn't land in the middle of a previous step.
  React.useEffect(() => {
    if (open) setStep(initialStep)
  }, [open, initialStep])

  // ----- Cash-step working amount (decoupled from the payments[] array
  // so the cashier can type freely without each keystroke mutating
  // parent state). Synced to the first cash line on Complete. -----
  const [cashAmount, setCashAmount] = React.useState<number>(0)
  React.useEffect(() => {
    if (step === "cash") {
      // Seed from an existing cash line if there is one, else 0.
      const existing = payments.find((p) => p.method === "cash")?.amount ?? 0
      setCashAmount(existing > 0 ? existing : 0)
    }
  }, [step, payments])

  // ----- Card-step reference (auth code / last 4) -----
  const [cardRef, setCardRef] = React.useState("")
  React.useEffect(() => {
    if (step === "card") setCardRef("")
  }, [step])

  // ----- Split-step even-split counter -----
  const [splitWays, setSplitWays] = React.useState(1)

  // "Add a tip" reveal for modes where tips aren't suggested by default.
  const [tipOpen, setTipOpen] = React.useState(false)
  const showTipBlock = tipSuggested || tipOpen || (tip || 0) > 0
  // Which preset is active (for highlight) — derived, not stored.
  const activePreset = TIP_PRESETS.find(
    (p) => Math.abs(Math.round(total * p) / 100 - (tip || 0)) < 0.005,
  )

  // ----- Apply cash payment + advance to confirm -----
  const completeCash = () => {
    if (cashAmount < grandTotal) return
    const cashIdx = payments.findIndex((p) => p.method === "cash")
    if (cashIdx >= 0) {
      onUpdatePayment(cashIdx, { method: "cash", amount: cashAmount })
    } else if (payments.length === 1 && payments[0]!.amount === 0) {
      // Single empty line in the array — reuse it.
      onUpdatePayment(0, { method: "cash", amount: cashAmount })
    } else {
      onAddPayment()
      // Caller appends the new line; bumping its amount happens on the
      // next render path. The completeWhenReady effect below catches it.
    }
    // Defer the parent's confirm until React has flushed the update —
    // this guarantees the payment line shows the new amount and the
    // sale snapshot is correct.
    queueMicrotask(onConfirm)
  }

  // ----- Apply card payment ("mark paid", since no real terminal). -----
  const completeCard = () => {
    const cardIdx = payments.findIndex((p) => p.method === "card")
    if (cardIdx >= 0) {
      onUpdatePayment(cardIdx, { method: "card", amount: grandTotal, reference: cardRef || undefined })
    } else if (payments.length === 1 && payments[0]!.amount === 0) {
      onUpdatePayment(0, { method: "card", amount: grandTotal, reference: cardRef || undefined })
    } else {
      onAddPayment()
    }
    queueMicrotask(onConfirm)
  }

  // ----- Apply a single 'other' tender by method -----
  const completeOther = (method: PaymentMethod) => {
    const idx = payments.findIndex((p) => p.method === method)
    const ref = method === "other" && virtualAccount ? virtualAccount.accountNumber : undefined
    if (idx >= 0) {
      onUpdatePayment(idx, { method, amount: grandTotal, reference: ref })
    } else if (payments.length === 1 && payments[0]!.amount === 0) {
      onUpdatePayment(0, { method, amount: grandTotal, reference: ref })
    } else {
      onAddPayment()
    }
    queueMicrotask(onConfirm)
  }

  // ----- Method-picker: tap a square to enter its step -----
  const pickMethod = (next: Step) => setStep(next)

  // ----- Header (changes per step) -----
  const stepTitle =
    step === "method" ? "Checkout"
    : step === "cash" ? "Cash payment"
    : step === "card" ? "Card payment"
    : step === "split" ? "Split bill"
    : "Other payment"

  const stepDescription = (
    <div className="flex flex-col gap-0.5">
      <span className="text-lg font-bold tabular-nums text-foreground">
        Charge {formatPrice(grandTotal)}
      </span>
      {tip > 0 && (
        <span className="text-[11px] text-muted-foreground">incl. {formatPrice(tip)} tip</span>
      )}
      {step === "split" && paid > 0 && remaining > 0 && (
        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          {formatPrice(remaining)} remaining · {formatPrice(paid)} taken
        </span>
      )}
    </div>
  )

  // Back arrow on every step except 'method'.
  const headerRight =
    step === "method" ? null : (
      <button
        type="button"
        onClick={() => setStep("method")}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Back to payment method"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
    )

  // ----- Footer (per-step) -----
  const footer = (
    <div className="flex flex-col gap-2 pb-3">
      {step === "method" && onSavePartial && (
        <Button type="button" variant="outline" onClick={onSavePartial} className="w-full">
          Save as deposit / layaway
        </Button>
      )}

      {step === "cash" && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {cashAmount >= grandTotal ? "Change due" : "Still needed"}
            </span>
            <span
              className={cn(
                "text-base font-bold tabular-nums",
                cashAmount >= grandTotal
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400",
              )}
            >
              {formatPrice(
                cashAmount >= grandTotal
                  ? Math.round((cashAmount - grandTotal) * 100) / 100
                  : Math.round((grandTotal - cashAmount) * 100) / 100,
              )}
            </span>
          </div>
          <Button
            type="button"
            onClick={completeCash}
            disabled={cashAmount < grandTotal}
            className="w-full"
          >
            <CheckCircle2 className="h-4 w-4" />
            {cashAmount >= grandTotal
              ? cashAmount > grandTotal
                ? `Complete · ${formatPrice(Math.round((cashAmount - grandTotal) * 100) / 100)} change`
                : "Complete sale"
              : "Enter at least " + formatPrice(grandTotal)}
          </Button>
        </>
      )}

      {step === "card" && (
        <Button type="button" onClick={completeCard} className="w-full">
          <CheckCircle2 className="h-4 w-4" />
          Mark paid · {formatPrice(grandTotal)}
        </Button>
      )}

      {step === "split" && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {remaining > 0 ? "Remaining" : change > 0 ? "Change due" : "Settled"}
            </span>
            <span
              className={cn(
                "text-base font-bold tabular-nums",
                remaining > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : change > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "",
              )}
            >
              {formatPrice(remaining > 0 ? remaining : change)}
            </span>
          </div>
          <Button type="button" onClick={onConfirm} disabled={!fullyPaid} className="w-full">
            <CheckCircle2 className="h-4 w-4" />
            {fullyPaid ? "Complete sale" : "Add more payment"}
          </Button>
          {onSavePartial && !fullyPaid && paid > 0 && (
            <Button type="button" variant="outline" onClick={onSavePartial} className="w-full">
              Take {formatPrice(paid)} deposit · owe {formatPrice(remaining)}
            </Button>
          )}
        </>
      )}
    </div>
  )

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      drawerBreakpoint={1024}
      title={stepTitle}
      description={stepDescription}
      headerRight={headerRight}
      maxHeightVh={92}
      footer={footer}
    >
      {/* ----- Step 1: method picker ----- */}
      {step === "method" && (
        <div className="flex flex-col gap-4">
          {/* Loyalty pill */}
          {account && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-brand/30 bg-brand-soft/50 p-3 dark:bg-primary/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand dark:text-primary" />
                <div className="text-xs">
                  <p className="font-semibold">{account.name || account.id}</p>
                  <p className="text-muted-foreground">
                    {account.points} pts
                    {account.storeCredit > 0 && <> · {formatPrice(account.storeCredit)} credit</>}
                  </p>
                </div>
              </div>
              {onRedeemPoints && account.points > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRedeemPoints(account.id, account.points)}
                >
                  Redeem points
                </Button>
              )}
            </div>
          )}

          {/* Tip block (hospitality / services suggested; retail hidden until toggled) */}
          {showTipBlock ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tip
                </p>
                {(tip || 0) > 0 && (
                  <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{formatPrice(tip)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => onTipChange(0)}
                  className={cn(
                    "rounded-xl border py-2.5 text-xs font-semibold transition-colors",
                    (tip || 0) === 0
                      ? "border-brand bg-brand text-brand-foreground dark:border-primary dark:bg-primary dark:text-primary-foreground"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  No tip
                </button>
                {TIP_PRESETS.map((pct) => {
                  const amt = Math.round(total * pct) / 100
                  const active = activePreset === pct
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => onTipChange(active ? 0 : amt)}
                      className={cn(
                        "rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                        active
                          ? "border-brand bg-brand text-brand-foreground dark:border-primary dark:bg-primary dark:text-primary-foreground"
                          : "border-border bg-card hover:bg-accent",
                      )}
                    >
                      {pct}%
                    </button>
                  )
                })}
                <div className="flex items-center rounded-xl border border-input bg-background pl-2">
                  <span className="text-xs text-muted-foreground">{symbol}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={tip === 0 ? "" : tip}
                    onChange={(e) => onTipChange(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Custom"
                    min={0}
                    step="0.01"
                    aria-label="Custom tip"
                    className="h-full w-full bg-transparent px-1 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTipOpen(true)}
              className="inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <HandCoins className="h-3.5 w-3.5" /> Add a tip
            </button>
          )}

          {/* 2x2 method grid — Square/Toast pattern */}
          <div className="grid grid-cols-2 gap-2">
            <MethodTile
              Icon={Banknote}
              label="Cash"
              hint="Enter amount, get change"
              onClick={() => pickMethod("cash")}
            />
            <MethodTile
              Icon={CreditCard}
              label="Card"
              hint="Tap, swipe, or insert"
              onClick={() => pickMethod("card")}
            />
            <MethodTile
              Icon={Split}
              label="Split"
              hint="Two or more tenders"
              onClick={() => pickMethod("split")}
            />
            <MethodTile
              Icon={Building2}
              label="Other"
              hint="Transfer · gift card · credit"
              onClick={() => pickMethod("other")}
            />
          </div>
        </div>
      )}

      {/* ----- Step 2: cash ----- */}
      {step === "cash" && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Customer pays
            </p>
            <div className="flex h-14 items-center rounded-xl border border-input bg-background pl-3 text-xl">
              <span className="text-muted-foreground">{symbol}</span>
              <input
                type="number"
                inputMode="decimal"
                value={cashAmount === 0 ? "" : cashAmount}
                onChange={(e) => setCashAmount(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                min={0}
                step="0.01"
                aria-label="Cash amount tendered"
                className="h-full w-full bg-transparent px-2 font-bold tabular-nums outline-none"
                autoFocus
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick amounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              {cashDenominations.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setCashAmount(amount)}
                  className="rounded-xl border border-border bg-card py-3 text-sm font-semibold tabular-nums transition-colors hover:border-brand/40 hover:bg-accent"
                >
                  {formatPrice(amount)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCashAmount(grandTotal)}
                className="col-span-3 rounded-xl border border-brand/30 bg-brand-soft py-3 text-sm font-semibold tabular-nums text-brand transition-colors hover:bg-brand/10 dark:bg-primary/15 dark:text-primary"
              >
                Exact {formatPrice(grandTotal)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----- Step 3: card ----- */}
      {step === "card" && (
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand/20 dark:bg-primary/20" />
            <CreditCard className="relative h-10 w-10" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-base font-bold">Tap, swipe, or insert</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Use the connected terminal. No terminal? Mark this card sale as paid and capture the
              auth code below.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <label className="block text-left">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reference (optional)
              </span>
              <Input
                value={cardRef}
                onChange={(e) => setCardRef(e.target.value)}
                placeholder="Auth code or last 4"
              />
            </label>
          </div>
        </div>
      )}

      {/* ----- Step 4: split ----- */}
      {step === "split" && (
        <div className="flex flex-col gap-4">
          {/* Loyalty pill repeats here so split-flow operators see it. */}
          {account && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-brand/30 bg-brand-soft/50 p-3 dark:bg-primary/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand dark:text-primary" />
                <div className="text-xs">
                  <p className="font-semibold">{account.name || account.id}</p>
                  <p className="text-muted-foreground">
                    {account.points} pts
                    {account.storeCredit > 0 && <> · {formatPrice(account.storeCredit)} credit</>}
                  </p>
                </div>
              </div>
              {onRedeemPoints && account.points > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRedeemPoints(account.id, account.points)}
                >
                  Redeem points
                </Button>
              )}
            </div>
          )}

          {/* Even split helper */}
          {onAddShare && (
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Split evenly
                </p>
                <div className="inline-flex items-center gap-1 rounded-md border border-input">
                  <button
                    type="button"
                    onClick={() => setSplitWays((n) => Math.max(1, n - 1))}
                    className="h-7 w-7 text-muted-foreground hover:bg-accent"
                    aria-label="Fewer ways"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{splitWays}</span>
                  <button
                    type="button"
                    onClick={() => setSplitWays((n) => Math.min(12, n + 1))}
                    className="h-7 w-7 text-muted-foreground hover:bg-accent"
                    aria-label="More ways"
                  >
                    +
                  </button>
                </div>
              </div>
              {splitWays > 1 && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatPrice(Math.round((grandTotal / splitWays) * 100) / 100)} each
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={remaining <= 0}
                    onClick={() => {
                      const share = Math.min(remaining, Math.round((grandTotal / splitWays) * 100) / 100)
                      onAddShare(share)
                      toast.success(`Share of ${formatPrice(share)} added.`)
                    }}
                  >
                    Add a share
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Payment lines */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Payment lines
              </p>
              <button
                type="button"
                onClick={onAddPayment}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-brand hover:bg-brand-soft dark:text-primary dark:hover:bg-primary/15"
              >
                <Plus className="h-3.5 w-3.5" /> Add another method
              </button>
            </div>
            <ul className="space-y-2">
              {payments.map((p, idx) => {
                const others = paid - (Number.isFinite(p.amount) ? p.amount : 0)
                const outstanding = Math.max(0, Math.round((grandTotal - others) * 100) / 100)
                return (
                  <li key={idx} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {SPLIT_METHODS.map((m) => {
                        const Icon = m.Icon
                        const active = p.method === m.value
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => onUpdatePayment(idx, { method: m.value, amount: 0, reference: "" })}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                              active
                                ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                                : "border border-border bg-card text-foreground hover:bg-accent",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" /> {m.label}
                          </button>
                        )
                      })}
                    </div>

                    {p.method === "gift-card" ? (
                      <GiftCardTender
                        code={p.reference || ""}
                        amount={p.amount}
                        outstanding={outstanding}
                        onChange={(part) => onUpdatePayment(idx, part)}
                      />
                    ) : p.method === "store-credit" ? (
                      <StoreCreditTender
                        available={account?.storeCredit ?? 0}
                        hasCustomer={!!loyaltyId}
                        amount={p.amount}
                        outstanding={outstanding}
                        onApply={(amt) => onUpdatePayment(idx, { amount: amt, reference: "Store credit" })}
                      />
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-10 flex-1 items-center rounded-lg border border-input bg-background pl-3">
                          <span className="text-sm text-muted-foreground">{symbol}</span>
                          <input
                            type="number"
                            value={p.amount === 0 ? "" : p.amount}
                            onChange={(e) =>
                              onUpdatePayment(idx, { amount: e.target.value === "" ? 0 : Number(e.target.value) || 0 })
                            }
                            placeholder="0.00"
                            aria-label={`Amount for payment ${idx + 1}`}
                            className="h-full w-full bg-transparent px-2 text-sm outline-none"
                          />
                        </div>
                        <Input
                          placeholder="Reference (opt)"
                          value={p.reference || ""}
                          onChange={(e) => onUpdatePayment(idx, { reference: e.target.value })}
                          className="hidden flex-1 sm:block"
                        />
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemovePayment(idx)}
                            aria-label="Remove split"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {(p.method === "gift-card" || p.method === "store-credit") && payments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemovePayment(idx)}
                        className="mt-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Remove this split
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {virtualAccount && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
              <p className="mb-1 font-semibold">Virtual account (for transfers)</p>
              <p className="text-muted-foreground">
                {virtualAccount.bank} · <span className="font-mono">{virtualAccount.accountNumber}</span>
              </p>
              <p className="text-muted-foreground">{virtualAccount.accountName}</p>
            </div>
          )}
        </div>
      )}

      {/* ----- Step 5: other ----- */}
      {step === "other" && (
        <div className="flex flex-col gap-2">
          {OTHER_METHODS.map((m) => {
            const Icon = m.Icon
            // Bank transfer surfaces the assigned virtual account so the
            // cashier can dictate it to the customer.
            const subline =
              m.value === "other" && virtualAccount
                ? `${virtualAccount.bank} · ${virtualAccount.accountNumber}`
                : m.hint
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => completeOther(m.value)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-brand/40 hover:bg-accent"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{subline}</p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {formatPrice(grandTotal)}
                </span>
              </button>
            )
          })}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Gift card and store credit may need a code or attached customer.
          </p>
        </div>
      )}
    </BottomSheet>
  )
}

// Big touch-friendly method tile — used in the step-1 picker.
function MethodTile({
  Icon,
  label,
  hint,
  onClick,
}: {
  Icon: LucideIcon
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-20 flex-col items-start justify-center gap-1 rounded-2xl border border-border bg-card p-3 text-left transition-all",
        "hover:border-brand/40 hover:bg-accent active:scale-[0.98]",
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-bold">{label}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </button>
  )
}

// Gift-card tender: type the code, Apply pulls the live balance and
// fills the amount (capped to what's still owed). The actual deduction
// happens at sale confirmation, not here. POS-2.
function GiftCardTender({
  code,
  amount,
  outstanding,
  onChange,
}: {
  code: string
  amount: number
  outstanding: number
  onChange: (part: Partial<PaymentLine>) => void
}) {
  const { formatPrice } = useCurrency()
  const card = code.trim() ? getGiftCard(code) : undefined
  const apply = () => {
    if (!card || card.status === "void") return
    const next = Math.min(card.currentBalance, outstanding)
    onChange({ amount: next })
    toast.success(`Gift card applied · ${formatPrice(next)}.`)
  }
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="Gift card code"
          value={code}
          onChange={(e) => onChange({ reference: e.target.value, amount: 0 })}
          className="flex-1 font-mono"
        />
        <Button type="button" variant="outline" onClick={apply} disabled={!card || card.status === "void"}>
          Apply
        </Button>
      </div>
      {code.trim() && !card && (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">No card with that code.</p>
      )}
      {card && (
        <p className="text-[11px] text-muted-foreground">
          Balance {formatPrice(card.currentBalance)}
          {card.status === "void" && " · voided"}
          {amount > 0 && (
            <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">
              · applying {formatPrice(amount)}
            </span>
          )}
        </p>
      )}
    </div>
  )
}

// Store-credit tender: shows the attached customer's balance and applies
// as much as is owed. POS-2.
function StoreCreditTender({
  available,
  hasCustomer,
  amount,
  outstanding,
  onApply,
}: {
  available: number
  hasCustomer: boolean
  amount: number
  outstanding: number
  onApply: (amt: number) => void
}) {
  const { formatPrice } = useCurrency()
  if (!hasCustomer) {
    return (
      <p className="mt-2 text-[11px] text-muted-foreground">
        Attach a customer (with email or phone) to use store credit.
      </p>
    )
  }
  const usable = Math.min(available, outstanding)
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <p className="text-[11px] text-muted-foreground">
        Available {formatPrice(available)}
        {amount > 0 && (
          <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">
            · using {formatPrice(amount)}
          </span>
        )}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={usable <= 0}
        onClick={() => {
          onApply(usable)
          toast.success(`Store credit applied · ${formatPrice(usable)}.`)
        }}
      >
        Use {formatPrice(usable)}
      </Button>
    </div>
  )
}
