import type { AggregatorKey, Period } from "./aggregators"
import { findGlossary, type GlossaryEntry } from "./glossary"

// F6 — Deterministic intent classifier. Regex + keyword matching only.
// The classifier never calls an LLM; it picks ONE of:
//
//   data    — answer with a deterministic aggregator over the live data
//   help    — answer with a glossary/nav entry
//   unknown — show the "try asking…" hint chips
//
// Why regex over ML: the answer surface is small (~10 aggregators +
// ~20 glossary entries). Regex is correct AND inspectable AND ships
// without a model.

export type IntentResult =
  | { kind: "data"; key: AggregatorKey; period?: Period; confidence: number }
  | { kind: "help"; entry: GlossaryEntry; confidence: number }
  | { kind: "unknown"; confidence: 0 }

// Period extraction — order matters, "today" before "month" so
// "sales today this month" picks today.
function detectPeriod(q: string): Period | undefined {
  if (/\btoday\b|\bso far today\b/i.test(q)) return "today"
  if (/\b(this|past|last|previous)\s*(week|7\s*days)\b|\bthis\s*week\b/i.test(q)) return "week"
  if (/\b(this|past|last|previous)\s*(month|30\s*days)\b|\bthis\s*month\b|\bmtd\b/i.test(q)) return "month"
  if (/\bof\s*all\s*time\b|\ball-time\b|\bever\b/i.test(q)) return "all"
  return undefined
}

// Data patterns — first match wins. Each pattern names the aggregator
// to invoke. Confidence is rough: 0.9 for a clean regex hit, 0.7 for
// a keyword-only hit.
const DATA_PATTERNS: Array<{ rx: RegExp; key: AggregatorKey; confidence: number }> = [
  { rx: /how\s+many\s+(orders?|checks?|tickets?|sales?|work\s*orders?|bookings?)/i,        key: "ordersCount",   confidence: 0.92 },
  { rx: /(orders?|sales?|tickets?|checks?)\s+(today|this\s*week|this\s*month|so\s*far)/i,  key: "ordersCount",   confidence: 0.85 },
  { rx: /how\s+many\s+invoices?/i,                                                          key: "invoicesCount", confidence: 0.92 },
  { rx: /(open|unpaid|overdue|outstanding)\s+invoices?/i,                                  key: "invoicesCount", confidence: 0.88 },

  { rx: /(top|best[-\s]?selling|best\s+performing|trending|most\s+sold)\b.*\b(products?|items?|skus?|menu\s*items?|parts?|services?|styles?)/i,
                                                                                            key: "topProducts",   confidence: 0.92 },
  { rx: /which\s+(products?|items?|menu\s*items?|parts?)\s+are\s+(selling|moving)/i,       key: "topProducts",   confidence: 0.88 },

  { rx: /low\s*stock|reorder|running\s+(low|out)|out\s+of\s+stock|need\s+to\s+restock/i,   key: "lowStock",      confidence: 0.94 },

  { rx: /(sales|revenue|takings|gross)\s+(today|this\s*week|this\s*month|so\s*far)/i,      key: "salesRevenue",  confidence: 0.92 },
  { rx: /how\s+much\s+did\s+(we|i)\s+(make|sell|earn)/i,                                   key: "salesRevenue",  confidence: 0.88 },
  { rx: /\b(total|gross)\s+sales\b/i,                                                       key: "salesRevenue",  confidence: 0.82 },

  { rx: /\b(tax|vat|gst|sales\s*tax)\s+(collected|owed|due|total)/i,                       key: "taxCollected",  confidence: 0.92 },
  { rx: /how\s+much\s+(tax|vat)/i,                                                          key: "taxCollected",  confidence: 0.85 },

  { rx: /how\s+many\s+(customers?|clients?|guests?|members?|patients?)/i,                  key: "customerCount", confidence: 0.92 },
  { rx: /total\s+(customers?|clients?|guests?)/i,                                           key: "customerCount", confidence: 0.85 },

  { rx: /average\s+(order|sale|ticket|basket|check|bill)\s*(value|size)?|\baov\b/i,        key: "avgOrderValue", confidence: 0.92 },

  { rx: /cash\s+(on\s+hand|in\s+drawer|in\s+till|balance)/i,                                key: "cashOnHand",    confidence: 0.94 },
  { rx: /how\s+much\s+cash/i,                                                                key: "cashOnHand",    confidence: 0.82 },

  { rx: /how\s+many\s+(staff|team\s*members?|employees?|cashiers?|technicians?|specialists?)/i,
                                                                                            key: "teamCount",     confidence: 0.92 },
]

// Help triggers — when one of these phrases appears we route to the
// glossary EVEN IF a data pattern also matched. The glossary then runs
// its own keyword score; if it finds nothing relevant we fall back to
// the data hit (handled by classifyIntent below).
const HELP_TRIGGER = /(where\s+(is|do\s+i\s+find)|how\s+(do\s+i|to)|what\s+is|what's|whats|define|explain|tell\s+me\s+about|find\s+(the|page|setting)|navigate\s+to|configure|set\s+up)/i

export function classifyIntent(query: string): IntentResult {
  const trimmed = query.trim()
  if (trimmed.length === 0) return { kind: "unknown", confidence: 0 }

  // 1) Help trigger first — operators almost always phrase "how do I"
  //    questions and we should answer those from docs, not data.
  if (HELP_TRIGGER.test(trimmed)) {
    const entry = findGlossary(trimmed)
    if (entry) return { kind: "help", entry, confidence: 0.9 }
  }

  // 2) Data patterns.
  for (const p of DATA_PATTERNS) {
    if (p.rx.test(trimmed)) {
      return { kind: "data", key: p.key, period: detectPeriod(trimmed), confidence: p.confidence }
    }
  }

  // 3) Glossary keyword fallback — covers "refund?" or single-word asks
  //    like "appointments" that didn't hit a help trigger.
  const entry = findGlossary(trimmed)
  if (entry) return { kind: "help", entry, confidence: 0.6 }

  return { kind: "unknown", confidence: 0 }
}
