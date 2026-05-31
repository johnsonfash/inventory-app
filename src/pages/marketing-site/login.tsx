import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Smile,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BrandMark } from "@/components/brand-mark"
import { isNative, haptic } from "@/hooks/use-native"
import { isAvailable as biometricAvailable, verify as biometricVerify } from "@/hooks/use-biometric"
import {
  isAvailable as passkeyAvailable,
  verify as passkeyVerify,
  isPasskeyLoginEnabled,
  isBiometricLoginEnabled,
} from "@/hooks/use-passkey"

// Standalone /login page. PWA-standalone + Tauri users land here on
// cold launch (the inline redirect in index.html rewrites `/` →
// `/login` for those contexts). Browser-tab visitors arrive here via
// the marketing modal or a direct URL.
//
// Smart welcome-back: localStorage.lastEmail decides whether to show
// a password-only return-visit form ("Welcome back, Tosin") or the
// full first-visit form. "Use a different account" resets back to
// fresh.
//
// Auth method buttons render conditionally per platform:
//   * Email + password — always
//   * Google — always (placeholder click; real OAuth wires to backend)
//   * Passkey — PWA / browser only, when the platform exposes
//     PublicKeyCredential + isUserVerifyingPlatformAuthenticatorAvailable
//   * Biometric — Tauri native only, when the device has a registered
//     fingerprint / Face ID enrolment

const LAST_EMAIL_KEY = "pallio.lastEmail"
const LAST_NAME_KEY  = "pallio.lastName"

