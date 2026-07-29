"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Full-bleed header bar — deliberately rendered OUTSIDE each page's narrow
// content column (not nested inside a max-w-* wrapper). That's what anchors
// the page to the full browser width instead of leaving a centered card
// floating in an empty white viewport on wider screens.
export default function AppHeader() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/jobs", label: "Jobs" },
    { href: "/interview-hub", label: "Interview Hub" },
    { href: "/referrals", label: "Referrals" },
    { href: "/profile", label: "My Profile" },
  ];

  return (
    <header className="w-full bg-paper-raised border-b border-line sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <img src="/brand/logo-icon.png" alt="" className="h-7 w-auto" />
          <span className="font-display italic text-xl text-ink tracking-tight">HRaniti</span>
        </Link>
        <nav className="flex items-center gap-0.5 bg-paper-deep rounded-full p-1 border border-line overflow-x-auto">
          {links.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  active ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
