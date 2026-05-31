import * as React from "react"

export default function PrivacyPage() {
  React.useEffect(() => {
    document.title = "Privacy · Pallio"
  }, [])

  return (
    <div className="px-4 py-16 md:px-6 md:py-24">
      <article className="prose-pallio mx-auto max-w-3xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand dark:text-primary">
            Legal
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: May 23, 2026</p>
        </header>

        <section>
          <h2>Summary</h2>
          <p>
            Pallio is a business-operations app. inventory, POS, sales team, marketing, books. The data you put in is <strong>yours</strong>. We use it to run the product on your behalf; we do not sell it, train models on it, or share it with anyone outside Pallio without your explicit permission.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Account info</strong>. your name, email, business name, role. Provided by you at signup.
            </li>
            <li>
              <strong>Business data</strong>. items, customers, invoices, POs, vendors, settings, anything you create inside Pallio.
            </li>
            <li>
              <strong>Device + usage info</strong>. browser / device type, IP, pages visited, feature interactions. Used to keep the product secure + improve performance.
            </li>
            <li>
              <strong>Payment info</strong>. billing email + a tokenised reference from our payment processor. We never store full card numbers.
            </li>
          </ul>
        </section>

        <section>
          <h2>How we use it</h2>
          <ul>
            <li>Run the product features you sign up for.</li>
            <li>Send transactional emails (receipts, invoices, password resets, security alerts).</li>
            <li>Detect + prevent abuse and fraud.</li>
            <li>Aggregate (non-identified) usage statistics so we know which features matter.</li>
          </ul>
          <p>We do <strong>not</strong> sell your data to third parties. We do not use your business data to train any AI / ML model.</p>
        </section>

        <section id="sub-processors">
          <h2>Sub-processors</h2>
          <p>
            We use a small number of well-known service providers to operate Pallio. Each is bound by a contract that holds them to at least the same level of care described here:
          </p>
          <ul>
            <li>Hosting + infrastructure. AWS / GCP (US, EU, AU regions)</li>
            <li>Email delivery. Postmark / SendGrid</li>
            <li>Payments. Stripe / PayPal</li>
            <li>Error monitoring. Sentry</li>
            <li>Customer support tooling. Linear / Plain</li>
          </ul>
          <p>
            A current list is at <a href="/privacy#sub-processors">/privacy#sub-processors</a>. We notify you 14 days before adding a new one.
          </p>
        </section>

        <section id="cookies">
          <h2>Cookies</h2>
          <p>
            We use a minimum set of cookies. session cookie for keeping you signed in, a CSRF token, a theme preference. No third-party advertising cookies. No cross-site tracking. You can clear them at any time without losing your data.
          </p>
        </section>

        <section id="dpa">
          <h2>Data Processing Addendum</h2>
          <p>
            If your jurisdiction requires a Data Processing Addendum (GDPR, UK-GDPR, CCPA, etc.), we have one ready. Email{" "}
            <a href="mailto:privacy@pallio.app">privacy@pallio.app</a> and we'll send the signed copy within a business day.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>You can, at any time:</p>
          <ul>
            <li>Export every piece of data you've put into Pallio (full CSV export from Settings).</li>
            <li>Delete your account. wipes all data within 30 days, including backups.</li>
            <li>Request a copy of what we know about you.</li>
            <li>Object to a particular processing activity.</li>
          </ul>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Privacy questions go to <a href="mailto:privacy@pallio.app">privacy@pallio.app</a>. Security disclosures go to <a href="mailto:security@pallio.app">security@pallio.app</a>. Anything else,{" "}
            <a href="/contact">contact us</a>.
          </p>
        </section>
      </article>
    </div>
  )
}
