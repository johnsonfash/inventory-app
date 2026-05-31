import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  Globe,
  Languages,
  Lock,
  Mail,
  MapPin,
  Pause,
  Play,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormField } from "@/components/forms/form-field"
import { FormGrid } from "@/components/forms/form-grid"
import { SwitchField } from "@/components/forms/switch-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/lists/status-badge"
import { EmptyState } from "@/components/lists/empty-state"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import {
  getStorefrontState,
  setStorefrontState,
  TEMPLATES_BY_ID,
} from "@/lib/storefront/data"
import type { StorefrontState } from "@/lib/storefront/types"
import { cn } from "@/lib/utils"

// Storefront-wide settings. Distinct from /settings/business (which
// is account-wide). Covers everything specific to the hosted shop:
// checkout, customer accounts, shipping zones, returns policy, SEO,
// legal, language + i18n, store status.

const SHIPPING_ZONES = [
  { name: "Lagos Island",    coverage: "Ikoyi, Lekki, VI",      flat: 1_500, free: 20_000, days: "1-2" },
  { name: "Lagos Mainland",  coverage: "Yaba, Surulere, Ikeja", flat: 2_200, free: 25_000, days: "1-3" },
  { name: "Abuja",            coverage: "Wuse, Garki, Maitama",  flat: 2_800, free: 30_000, days: "2-3" },
  { name: "Port Harcourt",    coverage: "GRA, Trans Amadi",      flat: 3_200, free: 40_000, days: "2-4" },
  { name: "Other states",     coverage: "Nationwide",            flat: 4_800, free: 60_000, days: "3-5" },
] as const

const LANGUAGES = ["English", "Yoruba", "Igbo", "Hausa", "French", "Portuguese"] as const

