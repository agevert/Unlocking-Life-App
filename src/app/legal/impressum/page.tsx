import type { Metadata } from "next";
import { LegalShell, V } from "@/components/LegalShell";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <LegalShell>
      <h1>Impressum</h1>
      <p className="muted">Angaben gemäß § 5 DDG</p>
      <p>
        <V v={LEGAL.company} /><br />
        <V v={LEGAL.street} /><br />
        <V v={LEGAL.city} /><br />
        {LEGAL.country}
      </p>
      <h2>Vertreten durch</h2>
      <p><V v={LEGAL.representative} /></p>
      <h2>Kontakt</h2>
      <p>E-Mail: <V v={LEGAL.email} /><br />Telefon: <V v={LEGAL.phone} /></p>
      <h2>Registereintrag</h2>
      <p><V v={LEGAL.register} /></p>
      <h2>Umsatzsteuer-ID</h2>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: <V v={LEGAL.vatId} /></p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    </LegalShell>
  );
}
