import { kvJson } from "@/lib/storage/kv"

// Gift cards, loyalty points, and store credit — the "value instruments"
// of POS-2. All persisted through kv so they survive reloads and mirror
// to the native store; the backend will own these tables later. Generic
// across industries (a salon prepaid balance is store credit; a
// restaurant gift card is a gift card; a retail rewards programme is
// loyalty points).

// ---------------- Gift cards ----------------

export type GiftCardStatus = "active" | "redeemed" | "void"

export type GiftCard = {
  code: string
  originalAmount: number
  currentBalance: number
  issuedAt: number
  expiresAt?: number
  status: GiftCardStatus
  customer?: { name?: string; email?: string; phone?: string } | null
}

const GIFT_CARDS_KEY = "pos:giftcards:v1"

export function listGiftCards(): GiftCard[] {
  return kvJson.get<GiftCard[]>(GIFT_CARDS_KEY) ?? []
}

function saveGiftCards(list: GiftCard[]) {
  void kvJson.set(GIFT_CARDS_KEY, list)
}

// Human-friendly, hard-to-mistype code: GC-XXXX-XXXX (no 0/O/1/I).
export function genGiftCardCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")
  return `GC-${block()}-${block()}`
}

export function getGiftCard(code: string): GiftCard | undefined {
  const norm = code.trim().toUpperCase()
  return listGiftCards().find((g) => g.code.toUpperCase() === norm)
}

export function createGiftCard(opts: {
  amount: number
  customer?: GiftCard["customer"]
  expiresAt?: number
}): GiftCard {
  const card: GiftCard = {
    code: genGiftCardCode(),
    originalAmount: opts.amount,
    currentBalance: opts.amount,
    issuedAt: Date.now(),
    expiresAt: opts.expiresAt,
    status: "active",
    customer: opts.customer ?? null,
  }
  saveGiftCards([card, ...listGiftCards()])
  return card
}

/** Deduct up to `amount` from a card. Returns the amount actually applied. */
export function redeemGiftCard(code: string, amount: number): { applied: number; balance: number } {
  const list = listGiftCards()
  const idx = list.findIndex((g) => g.code.toUpperCase() === code.trim().toUpperCase())
  if (idx === -1) return { applied: 0, balance: 0 }
  const card = list[idx]!
  if (card.status === "void") return { applied: 0, balance: card.currentBalance }
  const applied = Math.max(0, Math.min(card.currentBalance, Math.round(amount * 100) / 100))
  card.currentBalance = Math.round((card.currentBalance - applied) * 100) / 100
  card.status = card.currentBalance <= 0 ? "redeemed" : "active"
  list[idx] = card
  saveGiftCards(list)
  return { applied, balance: card.currentBalance }
}

// ---------------- Loyalty + store credit ----------------

export type LoyaltyAccount = {
  /** Stable identifier — the customer's email or phone. */
  id: string
  name?: string
  points: number
  storeCredit: number
  updatedAt: number
}

export type LoyaltyConfig = {
  /** Points earned per 1 unit of currency spent. */
  pointsPerCurrencyUnit: number
  /** Currency value of 1 point when redeemed for store credit. */
  redeemRate: number
}

const LOYALTY_KEY = "pos:loyalty:v1"
const LOYALTY_CONFIG_KEY = "pos:loyalty-config:v1"

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  pointsPerCurrencyUnit: 1, // 1 point per ₦1 / $1 spent
  redeemRate: 0.01, // 100 points = 1 unit of store credit
}

export function loyaltyConfig(): LoyaltyConfig {
  return { ...DEFAULT_LOYALTY_CONFIG, ...(kvJson.get<Partial<LoyaltyConfig>>(LOYALTY_CONFIG_KEY) ?? {}) }
}
export function saveLoyaltyConfig(next: Partial<LoyaltyConfig>) {
  void kvJson.set(LOYALTY_CONFIG_KEY, { ...loyaltyConfig(), ...next })
}

// ---------------- Operator-tunable rules (F7) ----------------
//
// Adds a second config layer for the operator-facing settings page
// (/settings/loyalty). The "Earn enabled" toggle and minimum-points
// threshold sit here instead of LoyaltyConfig so the existing
// pointsPerCurrencyUnit + redeemRate plumbing stays untouched — both
// reads merge for callers that want a single rules view.
export type LoyaltyRules = {
  pointsPerCurrencyUnit: number
  redeemRate: number
  /** Minimum points balance required before redemption is allowed. */
  minPointsToRedeem: number
  /** Operator switch to pause new point accrual without resetting balances. */
  earnEnabled: boolean
}

const LOYALTY_RULES_KEY = "pallio:loyalty:rules"

export const DEFAULT_LOYALTY_RULES: LoyaltyRules = {
  pointsPerCurrencyUnit: DEFAULT_LOYALTY_CONFIG.pointsPerCurrencyUnit,
  redeemRate: DEFAULT_LOYALTY_CONFIG.redeemRate,
  minPointsToRedeem: 100,
  earnEnabled: true,
}