export default function StorefrontSettings() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))

  const [state, setStateLocal] = React.useState<StorefrontState>(() => getStorefrontState())
  const template = state.templateId ? TEMPLATES_BY_ID[state.templateId] : null

  const update = async (patch: Partial<StorefrontState>) => {
    const next = { ...state, ...patch }
    setStateLocal(next)
    await setStorefrontState(next)
  }

  if (!template) {
    return (
      <PageShell title="Storefront settings" withToolbar={false} titleTooltip="Configure your hosted storefront. Available once you pick a template.">
        <Card>
          <CardContent className="p-0">
            <EmptyState
              Icon={Globe}
              title="No storefront yet"
              description="Pick a template before configuring it."
              action={<Link to="/storefront/templates"><Button>Pick a template</Button></Link>}
            />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const liveUrl = state.customDomain ?? `${state.subdomain}.pallio.shop`

  const togglePublished = async () => {
    await update({ published: !state.published })
    toast.success(state.published ? "Storefront paused." : "Storefront is live.")
  }

  return (
    <PageShell
      title="Storefront settings"
      withToolbar={false}
      titleTooltip={
        <>
          Configuration scoped to your hosted online shop —
          checkout, customer accounts, shipping zones, returns
          policy, SEO, legal pages. For account-wide settings
          (business info, currency, tax rates), see <strong>
          Settings → Business</strong>.
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Status hero */}
        <section
          className="relative overflow-hidden rounded-2xl border border-border p-4 md:p-5"
          style={{ background: `linear-gradient(135deg, ${template.colors.primary}1A, ${template.colors.accent}11 60%, transparent)` }}
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: `${template.colors.primary}40` }} aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: template.colors.primary }}>
                <Globe className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight md:text-base">{state.brand.businessName}</p>
                <a href={`https://${liveUrl}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-muted-foreground hover:text-brand dark:hover:text-primary">
                  {liveUrl}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone={state.published ? "success" : "neutral"} withDot>
                {state.published ? "live" : "paused"}
              </StatusBadge>
              <Button size="sm" onClick={togglePublished}>
                {state.published ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {state.published ? "Pause" : "Publish"}
              </Button>
            </div>
          </div>
        </section>

        {/* Quick-jump tiles — on mobile this is a horizontally
            scrollable rail so the user can flick to the section they
            need without scrolling forever. */}
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible md:px-0" aria-label="Settings sections">
          {[
            { id: "checkout",  Icon: CreditCard, label: "Checkout" },
            { id: "accounts",  Icon: Users,       label: "Customer accounts" },
            { id: "shipping",  Icon: Truck,       label: "Shipping zones" },
            { id: "returns",   Icon: Receipt,     label: "Returns + refunds" },
            { id: "seo",       Icon: Search,      label: "SEO" },
            { id: "legal",     Icon: FileText,    label: "Legal pages" },
            { id: "i18n",      Icon: Languages,   label: "Languages" },
            { id: "danger",    Icon: AlertTriangle, label: "Danger zone" },
          ].map((q) => (
            <a key={q.id} href={`#${q.id}`} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:border-brand/40 hover:bg-accent/40 md:py-3">
              <q.Icon className="h-3.5 w-3.5 text-muted-foreground" />
              {q.label}
            </a>
          ))}
        </nav>

        {/* Checkout */}
        <FormSection title="Checkout" description="What shoppers see at checkout." Icon={CreditCard} className="scroll-mt-20" trailing={<a id="checkout" />}>
          {/* Payment provider strip — surfaces which rails are live */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payment providers at checkout</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <ConnectionCard providerId="paystack"    reason="Card, bank transfer, USSD — Nigeria's most popular rail." />
              <ConnectionCard providerId="flutterwave" reason="Multi-country card + mobile money across Africa." />
              <ConnectionCard providerId="opay"        reason="Opay wallet checkout — popular with Lagos shoppers." />
              <ConnectionCard providerId="stripe"      reason="International cards for shoppers outside Nigeria." />
            </div>
          </div>
          <FormGrid cols={2}>
            <FormField label="Checkout style" tooltip="One-page checkout converts ~15% better than 3-step for first-time buyers. 3-step gives more form room for B2B buyers with long addresses.">
              <Select defaultValue="single">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single-page (recommended)</SelectItem>
                  <SelectItem value="steps">3-step (contact → shipping → pay)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Guest checkout" tooltip="Force account creation only if you'll re-engage buyers via email. Otherwise leave guest on — it converts ~30% more new buyers.">
              <Select defaultValue="optional">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="optional">Optional (recommended)</SelectItem>
                  <SelectItem value="required">Require account</SelectItem>
                  <SelectItem value="disabled">Guest only</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
          <div className="mt-3 flex flex-col gap-2">
            <SwitchField label="Show order notes field" description="Lets shoppers leave a delivery note (gate code, landmark)." defaultChecked />
            <SwitchField label="Collect phone number" description="Required for most Nigerian couriers to coordinate delivery." defaultChecked />
            <SwitchField label="Allow promo codes" description="Off if you only want automatic price-list discounts to apply." defaultChecked />
            <SwitchField label="Tipping at checkout" description="Optional tip line — popular with food / services templates." />
            <SwitchField label="Marketing opt-in checked by default" description="NDPR-safe: turn off if you want strict opt-in for newsletters." />
          </div>
        </FormSection>

        {/* Customer accounts */}
        <FormSection title="Customer accounts" description="Self-service for shoppers." Icon={Users} className="scroll-mt-20" trailing={<a id="accounts" />}>
          <FormGrid cols={2}>
            <FormField label="Account access" tooltip="What customers can do once signed in.">
              <Select defaultValue="full">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">View orders + track + reorder</SelectItem>
                  <SelectItem value="read">View orders + track only</SelectItem>
                  <SelectItem value="off">No account area</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Sign-in method">
              <Select defaultValue="email-password">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email-password">Email + password</SelectItem>
                  <SelectItem value="magic-link">Magic link (passwordless)</SelectItem>
                  <SelectItem value="otp">One-time SMS code</SelectItem>
                  <SelectItem value="social">Google / Apple sign-in</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
          <div className="mt-3 flex flex-col gap-2">
            <SwitchField label="Saved addresses" description="Customers see + reuse past delivery addresses." defaultChecked />
            <SwitchField label="Saved payment methods" description="Stored via your payment provider (Pallio never sees card numbers)." defaultChecked />
            <SwitchField label="Wishlists" description="Logged-in customers can heart products + come back." defaultChecked />
            <SwitchField label="Birthday + anniversary capture" description="Powers automated discount-on-special-day emails." />
          </div>
        </FormSection>

        {/* Shipping zones */}
        <FormSection
          title="Shipping zones + rates"
          description="Couriers + flat rates per region. Free-shipping threshold per zone."
          Icon={Truck}
          className="scroll-mt-20"
          trailing={<a id="shipping" />}
        >
          {/* Courier integrations strip */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Couriers available to your shoppers</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <ConnectionCard providerId="gig-logistics" reason="Nationwide same-day + next-day delivery." />
              <ConnectionCard providerId="sendbox"       reason="Cross-border + express within Lagos." />
              <ConnectionCard providerId="kwik"          reason="On-demand same-day rider, Lagos only." />
              <ConnectionCard providerId="dhl-express"   reason="International + worldwide shipping." />
              <ConnectionCard providerId="fez-delivery"  reason="Affordable inter-state shipping." />
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Zone</th>
                  <th className="px-3 py-2 font-medium">Coverage</th>
                  <th className="px-3 py-2 text-right font-medium">Flat rate</th>
                  <th className="px-3 py-2 text-right font-medium">Free over</th>
                  <th className="px-3 py-2 font-medium">Days</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SHIPPING_ZONES.map((z) => (
                  <tr key={z.name}>
                    <td className="px-3 py-2 font-semibold">{z.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{z.coverage}</td>
                    <td className="px-3 py-2 text-right tabular-nums">₦{z.flat.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums">₦{z.free.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{z.days}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                        title="Zone editor is part of the upcoming Storefront backend."
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <SwitchField
              label="Show real-time courier rates at checkout"
              description="Calls GIG / Sendbox / Kwik APIs to fetch live rates. Slightly slower but more accurate than flat rates."
              defaultChecked
            />
            <Button
              size="sm"
              variant="outline"
              disabled
              title="Zone editor is part of the upcoming Storefront backend."
            >
              <MapPin className="h-3.5 w-3.5" /> Add zone
            </Button>
          </div>
        </FormSection>

        {/* Returns + refunds */}
        <FormSection title="Returns + refunds" description="Policy + automation rules." Icon={Receipt} className="scroll-mt-20" trailing={<a id="returns" />}>
          <FormGrid cols={2}>
            <FormField label="Return window" tooltip="How many days after delivery customers have to start a return.">
              <Select defaultValue="14">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No returns</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days (recommended)</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Restocking fee" tooltip="Percent withheld from refunds. Keep at 0 unless theft is a big problem.">
              <Select defaultValue="0">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
          <FormField label="Customer-facing policy" hint="Shown on every product page + the cart.">
            <Textarea
              defaultValue="Free returns within 14 days for unworn items in original packaging. Pallio sends a prepaid courier label by email — no questions asked. Refunds land in the original payment method within 3 business days of us receiving the parcel."
              rows={4}
            />
          </FormField>
          <div className="mt-3 flex flex-col gap-2">
            <SwitchField label="Auto-approve refunds under ₦10,000" description="Speeds up low-risk refunds. Larger ones still need manager approval." defaultChecked />
            <SwitchField label="Refund to original payment method" description="Otherwise the customer chooses store credit / bank transfer." defaultChecked />
            <SwitchField label="Customer pays return shipping" description="Off for fashion (industry expects free returns), on for electronics." />
          </div>
        </FormSection>

        {/* SEO */}
        <FormSection title="SEO + social cards" description="How your shop appears on Google + when shared on WhatsApp / IG / Facebook." Icon={Search} className="scroll-mt-20" trailing={<a id="seo" />}>
          <FormGrid cols={1}>
            <FormField
              label="Browser + Google title"
              hint="60 chars or less. Pallio adds your business name automatically."
              tooltip="The headline Google shows on search results + the tab name."
            >
              <Input defaultValue={`${state.brand.businessName} — premium pieces, delivered`} />
            </FormField>
            <FormField
              label="Meta description"
              hint="150 chars or less."
              tooltip="The grey snippet under the title on Google. Sell the shop in one sentence."
            >
              <Textarea
                defaultValue={`Shop handcrafted ${template.sector} in Lagos. Free delivery on orders over ₦20,000. Tracked next-day across Nigeria.`}
                rows={2}
              />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Social share image" tooltip="1200×630 PNG shown when your shop link is pasted on WhatsApp / IG / FB.">
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-muted-foreground">
                  <Eye className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold">og-image.png</p>
                  <p className="text-muted-foreground">1200×630 · auto-generated from your logo + hero</p>
                </div>
                <Button size="sm" variant="outline">Upload</Button>
              </div>
            </FormField>
            <FormField label="Sitemap" tooltip="Pallio auto-generates and submits to Google Search Console.">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-2.5 text-xs">
                <code className="truncate font-mono">https://{liveUrl}/sitemap.xml</code>
                <StatusBadge tone="success" withDot>indexed</StatusBadge>
              </div>
            </FormField>
          </FormGrid>
          <SwitchField label="Allow search engines to index this shop" description="Off while you're staging — Pallio won't show in Google until you turn this on." defaultChecked />
        </FormSection>

        {/* Legal pages */}
        <FormSection title="Legal pages" description="Required pages — Pallio auto-generates NDPR + Nigerian-compliant defaults you can edit." Icon={FileText} className="scroll-mt-20" trailing={<a id="legal" />}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { name: "Privacy policy", path: "/privacy", ok: true,  required: true,  body: "NDPR-compliant. Covers cookies, data handling, retention." },
              { name: "Terms of service", path: "/terms", ok: true,  required: true,  body: "Sale terms, payment, governing law (Nigeria)." },
              { name: "Refund + return policy", path: "/refunds", ok: true, required: true, body: "Auto-syncs to the Returns settings above." },
              { name: "Shipping policy", path: "/shipping", ok: true, required: true, body: "Auto-syncs from your shipping zones." },
              { name: "Cookie policy", path: "/cookies", ok: false, required: true, body: "Auto-generated when you turn on the cookie banner." },
              { name: "Contact + FAQ", path: "/contact", ok: true,  required: false, body: "Phone, WhatsApp, business hours, support form." },
            ].map((p) => (
              <li key={p.path} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  p.ok ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                )}>
                  {p.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    {p.required && <StatusBadge tone="warning">required</StatusBadge>}
                  </div>
                  <code className="block truncate text-[10px] text-muted-foreground">{p.path}</code>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{p.body}</p>
                </div>
                <Link to="/storefront/pages" className="text-[11px] font-semibold text-brand hover:underline dark:text-primary">Edit</Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Pallio's defaults are NDPR + Consumer Protection Council friendly.
            </p>
            <p className="mt-1">If you sell across Africa, swap to the multi-jurisdiction templates (Ghana / Kenya / SA) per country.</p>
          </div>
        </FormSection>

        {/* Languages */}
        <FormSection title="Languages + currency" description="Translate the storefront automatically. Default currency is set in Settings → Currency." Icon={Languages} className="scroll-mt-20" trailing={<a id="i18n" />}>
          <FormField label="Languages your shop is available in">
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map((lang, i) => (
                <span
                  key={lang}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold",
                    i === 0
                      ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {lang} {i === 0 && "✓"}
                </span>
              ))}
              <button className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">+ Add language</button>
            </div>
          </FormField>
          <FormGrid cols={2}>
            <FormField label="Default language">
              <Select defaultValue="en">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Auto-translate new content" tooltip="When you publish a product in English, Pallio also generates Yoruba / Hausa / Igbo versions you can review.">
              <Select defaultValue="off">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off — I'll translate manually</SelectItem>
                  <SelectItem value="auto">Auto-translate + review</SelectItem>
                  <SelectItem value="auto-publish">Auto-translate + publish immediately</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Notifications */}
        <FormSection title="Customer notifications" description="Automated emails + WhatsApp / SMS messages Pallio sends shoppers." Icon={Bell}>
          {/* Communication channel providers */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channels the notifications send through</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <ConnectionCard providerId="mailgun"       reason="Transactional email — order receipts, shipping updates." />
              <ConnectionCard providerId="whatsapp-cloud" reason="WhatsApp Business — delivery + cart-recovery messages." />
              <ConnectionCard providerId="twilio"        reason="SMS fallback when WhatsApp + email fail." />
            </div>
          </div>
          <ul className="space-y-2">
            {[
              { name: "Order confirmation",      desc: "Receipt + tracking link, sent immediately on payment." },
              { name: "Shipped + tracking",      desc: "Sent when the courier label is bought." },
              { name: "Out for delivery",        desc: "Live update from the courier API." },
              { name: "Delivered",                desc: "Confirmation + 'leave a review' CTA after 3 days." },
              { name: "Cart abandoned",          desc: "Fires 1h + 24h + 3d after they leave with items." },
              { name: "Back in stock",           desc: "Email shoppers who hit the 'notify me' button." },
            ].map((n) => (
              <li key={n.name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.name}</p>
                  <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                </div>
                <Link to="/communications/templates" className="text-[11px] font-semibold text-brand hover:underline dark:text-primary">Edit</Link>
              </li>
            ))}
          </ul>
        </FormSection>

        {/* Cookie banner */}
        <FormSection title="Cookie banner" description="NDPR / GDPR-friendly consent before any tracking fires." Icon={Lock}>
          <div className="flex flex-col gap-2">
            <SwitchField label="Show cookie banner" description="Required if you use Meta Pixel, Google Analytics, or Mixpanel." defaultChecked />
            <SwitchField label="Block analytics until consent" description="Strict mode — tracking scripts only load after the shopper says yes." />
            <SwitchField label="Remember consent for 12 months" description="After that, ask again." defaultChecked />
          </div>
        </FormSection>

        {/* Danger zone */}
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 scroll-mt-20" id="danger">
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">Danger zone</h3>
          <ul className="mt-3 space-y-2">
            {[
              { name: "Pause storefront",        body: "Take the shop offline. Existing orders + customer accounts are preserved.", action: "Pause" },
              { name: "Reset storefront",        body: "Wipe all storefront-only data + start fresh. Inventory + customers untouched.", action: "Reset" },
              { name: "Delete storefront",       body: "Permanently delete the hosted shop. Cannot be undone. Inventory + sales records remain in Pallio.", action: "Delete" },
            ].map((d) => (
              <li key={d.name} className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-card p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">{d.body}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-500/40 text-rose-600 dark:text-rose-400"
                  onClick={() => toast.error(`${d.name} confirmed.`)}
                >
                  {d.action}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        {/* Cross-links */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { Icon: ShoppingBag, label: "Manage products",     href: "/storefront/products"  },
            { Icon: Sparkles,    label: "Edit page content",   href: "/storefront/pages"     },
            { Icon: Mail,        label: "Email customers",     href: "/communications/new"   },
          ].map((q) => (
            <Link
              key={q.label}
              to={q.href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
            >
              <q.Icon className="h-4 w-4 text-brand dark:text-primary" />
              <span className="flex-1 text-sm font-semibold">{q.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
