import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  AppWindow,
  ArrowRight,
  Copy,
  Film,
  Image as ImageIcon,
  Images,
  Package,
  Send,
  Sparkles,
  Type as TypeIcon,
  Video,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProductThumb } from "@/components/product-thumb"
import { loadAllCatalog } from "@/lib/pos/storage"
import { useCurrency } from "@/contexts/currency"
import { cn } from "@/lib/utils"

type Subject = "product" | "service" | "app" | "custom"
const SUBJECTS: { key: Subject; label: string; Icon: LucideIcon }[] = [
  { key: "product", label: "Product", Icon: Package },
  { key: "service", label: "Service", Icon: Wrench },
  { key: "app", label: "App", Icon: AppWindow },
  { key: "custom", label: "Custom", Icon: Sparkles },
]

type Format = "video" | "flier" | "carousel" | "caption"
const FORMATS: { key: Format; label: string; Icon: LucideIcon; cost: number }[] = [
  { key: "video",    label: "Video",    Icon: Film,    cost: 50 },
  { key: "flier",    label: "Flier",    Icon: ImageIcon, cost: 10 },
  { key: "carousel", label: "Carousel", Icon: Images,  cost: 15 },
  { key: "caption",  label: "Caption",  Icon: TypeIcon, cost: 2 },
]

// Example prompts shown in the empty state — tuned to the subject so
// service / app / custom operators see copy that fits their offer
// (the catalog-product example wouldn't translate).
const EXAMPLE_BY_SUBJECT: Record<Subject, string> = {
  product: 'e.g. "Lead with the 24-hour delivery, keep it under 12 seconds, end on the price." Pallio drafts it, then you refine by chatting.',
  service: 'e.g. "Open on a customer testimonial, show before/after, end with a same-week booking CTA." Pallio drafts it, then you refine by chatting.',
  app: 'e.g. "Hook with the core feature in 3 seconds, show 2 quick screens, end on a Get-the-app CTA." Pallio drafts it, then you refine by chatting.',
  custom: 'e.g. "Tell people who it’s for, what changes after they sign up, end with a clear next step." Pallio drafts it, then you refine by chatting.',
}

const PLATFORMS = ["Reels", "TikTok", "Feed", "YouTube"] as const
const TONES = ["Punchy", "Friendly", "Premium", "Playful"] as const
type Platform = (typeof PLATFORMS)[number]
type Tone = (typeof TONES)[number]

type Artifact = { headline: string; body: string; hashtags: string[]; format: Format; platform: Platform; vertical: boolean }
type Msg = { id: string; role: "you" | "ai"; text: string; artifact?: Artifact }

// Mock generator. Backend (api/marketing + a HeyGen-style provider) does
// the real thing; this synthesises plausible copy so the chat-to-build +
// preview + refine + deploy UX is fully exercised against credits.
function generateAd(opts: { subject: Subject; name: string; format: Format; platform: Platform; tone: Tone; prompt: string }): Artifact {
  const { name, format, platform, tone } = opts
  const subjectName = name.trim() || "your offer"
  const hooks: Record<Tone, string> = {
    Punchy: `Stop scrolling. ${subjectName} is the upgrade you didn't know you needed.`,
    Friendly: `Meet ${subjectName} — the little thing that makes the day easier.`,
    Premium: `${subjectName}. Considered, crafted, and built to last.`,
    Playful: `Okay but ${subjectName} kind of slaps. 👀`,
  }
  const bodies: Record<Format, string> = {
    video: `Open on the problem, cut to ${subjectName} solving it in 3 seconds, close on the price + a clear CTA. Keep it under 15s for ${platform}.`,
    flier: `Bold ${subjectName} hero shot, one-line benefit, price, and a thumb-stopping CTA. High contrast for the ${platform} feed.`,
    carousel: `Slide 1: the hook. Slides 2–4: three reasons ${subjectName} wins. Slide 5: price + CTA. Swipe-friendly for ${platform}.`,
    caption: `A tight ${platform} caption for ${subjectName} — one hook line, two benefit lines, a CTA, and a few hashtags.`,
  }
  const tags = ["#" + subjectName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "#shop", "#" + platform.toLowerCase(), "#dealoftheday", "#smallbusiness"]
  return {
    headline: hooks[tone],
    body: bodies[format],
    hashtags: tags,
    format,
    platform,
    vertical: platform === "Reels" || platform === "TikTok",
  }
}

