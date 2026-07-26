"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EmployerHeader() {
  const pathname = usePathname();

  const links = [
    { href: "/employer/dashboard", label: "Dashboard" },
    { href: "/employer/jobs", label: "Jobs" },
  ];

  return (
    <header className="w-full bg-paper-raised border-b border-line sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <Link href="/employer/dashboard" className="font-display italic text-xl text-ink tracking-tight shrink-0">
          HRaniti
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
