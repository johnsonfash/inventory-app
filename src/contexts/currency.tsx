import * as React from "react"
import { kv } from "@/lib/storage/kv"

// Ported from jax-technology — the property+beauty app uses the same
// shape (CURRENCY_SYMBOLS + SUPPORTED_CURRENCIES + useCurrency() +
// formatPrice). Pallio's version persists the user's choice to kv
// instead of an org-settings API (until the backend lands).
//
// 8 codes — union of jax/property's useCurrency.tsx and jax/beauty's
// CurrencyContext.tsx, so any currency listed anywhere in jax works
// here. NGN is the default since Pallio's first market is Nigeria.

export type CurrencyCode = "NGN" | "USD" | "EUR" | "GBP" | "GHS" | "KES" | "ZAR" | "SLL"

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  GHS: "₵",
  KES: "KSh",
  ZAR: "R",
  SLL: "Le",
}

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "NGN", label: "Nigerian Naira",         symbol: "₦"  },
  { code: "USD", label: "US Dollar",              symbol: "$"  },
  { code: "EUR", label: "Euro",                   symbol: "€"  },
  { code: "GBP", label: "British Pound",          symbol: "£"  },
  { code: "GHS", label: "Ghanaian Cedi",          symbol: "₵"  },
  { code: "KES", label: "Kenyan Shilling",        symbol: "KSh" },
  { code: "ZAR", label: "South African Rand",     symbol: "R"  },
  { code: "SLL", label: "Sierra Leonean Leone",   symbol: "Le" },
]

const STORAGE_KEY = "pallio:currency"
const DEFAULT_CURRENCY: CurrencyCode = "NGN"

// Currencies that conventionally render whole units only — kobo,
// dalasi sub-units etc. aren't typically shown in NG/SL retail. The
// formatter switches to 0-decimal display for these.
const ZERO_DECIMAL = new Set<CurrencyCode>(["NGN", "KES", "SLL", "GHS"])

// Common cash-tender denominations per currency. Used by the POS cash
// step to let the cashier tap "the buyer handed me ₦5,000" without
// typing. Values are the largest realistic note + a handful of
// smaller ones so the buttons cover roughly 80% of real-world tenders.
const CASH_DENOMINATIONS: Record<CurrencyCode, number[]> = {
  NGN: [500, 1000, 2000, 5000, 10000, 20000],
  USD: [5, 10, 20, 50, 100, 200],
  EUR: [5, 10, 20, 50, 100, 200],
  GBP: [5, 10, 20, 50, 100, 200],
  ZAR: [5, 10, 20, 50, 100, 200],
  GHS: [10, 20, 50, 100, 200, 500],
  KES: [50, 100, 200, 500, 1000, 2000],
  SLL: [5000, 10000, 20000, 50000, 100000, 200000],
}

/** Suggested cash-tender buttons for a given currency. Used by the
 *  CheckoutSheet's cash step. */
export function cashDenominations(code: CurrencyCode = getCurrentCurrency()): number[] {
  return CASH_DENOMINATIONS[code] ?? CASH_DENOMINATIONS.USD
}

/** Sync read for non-React callsites (mock data files, command palette
 *  sources, etc.). Reads localStorage via the kv shim so it stays in
 *  sync with what the provider would resolve. */
export function getCurrentCurrency(): CurrencyCode {
  const v = kv.get(STORAGE_KEY) as CurrencyCode | null
  if (v && v in CURRENCY_SYMBOLS) return v
  return DEFAULT_CURRENCY
}

/** Symbol for a code — handles unknown codes by returning the input. */
export function symbolFor(code: CurrencyCode): string {
  return CURRENCY_SYMBOLS[code] ?? "$"
}

/** Format `n` as a price string in the supplied currency. Used by mock
 *  data files that can't call the hook. */
export function formatPriceFor(n: number | null | undefined, code: CurrencyCode = getCurrentCurrency()): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  const symbol = symbolFor(code)
  const opts: Intl.NumberFormatOptions = ZERO_DECIMAL.has(code)
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  return `${symbol}${n.toLocaleString(undefined, opts)}`
}

/** Compact format for tight tiles ("₦18.4k", "$1.2M"). */
export function formatPriceCompact(n: number | null | undefined, code: CurrencyCode = getCurrentCurrency()): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—"
  const symbol = symbolFor(code)
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 1_000)     return `${symbol}${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return formatPriceFor(n, code)
}

// ----- React context -----
type CurrencyContextType = {
  currency: CurrencyCode
  symbol: string
  formatPrice: (n: number | null | undefined) => string
  formatCompact: (n: number | null | undefined) => string
  /** Tap-friendly cash denominations for the current currency. */
  cashDenominations: number[]
  setCurrency: (code: CurrencyCode) => Promise<void>
}

const CurrencyContext = React.createContext<CurrencyContextType | null>(null)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = React.useState<CurrencyCode>(() => getCurrentCurrency())

  const value = React.useMemo<CurrencyContextType>(
    () => ({
      currency,
      symbol: symbolFor(currency),
      formatPrice: (n) => formatPriceFor(n, currency),
      formatCompact: (n) => formatPriceCompact(n, currency),
      cashDenominations: cashDenominations(currency),
      setCurrency: async (code: CurrencyCode) => {
        await kv.set(STORAGE_KEY, code)
        setCurrencyState(code)
      },
    }),
    [currency],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

/** Hook variant — mirrors jax's useCurrency() API. Returns a default
 *  formatter outside a provider so static helpers don't crash. */
export function useCurrency(): CurrencyContextType {
  const ctx = React.useContext(CurrencyContext)
  if (ctx) return ctx
  const fallback: CurrencyCode = getCurrentCurrency()
  return {
    currency: fallback,
    symbol: symbolFor(fallback),
    formatPrice: (n) => formatPriceFor(n, fallback),
    formatCompact: (n) => formatPriceCompact(n, fallback),
    cashDenominations: cashDenominations(fallback),
    setCurrency: async () => {
      // outside provider — no-op
    },
  }
}
