import * as React from "react"
import { createPortal } from "react-dom"
import { Link, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Github, Lock, Mail, ShieldCheck, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = { open: boolean; onClose: () => void }

// Marketing-side sign-in / get-started modal. Two-tab — Sign in vs
// Create account — with Google + Apple SSO placeholders, an email +
// password form, and a SOC2-ish trust strip at the bottom.
//
// Backend isn't wired (this app is currently dummy data), so submit
// is a no-op + an artificial 600ms spinner before we navigate to
// /dashboard. When real auth lands, swap the submit handler for
// api.post('/auth/login') / api.post('/auth/signup').
export function SignInModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = React.useState<"signin" | "signup">("signin")
  const [busy, setBusy] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [name, setName] = React.useState("")

  // Reset state when opening fresh.
  React.useEffect(() => {
    if (!open) return
    setBusy(false)
  }, [open])

  // Escape closes.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Body scroll lock while open.
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Client-side validation — HTML5 required handles presence; this
    // covers malformed email + too-short password before we bother
    // the backend.
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (!emailOk) {
      toast.error("Please enter a valid email address.")
      return
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    if (tab === "signup" && !name.trim()) {
      toast.error("Please enter your name.")
      return
    }
    setBusy(true)
    try {
      await new Promise((r) => setTimeout(r, 600))
      onClose()
      navigate("/dashboard")
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  // Mock SSO handlers — show a brief busy state + surface a toast on
  // cancel/failure when real OAuth wires in. Today's mock always
  // resolves, but the shape is ready for `signInWithGoogle()` / Apple
  // ID web flow to slot in without re-plumbing the buttons.
  const continueWithSso = async (provider: "Google" | "Apple") => {
    setBusy(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      onClose()
      navigate("/dashboard")
    } catch {
      toast.error(`${provider} sign-in was cancelled or failed. Please try again.`)
    } finally {
      setBusy(false)
    }
  }

  if (typeof document === "undefined") return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={tab === "signin" ? "Sign in to Pallio" : "Create your Pallio account"}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40"
          >
            {/* Top brand strip */}
            <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-brand-soft via-card to-emerald-50/40 px-6 py-5 dark:from-primary/10 dark:to-emerald-950/15">
              {/* Decorative glow — needs pointer-events:none, otherwise
                  it captures clicks on the X button beneath the blur. */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/30 blur-3xl dark:bg-primary/30" aria-hidden />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/60 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-card hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-fuchsia-500 text-sm font-bold text-white shadow-sm shadow-brand/30">
                  P
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pallio</p>
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-tight">
                {tab === "signin" ? "Welcome back" : "Start free in 30 seconds"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {tab === "signin"
                  ? "Sign in to manage inventory, POS, sales and reporting from one app."
                  : "No credit card needed. Free plan covers up to 100 SKUs and 1 location."}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["signin", "signup"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={
                    "flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors " +
                    (tab === t
                      ? "border-brand text-brand dark:border-primary dark:text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {/* SSO */}
            <div className="grid grid-cols-2 gap-2 p-5 pb-3">
              <Button variant="outline" size="sm" type="button" disabled={busy} onClick={() => continueWithSso("Google")}>
                <GoogleMark /> Google
              </Button>
              <Button variant="outline" size="sm" type="button" disabled={busy} onClick={() => continueWithSso("Apple")}>
                <AppleMark /> Apple
              </Button>
            </div>
            <div className="px-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">or with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="flex flex-col gap-3 px-5 pb-5">
              {tab === "signup" && (
                <Field label="Your name" Icon={Sparkles}>
                  <Input
                    type="text"
                    autoComplete="name"
                    placeholder="Alex Larson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>
              )}
              <Field label="Email" Icon={Mail}>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Password" Icon={Lock}>
                <Input
                  type="password"
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>

              {tab === "signin" && (
                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-violet-600" />
                    Stay signed in
                  </label>
                  <Link to="/contact#chat" onClick={onClose} className="font-medium text-brand hover:underline dark:text-primary">
                    Reset via support
                  </Link>
                </div>
              )}

              <Button type="submit" disabled={busy} className="mt-1">
                {busy ? "Just a sec…" : tab === "signin" ? "Sign in" : "Create account"}
                {!busy && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                By continuing you agree to our{" "}
                <Link to="/terms" onClick={onClose} className="underline">Terms</Link> +{" "}
                <Link to="/privacy" onClick={onClose} className="underline">Privacy Policy</Link>.
              </p>
            </form>

            {/* Trust strip */}
            <div className="flex items-center justify-center gap-4 border-t border-border bg-muted/30 px-5 py-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Bank-grade encryption</span>
              <span className="inline-flex items-center gap-1"><Github className="h-3 w-3" /> Open development</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Field({ label, Icon, children }: { label: string; Icon: React.ElementType; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      {children}
    </label>
  )
}

// Minimal G mark — no Google brand dependency, just a colourful "G".
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-3.5 w-3.5" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.79 2.71v2.25h2.9c1.7-1.56 2.69-3.86 2.69-6.6z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.25c-.81.54-1.84.86-3.06.86-2.36 0-4.36-1.59-5.07-3.74H.98v2.32C2.45 15.98 5.48 18 9 18z" />
      <path fill="#FBBC05" d="M3.93 10.69A5.41 5.41 0 0 1 3.64 9c0-.59.1-1.16.29-1.69V4.99H.98A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.98 4.01l2.95-2.32z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0 5.48 0 2.45 2.02.98 4.99l2.95 2.32C4.64 5.17 6.64 3.58 9 3.58z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden="true">
      <path fill="currentColor" d="M11.6 7.4c-.02-2.04 1.67-3.02 1.75-3.07-.96-1.4-2.44-1.59-2.97-1.61-1.26-.13-2.46.74-3.1.74-.65 0-1.64-.72-2.7-.7C3.21 2.78 1.94 3.55 1.25 4.78c-1.39 2.4-.36 5.97 1 7.93.66.96 1.45 2.04 2.49 2 1-.04 1.37-.65 2.59-.65 1.21 0 1.55.65 2.61.63 1.08-.02 1.76-.97 2.42-1.94.76-1.1 1.07-2.18 1.09-2.23-.02-.01-2.09-.8-2.11-3.17zM9.8 1.94c.55-.67.92-1.59.82-2.5C9.83-.51 8.86.02 8.3.69c-.51.6-.95 1.55-.83 2.45.87.07 1.78-.44 2.33-1.2z" />
    </svg>
  )
}
