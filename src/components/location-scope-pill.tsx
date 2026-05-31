import * as React from "react"
import { Globe2, MapPin } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocationScope } from "@/hooks/use-location-scope"
import { cn } from "@/lib/utils"

// Global location-scope toggle. Lives in the desktop top bar +
// (compact form) in the mobile top bar trailing slot.
//
// Distinct from OrgLocationSwitch — that one binds the operator's
// own till/clocked-in location (POS uses it). This one only affects
// READ views (dashboard, reports, sales/inventory lists). See the
// header comment in `hooks/use-location-scope.tsx` for why the two
// are kept independent.
export function LocationScopePill({ className, variant = "default" }: { className?: string; variant?: "default" | "compact" }) {
  const { scope, setScope, locations, isAll, current } = useLocationScope()
  const Icon = isAll ? Globe2 : MapPin
  const isCompact = variant === "compact"

  return (
    <Select value={scope} onValueChange={setScope}>
      <SelectTrigger
        className={cn(
          // Pill look: rounded, brand-tinted background so it
          // reads as "view scope" not "form field".
          "h-9 gap-1.5 rounded-full border-border bg-brand-soft/40 px-3 text-xs font-medium dark:bg-primary/10",
          isCompact ? "w-auto min-w-0" : "w-[140px] lg:w-[180px]",
          className,
        )}
        aria-label="View scope (location filter for reports + dashboards)"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-brand dark:text-primary" />
          <SelectValue>
            {/* On the compact (mobile) variant, just show the
                short label — the icon already cues the scope. */}
            <span className={cn("truncate", isCompact ? "max-w-[80px]" : "")}>
              {isCompact ? shortLabel(current.label) : current.label}
            </span>
          </SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent>
        {locations.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm font-semibold">{l.label}</span>
              {l.sub && <span className="text-[11px] text-muted-foreground">{l.sub}</span>}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// "All locations" → "All", "Warehouse A" → "Warehouse", "Downtown
// Store" → "Downtown". Keeps the mobile pill from eating the title.
function shortLabel(label: string): string {
  if (label === "All locations") return "All"
  return label.split(/\s+/)[0]
}
