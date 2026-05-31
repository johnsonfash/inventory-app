import * as React from "react"

import {
  applyTerm,
  hasCapability,
  getIndustryProfile,
  type Capability,
  type IndustryKey,
  type IndustryProfile,
  type TermKey,
} from "@/lib/industry/profile"
import {
  INDUSTRY_CHANGED_EVENT,
  getActiveIndustry,
} from "@/lib/industry/storage"

// F1 — Industry curation hooks.
//
// Mirrors the pattern in `use-org-location.tsx`:
//   * A small provider exposes the current IndustryProfile via context so
//     consumers don't each subscribe to the window event separately.
//   * setActiveIndustry() (in lib/industry/storage.ts) dispatches
//     `pallio:industry-changed`; this provider listens, recomputes the
//     profile, and re-renders subscribers without a full reload.
//   * Hooks read from context so a single subscription drives the whole tree.
//
// Curation is SOFT. The profile influences default copy + suggested visibility,
// but every Pallio feature stays reachable. See memory: feedback_no_hard_modules.

type IndustryContextValue = {
  industry: IndustryKey
  profile: IndustryProfile
}

const IndustryContext = React.createContext<IndustryContextValue | null>(null)

function readProfile(): IndustryContextValue {
  const industry = getActiveIndustry()
  return { industry, profile: getIndustryProfile(industry) }
}

export function IndustryProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = React.useState<IndustryContextValue>(() => readProfile())

  React.useEffect(() => {
    const onChange = () => setValue(readProfile())
    window.addEventListener(INDUSTRY_CHANGED_EVENT, onChange)
    // Also listen to the legacy business-profile event — the Settings → Business
    // page (and first-run modal) may save through that path before this module
    // is everywhere. Cheap to listen; idempotent if both fire.
    window.addEventListener("pallio:business-profile-changed", onChange)
    return () => {
      window.removeEventListener(INDUSTRY_CHANGED_EVENT, onChange)
      window.removeEventListener("pallio:business-profile-changed", onChange)
    }
  }, [])

  return <IndustryContext.Provider value={value}>{children}</IndustryContext.Provider>
}

function useIndustryContext(): IndustryContextValue {
  const ctx = React.useContext(IndustryContext)
  if (ctx) return ctx
  // Out-of-provider fallback — same defensive pattern the currency context
  // uses. Means a stray test or storybook render doesn't crash; it just gets
  // the default "retail" profile.
  return readProfile()
}

/** The active industry profile (terms + capabilities + curation hints). */
export function useIndustry(): IndustryProfile {
  return useIndustryContext().profile
}

/** Active IndustryKey. Convenience for code that only needs the discriminator. */
export function useIndustryKey(): IndustryKey {
  return useIndustryContext().industry
}

/**
 * Look up a localised term for the current industry, with a fallback the
 * caller wants to show if this industry doesn't override it. Designed to be
 * used inline:
 *
 *     const label = useTerm("item", "Item")
 */
export function useTerm(key: TermKey, fallback: string): string {
  const { profile } = useIndustryContext()
  return applyTerm(profile, key, fallback)
}

/** True when this industry's profile flags the capability ON. */
export function useCapability(cap: Capability): boolean {
  const { profile } = useIndustryContext()
  return hasCapability(profile, cap)
}

/**
 * Sidebar curation hint. Returns the NAV group titles this industry typically
 * doesn't need — sidebar may demote/hide them by default. NOT a gate; the user
 * can still re-enable, and the routes remain reachable.
 */
export function useNavCuration(): { softHide: Set<string> } {
  const { profile } = useIndustryContext()
  return React.useMemo(
    () => ({ softHide: new Set(profile.softHideSections) }),
    [profile],
  )
}
