import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Building2,
  Check,
  Globe,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Wifi,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BrandMark } from "@/components/brand-mark"
import { haptic } from "@/hooks/use-native"

// Standalone /register page — paired with /login. Same shell, same
// gradient header, cross-linked so users can hop either direction.
// PWA-standalone + Tauri users reach this via the "Create an account"
// link on /login.
//
// Submit handler is mocked (no backend yet); on success we drop the
// user into /onboarding which collects the rest (currency, locations,
// invite team, etc).

const LAST_EMAIL_KEY = "pallio.lastEmail"
const LAST_NAME_KEY  = "pallio.lastName"

// Nigeria first since the target market is Nigerian SMBs; the rest
// of West Africa next, then the broader list. A real version would
// be searchable; this short list keeps the initial UI clean.
const COUNTRIES: Array<{ code: string; name: string; dial: string }> = [
  { code: "NG", name: "Nigeria",        dial: "+234" },
  { code: "GH", name: "Ghana",          dial: "+233" },
  { code: "KE", name: "Kenya",          dial: "+254" },
  { code: "ZA", name: "South Africa",   dial: "+27"  },
  { code: "GB", name: "United Kingdom", dial: "+44"  },
  { code: "US", name: "United States",  dial: "+1"   },
  { code: "CA", name: "Canada",         dial: "+1"   },
]

