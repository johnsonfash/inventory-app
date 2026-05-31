import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  AppWindow,
  Facebook,
  Globe,
  Image as ImageIcon,
  Instagram,
  Megaphone,
  Music2,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Tag,
  Video,
  Wrench,
  X,
  Youtube,
  type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormShell } from "@/components/forms/form-shell"
import { FormSection } from "@/components/forms/form-section"
import { FormGrid } from "@/components/forms/form-grid"
import { FormField } from "@/components/forms/form-field"
import { FormFooter } from "@/components/forms/form-footer"
import { SwitchField } from "@/components/forms/switch-field"
import { InputAddon } from "@/components/forms/input-addon"
import { ProductThumb } from "@/components/product-thumb"
import { useCurrency } from "@/contexts/currency"
import { loadAllCatalog } from "@/lib/pos/storage"
import { cn } from "@/lib/utils"

// Ads aren't goods-only. You can promote a catalog product, a service,
// an app, or anything custom — so the builder starts by asking WHAT
// you're advertising, then adapts the fields + the call-to-action.
type Subject = "product" | "service" | "app" | "custom"
const SUBJECTS: { key: Subject; label: string; Icon: LucideIcon; cta: string }[] = [
  { key: "product", label: "Product",  Icon: Package,   cta: "Shop now" },
  { key: "service", label: "Service",  Icon: Wrench,    cta: "Book now" },
  { key: "app",     label: "App",      Icon: AppWindow, cta: "Get the app" },
  { key: "custom",  label: "Custom",   Icon: Sparkles,  cta: "Learn more" },
]

type ChannelKey = "facebook-ads" | "instagram-ads" | "tiktok-ads" | "facebook-marketplace" | "youtube-adsense" | "website"
const CHANNELS: { key: ChannelKey; label: string; Icon: LucideIcon; tone: keyof typeof TONES; paid: boolean; desc: string }[] = [
  { key: "facebook-ads",         label: "Facebook Ads",         Icon: Facebook,    tone: "sky",     paid: true,  desc: "Catalog-driven ads across Facebook." },
  { key: "instagram-ads",        label: "Instagram Ads",        Icon: Instagram,   tone: "fuchsia", paid: true,  desc: "Reels, Stories, and Shopping ads." },
  { key: "tiktok-ads",           label: "TikTok Ads",           Icon: Music2,      tone: "violet",  paid: true,  desc: "In-feed video + Spark Ads." },
  { key: "facebook-marketplace", label: "Facebook Marketplace", Icon: ShoppingBag, tone: "emerald", paid: false, desc: "Local + national listings." },
  { key: "youtube-adsense",      label: "YouTube & AdSense",    Icon: Youtube,     tone: "rose",    paid: true,  desc: "Video ad inventory." },
  { key: "website",              label: "Website",              Icon: Globe,       tone: "emerald", paid: false, desc: "Feature on your connected storefront." },
]

const TONES = {
  violet: "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
} as const

type Media = { url: string; name: string; kind: "image" | "video" }

