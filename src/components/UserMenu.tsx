import Link from "next/link";
import { signOut } from "@/lib/actions";

export function UserMenu({ name, email }: { name: string; email: string | null }) {
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();
  return (
    <details className="menu">
      <summary aria-label="Account menu">{initial}</summary>
      <div className="menu-pop">
        <div className="who">{name ? <strong style={{ color: "var(--ink)" }}>{name}</strong> : null}{name ? <br /> : null}{email}</div>
        <Link href="/app/settings">Settings</Link>
        <Link href="/app/guide">How to use</Link>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </div>
    </details>
  );
}
