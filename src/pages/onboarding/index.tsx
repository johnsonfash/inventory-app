import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Eye,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/lists/status-badge"
import { ORG_STEPS, PERSONAL_STEPS, type StepDefinition } from "@/components/onboarding/step-definitions"
import { CelebrationModal, resetCelebration } from "@/components/onboarding/celebration"
import { resetFirstRun } from "@/components/onboarding/first-run-modal"
import { resetCoachMarks } from "@/components/onboarding/coach-mark"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { kv, kvJson } from "@/lib/storage/kv"
import { cn } from "@/lib/utils"

const PROGRESS_KEY  = "pallio:onboarding-progress"
const DISMISSED_KEY = "pallio:onboarding-dismissed"

type ProgressMap = Record<string, boolean>

function readProgress(): ProgressMap {
  return kvJson.get<ProgressMap>(PROGRESS_KEY) ?? {}
}

type Filter = "all" | "todo" | "done" | "org" | "personal"

export default function OnboardingHub() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))
  const [progress, setProgress] = React.useState<ProgressMap>(() => readProgress())
  const [filter, setFilter]     = React.useState<Filter>("todo")
  const [showConfetti, setShowConfetti] = React.useState(false)

  React.useEffect(() => {
    const onChange = () => setProgress(readProgress())
    window.addEventListener("pallio:onboarding-changed", onChange)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener("pallio:onboarding-changed", onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  const allSteps = React.useMemo(() => [...ORG_STEPS, ...PERSONAL_STEPS], [])
  const doneCount = allSteps.filter((s) => progress[s.key]).length
  const totalSteps = allSteps.length
  const pct = Math.round((doneCount / totalSteps) * 100)
  const orgDone = ORG_STEPS.filter((s) => progress[s.key]).length
  const personalDone = PERSONAL_STEPS.filter((s) => progress[s.key]).length
  const isComplete = doneCount === totalSteps

  const mark = (key: string, done: boolean) => {
    const next = { ...progress, [key]: done }
    setProgress(next)
    void kvJson.set(PROGRESS_KEY, next)
    window.dispatchEvent(new CustomEvent("pallio:onboarding-changed"))
  }

  const resetEverything = async () => {
    await kv.remove(PROGRESS_KEY)
    await kv.remove(DISMISSED_KEY)
    await resetFirstRun()
    await resetCelebration()
    await resetCoachMarks()
    window.dispatchEvent(new CustomEvent("pallio:onboarding-changed"))
    toast.success("Tour reset — welcome modal + checklist will fire again.")
  }

  const counts: Record<Filter, number> = {
    all:      allSteps.length,
    todo:     allSteps.filter((s) => !progress[s.key]).length,
    done:     doneCount,
    org:      ORG_STEPS.length,
    personal: PERSONAL_STEPS.length,
  }

  const isMatch = (s: StepDefinition, source: "org" | "personal") => {
    if (filter === "all") return true
    if (filter === "todo") return !progress[s.key]
    if (filter === "done") return !!progress[s.key]
    return filter === source
  }
  const orgFiltered      = ORG_STEPS.filter((s) => isMatch(s, "org"))
  const personalFiltered = PERSONAL_STEPS.filter((s) => isMatch(s, "personal"))

  return (
    <PageShell
      title="Get started with Pallio"
      withToolbar={false}
      titleTooltip={
        <>
          Every step you need to set up your Pallio business — org
          fundamentals + personal exercises that build muscle memory.
          Most steps auto-tick once you visit the right page.
        </>
      }
      mobileTrailing={
        <Button size="sm" variant="ghost" onClick={resetEverything} aria-label="Replay tour">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Hero — progress ring + headline + replay */}
        <section
          className={cn(
            "relative overflow-hidden rounded-2xl border p-5",
            isComplete
              ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card"
              : "border-border bg-gradient-to-br from-brand-soft via-card to-fuchsia-50/40 dark:from-primary/10 dark:to-fuchsia-950/15",
          )}
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-brand/30 via-fuchsia-500/15 to-transparent blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Progress ring */}
              <div className="relative h-20 w-20 shrink-0">
                {/* 100x100 viewBox; cx/cy=50 centers; r=42 leaves room for
                    the 9-unit stroke. Circumference 2π·42 ≈ 264 — used as
                    the dasharray base so (pct/100)*264 fills proportionally. */}
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="9" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#onb-grad)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 264} 264`}
                  />
                  <defs>
                    <linearGradient id="onb-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xl font-bold tabular-nums leading-none">{doneCount}/{totalSteps}</p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">done</p>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                  {isComplete ? "You're all set 🎉" : `${pct}% there — keep going.`}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground md:text-base">
                  {isComplete
                    ? "Every onboarding step is done. Pallio is ready to power your business."
                    : "Tap any step to start it. Most auto-tick when you visit the right page."}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <StatusBadge tone="brand">Org · {orgDone}/{ORG_STEPS.length}</StatusBadge>
                  <StatusBadge tone="success">Personal · {personalDone}/{PERSONAL_STEPS.length}</StatusBadge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isComplete ? (
                <Button onClick={() => setShowConfetti(true)}>
                  <Trophy className="h-3.5 w-3.5" /> Show celebration
                </Button>
              ) : (
                <Button variant="outline" onClick={resetEverything}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
              <Link to="/dashboard">
                <Button variant="ghost">Back to dashboard</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Filters */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
          {(["todo", "all", "done", "org", "personal"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                filter === f
                  ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", filter === f ? "bg-white/20" : "bg-muted")}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Org block */}
        {orgFiltered.length > 0 && (
          <StepBlock
            title="Set up your business"
            subtitle="One-time configuration that powers every invoice, sale, and report."
            Icon={Building2}
            steps={orgFiltered}
            progress={progress}
            onMark={mark}
          />
        )}

        {/* Personal block */}
        {personalFiltered.length > 0 && (
          <StepBlock
            title="Build muscle memory"
            subtitle="Hands-on exercises so the app's flow becomes second nature."
            Icon={Users}
            steps={personalFiltered}
            progress={progress}
            onMark={mark}
          />
        )}

        {orgFiltered.length === 0 && personalFiltered.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 dark:text-emerald-400" />
              <p className="mt-3 text-lg font-bold">Nothing in this filter</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another filter — or you're truly done.</p>
            </CardContent>
          </Card>
        )}

        {/* Cross-links */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { Icon: Sparkles,   label: "Tour all features",     body: "Browse the full feature map.", href: "/help/glossary" },
            { Icon: HelpCircle, label: "FAQ + help",             body: "Plain-English answers to common questions.", href: "/faq" },
            { Icon: Target,     label: "What's next this week", body: "Pallio AI suggests your week-1 priorities.", href: "/ai" },
          ].map((q) => (
            <Link key={q.label} to={q.href} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
              <q.Icon className="h-4 w-4 text-brand dark:text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{q.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{q.body}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      <CelebrationModal open={showConfetti} onClose={() => setShowConfetti(false)} />
    </PageShell>
  )
}

function StepBlock({
  title, subtitle, Icon, steps, progress, onMark,
}: {
  title: string
  subtitle: string
  Icon: typeof Building2
  steps: StepDefinition[]
  progress: ProgressMap
  onMark: (key: string, done: boolean) => void
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold md:text-base">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {steps.map((s, idx) => {
            const done = !!progress[s.key]
            const StepIcon = s.Icon
            return (
              <li key={s.key} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30">
                <button
                  type="button"
                  onClick={() => onMark(s.key, !done)}
                  aria-pressed={done}
                  aria-label={done ? `Mark ${s.title} as undone` : `Mark ${s.title} as done`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center"
                >
                  {done ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </button>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", s.tone)}>
                  <StepIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", done && "text-muted-foreground line-through")}>
                    <span className="mr-1.5 inline-block w-6 text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </p>
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">{s.description}</p>
                </div>
                <Link to={s.href}>
                  <Button size="sm" variant={done ? "ghost" : "outline"}>
                    {done ? <Eye className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    {done ? "Review" : "Start"}
                  </Button>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
