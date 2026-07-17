"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <header className="flex items-center justify-between mb-8 pb-5 border-b border-line">
      <span className="font-display italic text-xl text-ink tracking-tight">
        HRaniti
      </span>
      <nav className="flex items-center gap-0.5 bg-paper-deep rounded-full p-1 border border-line">
        {links.map((l) => {
          const active = pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
                active
                  ? "bg-ink text-white"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
