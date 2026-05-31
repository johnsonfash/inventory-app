import * as React from "react"
import { toast } from "sonner"
import { Sparkles, Coins, Calculator, Power } from "lucide-react"
import { Input } from "@/components/ui/input"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { SwitchField } from "@/components/forms/switch-field"
import { useCurrency } from "@/contexts/currency"
import { loadLoyaltyRules, saveLoyaltyRules, type LoyaltyRules } from "@/lib/pos/loyalty"

// F7 — loyalty rules. Industry-agnostic: works for any business that
// wants to award points at the till. No vertical-specific bonuses.

export default function LoyaltySettings() {
  const { symbol } = useCurrency()
  const [rules, setRules] = React.useState<LoyaltyRules>(() => loadLoyaltyRules())
  const [submitting, setSubmitting] = React.useState(false)

  // Mirror form state into kv only on submit so a half-typed redemption
  // rate doesn't accidentally take effect at the till.
  const onSubmit = async () => {
    if (rules.pointsPerCurrencyUnit < 0) {
      toast.error("Points per unit can't be negative.")
      return
    }
    if (rules.redeemRate < 0) {
      toast.error("Redemption rate can't be negative.")
      return
    }
    if (rules.minPointsToRedeem < 0) {
      toast.error("Minimum points to redeem can't be negative.")
      return
    }
    setSubmitting(true)
    try {
      saveLoyaltyRules(rules)
      await new Promise((r) => setTimeout(r, 250))
      toast.success("Loyalty rules saved.")
    } catch {
      toast.error("Couldn't save loyalty rules — try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Convenience: how much currency does the operator's rule actually
  // award per 100 units of a sale? Renders so they can sanity-check.
  const sampleSpend = 100
  const sampleEarned = Math.floor(sampleSpend * rules.pointsPerCurrencyUnit)
  const sampleRedeemValue = Math.round(rules.minPointsToRedeem * rules.redeemRate * 100) / 100

  return (
    <FormShell
      title="Loyalty rules"
      description="How customers earn and redeem points."
      titleTooltip={
        <>
          Tune the earn/redeem rates for your loyalty programme. These
          values apply at the till for every customer with an attached
          email or phone. Existing point balances are not touched when
          you change the rules — only future earn/redeem events use the
          new values.
        </>
      }
      backHref="/settings"
      onSubmit={onSubmit}
      aside={
        <FormAside
          tips={[
            { title: "Earning", body: "Most retailers award 1 pt per currency unit. Higher-margin businesses (services, salons) sometimes go richer.", Icon: Sparkles },
            { title: "Redemption", body: "100 pts = 1 unit of credit is a familiar default. Adjust if you'd rather hold a higher reserve.", Icon: Coins },
            { title: "Minimum balance", body: "Stops tiny redemptions that aren't worth the operator's time at the till.", Icon: Calculator },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save loyalty rules" submitting={submitting} cancelHref="/settings" />}
    >
      <FormSection title="Earning" description="How fast customers accrue points" Icon={Sparkles}>
        <FormGrid cols={2}>
          <FormField
            label="Points per currency unit"
            hint={`e.g. 1 = 1 pt per 1${symbol === "₦" ? " naira" : ""} spent`}
            tooltip="Multiplies the sale total to award points. Fractional values are fine: 0.5 = half a point per unit spent."
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={rules.pointsPerCurrencyUnit}
              onChange={(e) =>
                setRules((r) => ({ ...r, pointsPerCurrencyUnit: Number(e.target.value) || 0 }))
              }
            />
          </FormField>
          <FormField span={2}>
            <SwitchField
              label="Earning enabled"
              description="Turn off to pause new accrual without touching existing balances. Use during promo recalibration."
              checked={rules.earnEnabled}
              onCheckedChange={(v) => setRules((r) => ({ ...r, earnEnabled: v }))}
            />
          </FormField>
        </FormGrid>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Example: a {symbol}{sampleSpend.toLocaleString()} sale earns{" "}
          <span className="font-semibold text-foreground">{sampleEarned}</span> point
          {sampleEarned === 1 ? "" : "s"}.
        </p>
      </FormSection>

      <FormSection title="Redemption" description="Converting points back into store credit" Icon={Coins}>
        <FormGrid cols={2}>
          <FormField
            label="Redemption rate"
            hint="Currency value of 1 point at redemption"
            tooltip="0.01 means 100 pts → 1 unit of credit. Lower numbers make points more valuable per redemption."
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.001"
              value={rules.redeemRate}
              onChange={(e) =>
                setRules((r) => ({ ...r, redeemRate: Number(e.target.value) || 0 }))
              }
            />
          </FormField>
          <FormField
            label="Minimum points to redeem"
            hint="Below this, the redeem button is disabled."
            tooltip="Set this so a customer with 12 stray points can't drip-redeem during checkout."
          >
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              value={rules.minPointsToRedeem}
              onChange={(e) =>
                setRules((r) => ({ ...r, minPointsToRedeem: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
              }
            />
          </FormField>
        </FormGrid>
        <p className="mt-2 text-[11px] text-muted-foreground">
          A {rules.minPointsToRedeem}-point redemption converts to{" "}
          <span className="font-semibold text-foreground">{symbol}{sampleRedeemValue.toLocaleString()}</span>{" "}
          of store credit.
        </p>
      </FormSection>

      <FormSection title="State" description="Current programme state" Icon={Power}>
        <p className="text-[11px] text-muted-foreground">
          Saved to <span className="font-mono">pallio:loyalty:rules</span>. The till reads
          this on every sale — no restart needed.
        </p>
      </FormSection>
    </FormShell>
  )
}
