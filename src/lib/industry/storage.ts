// F1 — Industry storage + reconciliation.
//
// The active industry has TWO writers historically:
//   1. The first-run "What do you run?" modal + Settings → Business (already shipped) —
//      writes a `BusinessProfile` blob to `pallio:business-profile:v1` whose `industry`
//      field is one of 6 onboarding keys (retail | food | services | auto | manufacturing | other).
//   2. F1's richer 10-key IndustryProfile (this module) — `retail | restaurant | qsr |
//      services | auto | apparel | pharmacy | gym | hotel | manufacturing`.
//
// We don't fork the user's intent across two keys. Strategy:
//   * Single-source preference is `pallio:industry` (this module's key).
//   * If `pallio:industry` is missing, fall back to the business-profile industry,
//     mapped through `BUSINESS_PROFILE_TO_INDUSTRY` so e.g. "food" promotes to "restaurant".
//   * When setActiveIndustry runs, it also rewrites the business-profile key (mapped back
//     through `INDUSTRY_TO_BUSINESS_PROFILE`) so the onboarding answer stays in sync.
//
// Persistence flows through `kv` per repo convention (never localStorage directly).

import { kv } from "@/lib/storage/kv"
import { kvJson } from "@/lib/storage/kv"
import { INDUSTRIES, type IndustryKey } from "./profile"

export const INDUSTRY_KEY = "pallio:industry"
export const INDUSTRY_CHANGED_EVENT = "pallio:industry-changed"

// Business-profile module's narrower IndustryKey. Kept as a string union here so
// this file doesn't import from `lib/profile/business-profile.ts` and create a
// circular type dependency.
type BusinessProfileIndustry = "retail" | "food" | "services" | "auto" | "manufacturing" | "other"

const BUSINESS_PROFILE_KEY = "pallio:business-profile:v1"

type StoredBusinessProfile = {
  industry: BusinessProfileIndustry
  sells: "products" | "services" | "both"
  setAt: number
}

// Map the legacy 6-key onboarding answer → richer F1 IndustryKey.
// "food" is the closest umbrella → promote to "restaurant" (sit-down covers more
// surface area than qsr; F1 sweep can refine). "other" → "retail" (the most
// neutral, broadest default).
const BUSINESS_PROFILE_TO_INDUSTRY: Record<BusinessProfileIndustry, IndustryKey> = {
  retail: "retail",
  food: "restaurant",
  services: "services",
  auto: "auto",
  manufacturing: "manufacturing",
  other: "retail",
}

// Reverse map: F1 IndustryKey → business-profile's narrower key. Industries
// without a direct twin collapse to their nearest umbrella so the business
// profile remains a valid 6-way enum.
const INDUSTRY_TO_BUSINESS_PROFILE: Record<IndustryKey, BusinessProfileIndustry> = {
  retail: "retail",
  restaurant: "food",
  qsr: "food",
  services: "services",
  auto: "auto",
  apparel: "retail",
  pharmacy: "retail",
  gym: "services",
  hotel: "services",
  manufacturing: "manufacturing",
}

function isIndustryKey(value: unknown): value is IndustryKey {
  return typeof value === "string" && value in INDUSTRIES
}

/**
 * Read the active industry. Resolution order:
 *   1. `pallio:industry` if set + valid
 *   2. business profile (mapped) if present
 *   3. "retail" as the neutral default
 */
export function getActiveIndustry(): IndustryKey {
  const direct = kv.get(INDUSTRY_KEY)
  if (isIndustryKey(direct)) return direct

  const profile = kvJson.get<StoredBusinessProfile>(BUSINESS_PROFILE_KEY)
  if (profile && profile.industry in BUSINESS_PROFILE_TO_INDUSTRY) {
    return BUSINESS_PROFILE_TO_INDUSTRY[profile.industry]
  }

  return "retail"
}

/**
 * Set the active industry. Writes BOTH the F1 key and the business-profile key
 * (so the onboarding answer stays in sync) and fires a window event so any
 * mounted `useIndustry()` hook re-renders without a full reload.
 */
export function setActiveIndustry(key: IndustryKey): void {
  if (!isIndustryKey(key)) return

  void kv.set(INDUSTRY_KEY, key)

  // Mirror into business-profile so legacy consumers (onboarding step ordering,
  // first-run modal) reflect the same choice. Preserve existing `sells`.
  const existing = kvJson.get<StoredBusinessProfile>(BUSINESS_PROFILE_KEY)
  const next: StoredBusinessProfile = {
    industry: INDUSTRY_TO_BUSINESS_PROFILE[key],
    sells: existing?.sells ?? "products",
    setAt: Date.now(),
  }
  void kvJson.set(BUSINESS_PROFILE_KEY, next)

  // Notify hook consumers in this tab/process.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INDUSTRY_CHANGED_EVENT, { detail: key }))
    // Keep the legacy event firing too — existing first-run / onboarding code
    // listens for this, and we don't want a silent desync.
    window.dispatchEvent(new CustomEvent("pallio:business-profile-changed"))
  }
}