export default function GenerateAd() {
  const navigate = useNavigate()
  const { formatPrice } = useCurrency()
  const catalog = React.useMemo(() => loadAllCatalog(), [])

  const [subject, setSubject] = React.useState<Subject>("product")
  const [sku, setSku] = React.useState(catalog[0]?.sku ?? "")
  const [customName, setCustomName] = React.useState("")
  const [format, setFormat] = React.useState<Format>("video")
  const [platform, setPlatform] = React.useState<Platform>("Reels")
  const [tone, setTone] = React.useState<Tone>("Punchy")
  const [prompt, setPrompt] = React.useState("")
  const [messages, setMessages] = React.useState<Msg[]>([])
  const [credits, setCredits] = React.useState(260) // mock balance; ties to /settings/billing
  const [generating, setGenerating] = React.useState(false)

  const item = subject === "product" ? catalog.find((c) => c.sku === sku) : undefined
  const subjectName = subject === "product" ? (item?.name ?? "") : customName
  const cost = FORMATS.find((f) => f.key === format)!.cost
  const latest = [...messages].reverse().find((m) => m.artifact)?.artifact

  // Failsafe so a stalled generation can't lock the UI in the "Generating…"
  // state forever. Real backend should resolve well under this cap.
  const GENERATION_TIMEOUT_MS = 10_000
  const generationTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => () => { if (generationTimer.current) clearTimeout(generationTimer.current) }, [])

  const run = (instruction: string, isRefine: boolean) => {
    if (subject === "product" ? !item : !subjectName.trim()) {
      toast.error("Pick what you're advertising first")
      return
    }
    if (credits < cost) {
      toast.error("Out of AI credits", { description: "Top up to keep generating.", action: { label: "Top up", onClick: () => navigate("/settings/billing") } })
      return
    }
    setGenerating(true)
    const youText = instruction.trim() || `Generate a ${tone.toLowerCase()} ${format} for ${platform}.`
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "you", text: youText }])
    // Simulate the async generation. Wrapped so a thrown synthesiser
    // doesn't strand the UI; backend errors will surface the same way.
    const failsafe = setTimeout(() => {
      setGenerating(false)
      toast.error("Generation timed out", { description: "Try again, or simplify your prompt." })
    }, GENERATION_TIMEOUT_MS)
    generationTimer.current = setTimeout(() => {
      try {
        const artifact = generateAd({ subject, name: subjectName, format, platform, tone, prompt: instruction })
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "ai",
            text: isRefine ? "Updated — here's the new draft:" : `Here's a ${tone.toLowerCase()} ${format} concept for ${platform}:`,
            artifact,
          },
        ])
        setCredits((c) => c - cost)
        setPrompt("")
      } catch {
        toast.error("Couldn't generate the ad", { description: "Something went wrong. Please try again." })
      } finally {
        clearTimeout(failsafe)
        setGenerating(false)
      }
    }, 650)
  }

  const deploy = () => {
    try {
      navigate("/marketing/listings/new")
      toast.success("Sent to the ad builder", { description: "Review channels + budget, then publish." })
    } catch {
      toast.error("Couldn't open the ad builder", { description: "Try again from the Marketing menu." })
    }
  }

  return (
    <PageShell
      title="Generate an ad with AI"
      withToolbar={false}
      titleTooltip="Describe what you're promoting and Pallio drafts the copy, a flier, or a short video — tuned to the platform. Refine it by chatting, then deploy to your channels. Each generation uses AI credits."
    >
      <div className="flex flex-col gap-4">
        {/* Setup */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">What are you advertising?</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold">
              <Zap className="h-3.5 w-3.5 text-brand dark:text-primary" /> {credits} credits
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SUBJECTS.map((s) => (
              <button key={s.key} type="button" onClick={() => setSubject(s.key)}
                className={cn("flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-colors",
                  subject === s.key ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/15 dark:text-primary" : "border-border text-muted-foreground hover:border-brand/40")}>
                <s.Icon className="h-4 w-4" /> {s.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {subject === "product" ? (
              <Select value={sku} onValueChange={setSku}>
                <SelectTrigger><SelectValue placeholder="Choose a product" /></SelectTrigger>
                <SelectContent>
                  {catalog.map((c) => <SelectItem key={c.sku} value={c.sku}>{c.name} ({c.sku})</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={subject === "app" ? "Your app name" : subject === "service" ? "The service you offer" : "What you're promoting"} />
            )}
          </div>

          {/* Format / platform / tone */}
          <div className="mt-3 flex flex-col gap-2">
            <Chips label="Format" options={FORMATS.map((f) => ({ value: f.key, label: `${f.label} · ${f.cost}` }))} value={format} onChange={(v) => setFormat(v as Format)} />
            <Chips label="Platform" options={PLATFORMS.map((p) => ({ value: p, label: p }))} value={platform} onChange={(v) => setPlatform(v as Platform)} />
            <Chips label="Tone" options={TONES.map((t) => ({ value: t, label: t }))} value={tone} onChange={(v) => setTone(v as Tone)} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* Chat */}
          <div className="flex min-h-[20rem] flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
                <Sparkles className="h-8 w-8 text-brand dark:text-primary" />
                <p className="mt-2 text-sm font-semibold">Describe your ad, or just hit Generate</p>
                <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">
                  {EXAMPLE_BY_SUBJECT[subject]}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {messages.map((m) => (
                  <li key={m.id} className={cn("flex", m.role === "you" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      m.role === "you" ? "bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground" : "border border-border bg-card")}>
                      <p>{m.text}</p>
                      {m.artifact && <ArtifactCard a={m.artifact} formatPrice={formatPrice} price={item?.price} image={item?.image} name={subjectName} />}
                    </div>
                  </li>
                ))}
                {generating && (
                  <li className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4 animate-pulse text-brand dark:text-primary" /> Generating…
                    </div>
                  </li>
                )}
              </ul>
            )}

            {/* Composer */}
            <form
              onSubmit={(e) => { e.preventDefault(); run(prompt, messages.length > 0) }}
              className="sticky bottom-2 mt-auto flex items-center gap-2 rounded-2xl border border-border bg-background p-2"
            >
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={messages.length === 0 ? "Describe the ad (optional)…" : "Refine it — 'shorter', 'warmer tone', 'lead with price'…"}
                className="border-0 shadow-none focus-visible:ring-0"
              />
              <Button type="submit" disabled={generating}>
                <Send className="h-4 w-4" /> {messages.length === 0 ? `Generate · ${cost}` : `Refine · ${cost}`}
              </Button>
            </form>
          </div>

          {/* Preview + deploy */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Latest draft</p>
            <div className={cn("relative w-full overflow-hidden rounded-2xl border border-border bg-muted", latest?.vertical ? "aspect-[9/16]" : "aspect-square")}>
              {item?.image ? (
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <ProductThumb name={subjectName || "Ad"} className="h-full w-full rounded-none" textClassName="text-4xl" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="line-clamp-3 text-sm font-bold text-white">{latest?.headline ?? "Your generated ad appears here"}</p>
              </div>
              {latest?.format === "video" && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white"><Video className="h-3 w-3" /> {latest.platform}</span>
              )}
            </div>
            <Button
              onClick={deploy}
              disabled={!latest}
              title={!latest ? "Generate an ad first" : undefined}
            >
              Deploy to channels <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Generations use credits ({cost} for a {format}). Manage your balance in <button type="button" onClick={() => navigate("/settings/billing")} className="font-semibold text-brand hover:underline dark:text-primary">Billing</button>.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function Chips({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
              value === o.value ? "border-brand bg-brand-soft text-brand dark:border-primary dark:bg-primary/15 dark:text-primary" : "border-border text-muted-foreground hover:border-brand/40")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ArtifactCard({ a, formatPrice, price, image, name }: { a: Artifact; formatPrice: (n: number) => string; price?: number; image?: string; name: string }) {
  const copyAll = () => {
    const text = `${a.headline}\n\n${a.body}\n\n${a.hashtags.join(" ")}`
    navigator.clipboard?.writeText(text)
    toast.success("Copy copied to clipboard")
  }
  return (
    <div className="mt-2 rounded-xl border border-border bg-background p-2.5 text-foreground">
      <div className="flex gap-2.5">
        <div className={cn("relative shrink-0 overflow-hidden rounded-lg bg-muted", a.vertical ? "h-24 w-[3.375rem]" : "h-16 w-16")}>
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <ProductThumb name={name || "Ad"} className="h-full w-full rounded-none" textClassName="text-base" />}
          {a.format === "video" && <span className="absolute inset-0 flex items-center justify-center"><Video className="h-4 w-4 text-white drop-shadow" /></span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold">{a.headline}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{a.body}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {a.hashtags.map((h) => <span key={h} className="text-[10px] text-brand dark:text-primary">{h}</span>)}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{a.format} · {a.platform}{price != null ? ` · ${formatPrice(price)}` : ""}</span>
        <Button size="sm" variant="ghost" onClick={copyAll}><Copy className="h-3.5 w-3.5" /> Copy</Button>
      </div>
    </div>
  )
}
