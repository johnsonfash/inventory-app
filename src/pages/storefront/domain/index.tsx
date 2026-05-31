import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  HelpCircle,
  Lock,
  RefreshCcw,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { SwitchField } from "@/components/forms/switch-field"
import { StatusBadge, type StatusTone } from "@/components/lists/status-badge"
import { useRegisterPageRefresh } from "@/hooks/use-pull-to-refresh"
import { getStorefrontState, setStorefrontState } from "@/lib/storefront/data"
import type { StorefrontState } from "@/lib/storefront/types"
import { cn } from "@/lib/utils"

// Storefront domain settings. The /storefront management page has a
// quick widget — this is the deep page for setting up a custom
// domain, watching the DNS propagation status, SSL provisioning,
// and configuring redirects.

type DnsStep = {
  key: "subdomain" | "dns" | "ssl" | "live"
  label: string
  body: string
  Icon: React.ElementType
}

const STEPS: DnsStep[] = [
  { key: "subdomain", label: "Pallio subdomain", body: "Your free shop URL — works in 60 seconds.", Icon: Globe },
  { key: "dns",       label: "DNS record",         body: "Add one CNAME at your registrar so your own domain points at Pallio.", Icon: Server },
  { key: "ssl",       label: "SSL certificate",     body: "Pallio provisions a Let's Encrypt cert automatically once DNS resolves.", Icon: Lock },
  { key: "live",      label: "Live + redirects",     body: "Pick the canonical domain and turn on www → root redirect.", Icon: CheckCircle2 },
]

