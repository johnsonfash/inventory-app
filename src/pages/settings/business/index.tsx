import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Building2, FileText, Globe, MapPin, Phone, Sparkles, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { useAutoMarkStep } from "@/hooks/use-auto-mark-step"
import {
  INDUSTRIES,
  loadBusinessProfile,
  saveBusinessProfile,
  type IndustryKey,
  type SellsKind,
} from "@/lib/profile/business-profile"
import { setActiveIndustry } from "@/lib/industry/storage"
import type { IndustryKey as F1IndustryKey } from "@/lib/industry/profile"
import { resetFirstRun } from "@/components/onboarding/first-run-modal"

// Map the 6-key onboarding answer → F1's richer 10-key IndustryKey. Mirrors
// the mapping in `lib/industry/storage.ts` (kept here so saving the business
// profile also promotes the F1 active industry, which drives terminology +
// capability hints across the app).
const BUSINESS_TO_F1: Record<IndustryKey, F1IndustryKey> = {
  retail: "retail",
  food: "restaurant",
  services: "services",
  auto: "auto",
  manufacturing: "manufacturing",
  other: "retail",
}

export default function BusinessSettings() {
  useAutoMarkStep("business")
  const navigate = useNavigate()
  const [submitting, setSubmitting] = React.useState(false)

  // Business profile — the "What do you run?" answer from first-run. Editable
  // here so it's reachable again after the modal is skipped (its only other
  // entry point). Seed from the saved profile, fall back to neutral defaults.
  const saved = React.useMemo(() => loadBusinessProfile(), [])
  const [industry, setIndustry] = React.useState<IndustryKey>(saved?.industry ?? "retail")
  const [sells, setSells] = React.useState<SellsKind>(saved?.sells ?? "products")

  // Logo: show the picked file instantly via an object URL. The actual
  // upload (and a progress %) lands with the backend; for now this gives
  // the operator the "I see what I changed it to" confirmation.
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }
  React.useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl) }, [logoUrl])

  const replayTour = async () => {
    await resetFirstRun()
    toast.success("Setup tour reset", { description: "The welcome guide will open on your dashboard." })
    navigate("/dashboard")
  }

  return (
    <FormShell
      title="Business details"
      description="Identity, registration, and global defaults — these flow into invoices, receipts, and reports."
      titleTooltip={
        <>
          The identity block for your whole Pallio account. Legal +
          trading names, address, contact, tax ID, logo, and the
          business-wide defaults (currency, time zone, fiscal year).
          Set it once; every invoice, receipt, and report inherits.
        </>
      }
      backHref="/settings"
      onSubmit={() => {
        setSubmitting(true)
        // Persist the business profile (industry + what you sell). The rest
        // of this form is still mock until the backend lands, but the
        // profile is real — it drives onboarding emphasis + smart defaults.
        saveBusinessProfile({ industry, sells })
        // Mirror into the F1 industry curation engine so terminology +
        // capability hints across the app react to the change. Fires
        // `pallio:industry-changed` which IndustryProvider listens for.
        setActiveIndustry(BUSINESS_TO_F1[industry])
        setTimeout(() => {
          setSubmitting(false)
          toast.success("Business details saved")
        }, 500)
      }}
      aside={
        <FormAside
          tips={[
            { title: "Currency", body: "Changing this rebases historic reports — be cautious if you have invoices already issued.", Icon: Globe },
            { title: "Tax ID", body: "Shown on B2B invoices. Required in most VAT/GST jurisdictions.", Icon: FileText },
            { title: "Logo", body: "Square 512×512 PNG. Appears on receipts and the AppShell brand mark.", Icon: Building2 },
          ]}
        />
      }
      footer={<FormFooter submitLabel="Save changes" submitting={submitting} cancelHref="/settings" />}
    >
      <FormSection title="Company" description="Public-facing identity" Icon={Building2}>
        <FormGrid cols={2}>
          <FormField
            label="Legal name"
            required
            tooltip="The exact name on your business registration documents (your CAC certificate in Nigeria). Pallio uses this on official paperwork like invoices and tax filings."
          >
            <Input defaultValue="Funke Apparel Co. Ltd." required />
          </FormField>
          <FormField
            label="Trading name"
            hint="Shown to customers if different from the legal name."
            tooltip={
              <>
                The friendly name customers actually know you by. For example,
                your legal name might be <em>Funke Apparel Co. Ltd.</em> but
                you advertise as just <em>Funke Apparel</em>. Leave this blank
                if they're the same.
              </>
            }
          >
            <Input placeholder="Funke Apparel" />
          </FormField>
          <FormField
            label="Primary industry"
            hint="We tailor defaults — terminology, suggested features, sidebar order — to match. You can still use every Pallio feature."
            tooltip="Your answer to the first-run “What do you run?” question. Pallio uses it to order your setup steps, pre-fill smart defaults, and tune terminology (e.g. ‘menu items’ for restaurants, ‘parts’ for auto). Nothing is ever hidden, and you can change it any time."
          >
            <Select value={industry} onValueChange={(v) => setIndustry(v as IndustryKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind.key} value={ind.key}>{ind.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="You mostly sell"
            tooltip="Whether you sell physical products, services (time/appointments), or both. Tunes which setup steps come first — e.g. a salon leads with services, a shop leads with stock."
          >
            <Select value={sells} onValueChange={(v) => setSells(v as SellsKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Tax ID / VAT"
            hint="Used on B2B invoices."
            tooltip={
              <>
                Your government tax number. In Nigeria this is your{" "}
                <strong>TIN</strong> (Tax Identification Number) or
                <strong> VAT</strong> registration number. Other countries call
                it a GST number or EIN. It's required on business-to-business
                invoices so your buyer can reclaim VAT.
              </>
            }
          >
            <Input placeholder="12345678-0001" />
          </FormField>
          <FormField
            label="Logo"
            span={2}
            tooltip="Square PNG (at least 512×512 px). Appears on receipts, invoices, and the AppShell brand mark. JPGs work too but PNG keeps a transparent background."
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Input type="file" accept="image/*" onChange={onLogoChange} />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {logoUrl
                    ? "Preview shown. Save to apply — upload finishes when the backend is connected."
                    : "PNG or JPG, square, at least 512×512 px."}
                </p>
              </div>
            </div>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Contact" description="How customers reach you" Icon={Phone}>
        <FormGrid cols={2}>
          <FormField label="Support email" required>
            <Input type="email" defaultValue="hello@funkeapparel.com" required />
          </FormField>
          <FormField label="Support phone">
            <Input type="tel" placeholder="+234 903 672 3177" />
          </FormField>
          <FormField label="Website" span={2}>
            <Input type="url" placeholder="https://funkeapparel.com" />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Address" description="Registered place of business" Icon={MapPin}>
        <FormField label="Full address">
          <Textarea defaultValue={"12 Admiralty Way\nLekki Phase 1\nLagos 106104\nNigeria"} />
        </FormField>
      </FormSection>

      <FormSection title="Defaults" description="Globally apply across the app" Icon={Globe}>
        <FormGrid cols={3}>
          <FormField
            label="Currency"
            required
            tooltip="The currency you do business in. Every price, total, report, and POS button uses this symbol. You can override per-customer (e.g. invoice a foreign client in USD) later."
          >
            <Select defaultValue="NGN">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">NGN — Nigerian Naira</SelectItem>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
                <SelectItem value="GBP">GBP — British Pound</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="GHS">GHS — Ghanaian Cedi</SelectItem>
                <SelectItem value="KES">KES — Kenyan Shilling</SelectItem>
                <SelectItem value="ZAR">ZAR — South African Rand</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Time zone"
            tooltip="So receipts, reports, and 'today' on the dashboard use your local clock. Pick the city closest to where you actually do business — not where Pallio's servers live."
          >
            <Select defaultValue="africa-lagos">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="africa-lagos">Africa / Lagos (WAT)</SelectItem>
                <SelectItem value="africa-accra">Africa / Accra (GMT)</SelectItem>
                <SelectItem value="africa-nairobi">Africa / Nairobi (EAT)</SelectItem>
                <SelectItem value="africa-johannesburg">Africa / Johannesburg (SAST)</SelectItem>
                <SelectItem value="europe-london">Europe / London</SelectItem>
                <SelectItem value="us-eastern">US Eastern</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Fiscal year start"
            tooltip={
              <>
                The month your accounting year begins. Most Nigerian businesses
                pick <strong>January</strong>. Pallio uses this to group
                "year to date" totals on your profit-and-loss reports.
              </>
            }
          >
            <Select defaultValue="january">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="january">January</SelectItem>
                <SelectItem value="april">April</SelectItem>
                <SelectItem value="july">July</SelectItem>
                <SelectItem value="october">October</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection
        title="Guided setup"
        description="Replay the welcome walkthrough any time"
        Icon={Sparkles}
      >
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Setup tour</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Re-open the “What do you run?” welcome guide and onboarding checklist on your dashboard. Handy if you skipped it the first time.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={replayTour} className="shrink-0">
            <Wand2 className="h-4 w-4" /> Replay setup tour
          </Button>
        </div>
      </FormSection>
    </FormShell>
  )
}
