import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  Apple,
  Check,
  Chrome,
  Clock,
  Copy,
  Download,
  Fingerprint,
  Globe,
  KeyRound,
  Lock,
  Mail,
  Monitor,
  RefreshCcw,
  ScanFace,
  Shield,
  ShieldCheck,
  Smartphone,
  X,
  Zap,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { FormSection } from "@/components/forms/form-section"
import { SwitchField } from "@/components/forms/switch-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import {
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  useBiometric,
  verify as verifyBiometric,
  register as registerBiometric,
  unregister as unregisterBiometric,
} from "@/hooks/use-biometric"
import {
  usePasskey,
  isPasskeyLoginEnabled,
  setPasskeyLoginEnabled,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
  register as registerPasskey,
  unregister as unregisterPasskey,
} from "@/hooks/use-passkey"
import { isNative } from "@/hooks/use-native"
import { cn } from "@/lib/utils"

// Comprehensive Security page — biometric unlock, password rotation,
// 2FA setup with QR + recovery codes, social sign-in connections,
// active sessions list, login alerts, password requirements. Every
// section is mobile-first and at least visually wired even though
// the auth backend is still mocked (kv-only).

const RECOVERY_CODES = [
  "8XKQ-2RZF", "L7M4-9DP1", "WB3T-VYNE", "U6CF-S2HK",
  "4ZP9-XJDA", "G8V1-EQ7M", "RKLT-N3W6", "T2YJ-MQ8C",
]

