import * as React from "react"
import { motion } from "framer-motion"
import { AtSign, Building2, Mail, MapPin, MessageSquare, Phone, Send } from "lucide-react"
import { WhatsAppMark } from "@/components/marketing/whatsapp-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function ContactPage() {
  const [submitting, setSubmitting] = React.useState(false)
  React.useEffect(() => {
    document.title = "Contact · Pallio"
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const email = ((data.get("email") as string) || "").trim()
    const message = ((data.get("message") as string) || "").trim()

    // Lightweight client-side validation — HTML5 required attrs cover
    // presence; this catches malformed email + too-short messages so
    // we don't bother the backend with obvious junk.
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailOk) {
      toast.error("Please enter a valid email address.")
      return
    }
    if (message.length < 10) {
      toast.error("Please add a few more details so we can help.")
      return
    }

    setSubmitting(true)
    try {
      await new Promise((r) => setTimeout(r, 700))
      toast.success("Thanks. We'll get back to you within a business day.")
      form.reset()
    } catch {
      // Real backend will throw on network/API errors; preserve the
      // form so the user doesn't lose what they typed.
      toast.error("Something went wrong sending your message. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 220 }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-brand dark:text-primary">
            Get in touch
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
            Talk to a human.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Questions about pricing, custom integrations, demos, security reviews? We answer every email ourselves. Same person who's writing this page.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Form */}
          <motion.form
            id="form"
            onSubmit={submit}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
            className="rounded-2xl border border-border bg-card p-6 md:p-8"
          >
            <h2 className="text-lg font-bold tracking-tight">Send us a message</h2>
            <p className="mt-1 text-sm text-muted-foreground">We reply within a business day.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Your name" Icon={AtSign}>
                <Input name="name" placeholder="Alex Larson" required />
              </Field>
              <Field label="Email" Icon={Mail}>
                <Input type="email" name="email" placeholder="you@business.com" required />
              </Field>
              <Field label="Company" Icon={Building2}>
                <Input name="company" placeholder="Your business name" />
              </Field>
              <Field label="Topic" Icon={MessageSquare}>
                <Select defaultValue="general">
                  <SelectTrigger><SelectValue placeholder="Choose a topic" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General question</SelectItem>
                    <SelectItem value="sales">Sales / pricing</SelectItem>
                    <SelectItem value="demo">Book a demo</SelectItem>
                    <SelectItem value="security">Security review</SelectItem>
                    <SelectItem value="integration">Custom integration</SelectItem>
                    <SelectItem value="bug">Bug report</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Message" Icon={MessageSquare} className="sm:col-span-2">
                <Textarea name="message" rows={5} placeholder="What's on your mind?" required />
              </Field>
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="mt-6">
              {submitting ? "Sending…" : "Send message"}
              {!submitting && <Send className="h-4 w-4" />}
            </Button>
          </motion.form>

          {/* Side — contact methods + locations */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-base font-bold tracking-tight">Reach us directly</h3>
              <ul className="mt-4 flex flex-col gap-3 text-sm">
                <li id="chat" className="flex items-start gap-3">
                  <a
                    href="https://wa.me/2349036723177?text=Hi%20Pallio%2C%20I%E2%80%99d%20like%20to%20learn%20more."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 transition-colors hover:bg-emerald-500 hover:text-white dark:text-emerald-300"
                    aria-label="Open WhatsApp"
                  >
                    <WhatsAppMark className="h-4 w-4" />
                  </a>
                  <div>
                    <p className="font-semibold">WhatsApp · fastest</p>
                    <a
                      href="https://wa.me/2349036723177?text=Hi%20Pallio%2C%20I%E2%80%99d%20like%20to%20learn%20more."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      +234 903 672 3177
                    </a>
                    {/* wa.me opens the WhatsApp app on mobile or
                        WhatsApp Web on desktop; if the user has
                        neither it lands on a download prompt. Hint
                        keeps the expectation honest. */}
                    <p className="text-[11px] text-muted-foreground">
                      Opens WhatsApp app or web. Email or call below if you don't use WhatsApp.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-primary/15 dark:text-primary">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">Email</p>
                    <a href="mailto:hello@pallio.app" className="text-muted-foreground hover:text-foreground">
                      hello@pallio.app
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">Call</p>
                    <a href="tel:+2349036723177" className="text-muted-foreground hover:text-foreground">
                      +234 903 672 3177
                    </a>
                    <p className="text-[11px] text-muted-foreground">9am-6pm WAT, Mon-Sat</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-base font-bold tracking-tight">Where we are</h3>
              <ul className="mt-4 flex flex-col gap-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">Lagos, Nigeria</p>
                    <p className="text-muted-foreground">Yaba tech corridor · open-door Tuesdays</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">Remote-first team</p>
                    <p className="text-muted-foreground">Engineering across Lagos, Abuja + Nairobi.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  Icon,
  children,
  className,
}: {
  label: string
  Icon: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={"flex flex-col gap-1.5 text-xs " + (className ?? "")}>
      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      {children}
    </label>
  )
}
