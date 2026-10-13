"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app", label: "Today", icon: "M3 11l9-7 9 7v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", match: (p: string) => p === "/app" },
  { href: "/app/objectives", label: "Goals", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", match: (p: string) => p.startsWith("/app/objectives") },
  { href: "/app/review", label: "Review", icon: "M5 5h14v14H5zM8 10l3 3 5-6", match: (p: string) => p.startsWith("/app/review") },
  { href: "/app/log", label: "Evidence", icon: "M4 19V9M10 19V5M16 19v-7M22 19H2", match: (p: string) => p.startsWith("/app/log") },
  { href: "/app/guide", label: "Method", icon: "", match: (p: string) => p.startsWith("/app/guide") },
];

export function AppNav() {
  const path = usePathname();
  return (
    <>
      <nav className="tabs desktop" aria-label="Main">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className="tab" aria-current={i.match(path) ? "page" : undefined}>
            {i.label}
          </Link>
        ))}
      </nav>
      <nav className="bottombar" aria-label="Main">
        {ITEMS.filter((i) => i.icon).map((i) => (
          <Link key={i.href} href={i.href} aria-current={i.match(path) ? "page" : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={i.icon} />
            </svg>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