// Dummy "qr-as-svg" — a deterministic-looking grid that's good
// enough to demonstrate the UI. Real backend issues a tag and a
// signed otpauth:// URL.
function FakeQR({ className }: { className?: string }) {
  const cells = React.useMemo(() => {
    const out: boolean[] = []
    let seed = 0x9e3779b1
    for (let i = 0; i < 21 * 21; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      out.push((seed & 1) === 1)
    }
    return out
  }, [])
  return (
    <svg viewBox="0 0 21 21" className={className} role="img" aria-label="2FA QR code">
      <rect width="21" height="21" fill="currentColor" opacity="0.04" />
      {cells.map((on, i) => {
        const x = i % 21
        const y = Math.floor(i / 21)
        if (!on) return null
        // Three position markers (top-left, top-right, bottom-left).
        if ((x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)) {
          // Skip — markers drawn separately.
          if (
            (x === 0 || x === 6 || y === 0 || y === 6) ||
            (x >= 2 && x <= 4 && y >= 2 && y <= 4)
          ) {
            return <rect key={i} x={x} y={y} width="1" height="1" fill="currentColor" />
          }
          return null
        }
        return <rect key={i} x={x} y={y} width="1" height="1" fill="currentColor" />
      })}
      {/* Position markers — three corners */}
      {[
        [0, 0], [14, 0], [0, 14],
      ].map(([mx, my]) => (
        <g key={`${mx}-${my}`}>
          <rect x={mx} y={my} width="7" height="7" fill="currentColor" opacity="0" stroke="currentColor" strokeWidth="1" />
          <rect x={mx + 2} y={my + 2} width="3" height="3" fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}

type SocialConnection = {
  id: "google" | "apple" | "github" | "microsoft"
  name: string
  Icon: React.ElementType
  brand: string
  connectedAt: string | null
  email?: string
}

type Session = {
  id: string
  device: string
  browser: string
  location: string
  ip: string
  lastActive: string
  current: boolean
  Icon: React.ElementType
}

const SESSIONS: Session[] = [
  { id: "s-1", device: "MacBook Pro 16\"", browser: "Chrome 130 · macOS",     location: "Lagos, NG",    ip: "102.89.32.18", lastActive: "now",         current: true,  Icon: Monitor },
  { id: "s-2", device: "iPhone 15 Pro",    browser: "Pallio iOS · 1.3.2",      location: "Lagos, NG",    ip: "102.89.32.18", lastActive: "2h ago",      current: false, Icon: Smartphone },
  { id: "s-3", device: "Pixel 7",          browser: "Pallio Android · 1.3.0",   location: "Abuja, NG",    ip: "197.210.55.92", lastActive: "3d ago",      current: false, Icon: Smartphone },
  { id: "s-4", device: "Windows desktop",  browser: "Edge 130 · Windows",      location: "Lagos, NG",    ip: "102.89.32.18", lastActive: "1w ago",      current: false, Icon: Monitor },
]

export default function SecuritySettings() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))
  const bio = useBiometric()
  const passkey = usePasskey()
  const [lockEnabled, setLockEnabled] = React.useState(() => isBiometricLockEnabled())
  // Sleekr-pattern sign-in shortcuts — separate from the lock toggle.
  // "Biometric login" → /login shows a biometric button (Tauri only).
  // "Passkey login"   → /login shows a passkey button (web only).
  const [bioLogin, setBioLogin]     = React.useState(() => isBiometricLoginEnabled())
  const [passkeyOn, setPasskeyOn]   = React.useState(() => isPasskeyLoginEnabled())

  // 2FA state — mocked in kv via setup-step-machine.
  const [twoFAStatus, setTwoFAStatus] = React.useState<"off" | "setup" | "verifying" | "on">("off")
  const [twoFACode, setTwoFACode] = React.useState("")
  const [codesRevealed, setCodesRevealed] = React.useState(false)
  const [regenerateOpen, setRegenerateOpen] = React.useState(false)
  const [loginAlerts, setLoginAlerts] = React.useState(true)
  const [trustedDeviceDays, setTrustedDeviceDays] = React.useState("30")

  // Social connections — mocked. Google is shown "connected" so the
  // UI demonstrates the disconnect path too.
  const [socials, setSocials] = React.useState<SocialConnection[]>([
    { id: "google",    name: "Google",        Icon: Chrome,    brand: "#4285F4", connectedAt: "Connected · used for sign-in", email: "mia@funkeapparel.com" },
    { id: "apple",     name: "Apple",         Icon: Apple,     brand: "#000000", connectedAt: null },
    { id: "microsoft", name: "Microsoft",     Icon: Globe,     brand: "#0078D4", connectedAt: null },
    { id: "github",    name: "GitHub",        Icon: Globe,     brand: "#181717", connectedAt: null },
  ])

  const toggleSocial = (id: SocialConnection["id"]) => {
    setSocials((prev) => prev.map((s) =>
      s.id === id
        ? { ...s, connectedAt: s.connectedAt ? null : `Just now · used for sign-in` }
        : s,
    ))
    const provider = socials.find((s) => s.id === id)
    if (provider) toast.success(provider.connectedAt ? `Disconnected from ${provider.name}` : `Connected to ${provider.name}`)
  }

  const onToggleLock = async (next: boolean) => {
    if (!next) {
      setBiometricLockEnabled(false)
      setLockEnabled(false)
      window.dispatchEvent(new CustomEvent("pallio:biometric-lock-changed"))
      return
    }
    const ok = await verifyBiometric("Confirm to enable biometric unlock")
    if (!ok) return
    setBiometricLockEnabled(true)
    setLockEnabled(true)
    window.dispatchEvent(new CustomEvent("pallio:biometric-lock-changed"))
  }

  // Biometric sign-in: gate the /login biometric button. Real auth
  // would also save the current refresh-token pair behind the
  // device's Keychain (Sleekr pattern) so login can unlock it. Mock
  // build runs the actual platform ceremony (Touch ID prompt on
  // macOS, native sheet on iOS) so the toggle's UX is real even
  // without a backend.
  const onToggleBioLogin = async (next: boolean) => {
    if (!next) {
      await unregisterBiometric()
      setBiometricLoginEnabled(false)
      setBioLogin(false)
      toast.success("Biometric sign-in turned off")
      return
    }
    // register() prompts Touch ID/Face ID/Hello and stores the
    // credential on success. Returns false on cancel — don't flip
    // the toggle in that case.
    const ok = await registerBiometric("Pallio")
    if (!ok) { toast.error("Couldn't enable biometric sign-in."); return }
    setBiometricLoginEnabled(true)
    setBioLogin(true)
    toast.success("Biometric sign-in enabled")
  }

  // Passkey sign-in: enrolment runs the WebAuthn ceremony, then
  // persists the flag. Disabling clears the stored credential ID
  // (server would also revoke server-side — mock build is local-only).
  const onTogglePasskey = async (next: boolean) => {
    if (!next) {
      unregisterPasskey()
      setPasskeyLoginEnabled(false)
      setPasskeyOn(false)
      toast.success("Passkey sign-in turned off")
      return
    }
    const res = await registerPasskey("Pallio")
    if (!res.ok) { toast.error("Couldn't create a passkey on this device."); return }
    setPasskeyLoginEnabled(true)
    setPasskeyOn(true)
    toast.success("Passkey saved — you can sign in with it next time.")
  }

  const start2FA = () => setTwoFAStatus("setup")
  const verify2FA = () => {
    if (twoFACode.replace(/\s/g, "").length < 6) {
      toast.error("Enter the 6-digit code from your authenticator app.")
      return
    }
    setTwoFAStatus("on")
    setCodesRevealed(true)
    toast.success("Two-factor authentication is on.")
  }
  const turn2FAOff = () => {
    setTwoFAStatus("off")
    setTwoFACode("")
    setCodesRevealed(false)
    toast.success("Two-factor authentication turned off.")
  }

  const copy = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  const downloadCodes = () => {
    const blob = new Blob([
      `# Pallio recovery codes for mia@funkeapparel.com\n# Generated ${new Date().toLocaleString()}\n\n${RECOVERY_CODES.join("\n")}\n`,
    ], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "pallio-recovery-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const BioIcon = bio.type === "face" ? ScanFace : bio.type === "fingerprint" || bio.type === "touch" ? Fingerprint : Lock
  const bioLabel = bio.type === "face" ? "Face ID" : bio.type === "touch" ? "Touch ID" : bio.type === "fingerprint" ? "Fingerprint" : "Biometrics"

  const securityScore = React.useMemo(() => {
    let s = 40 // base for having an account + password
    if (twoFAStatus === "on") s += 30
    if (lockEnabled) s += 15
    if (socials.some((x) => x.connectedAt)) s += 10
    if (loginAlerts) s += 5
    return Math.min(100, s)
  }, [twoFAStatus, lockEnabled, socials, loginAlerts])

  const scoreTone: StatusTone =
    securityScore >= 85 ? "success" : securityScore >= 60 ? "info" : "warning"

  return (
    <PageShell
      title="Security"
      withToolbar={false}
      titleTooltip={
        <>
          How Pallio keeps your account safe — password, two-factor
          authentication, biometric unlock, social sign-in, active
          sessions, login alerts. Turn on 2FA + biometric at a minimum;
          takes 30 seconds and stops 99% of account takeovers.
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Security score hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/25 via-brand/15 to-transparent blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-5">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#sec-grad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(securityScore / 100) * 264} 264`}
                />
                <defs>
                  <linearGradient id="sec-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold tabular-nums leading-none">{securityScore}</p>
                <p className="text-[10px] text-muted-foreground">of 100</p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold tracking-tight md:text-lg">Security score</h2>
                <StatusBadge tone={scoreTone}>{securityScore >= 85 ? "strong" : securityScore >= 60 ? "fair" : "weak"}</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                {securityScore >= 85
                  ? "Excellent. You've layered Pallio with the standard recommendations."
                  : "Boost your score by turning on 2FA + biometric unlock + connecting a social sign-in."}
              </p>
              <div className="mt-3 grid gap-1.5 text-[11px] sm:grid-cols-2">
                {[
                  { label: "Strong password",  on: true },
                  { label: "Two-factor auth",   on: twoFAStatus === "on" },
                  { label: "Biometric unlock",  on: lockEnabled },
                  { label: "Login alerts",       on: loginAlerts },
                ].map((c) => (
                  <span key={c.label} className="flex items-center gap-1.5">
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", c.on ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                      {c.on ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
                    </span>
                    <span className={c.on ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Password */}
        <FormSection title="Password" description="Your primary sign-in credential." Icon={KeyRound}>
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold">Current password</span>
                <Input type="password" placeholder="••••••••" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold">New password</span>
                <Input type="password" placeholder="At least 12 characters" />
              </label>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
              <p className="font-semibold text-foreground">Requirements</p>
              <ul className="mt-1.5 space-y-0.5">
                <li>• 12+ characters with letters, numbers, and at least one symbol</li>
                <li>• Different from your last 5 passwords</li>
                <li>• Not found in known breach databases (we check against haveibeenpwned)</li>
              </ul>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Last changed: 47 days ago</span>
              <Button size="sm" onClick={() => toast.success("Password updated.")}>Update password</Button>
            </div>
          </div>
        </FormSection>

        {/* Two-factor authentication */}
        <FormSection
          title="Two-factor authentication"
          description="Adds a one-time code on top of your password. The single biggest jump in account safety you can make."
          Icon={Shield}
          trailing={
            <StatusBadge tone={twoFAStatus === "on" ? "success" : "warning"} withDot>
              {twoFAStatus === "on" ? "enabled" : "off"}
            </StatusBadge>
          }
        >
          {twoFAStatus === "off" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs">
                <p className="font-semibold">How it works</p>
                <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-muted-foreground">
                  <li>Install an authenticator app (Google Authenticator, Authy, 1Password).</li>
                  <li>Scan the QR code Pallio gives you.</li>
                  <li>The app generates a fresh 6-digit code every 30 seconds.</li>
                  <li>You enter the current code along with your password each sign-in.</li>
                </ol>
              </div>
              <Button onClick={start2FA} className="w-fit">
                <Zap className="h-3.5 w-3.5" /> Set up 2FA
              </Button>
            </div>
          )}

          {twoFAStatus === "setup" && (
            <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border border-border bg-white p-3 shadow-sm dark:bg-card">
                  <FakeQR className="h-44 w-44 text-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground">Scan with your authenticator app</p>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold">Can't scan? Enter this key manually:</p>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-input bg-background p-2">
                    <code className="flex-1 truncate font-mono text-xs">JBSWY3DPEHPK3PXPMIA2EQRJ</code>
                    <Button size="sm" variant="ghost" onClick={() => copy("JBSWY3DPEHPK3PXPMIA2EQRJ", "Setup key")}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold">Enter the 6-digit code from your app</span>
                  <Input
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000 000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="font-mono text-lg tracking-widest"
                  />
                </label>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setTwoFAStatus("off")}>Cancel</Button>
                  <Button size="sm" onClick={verify2FA}>Verify + enable</Button>
                </div>
              </div>
            </div>
          )}

          {twoFAStatus === "on" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <p className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" /> 2FA is active.
                </p>
                <p className="mt-1">You'll be asked for a code from your authenticator app every sign-in.</p>
              </div>

              {/* Recovery codes */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Save your recovery codes</p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                      Each code works once. Use one to sign in if you lose your authenticator device. Treat them like passwords — store in a password manager.
                    </p>
                  </div>
                </div>
                {codesRevealed ? (
                  <ul className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-xs sm:grid-cols-4">
                    {RECOVERY_CODES.map((c) => (
                      <li key={c} className="rounded-md border border-amber-500/30 bg-card px-2 py-1.5 text-center">
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Codes hidden. <button type="button" onClick={() => setCodesRevealed(true)} className="font-semibold text-brand hover:underline dark:text-primary">Show codes</button></p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={downloadCodes}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copy(RECOVERY_CODES.join("\n"), "Recovery codes")}>
                    <Copy className="h-3.5 w-3.5" /> Copy all
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRegenerateOpen(true)}>
                    <RefreshCcw className="h-3.5 w-3.5" /> Regenerate
                  </Button>
                </div>
              </div>

              <Button size="sm" variant="outline" onClick={turn2FAOff} className="w-fit border-rose-500/40 text-rose-600 dark:text-rose-400">
                Turn off 2FA
              </Button>
            </div>
          )}
        </FormSection>

        {/* Biometric unlock (existing) */}
        <FormSection
          title="Biometric unlock"
          description="Require Face ID, Touch ID, or fingerprint to open Pallio."
          Icon={BioIcon}
          trailing={
            <StatusBadge tone={!isNative ? "neutral" : lockEnabled ? "success" : "warning"} withDot>
              {!isNative ? "mobile only" : lockEnabled ? "on" : "off"}
            </StatusBadge>
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                <BioIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{bioLabel}</p>
                <p className="text-[11px] text-muted-foreground">
                  {!isNative
                    ? "Available in the iOS / Android / desktop app — not in the browser."
                    : !bio.ready
                      ? "Checking device support…"
                      : bio.available
                        ? "Device supports biometric authentication."
                        : "No biometric set up on this device — enroll one in your system Settings."}
                </p>
              </div>
            </div>
            <StatusBadge tone={!isNative ? "neutral" : bio.available ? "success" : "warning"}>
              {!isNative ? "web" : bio.available ? "available" : "unavailable"}
            </StatusBadge>
          </div>

          <div className="mt-3">
            <SwitchField
              label="Require biometric to open Pallio"
              description={
                lockEnabled
                  ? "On — you'll be prompted every cold launch."
                  : "Off — anyone with this device can open Pallio."
              }
              checked={lockEnabled}
              onCheckedChange={onToggleLock}
              disabled={!isNative || !bio.available}
            />
          </div>
        </FormSection>

        {/* Sign-in shortcuts — separate from biometric LOCK above.
            These two toggles control the buttons that appear on the
            /login page. Mirrors Sleekr's pattern: native gets
            biometric, web gets passkey. Both stay hidden on platforms
            where they can't work. */}
        <FormSection
          title="Sign-in shortcuts"
          description="Skip your password on this device when you sign in."
          Icon={KeyRound}
          trailing={
            <StatusBadge tone={bioLogin || passkeyOn ? "success" : "neutral"} withDot>
              {bioLogin && passkeyOn ? "biometric + passkey"
                : bioLogin ? "biometric"
                : passkeyOn ? "passkey"
                : "password only"}
            </StatusBadge>
          }
        >
          <div className="grid gap-3">
            {/* Biometric sign-in (Tauri only) */}
            <div className="rounded-xl border border-border bg-background p-3">
              <SwitchField
                label={`Sign in with ${bioLabel}`}
                description={
                  !isNative
                    ? "Available in the iOS / Android / desktop app — not in the browser."
                    : !bio.ready
                      ? "Checking device support…"
                      : !bio.available
                        ? "No biometric set up on this device — enroll one in your phone's Settings."
                        : bioLogin
                          ? `On — tap ${bioLabel} on the sign-in screen instead of typing your password.`
                          : "Off — sign in always asks for your password."
                }
                checked={bioLogin}
                onCheckedChange={onToggleBioLogin}
                disabled={!isNative || !bio.available}
              />
            </div>

            {/* Passkey sign-in (web only) */}
            <div className="rounded-xl border border-border bg-background p-3">
              <SwitchField
                label="Sign in with a passkey"
                description={
                  isNative
                    ? "Passkeys are managed by your browser — use the web app for this."
                    : !passkey.ready
                      ? "Checking browser support…"
                      : !passkey.available
                        ? "Your browser doesn't support platform passkeys (need Safari 16+, Chrome 108+, or Firefox 119+)."
                        : passkeyOn
                          ? "On — use Face ID / Touch ID / Windows Hello to sign in. Synced via iCloud Keychain or Google Password Manager."
                          : "Off — sign in always asks for your password."
                }
                checked={passkeyOn}
                onCheckedChange={onTogglePasskey}
                disabled={isNative || !passkey.available}
              />
            </div>
          </div>
        </FormSection>

        {/* Social sign-in / connected accounts */}
        <FormSection
          title="Sign in with social"
          description="Connect Google, Apple, Microsoft, or GitHub to skip the password screen — and recover access faster if you lose your device."
          Icon={Globe}
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {socials.map((s) => {
              const Icon = s.Icon
              const isConnected = !!s.connectedAt
              return (
                <li key={s.id}>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                      style={{ background: s.brand }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {isConnected ? `${s.email ?? "linked"} · ${s.connectedAt}` : "Not connected"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isConnected ? "outline" : "default"}
                      onClick={() => toggleSocial(s.id)}
                    >
                      {isConnected ? "Disconnect" : "Connect"}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </FormSection>

        {/* Active sessions */}
        <FormSection
          title="Active sessions"
          description="Every device + browser currently signed in to your account."
          Icon={Smartphone}
          trailing={
            <Button size="sm" variant="outline" onClick={() => toast.success("Signed out everywhere except this device.")}>
              <Lock className="h-3.5 w-3.5" /> Sign out all
            </Button>
          }
        >
          <ul className="divide-y divide-border rounded-xl border border-border">
            {SESSIONS.map((s) => {
              const Icon = s.Icon
              return (
                <li key={s.id} className="flex items-center gap-3 p-3">
                  <span className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    s.current ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{s.device}</p>
                      {s.current && <StatusBadge tone="success">this device</StatusBadge>}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{s.browser}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {s.location} · <span className="font-mono">{s.ip}</span> · <Clock className="inline h-2.5 w-2.5" /> {s.lastActive}
                    </p>
                  </div>
                  {!s.current && (
                    <Button size="sm" variant="ghost" onClick={() => toast.success(`Signed out ${s.device}.`)}>
                      Sign out
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </FormSection>

        {/* Login alerts + trusted devices */}
        <FormSection title="Login alerts & trusted devices" description="Get a heads-up the moment your account is used somewhere new." Icon={Mail}>
          <div className="flex flex-col gap-3">
            <SwitchField
              label="Email me on every new sign-in"
              description="Pallio sends an email the moment a new device, browser, or location signs in."
              checked={loginAlerts}
              onCheckedChange={setLoginAlerts}
            />
            <SwitchField
              label="Require 2FA on every sign-in"
              description="On = even on a trusted device. Off = trusted devices skip 2FA for the period below."
              disabled={twoFAStatus !== "on"}
            />
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold">Trust devices for</span>
              <div className="flex gap-1.5">
                {["7", "14", "30", "90"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTrustedDeviceDays(d)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      trustedDeviceDays === d
                        ? "border-transparent bg-brand text-brand-foreground dark:bg-primary dark:text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {d} days
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">After this window, even a trusted device prompts for 2FA again.</span>
            </label>
          </div>
        </FormSection>

        {/* Quick-links */}
        <section className="grid gap-2 sm:grid-cols-2">
          <Link to="/settings/profile" className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
            <ShieldCheck className="h-4 w-4 text-brand dark:text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Personal info</p>
              <p className="text-[11px] text-muted-foreground">Name, photo, email, contact preferences.</p>
            </div>
          </Link>
          <Link to="/settings/notifications" className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent/40">
            <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Notification rules</p>
              <p className="text-[11px] text-muted-foreground">Where security alerts get routed.</p>
            </div>
          </Link>
        </section>
      </div>

      {/* Regenerate recovery codes confirmation — irreversible: any old code
          held in a password manager stops working the moment new ones land. */}
      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate recovery codes?</DialogTitle>
            <DialogDescription>
              Every existing recovery code will stop working immediately. If you've saved your current codes in a password manager or printed them out, replace them right away. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegenerateOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                try {
                  setCodesRevealed(true)
                  toast.success("New recovery codes generated. Old ones are invalid.")
                  setRegenerateOpen(false)
                } catch {
                  toast.error("Couldn't regenerate recovery codes. Try again.")
                }
              }}
            >
              Regenerate codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