export function loadLoyaltyRules(): LoyaltyRules {
  const stored = kvJson.get<Partial<LoyaltyRules>>(LOYALTY_RULES_KEY) ?? {}
  const cfg = loyaltyConfig()
  // The legacy LoyaltyConfig wins if rules haven't been set yet; once
  // the operator edits the rules page, the rules override.
  return {
    pointsPerCurrencyUnit: stored.pointsPerCurrencyUnit ?? cfg.pointsPerCurrencyUnit,
    redeemRate: stored.redeemRate ?? cfg.redeemRate,
    minPointsToRedeem: stored.minPointsToRedeem ?? DEFAULT_LOYALTY_RULES.minPointsToRedeem,
    earnEnabled: stored.earnEnabled ?? DEFAULT_LOYALTY_RULES.earnEnabled,
  }
}

export function saveLoyaltyRules(next: Partial<LoyaltyRules>) {
  const merged = { ...loadLoyaltyRules(), ...next }
  void kvJson.set(LOYALTY_RULES_KEY, merged)
  // Mirror the two shared knobs into LoyaltyConfig so the till and
  // existing earnPoints/redeemPointsForCredit reads stay in sync
  // without code changes elsewhere.
  saveLoyaltyConfig({
    pointsPerCurrencyUnit: merged.pointsPerCurrencyUnit,
    redeemRate: merged.redeemRate,
  })
}

export function listLoyalty(): LoyaltyAccount[] {
  return kvJson.get<LoyaltyAccount[]>(LOYALTY_KEY) ?? []
}
function saveLoyalty(list: LoyaltyAccount[]) {
  void kvJson.set(LOYALTY_KEY, list)
}

/** The loyalty key for a POS customer, or null when they're anonymous. */
export function loyaltyIdFor(customer?: { email?: string; phone?: string } | null): string | null {
  const id = (customer?.email || customer?.phone || "").trim().toLowerCase()
  return id || null
}

export function getLoyalty(id: string): LoyaltyAccount | undefined {
  return listLoyalty().find((a) => a.id === id)
}

function upsertLoyalty(id: string, name: string | undefined, mut: (a: LoyaltyAccount) => void): LoyaltyAccount {
  const list = listLoyalty()
  const idx = list.findIndex((a) => a.id === id)
  const acct: LoyaltyAccount = idx >= 0
    ? list[idx]!
    : { id, name, points: 0, storeCredit: 0, updatedAt: Date.now() }
  if (name && !acct.name) acct.name = name
  mut(acct)
  acct.updatedAt = Date.now()
  if (idx >= 0) list[idx] = acct
  else list.unshift(acct)
  saveLoyalty(list)
  return acct
}

/** Award points for a completed sale. Returns points earned. */
export function earnPoints(
  customer: { name?: string; email?: string; phone?: string } | null | undefined,
  amountSpent: number,
): number {
  const id = loyaltyIdFor(customer)
  if (!id) return 0
  const rules = loadLoyaltyRules()
  // Operator can pause accrual without affecting existing balances.
  if (!rules.earnEnabled) return 0
  const earned = Math.floor(amountSpent * rules.pointsPerCurrencyUnit)
  if (earned <= 0) return 0
  upsertLoyalty(id, customer?.name, (a) => {
    a.points += earned
  })
  return earned
}

/** Convert points into store credit at the configured rate. */
export function redeemPointsForCredit(id: string, points: number): { credit: number; account?: LoyaltyAccount } {
  const acct = getLoyalty(id)
  if (!acct || points <= 0 || acct.points < points) return { credit: 0, account: acct }
  const rules = loadLoyaltyRules()
  // Enforce the operator-tunable minimum-balance threshold so a
  // 12-point account doesn't dribble redemption into 12 NGN credit.
  if (acct.points < rules.minPointsToRedeem) return { credit: 0, account: acct }
  const credit = Math.round(points * rules.redeemRate * 100) / 100
  const updated = upsertLoyalty(id, acct.name, (a) => {
    a.points -= points
    a.storeCredit = Math.round((a.storeCredit + credit) * 100) / 100
  })
  return { credit, account: updated }
}

export function addStoreCredit(id: string, name: string | undefined, amount: number) {
  upsertLoyalty(id, name, (a) => {
    a.storeCredit = Math.round((a.storeCredit + amount) * 100) / 100
  })
}

/** Spend up to `amount` of store credit. Returns the amount applied. */
export function useStoreCredit(id: string, amount: number): number {
  const acct = getLoyalty(id)
  if (!acct) return 0
  const applied = Math.max(0, Math.min(acct.storeCredit, Math.round(amount * 100) / 100))
  if (applied <= 0) return 0
  upsertLoyalty(id, acct.name, (a) => {
    a.storeCredit = Math.round((a.storeCredit - applied) * 100) / 100
  })
  return applied
}
