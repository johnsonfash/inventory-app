import * as React from "react"

export default function TermsPage() {
  React.useEffect(() => {
    document.title = "Terms · Pallio"
  }, [])

  return (
    <div className="px-4 py-16 md:px-6 md:py-24">
      <article className="prose-pallio mx-auto max-w-3xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand dark:text-primary">
            Legal
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: May 23, 2026</p>
        </header>

        <section>
          <h2>1. Acceptance</h2>
          <p>
            By creating a Pallio account or using the app you agree to these Terms. If you're agreeing on behalf of a company, you confirm you have the authority to do so.
          </p>
        </section>

        <section>
          <h2>2. The service</h2>
          <p>
            Pallio is a software-as-a-service product covering inventory, POS, sales team, marketing, accounting, and adjacent operational tools. We work hard to keep it up + improve it; we don't guarantee zero downtime.
          </p>
        </section>

        <section>
          <h2>3. Your account</h2>
          <ul>
            <li>You're responsible for keeping your login secret.</li>
            <li>You're responsible for what your team members do under your account.</li>
            <li>Notify us immediately if you believe an account has been compromised.</li>
          </ul>
        </section>

        <section>
          <h2>4. Acceptable use</h2>
          <p>You agree not to use Pallio to:</p>
          <ul>
            <li>Break the law, sell prohibited goods, or facilitate fraud.</li>
            <li>Scrape, reverse-engineer, or stress-test the service.</li>
            <li>Impersonate other businesses or individuals.</li>
            <li>Re-sell Pallio as a competing product without a written partnership agreement.</li>
          </ul>
        </section>

        <section>
          <h2>5. Pricing + billing</h2>
          <p>
            Plans + prices are listed on{" "}
            <a href="/pricing">/pricing</a>. You authorise us to charge your payment method on the cycle you chose (monthly / yearly). Refunds are pro-rated on yearly plans cancelled mid-cycle.
          </p>
          <p>
            We may change prices with at least 30 days' notice. Existing yearly subscribers keep their current rate until renewal.
          </p>
        </section>

        <section>
          <h2>6. Your data</h2>
          <p>
            You own your data. We process it on your behalf as described in our{" "}
            <a href="/privacy">Privacy Policy</a>. On account closure we delete it within 30 days (including backups).
          </p>
        </section>

        <section>
          <h2>7. Service availability</h2>
          <p>
            We target 99.9% monthly uptime. We notify you of planned maintenance. Scale-plan customers receive SLA credits for unmet uptime targets. terms in the signed Order Form.
          </p>
        </section>

        <section>
          <h2>8. Termination</h2>
          <ul>
            <li><strong>By you:</strong> any time, from Settings → Account → Close account.</li>
            <li><strong>By us:</strong> for non-payment after grace period, breach of acceptable use, or with 60 days' written notice for any other reason.</li>
          </ul>
        </section>

        <section>
          <h2>9. Limitation of liability</h2>
          <p>
            Pallio is provided "as is". To the extent permitted by law, our total liability for any claim is limited to the fees you paid us in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2>10. Governing law</h2>
          <p>
            These Terms are governed by the laws of the State of Texas, USA, without regard to its conflict of laws rules. Disputes go to courts located in Travis County, Texas.
          </p>
        </section>

        <section>
          <h2>11. Changes to these terms</h2>
          <p>
            We update these Terms occasionally. Material changes get 14 days' email notice; the "Last updated" date at the top changes with every revision.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about these Terms: <a href="mailto:legal@pallio.app">legal@pallio.app</a>.
          </p>
        </section>
      </article>
    </div>
  )
}