export default function StorefrontDomain() {
  useRegisterPageRefresh(React.useCallback(async () => { await new Promise((r) => setTimeout(r, 250)) }, []))
  const [state, setStateLocal] = React.useState<StorefrontState>(() => getStorefrontState())
  // Draft input for the not-yet-saved custom domain. We only persist
  // to state.customDomain on Add click so the Add button isn't dead.
  const [domainDraft, setDomainDraft] = React.useState("")
  // Mocked DNS / SSL status — real backend will poll & update.
  const [dnsStatus, setDnsStatus] = React.useState<"pending" | "verified" | "error">(state.customDomain ? "verified" : "pending")
  const [sslStatus, setSslStatus] = React.useState<"pending" | "active" | "error">(state.customDomain ? "active" : "pending")
  const [wwwRedirect, setWwwRedirect] = React.useState(true)
  const [forceHttps, setForceHttps] = React.useState(true)

  const update = async (patch: Partial<StorefrontState>) => {
    const next = { ...state, ...patch }
    setStateLocal(next)
    await setStorefrontState(next)
  }

  const subdomainValid = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(state.subdomain)

  const copy = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  // Determine which step the user is on
  const currentStep: DnsStep["key"] =
    !subdomainValid ? "subdomain"
    : !state.customDomain ? "subdomain"
    : dnsStatus !== "verified" ? "dns"
    : sslStatus !== "active" ? "ssl"
    : "live"
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep)

  const livePrimary = state.customDomain ?? `${state.subdomain}.pallio.shop`

  return (
    <PageShell
      title="Domain + DNS"
      withToolbar={false}
      titleTooltip={
        <>
          Set up your storefront's web address. Free Pallio subdomain
          works instantly; a custom domain needs one DNS record at
          your registrar (GoDaddy, Namecheap, Cloudflare etc.). SSL +
          DDoS + CDN are automatic once DNS resolves.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Link to="/storefront" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Storefront overview
        </Link>

        {/* Live URL hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-brand/25 via-emerald-500/10 to-transparent blur-3xl" aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-emerald-500 text-white shadow-sm shadow-brand/30">
                <Globe className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your shop is at</p>
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <a
                href={`https://${livePrimary}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-lg font-bold tracking-tight text-foreground hover:text-brand dark:hover:text-primary md:text-2xl"
              >
                {livePrimary}
                <ExternalLink className="h-4 w-4" />
              </a>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={state.published ? "success" : "neutral"} withDot>
                  {state.published ? "live" : "paused"}
                </StatusBadge>
                <StatusBadge tone={sslStatus === "active" ? "success" : sslStatus === "pending" ? "warning" : "danger"} withDot>
                  {sslStatus === "active" ? "SSL secured" : sslStatus === "pending" ? "SSL pending" : "SSL failed"}
                </StatusBadge>
              </div>
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => copy(`https://${livePrimary}`, "Live URL")}>
              <Copy className="h-3.5 w-3.5" /> Copy link
            </Button>
          </div>
        </section>

        {/* Step progress */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold md:text-base">Setup progress</h3>
          <p className="text-[11px] text-muted-foreground">{stepIndex + 1} of {STEPS.length} complete · {Math.round(((stepIndex + 1) / STEPS.length) * 100)}%</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-brand via-fuchsia-500 to-emerald-500 transition-all" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
          </div>
          <ol className="mt-4 space-y-3">
            {STEPS.map((s, i) => {
              const Icon = s.Icon
              const done = i < stepIndex
              const active = i === stepIndex
              return (
                <li key={s.key} className="flex items-start gap-3">
                  <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    done   && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                    active && "bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}>
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <p className={cn("text-sm font-semibold", done && "line-through text-muted-foreground")}>{s.label}</p>
                      {active && <StatusBadge tone="warning">in progress</StatusBadge>}
                      {done && <StatusBadge tone="success">done</StatusBadge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Subdomain + custom domain config */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold md:text-base">Pallio subdomain</h3>
                <p className="text-[11px] text-muted-foreground">Your free hosted URL. Lowercase letters, numbers, hyphens.</p>
                <div className="mt-3 flex items-stretch overflow-hidden rounded-lg border border-input bg-background">
                  <input
                    value={state.subdomain}
                    onChange={(e) => update({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    className="flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none"
                    placeholder="your-shop"
                  />
                  <span className="flex items-center bg-muted/40 px-3 font-mono text-xs text-muted-foreground">.pallio.shop</span>
                </div>
                <p className={cn("mt-1.5 text-[11px]", subdomainValid ? "text-muted-foreground" : "text-rose-600 dark:text-rose-400")}>
                  {subdomainValid
                    ? <>Live at <a href={`https://${state.subdomain}.pallio.shop`} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-brand hover:underline dark:text-primary">{state.subdomain}.pallio.shop</a></>
                    : "Must start + end with a letter or number. No spaces, no special characters."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold md:text-base">Custom domain</h3>
                  {state.customDomain && (
                    <StatusBadge tone={dnsStatus === "verified" ? "success" : "warning"} withDot>
                      {dnsStatus === "verified" ? "verified" : "verifying"}
                    </StatusBadge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Use your own domain (shop.funkeapparel.com). Pallio handles SSL + DDoS + global CDN automatically.</p>

                <div className="mt-3 flex gap-2">
                  <Input
                    value={state.customDomain ?? domainDraft}
                    onChange={(e) => {
                      const next = e.target.value.trim()
                      if (state.customDomain) update({ customDomain: next || null })
                      else setDomainDraft(next)
                    }}
                    placeholder="shop.yourdomain.com"
                    className="flex-1 font-mono"
                  />
                  {state.customDomain ? (
                    <Button variant="outline" onClick={() => { update({ customDomain: null }); setDomainDraft(""); setDnsStatus("pending"); setSslStatus("pending"); toast.success("Custom domain removed.") }}>
                      Remove
                    </Button>
                  ) : (
                    <Button
                      onClick={() => { update({ customDomain: domainDraft }); setDnsStatus("pending"); setSslStatus("pending"); toast.success("Domain added — set up DNS below.") }}
                      disabled={!domainDraft}
                    >
                      Add
                    </Button>
                  )}
                </div>

                {state.customDomain && (
                  <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-[11px]">
                    <p className="font-semibold text-foreground">DNS record to add at your registrar</p>
                    <p className="mt-1 text-muted-foreground">In your domain provider (Cloudflare, GoDaddy, Namecheap, Google Domains), add this CNAME record:</p>
                    <div className="mt-2.5 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1 text-left font-medium">Type</th>
                            <th className="px-2 py-1 text-left font-medium">Host / Name</th>
                            <th className="px-2 py-1 text-left font-medium">Value / Points to</th>
                            <th className="px-2 py-1 text-left font-medium">TTL</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          <tr className="border-t border-border">
                            <td className="px-2 py-1.5">CNAME</td>
                            <td className="px-2 py-1.5">
                              <button onClick={() => copy(state.customDomain!.split(".")[0], "Host")} className="hover:underline">{state.customDomain.split(".")[0]}</button>
                            </td>
                            <td className="px-2 py-1.5">
                              <button onClick={() => copy(`${state.subdomain}.pallio.shop`, "Target")} className="hover:underline">{state.subdomain}.pallio.shop</button>
                            </td>
                            <td className="px-2 py-1.5">300</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(`CNAME  ${state.customDomain!.split(".")[0]}  ${state.subdomain}.pallio.shop`, "DNS record")}>
                        <Copy className="h-3.5 w-3.5" /> Copy record
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setDnsStatus("verified")
                          setTimeout(() => setSslStatus("active"), 800)
                          toast.success("DNS verified. SSL is provisioning…")
                        }}
                        disabled={dnsStatus === "verified"}
                      >
                        <RefreshCcw className="h-3.5 w-3.5" /> {dnsStatus === "verified" ? "Verified" : "Verify now"}
                      </Button>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">DNS changes can take up to 48 hours globally — usually under 15 minutes for Nigerian / African DNS resolvers.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live + redirect settings */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold md:text-base">Redirect rules</h3>
                <p className="text-[11px] text-muted-foreground">Make sure customers always land on one canonical URL. Improves SEO + analytics fidelity.</p>
                <div className="mt-3 space-y-2">
                  <SwitchField
                    label="Redirect www → root"
                    description={state.customDomain ? `www.${state.customDomain} sends visitors to ${state.customDomain}.` : "Once a custom domain is verified, www traffic will redirect to the bare domain."}
                    checked={wwwRedirect}
                    onCheckedChange={setWwwRedirect}
                    disabled={!state.customDomain}
                  />
                  <SwitchField
                    label="Force HTTPS"
                    description="Auto-redirect http:// to https://. Strongly recommended for shopper trust + Paystack."
                    checked={forceHttps}
                    onCheckedChange={setForceHttps}
                  />
                  <SwitchField
                    label="Redirect subdomain → custom domain"
                    description={state.customDomain ? `${state.subdomain}.pallio.shop sends visitors to ${state.customDomain}.` : "Available after a custom domain is verified."}
                    disabled={!state.customDomain || dnsStatus !== "verified"}
                    defaultChecked
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right rail */}
          <aside className="flex flex-col gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold md:text-base">SSL certificate</h3>
                <p className="text-[11px] text-muted-foreground">Encrypts traffic between shoppers' browsers and your shop. Provisioned + renewed automatically.</p>
                <ul className="mt-3 space-y-2 text-xs">
                  <li className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">Issuer</span>
                    <span className="font-semibold">Let's Encrypt</span>
                  </li>
                  <li className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge tone={sslStatus === "active" ? "success" : sslStatus === "pending" ? "warning" : "danger"} withDot>
                      {sslStatus}
                    </StatusBadge>
                  </li>
                  <li className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">Auto-renew</span>
                    <span className="font-semibold">30 days before expiry</span>
                  </li>
                  <li className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">TLS version</span>
                    <span className="font-semibold font-mono">1.3</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold md:text-base">Nameserver shortcuts</h3>
                <p className="text-[11px] text-muted-foreground">Step-by-step guides for the registrars Nigerian operators use most.</p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    { name: "Cloudflare",   docs: "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records" },
                    { name: "Namecheap",    docs: "https://www.namecheap.com/support/knowledgebase/article.aspx/9646" },
                    { name: "GoDaddy",      docs: "https://www.godaddy.com/help/add-a-cname-record-19236" },
                    { name: "Whogohost",    docs: "https://wghhelp.zendesk.com/hc/en-us/articles/360011225553" },
                    { name: "Google Domains", docs: "https://support.google.com/domains/answer/9211383" },
                  ].map((r) => (
                    <li key={r.name}>
                      <a
                        href={r.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg p-2 text-xs transition-colors hover:bg-accent/40"
                      >
                        <span className="font-semibold">{r.name}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold">DDoS protection on</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Pallio sits behind a global CDN. Attacks against your shop are absorbed before they touch your origin.</p>
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-600 dark:text-fuchsia-300" />
                  <div>
                    <p className="text-xs font-semibold">Global CDN included</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Customers in Lagos load your shop from Lagos. Customers in London from London. Sub-150ms first-paint anywhere.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link to="/contact" className="group flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-xs">
              <HelpCircle className="h-3.5 w-3.5 text-brand dark:text-primary" />
              <span className="flex-1">Stuck on DNS? <span className="font-semibold text-brand group-hover:underline dark:text-primary">Talk to support →</span></span>
            </Link>
          </aside>
        </div>
      </div>
    </PageShell>
  )
}

void AlertTriangle; void ArrowRight
