import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CalendarDays, Megaphone, Target, Users, type LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { FormAside } from "@/components/forms/form-aside"
import { InputAddon } from "@/components/forms/input-addon"
import { SwitchField } from "@/components/forms/switch-field"
import { ConnectionCard } from "@/components/integrations/connection-chip"
import { getStatus } from "@/lib/integrations/data"

type Tone = "sky" | "fuchsia" | "rose"

type Props = {
  channel: "Facebook Ads" | "Instagram Ads" | "YouTube & AdSense"
  Icon: LucideIcon
  tone: Tone
  /** Where to navigate back / on cancel. */
  backHref: string
  /** Either "campaign" (top-level objective + ads) or "listing" (single
      ad creative within a campaign). Drives section labels + tips. */
  kind: "campaign" | "listing"
  /** Provider id that powers this channel. When passed, the wizard
      shows a connection card at the top + blocks submit if the
      provider isn't connected. */
  providerId?: string
}

export function CampaignShell({ channel, Icon, backHref, kind, providerId }: Props) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = React.useState(false)
  const providerConnected = providerId ? getStatus(providerId) === "connected" : true

  return (
    <FormShell
      title={kind === "campaign" ? `New ${channel} campaign` : `New ${channel} listing`}
      description={
        kind === "campaign"
          ? "Define the objective, audience, and budget."
          : "Single ad creative. Drops into an existing campaign."
      }
      backHref={backHref}
      onSubmit={() => {
        if (!providerConnected) {
          toast.error(`Connect ${channel} first`, { description: "Your draft is saved — connect the provider to publish." })
          return
        }
        setSubmitting(true)
        // Mock persistence — real backend would POST here. We still confirm
        // success so the user gets clear feedback + ends up back on the
        // channel page where the new entry would appear in the list.
        setTimeout(() => {
          setSubmitting(false)
          toast.success(
            kind === "campaign"
              ? `${channel} campaign launched`
              : `${channel} listing saved`,
          )
          navigate(backHref)
        }, 500)
      }}
      aside={
        <FormAside
          tips={
            kind === "campaign"
              ? [
                  { title: "Objective", body: "Pallio recommends Conversions for catalog-driven stores.", Icon: Target },
                  { title: "Budget", body: "Daily budget x duration is the hard cap. Bid strategy controls pacing.", Icon: Megaphone },
                  { title: "Audience", body: "Lookalike of past buyers tends to outperform broad, even on cold launches.", Icon: Users },
                ]
              : [
                  { title: "Creative", body: "Square 1080×1080 PNG performs everywhere. Vertical 1080×1920 unlocks Reels/Stories.", Icon: Target },
                  { title: "Catalog", body: "Source items from the catalog so price + stock stay in sync automatically.", Icon: Megaphone },
                ]
          }
        />
      }
      footer={
        <FormFooter
          submitLabel={kind === "campaign" ? "Launch campaign" : "Save listing"}
          submitting={submitting}
          cancelHref={backHref}
        />
      }
    >
      {providerId && (
        <ConnectionCard
          providerId={providerId}
          reason={providerConnected
            ? `${channel} is connected. Pallio will publish this ${kind} when you click submit.`
            : `${channel} isn't connected yet. Connect it to publish. Your draft is saved either way.`}
        />
      )}
      <FormSection title="Basics" Icon={Icon}>
        <FormGrid cols={2}>
          <FormField label="Name" required>
            <Input placeholder={kind === "campaign" ? "Summer Promo" : "Hero Reel · USB-C Hub"} required />
          </FormField>
          {kind === "campaign" ? (
            <FormField label="Objective" required>
              <Select defaultValue="conversions">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversions">Conversions</SelectItem>
                  <SelectItem value="awareness">Awareness</SelectItem>
                  <SelectItem value="traffic">Traffic</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="catalog">Catalog sales</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          ) : (
            <FormField label="Parent campaign" required>
              <Select defaultValue="summer-promo">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="summer-promo">Summer Promo</SelectItem>
                  <SelectItem value="bts">Back to School</SelectItem>
                  <SelectItem value="holiday">USB-C Hub · Holiday</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
          {kind === "listing" && (
            <FormField label="Source item" required hint="Pull live price + stock + image from inventory.">
              <Select defaultValue="EL-2109">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EL-2109">USB‑C Hub 6‑in‑1 (EL-2109)</SelectItem>
                  <SelectItem value="AP-4012">Cotton Tee · Black (AP-4012)</SelectItem>
                  <SelectItem value="HM-2205">Ceramic Mug 12oz (HM-2205)</SelectItem>
                  <SelectItem value="BT-9091">Hydrating Serum (BT-9091)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
          <FormField label={kind === "campaign" ? "Description" : "Copy / headline"} span={2}>
            <Textarea placeholder={kind === "campaign" ? "Internal description." : "The everything-port adapter. 6 in 1. Pocket-sized."} />
          </FormField>
        </FormGrid>
      </FormSection>

      {kind === "campaign" ? (
        <>
          <FormSection title="Budget + bidding" Icon={Megaphone}>
            <FormGrid cols={3}>
              <FormField label="Budget type" required>
                <Select defaultValue="daily">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily budget</SelectItem>
                    <SelectItem value="lifetime">Lifetime budget</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Amount" required>
                <InputAddon leading="$">
                  <input type="number" step="0.01" defaultValue={50} required />
                </InputAddon>
              </FormField>
              <FormField label="Bid strategy">
                <Select defaultValue="auto">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-bid</SelectItem>
                    <SelectItem value="lowest">Lowest CPM</SelectItem>
                    <SelectItem value="target-roas">Target ROAS</SelectItem>
                    <SelectItem value="manual">Manual CPC</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Currency">
                <Select defaultValue="USD">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Audience" Icon={Users}>
            <FormGrid cols={2}>
              <FormField label="Audience preset" required>
                <Select defaultValue="lookalike">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lookalike">Lookalike of past buyers</SelectItem>
                    <SelectItem value="custom">Custom audience</SelectItem>
                    <SelectItem value="retargeting">Retargeting (cart abandon)</SelectItem>
                    <SelectItem value="broad">Broad</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Geography">
                <Select defaultValue="us">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="us-ca">United States + Canada</SelectItem>
                    <SelectItem value="eu">European Union</SelectItem>
                    <SelectItem value="worldwide">Worldwide</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Age range">
                <Input placeholder="18-65" defaultValue="18-65" />
              </FormField>
              <FormField label="Languages">
                <Input placeholder="English" defaultValue="English" />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Schedule" Icon={CalendarDays}>
            <FormGrid cols={2}>
              <FormField label="Start" required>
                <Input type="datetime-local" required />
              </FormField>
              <FormField label="End (optional)">
                <Input type="datetime-local" />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Behaviour" Icon={Target}>
            <SwitchField label="Auto-pause on low ROAS" description="Pause the campaign if ROAS drops below 1.0× for 24h." defaultChecked />
            <SwitchField label="Auto-pause out-of-stock products" description="Skip ads for SKUs at 0 stock." defaultChecked />
          </FormSection>
        </>
      ) : (
        <>
          <FormSection title="Creative" Icon={Target}>
            <FormGrid cols={2}>
              <FormField label="Hero image / video" required>
                <Input type="file" accept="image/*,video/mp4" required />
              </FormField>
              <FormField label="Call-to-action">
                <Select defaultValue="shop">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop">Shop now</SelectItem>
                    <SelectItem value="learn">Learn more</SelectItem>
                    <SelectItem value="signup">Sign up</SelectItem>
                    <SelectItem value="book">Book now</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Destination URL" hint="Where the click takes the viewer." span={2}>
                <Input type="url" placeholder="https://shop.acme.com/p/usb-c-hub" />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Behaviour" Icon={Megaphone}>
            <SwitchField label="Sync price from catalog" description="When you change the price in Pallio, the ad updates." defaultChecked />
            <SwitchField label="Sync image from catalog" description="When you upload a new product image, the ad updates." defaultChecked />
          </FormSection>
        </>
      )}
    </FormShell>
  )
}
