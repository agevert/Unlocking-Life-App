import type { Metadata } from "next";
import { LegalShell, V } from "@/components/LegalShell";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalShell>
      <p className="notice">Template. Have it reviewed by a lawyer and adjusted to your actual providers before launch.</p>
      <h1>Privacy policy</h1>
      <p className="muted">Last updated {LEGAL.lastUpdated}</p>

      <h2>Who is responsible</h2>
      <p>
        <V v={LEGAL.company} />, <V v={LEGAL.street} />, <V v={LEGAL.city} />, {LEGAL.country}. Contact: <V v={LEGAL.email} />.
      </p>

      <h2>What we store and why</h2>
      <ul>
        <li><strong>Account data</strong>: your email address and name, to sign you in and address you (Art. 6(1)(b) GDPR).</li>
        <li>
          <strong>Your content</strong>: objectives, key results, weekly reviews and sparring responses. We store them only to
          provide the service to you (Art. 6(1)(b) GDPR). Reflections can be personal; nobody at the company reads them except
          when you ask for support and grant access.
        </li>
        <li><strong>Settings</strong>: time zone, review day and reminder preference.</li>
        <li><strong>Technical logs</strong>: kept by our hosting providers for security and troubleshooting (Art. 6(1)(f) GDPR).</li>
      </ul>
      <p>We use no advertising, no tracking cookies and no analytics that profile you. The only cookies are the ones that keep you signed in.</p>

      <h2>Processors</h2>
      <ul>
        <li><strong>Supabase</strong> (database and sign-in), hosted in the EU region <V v="[Frankfurt, eu-central-1]" />.</li>
        <li><strong>Vercel</strong> (application hosting), EU functions region <V v="[fra1]" />.</li>
        <li>
          <strong>Anthropic</strong> (the sparring feature): when you press &ldquo;Spar with me&rdquo;, the review for that week, your
          objectives and a short history are sent to Anthropic&apos;s API to generate a response. Under Anthropic&apos;s commercial
          terms, API inputs are not used to train models. Transfers to the US rely on the EU–US Data Privacy Framework and/or
          Standard Contractual Clauses.
        </li>
        <li><strong>Resend</strong> (reminder emails), only if you keep reminders switched on.</li>
      </ul>
      <p>We have data processing agreements with each provider.</p>

      <h2>How long we keep it</h2>
      <p>Until you delete your account. Deletion removes your account and all content immediately; backups roll over within <V v="[7 days]" />.</p>

      <h2>Your rights</h2>
      <p>
        You can access, correct, export (Settings → Download my data) and delete (Settings → Delete account) your data at any
        time. You can also object to processing, restrict it, and complain to a supervisory authority, for example the
        Hessian Commissioner for Data Protection and Freedom of Information.
      </p>
    </LegalShell>
  );
}
