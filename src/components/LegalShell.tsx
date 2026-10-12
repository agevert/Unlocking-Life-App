import Link from "next/link";
import { Brand } from "./Brand";
import { isPlaceholder } from "@/lib/legal";

export function LegalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <header className="site-nav"><Brand /><Link href="/login" className="btn small">Sign in</Link></header>
      <main className="prose">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function V({ v }: { v: string }) {
  return isPlaceholder(v) ? <span className="placeholder">{v}</span> : <>{v}</>;
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} Threefold</span>
      <nav className="row" aria-label="Legal">
        <Link href="/legal/impressum">Impressum</Link>
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/terms">Terms</Link>
      </nav>
    </footer>
  );
}