export default function NewListing() {
  const navigate = useNavigate()
  const { symbol, formatPrice } = useCurrency()
  const catalog = React.useMemo(() => loadAllCatalog(), [])

  const [submitting, setSubmitting] = React.useState(false)
  const [dragKind, setDragKind] = React.useState<Media["kind"] | null>(null)
  const [subject, setSubject] = React.useState<Subject>("product")
  const [sku, setSku] = React.useState(catalog[0]?.sku ?? "")
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [price, setPrice] = React.useState<string>("")
  const [destUrl, setDestUrl] = React.useState("")
  const [media, setMedia] = React.useState<Media[]>([])
  const [channels, setChannels] = React.useState<Record<ChannelKey, boolean>>({
    "facebook-ads": true, "instagram-ads": true, "tiktok-ads": false,
    "facebook-marketplace": false, "youtube-adsense": false, website: true,
  })

  const subjectDef = SUBJECTS.find((s) => s.key === subject)!
  const enabledChannels = CHANNELS.filter((c) => channels[c.key])
  const hasPaid = enabledChannels.some((c) => c.paid)

  // Cleanup object URLs on unmount.
  React.useEffect(() => () => { media.forEach((m) => URL.revokeObjectURL(m.url)) }, [media])

  // Picking a catalog item pre-fills the title + price (still editable).
  const pickItem = (nextSku: string) => {
    setSku(nextSku)
    const item = catalog.find((c) => c.sku === nextSku)
    if (item) {
      setTitle(item.name)
      setPrice(String(item.price ?? ""))
    }
  }

  const addFiles = (files: FileList | null, kind: Media["kind"]) => {
    if (!files) return
    const next: Media[] = Array.from(files).map((f) => ({ url: URL.createObjectURL(f), name: f.name, kind }))
    setMedia((prev) => (kind === "video" ? [...prev.filter((m) => m.kind !== "video"), ...next.slice(0, 1)] : [...prev, ...next]))
  }
  const removeMedia = (url: string) => {
    setMedia((prev) => prev.filter((m) => m.url !== url))
    URL.revokeObjectURL(url)
  }

  const productItem = subject === "product" ? catalog.find((c) => c.sku === sku) : undefined
  const previewTitle = title || (productItem?.name ?? "Your headline goes here")
  const previewImage = media.find((m) => m.kind === "image")?.url ?? productItem?.image
  const priceNum = Number(price)
  const enabledCount = enabledChannels.length

  return (
    <FormShell
      title="New ad / listing"
      description="Promote a product, service, app, or anything else — across every channel at once."
      titleTooltip={
        <>
          Build one ad and publish it to every connected channel
          (Facebook, Instagram, TikTok, Marketplace, YouTube, your
          storefront). Start by choosing what you're promoting — a
          catalog product pulls its photo + price automatically; a
          service, app, or custom subject takes a destination link.
        </>
      }
      backHref="/marketing"
      onSubmit={() => {
        setSubmitting(true)
        // Mock persistence — real backend will POST to /listings.
        // We still confirm success + send the user back to the marketing
        // hub so they can see the listing appear in the per-channel views.
        setTimeout(() => {
          setSubmitting(false)
          toast.success(`Published to ${enabledCount} ${enabledCount === 1 ? "channel" : "channels"}`)
          navigate("/marketing")
        }, 600)
      }}
      aside={<PreviewAside subjectCta={subjectDef.cta} title={previewTitle} image={previewImage} priceLabel={price && !Number.isNaN(priceNum) ? formatPrice(priceNum) : undefined} channels={enabledChannels.map((c) => ({ key: c.key, label: c.label }))} hasVideo={media.some((m) => m.kind === "video")} />}
      footer={
        <FormFooter
          submitLabel={`Publish to ${enabledCount} ${enabledCount === 1 ? "channel" : "channels"}`}
          submitting={submitting}
          submitDisabled={enabledCount === 0 || !previewTitle.trim()}
          submitTooltip={
            enabledCount === 0
              ? "Select at least one channel"
              : !previewTitle.trim()
                ? "Add a headline first"
                : undefined
          }
          cancelHref="/marketing"
        />
      }
    >
      {/* What are you promoting */}
      <FormSection title="What are you promoting?" description="This shapes the fields and the call-to-action" Icon={Megaphone}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSubject(s.key)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors",
                subject === s.key ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/15 dark:text-primary" : "border-border bg-background text-muted-foreground hover:border-brand/40",
              )}
            >
              <s.Icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{s.label}</span>
            </button>
          ))}
        </div>
      </FormSection>

      {/* Subject details */}
      <FormSection title="Details" description={subject === "product" ? "Pull from your catalogue, or edit anything" : "What you're advertising"} Icon={Tag}>
        <FormGrid cols={2}>
          {subject === "product" && (
            <FormField label="Catalogue item" required span={2} hint="Pulls the photo, name, and price from your inventory.">
              <Select value={sku} onValueChange={pickItem}>
                <SelectTrigger><SelectValue placeholder="Choose a product" /></SelectTrigger>
                <SelectContent>
                  {catalog.map((c) => (
                    <SelectItem key={c.sku} value={c.sku}>{c.name} ({c.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <FormField label="Headline" required span={2} hint="Max ~120 characters; channels trim as needed.">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={subject === "app" ? "The fastest way to…" : "A short, punchy headline"} required />
          </FormField>
          <FormField label="Description" required span={2}>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell people why they should care. Keep it concrete." />
          </FormField>
          <FormField label={subject === "product" ? "Listing price" : "Price (optional)"} hint={subject === "product" ? "Override the catalogue price for this ad." : "Leave blank for non-priced offers."}>
            <InputAddon leading={symbol}>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </InputAddon>
          </FormField>
          {subject !== "product" && (
            <FormField label="Destination link" required hint="Where the ad sends people (app store, booking page, site).">
              <Input type="url" value={destUrl} onChange={(e) => setDestUrl(e.target.value)} placeholder="https://…" />
            </FormField>
          )}
        </FormGrid>
      </FormSection>

      {/* Media */}
      <FormSection title="Media" description="Images and an optional video — mobile-first formats win" Icon={ImageIcon}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {media.map((m) => (
              <div key={m.url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted">
                {m.kind === "image" ? (
                  <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground"><Video className="h-5 w-5" /><span className="text-[9px]">video</span></span>
                )}
                <button type="button" onClick={() => removeMedia(m.url)} aria-label="Remove" className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label
              onDragOver={(e) => { e.preventDefault(); setDragKind("image") }}
              onDragLeave={() => setDragKind(null)}
              onDrop={(e) => { e.preventDefault(); setDragKind(null); addFiles(e.dataTransfer.files, "image") }}
              className={cn(
                "flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-background text-muted-foreground transition-colors hover:border-brand/40",
                dragKind === "image" ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/15 dark:text-primary" : "border-border",
              )}
            >
              <Plus className="h-5 w-5" />
              <span className="text-[10px]">{dragKind === "image" ? "Drop here" : "Image"}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files, "image")} />
            </label>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragKind("video") }}
              onDragLeave={() => setDragKind(null)}
              onDrop={(e) => { e.preventDefault(); setDragKind(null); addFiles(e.dataTransfer.files, "video") }}
              className={cn(
                "flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-background text-muted-foreground transition-colors hover:border-brand/40",
                dragKind === "video" ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/15 dark:text-primary" : "border-border",
              )}
            >
              <Video className="h-5 w-5" />
              <span className="text-[10px]">{dragKind === "video" ? "Drop here" : "Video"}</span>
              <input type="file" accept="video/*" className="hidden" onChange={(e) => addFiles(e.target.files, "video")} />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Square (1080×1080) images and vertical (9:16) video perform best across Reels, TikTok and Stories. No video yet? Generate one with AI from the Marketing page.
          </p>
        </div>
      </FormSection>

      {/* Channels */}
      <FormSection title="Channels" description="Where this ad will run" Icon={Megaphone}>
        <div className="flex flex-col gap-2">
          {CHANNELS.map((c) => (
            <ChannelToggle key={c.key} Icon={c.Icon} label={c.label} description={c.desc} tone={c.tone}
              checked={channels[c.key]} onChange={(v) => setChannels((prev) => ({ ...prev, [c.key]: v }))} />
          ))}
        </div>
      </FormSection>

      {/* Budget — only when a paid ad channel is selected */}
      {hasPaid && (
        <FormSection title="Budget & targeting" description="Applies to the paid ad channels above" Icon={Megaphone}>
          <FormGrid cols={3}>
            <FormField label="Daily budget">
              <InputAddon leading={symbol}><input type="number" step="0.01" defaultValue={20} /></InputAddon>
            </FormField>
            <FormField label="Bidding">
              <Select defaultValue="auto">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-bid</SelectItem>
                  <SelectItem value="lowest">Lowest CPM</SelectItem>
                  <SelectItem value="target-roas">Target ROAS</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Audience">
              <Select defaultValue={subject === "product" ? "lookalike" : "broad"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lookalike">Lookalike of buyers</SelectItem>
                  <SelectItem value="custom">Custom audience</SelectItem>
                  <SelectItem value="retargeting">Retargeting</SelectItem>
                  <SelectItem value="broad">Broad</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField span={3}>
              <SwitchField label="Auto-pause on low ROAS" description="Pause on any channel where ROAS drops below 1.0× for 24h." defaultChecked />
            </FormField>
          </FormGrid>
        </FormSection>
      )}
    </FormShell>
  )
}

// Per-channel layout: each surface frames the ad differently, so the
// preview shows the ad the way it'll actually appear on the channel
// you're checking.
function layoutFor(key?: ChannelKey): "vertical" | "wide" | "listing" | "square" {
  if (key === "tiktok-ads" || key === "instagram-ads") return "vertical"
  if (key === "youtube-adsense") return "wide"
  if (key === "facebook-marketplace") return "listing"
  return "square"
}

// Live preview — a social-post mock that updates as you build, and
// switches chrome per channel (Reels/TikTok vertical, YouTube 16:9,
// Marketplace listing, Feed square).
function PreviewAside({ subjectCta, title, image, priceLabel, channels, hasVideo }: {
  subjectCta: string
  title: string
  image?: string
  priceLabel?: string
  channels: { key: ChannelKey; label: string }[]
  hasVideo: boolean
}) {
  const [active, setActive] = React.useState<ChannelKey | undefined>(channels[0]?.key)
  // Keep the active tab valid as channels toggle.
  React.useEffect(() => {
    if (channels.length === 0) { setActive(undefined); return }
    if (!active || !channels.some((c) => c.key === active)) setActive(channels[0]!.key)
  }, [channels, active])

  const layout = layoutFor(active)
  const media = (
    <div className={cn("relative w-full bg-muted", layout === "vertical" ? "aspect-[9/16]" : layout === "wide" ? "aspect-video" : "aspect-square")}>
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <ProductThumb name={title} className="h-full w-full rounded-none" textClassName="text-3xl" />}
      {(hasVideo || layout === "wide") && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white"><Video className="h-3 w-3" /> video</span>
      )}
      {/* Vertical formats overlay the caption like Reels/TikTok. */}
      {layout === "vertical" && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
          <p className="line-clamp-2 text-xs font-bold text-white">{title}</p>
          <span className="shrink-0 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold text-black">{subjectCta}</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Live preview</p>

      {channels.length > 0 && (
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 scrollbar-hide">
          {channels.map((c) => (
            <button key={c.key} type="button" onClick={() => setActive(c.key)}
              className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                active === c.key ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/15 dark:text-primary" : "border-border text-muted-foreground hover:border-brand/40")}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {layout !== "listing" && (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-fuchsia-500 text-[10px] font-bold text-white">P</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">Your business</p>
              <p className="text-[10px] text-muted-foreground">{active === "website" ? "Featured" : "Sponsored"}</p>
            </div>
          </div>
        )}
        {media}
        {/* Non-vertical layouts put the headline + CTA below the media. */}
        {layout !== "vertical" && (
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{title}</p>
              {priceLabel && <p className={cn("text-[11px]", layout === "listing" ? "font-bold text-foreground" : "text-muted-foreground")}>{priceLabel}</p>}
            </div>
            <span className="shrink-0 rounded-lg bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-foreground dark:bg-primary dark:text-primary-foreground">{layout === "listing" ? "Message" : subjectCta}</span>
          </div>
        )}
      </div>
      {channels.length === 0 && <p className="text-[11px] text-muted-foreground">Pick a channel to preview the ad.</p>}
    </div>
  )
}

function ChannelToggle({ Icon, label, description, tone, checked, onChange }: {
  Icon: LucideIcon
  label: string
  description: string
  tone: keyof typeof TONES
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-brand/40">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
      <span className="inline-flex items-center">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="relative h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-brand peer-checked:dark:bg-primary">
          <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
        </span>
      </span>
    </label>
  )
}
