import * as React from "react"
import { Link, NavLink } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Github, Instagram, Linkedin, Menu, Twitter, X } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { SignInModal } from "@/components/marketing/sign-in-modal"
import { WhatsAppButton } from "@/components/marketing/whatsapp-button"
import { useIsMobile } from "@/hooks/use-mobile"
import { isNative, haptic } from "@/hooks/use-native"
import { cn } from "@/lib/utils"

// App-shell = installed PWA or Tauri (desktop / iOS / Android). In
// those contexts users land on /login or /register directly via the
// inline redirect in index.html, and the marketing top nav + footer
// + WhatsApp widget would be visual noise — these surfaces aren't
// where you sell the product, they're where you USE it. So skip the
// chrome and render bare children.
function useIsAppShell(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia?.("(display-mode: standalone)")
      mql?.addEventListener?.("change", cb)
      return () => mql?.removeEventListener?.("change", cb)
    },
    () => {
      if (isNative) return true
      if (typeof window === "undefined") return false
      const standalone = window.matchMedia?.("(display-mode: standalone)").matches
      const iosPwa = (window.navigator as { standalone?: boolean }).standalone === true
      return !!(standalone || iosPwa)
    },
    () => false, // SSR fallback — marketing chrome by default
  )
}

// Public marketing shell. Top nav with brand mark + page links +
// theme toggle + Sign in / Get started CTAs. Long footer with brand
// recap, link columns, social, and legal small print.
//
// Distinct from AppFrame — used only on / (landing) and the public
// pages (/pricing, /about, /faq, /contact, /privacy, /terms, /login).
// AppFrame keeps owning the in-app routes.

const NAV_LINKS = [
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
]

export function MarketingFrame({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const isAppShell = useIsAppShell()
  const [navOpen, setNavOpen] = React.useState(false)
  const [signInOpen, setSignInOpen] = React.useState(false)

  // Close the drawer on route change (children rendering a new page).
  React.useEffect(() => {
    const onLocationChange = () => setNavOpen(false)
    window.addEventListener("popstate", onLocationChange)
    return () => window.removeEventListener("popstate", onLocationChange)
  }, [])

  // App-shell render: just the page. /login + /register own their own
  // layout (centred card with the brand mark in the header). Legal
  // pages reached via deep link from those forms render bare too —
  // still readable, just without the marketing top nav/footer.
  if (isAppShell) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
        <main id="main" className="flex-1">{children}</main>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Header
        isMobile={isMobile}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((v) => !v)}
        onSignIn={() => setSignInOpen(true)}
      />

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobile && navOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-background/85 backdrop-blur-md"
            onClick={() => {
              haptic.light()
              setNavOpen(false)
            }}
          >
            <motion.nav
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 mt-20 rounded-2xl border border-border bg-card p-5 shadow-xl"
              aria-label="Mobile primary"
            >
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <li key={l.to}>
                    <NavLink
                      to={l.to}
                      onClick={() => setNavOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "block rounded-lg px-3 py-2.5 text-base font-semibold transition-colors",
                          isActive
                            ? "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary"
                            : "text-foreground hover:bg-accent",
                        )
                      }
                    >
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNavOpen(false)
                    setSignInOpen(true)
                  }}
                  className="w-full"
                >
                  Sign in
                </Button>
                <Link to="/dashboard" onClick={() => setNavOpen(false)}>
                  <Button className="w-full">
                    Get started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main" className="flex-1">{children}</main>

      <Footer />

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
      <WhatsAppButton />
    </div>
  )
}

function Header({
  isMobile,
  navOpen,
  onToggleNav,
  onSignIn,
}: {
  isMobile: boolean
  navOpen: boolean
  onToggleNav: () => void
  onSignIn: () => void
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md pwa-top">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark className="h-8 w-8 shrink-0 shadow-sm shadow-violet-500/20" />
          <span className="text-base font-bold tracking-tight">Pallio</span>
        </Link>

        {!isMobile && (
          <nav aria-label="Primary" className="ml-6 flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "text-brand dark:text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          {!isMobile && (
            <>
              <Button variant="ghost" size="sm" onClick={onSignIn}>
                Sign in
              </Button>
              <Link to="/dashboard">
                <Button size="sm">
                  Get started <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={onToggleNav}
              aria-label={navOpen ? "Close menu" : "Open menu"}
              aria-expanded={navOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand column */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <BrandMark className="h-9 w-9 shrink-0 shadow-sm shadow-violet-500/20" />
              <span className="text-lg font-bold tracking-tight">Pallio</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              All-in-one inventory, POS, sales team, marketing and books. Built mobile-first for the operators who actually run the floor.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <SocialLink href="https://twitter.com/pallioapp" label="Twitter"><Twitter className="h-4 w-4" /></SocialLink>
              <SocialLink href="https://instagram.com/pallioapp" label="Instagram"><Instagram className="h-4 w-4" /></SocialLink>
              <SocialLink href="https://linkedin.com/company/pallio" label="LinkedIn"><Linkedin className="h-4 w-4" /></SocialLink>
              <SocialLink href="https://github.com/johnsonfash/inventory-app" label="GitHub"><Github className="h-4 w-4" /></SocialLink>
            </div>
          </div>

          <Col title="Product" links={[
            { to: "/pricing", label: "Pricing" },
            { to: "/dashboard", label: "Open the app" },
            { to: "/faq", label: "FAQ" },
            { to: "/about#story", label: "Our story" },
          ]} />
          <Col title="Company" links={[
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
            { to: "/about#story", label: "Story" },
            { to: "/about#careers", label: "Careers" },
          ]} />
          <Col title="Legal" links={[
            { to: "/privacy", label: "Privacy" },
            { to: "/terms", label: "Terms" },
            { to: "/privacy#cookies", label: "Cookies" },
            { to: "/privacy#dpa", label: "DPA" },
          ]} />
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Pallio. All rights reserved.</p>
          <p>Made for the operators who actually run the floor.</p>
        </div>
      </div>
    </footer>
  )
}

function Col({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-brand/40 hover:bg-accent hover:text-foreground"
    >
      {children}
    </a>
  )
}