// Pulls the first name (or first word) out of an email or stored
// name. "tosin.fashanu@pallio.app" → "Tosin"; falls back gracefully.
function friendlyName(raw: string | null, email: string | null): string {
  const candidate = (raw && raw.trim()) || (email && email.split("@")[0]) || ""
  if (!candidate) return "back"
  const first = candidate.replace(/[._-]/g, " ").trim().split(/\s+/)[0]
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [busy, setBusy] = React.useState(false)

  // Welcome-back mode is the default when we recognise the email;
  // toggling it back lets the user sign in with a different account.
  const [lastEmail, setLastEmail] = React.useState<string | null>(null)
  const [lastName,  setLastName]  = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<"welcome-back" | "fresh">("fresh")

  // Auth-method availability — checked on mount once.
  const [passkeyReady,   setPasskeyReady]   = React.useState(false)
  const [biometricReady, setBiometricReady] = React.useState<{ available: boolean; type: "face" | "touch" | "fingerprint" | "none" }>(
    { available: false, type: "none" },
  )

  React.useEffect(() => {
    document.title = "Sign in · Pallio"
  }, [])

  // One-shot detection. Runs only on mount — no need to re-check.
  React.useEffect(() => {
    try {
      const e = localStorage.getItem(LAST_EMAIL_KEY)
      const n = localStorage.getItem(LAST_NAME_KEY)
      if (e) {
        setLastEmail(e)
        setLastName(n)
        setMode("welcome-back")
      }
    } catch { /* private mode */ }

    // Passkey availability — web only (Tauri WebView is excluded
    // inside use-passkey). Button only renders if BOTH the platform
    // supports it AND the user opted in via Settings.
    if (isPasskeyLoginEnabled()) {
      passkeyAvailable().then((r) => setPasskeyReady(r.available)).catch(() => setPasskeyReady(false))
    }

    // Biometric — Tauri only. Button only renders if BOTH the device
    // has biometry enrolled AND the user opted in via Settings.
    if (isBiometricLoginEnabled()) {
      biometricAvailable().then(setBiometricReady).catch(() => {})
    }
  }, [])

  // Submit handlers — every method funnels through this finishSignIn
  // so we get one place to persist the last email + navigate. Real
  // auth swaps the inner await for an API call.
  const finishSignIn = React.useCallback(
    async (email: string, name?: string) => {
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email)
        if (name) localStorage.setItem(LAST_NAME_KEY, name)
      } catch { /* private mode */ }
      haptic.success()
      await new Promise((r) => setTimeout(r, 500))
      navigate("/dashboard")
    },
    [navigate],
  )

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const email =
      (data.get("email") as string | null) ||
      lastEmail ||
      ""
    if (!email) return
    setBusy(true)
    await finishSignIn(email)
  }

  const useDifferentAccount = () => {
    haptic.light()
    setMode("fresh")
    setLastEmail(null)
    setLastName(null)
  }

  const continueWithGoogle = async () => {
    setBusy(true)
    haptic.light()
    // Mock: pretend Google returned an email. Real flow: signInWithGoogle()
    // → backend exchange → finishSignIn(email, name).
    await finishSignIn(lastEmail || "you@gmail.com", lastName || undefined)
  }

  const continueWithPasskey = async () => {
    setBusy(true)
    haptic.light()
    const ok = await passkeyVerify()
    if (!ok) {
      setBusy(false)
      haptic.warning()
      toast.error("Passkey verification failed. Try again or use email and password.")
      return
    }
    await finishSignIn(lastEmail || "you@business.com")
  }

  const continueWithBiometric = async () => {
    setBusy(true)
    haptic.medium()
    const ok = await biometricVerify("Sign in to Pallio")
    if (!ok) {
      setBusy(false)
      haptic.warning()
      toast.error("Biometric verification failed. Try again or use email and password.")
      return
    }
    await finishSignIn(lastEmail || "you@business.com")
  }

  const greeting = mode === "welcome-back"
    ? `Welcome back, ${friendlyName(lastName, lastEmail)}`
    : "Welcome back"

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto px-4 py-10 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="my-auto w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/20"
      >
        {/* Header — same gradient + glow treatment used on the modal
            so the standalone page reads as part of the same brand. */}
        <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-brand-soft via-card to-emerald-50/40 px-6 py-6 dark:from-primary/10 dark:to-emerald-950/15">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/30 blur-3xl dark:bg-primary/30" aria-hidden />
          <div className="relative flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <BrandMark className="h-9 w-9 shadow-sm shadow-violet-500/20" />
              <span className="text-sm font-bold tracking-tight">Pallio</span>
            </Link>
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            {mode === "welcome-back" && <Smile className="h-6 w-6 text-brand dark:text-primary" />}
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "welcome-back"
              ? "Enter your password to pick up where you left off."
              : "Sign in to manage your business from one place."}
          </p>
        </div>

        <form onSubmit={submitForm} className="flex flex-col gap-4 px-6 py-6">
          {/* Email — hidden in welcome-back mode (we already know who
              you are) but kept as a hidden field so password managers
              still associate the saved credential correctly. */}
          {mode === "welcome-back" ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-3 py-2.5 text-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-fuchsia-500 text-[10px] font-bold text-white">
                  {friendlyName(lastName, lastEmail).charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{lastEmail}</p>
                  <p className="text-[10px] text-muted-foreground">Last signed in here</p>
                </div>
              </div>
              <input type="email" name="email" defaultValue={lastEmail ?? ""} autoComplete="email" className="hidden" readOnly />
            </>
          ) : (
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
              <Input name="email" type="email" autoComplete="email" placeholder="you@business.com" required />
            </label>
          )}

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
              <Lock className="h-3.5 w-3.5" /> Password
            </span>
            <Input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required autoFocus={mode === "welcome-back"} />
          </label>

          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex items-center gap-1.5 text-muted-foreground">
              <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-violet-600" />
              Stay signed in
            </label>
            <Link to="/contact#chat" className="font-medium text-brand hover:underline dark:text-primary">
              Reset via support
            </Link>
          </div>

          <Button type="submit" disabled={busy} size="lg" className="mt-2">
            {busy ? "Just a sec…" : (mode === "welcome-back" ? "Continue" : "Sign in")}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>

          {mode === "welcome-back" && (
            <button
              type="button"
              onClick={useDifferentAccount}
              className="text-center text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Use a different account
            </button>
          )}

          {/* Divider — only render if at least one alt method is
              available, so we never show "or" floating above nothing. */}
          {(passkeyReady || biometricReady.available || true /* google always */) && (
            <div className="my-1 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          )}

          {/* Alt-auth buttons. Each is a self-contained handler that
              still routes through finishSignIn so the post-auth
              behaviour is uniform. */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={continueWithGoogle}
              disabled={busy}
              className="justify-center"
            >
              <GoogleGlyph className="h-4 w-4" />
              Continue with Google
            </Button>

            {biometricReady.available && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={continueWithBiometric}
                disabled={busy}
                className="justify-center"
              >
                <Fingerprint className="h-4 w-4" />
                {biometricLabel(biometricReady.type)}
              </Button>
            )}

            {passkeyReady && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={continueWithPasskey}
                disabled={busy}
                className="justify-center"
              >
                <KeyRound className="h-4 w-4" />
                Sign in with a passkey
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            New to Pallio?{" "}
            <Link to="/register" className="font-semibold text-brand hover:underline dark:text-primary">
              Create an account
            </Link>
          </p>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border bg-muted/30 px-6 py-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Bank-grade encryption
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-block" />
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Works offline
          </span>
        </div>
      </motion.div>
    </div>
  )
}

// Minimal inline Google G — avoids depending on an icon font that
// might not be brand-accurate, and keeps the bundle tight.
// Best-effort label for the biometric button. Same `type` field
// resolves: native iOS Face ID = "face"; iOS Touch ID + macOS = "touch";
// Android / Windows Hello / Linux fprintd = "fingerprint". For
// Windows Hello specifically, ua-sniff the platform to swap the
// generic "fingerprint" copy for the brand-name users recognise.
function biometricLabel(type: "face" | "touch" | "fingerprint" | "none"): string {
  if (type === "face")  return "Sign in with Face ID"
  if (type === "touch") return "Sign in with Touch ID"
  if (type === "fingerprint") {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
    if (/Windows/i.test(ua)) return "Sign in with Windows Hello"
    return "Sign in with fingerprint"
  }
  return "Sign in with biometric"
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