// Lightweight password-strength rubric. Real backend should re-check.
function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: "" }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  return { score: score as 0 | 1 | 2 | 3 | 4, label: ["", "Weak", "Fair", "Good", "Strong"][score] }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [busy, setBusy] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const strength = scorePassword(password)

  React.useEffect(() => {
    document.title = "Create your account · Pallio"
  }, [])

  const finishSignUp = React.useCallback(
    async (email: string, name?: string) => {
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email)
        if (name) localStorage.setItem(LAST_NAME_KEY, name)
      } catch { /* private mode */ }
      haptic.success()
      await new Promise((r) => setTimeout(r, 600))
      navigate("/onboarding")
    },
    [navigate],
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget as HTMLFormElement)
    const email = (data.get("email") as string) || ""
    const name  = (data.get("name") as string)  || ""
    if (!email) return
    setBusy(true)
    try {
      await finishSignUp(email, name)
    } catch {
      // Backend will throw on duplicate email / network / validation
      // errors; surface that instead of silently dropping the user.
      setBusy(false)
      haptic.warning()
      toast.error("Couldn't create your account. Please try again.")
    }
  }

  const continueWithGoogle = async () => {
    setBusy(true)
    haptic.light()
    try {
      // Mock: pretend Google returned an email + name. Real OAuth wires
      // here — if the user cancels or auth fails, surface a toast and
      // reset the button instead of silently navigating away.
      await finishSignUp("you@gmail.com", "Tosin Fashanu")
    } catch {
      setBusy(false)
      haptic.warning()
      toast.error("Google sign-up was cancelled or failed. Please try again.")
    }
  }

  return (
    <div className="grid min-h-[100dvh] w-full md:grid-cols-2">
      {/* Marketing rail — desktop only. Reinforces the brand value
          while the user fills the form on the right so register
          doesn't feel like a wall of inputs. Hidden on mobile because
          the form already takes the full screen and the rail's copy
          would push the form below the fold. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-soft via-card to-emerald-50/40 p-10 md:flex dark:from-primary/15 dark:via-card dark:to-emerald-950/15">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand/25 blur-3xl dark:bg-primary/25" aria-hidden />
        <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-fuchsia-500/15" aria-hidden />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2">
            <BrandMark className="h-10 w-10 shadow-sm shadow-violet-500/20" />
            <span className="text-lg font-bold tracking-tight">Pallio</span>
          </Link>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            Run every counter, shelf, and storefront from one place.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Inventory, POS, accounting, and your own hosted storefront. Built for the operators who actually run the floor.
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            {[
              { Icon: Zap,         label: "Set up in 5 minutes",   sub: "Drop in your products, you're selling today." },
              { Icon: Wifi,        label: "Works offline",         sub: "POS keeps ringing through power cuts. Syncs when you're back." },
              { Icon: ShieldCheck, label: "Bank-grade encryption", sub: "Your books, your customers, your data. Encrypted at rest." },
            ].map(({ Icon, label, sub }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand shadow-sm shadow-brand/15 dark:bg-primary/15 dark:text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-sm">
          <p className="text-[13px] leading-relaxed text-foreground/90">
            "We moved the whole shop off paper notebooks in a week. Stock counts that used to take a Saturday now take 20 minutes."
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-fuchsia-500 text-[10px] font-bold text-white">A</span>
            <div className="text-[11px]">
              <p className="font-semibold">Aisha O.</p>
              <p className="text-muted-foreground">Owner · Sade Beauty, Lekki</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Form rail — fills the right half on desktop, full width on
          mobile. Centred vertically; scrolls when content overflows
          (small windows, on-screen keyboard, etc). */}
      <div className="flex items-center justify-center overflow-y-auto px-4 py-10 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="my-auto w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/20"
      >
        <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-brand-soft via-card to-emerald-50/40 px-6 py-6 md:hidden dark:from-primary/10 dark:to-emerald-950/15">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/30 blur-3xl dark:bg-primary/30" aria-hidden />
          <div className="relative flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <BrandMark className="h-9 w-9 shadow-sm shadow-violet-500/20" />
              <span className="text-sm font-bold tracking-tight">Pallio</span>
            </Link>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get inventory, POS, storefront, and accounting in one place.
          </p>
        </div>

        {/* Desktop-only form header — the marketing rail already
            carries the brand mark, so the form starts with the
            primary heading instead of repeating it. */}
        <div className="hidden border-b border-border px-6 py-6 md:block">
          <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Free 30-day trial. No card required.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-6">
          {/* Google sign-up first — easier path for many users; the
              form below stays as the secondary option. */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={continueWithGoogle}
            disabled={busy}
            className="justify-center"
          >
            <GoogleGlyph className="h-4 w-4" />
            Sign up with Google
          </Button>

          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
              <User className="h-3.5 w-3.5" /> Your name
            </span>
            <Input name="name" type="text" autoComplete="name" placeholder="Tosin Fashanu" required />
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
              <Building2 className="h-3.5 w-3.5" /> Business name
            </span>
            <Input name="business" type="text" autoComplete="organization" placeholder="Pallio Lagos" required />
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
              <Mail className="h-3.5 w-3.5" /> Work email
            </span>
            <Input name="email" type="email" autoComplete="email" placeholder="you@business.com" required />
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
              <Lock className="h-3.5 w-3.5" /> Password
            </span>
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="text-[10px] text-muted-foreground">At least 8 characters.</span>
            {/* Strength meter — 4-segment bar that lights up as the
                password gets stronger. Pure feedback; backend should
                re-validate before accepting. */}
            <div className="mt-1 flex items-center gap-1.5">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((seg) => (
                  <span
                    key={seg}
                    className={
                      "h-1 flex-1 rounded-full transition-colors " +
                      (strength.score >= seg
                        ? strength.score >= 3
                          ? "bg-emerald-500"
                          : strength.score === 2
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        : "bg-muted")
                    }
                  />
                ))}
              </div>
              {strength.label && (
                <span className={
                  "shrink-0 text-[10px] font-semibold tabular-nums " +
                  (strength.score >= 3 ? "text-emerald-600 dark:text-emerald-400"
                    : strength.score === 2 ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400")
                }>
                  {strength.label}
                </span>
              )}
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
              <Globe className="h-3.5 w-3.5" /> Country
            </span>
            <select
              name="country"
              defaultValue="NG"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30 dark:focus:ring-primary/30"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name} · {c.dial}</option>
              ))}
            </select>
          </label>

          <label className="mt-1 inline-flex items-start gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" required defaultChecked className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-violet-600" />
            <span>
              I agree to Pallio's{" "}
              <Link to="/terms" className="font-medium text-brand hover:underline dark:text-primary">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="font-medium text-brand hover:underline dark:text-primary">Privacy Policy</Link>.
            </span>
          </label>

          <Button type="submit" disabled={busy} size="lg" className="mt-1">
            {busy ? "Setting up your space…" : "Create account"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-brand hover:underline dark:text-primary">
              Sign in
            </Link>
          </p>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border bg-muted/30 px-6 py-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500" /> Free 30-day trial
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-block" />
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> No card required
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-block" />
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Works offline
          </span>
        </div>
      </motion.div>
      </div>
    </div>
  )
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.6l3-3A9.97 9.97 0 0 0 12 1a11 11 0 0 0-9.8 6.1l3.5 2.7C6.5 6.9 9 5 12 5Z" />
      <path fill="#4285F4" d="M23 12.2c0-.8-.1-1.5-.2-2.2H12v4.4h6.2c-.3 1.5-1.1 2.7-2.4 3.6l3.6 2.8c2.1-2 3.4-4.9 3.4-8.6Z" />
      <path fill="#FBBC05" d="M5.7 14.4c-.3-.8-.4-1.6-.4-2.4 0-.8.1-1.6.4-2.4L2.2 6.9A11 11 0 0 0 1 12c0 1.8.4 3.5 1.2 5l3.5-2.6Z" />
      <path fill="#34A853" d="M12 23c2.7 0 5-.9 6.6-2.4l-3.6-2.8c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7L2.2 17A11 11 0 0 0 12 23Z" />
    </svg>
  )
}
