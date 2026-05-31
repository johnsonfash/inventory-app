import { kvJson } from "@/lib/storage/kv"

// F6 — AI credit meter. Pure mock today; backend will replace the kv
// store with a metered ledger on the AI gateway.
//
// Persists at "pallio:ai-credits" as { remaining, total }. The page
// reads remaining on every render via getAiCredits(); spendCredit()
// is fire-and-forget (kv writes are async, but the read for the next
// render goes through localStorage synchronously — kv mirrors).

export type AiCredits = { remaining: number; total: number }

const STORAGE_KEY = "pallio:ai-credits"
const DEFAULT_TOTAL = 500

export function getAiCredits(): AiCredits {
  const stored = kvJson.get<AiCredits>(STORAGE_KEY)
  if (stored && typeof stored.remaining === "number" && typeof stored.total === "number") {
    return stored
  }
  const seed: AiCredits = { remaining: DEFAULT_TOTAL, total: DEFAULT_TOTAL }
  void kvJson.set(STORAGE_KEY, seed)
  return seed
}

// Returns true when the deduction succeeded (i.e. we had enough). When
// remaining hits 0 we still allow the call to proceed — the page surfaces
// a "credits exhausted" hint but doesn't block. Returning false lets the
// caller decide whether to show the warning.
export function spendCredit(amount: number = 1): boolean {
  const current = getAiCredits()
  if (current.remaining <= 0) {
    return false
  }
  const next: AiCredits = {
    remaining: Math.max(0, current.remaining - amount),
    total: current.total,
  }
  void kvJson.set(STORAGE_KEY, next)
  return true
}

export function refillCredits(amount: number): void {
  const current = getAiCredits()
  const next: AiCredits = {
    remaining: Math.min(current.total, current.remaining + amount),
    total: current.total,
  }
  void kvJson.set(STORAGE_KEY, next)
}
