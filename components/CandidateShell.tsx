"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, Mic, Users, UserCircle } from "lucide-react";

export default function CandidateShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/interview-hub", label: "Interview Hub", icon: Mic },
    { href: "/referrals", label: "Referrals", icon: Users },
    { href: "/profile", label: "My Profile", icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-paper flex">
      <aside className="w-64 shrink-0 bg-paper-raised border-r border-line flex flex-col min-h-screen sticky top-0">
        <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5">
          <img src="/brand/logo-icon.png" alt="" className="h-7 w-auto" />
          <span className="font-display italic text-lg text-ink">HRaniti</span>
        </Link>

        <nav className="px-3 mt-2">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
                  active
                    ? "bg-brandViolet-soft text-brandViolet font-medium"
                    : "text-ink-soft hover:bg-paper-deep"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="p-4">
          <div className="rounded-xl p-4 bg-brandViolet text-white">
            <p className="text-[10px] font-mono tracking-widest uppercase opacity-80 mb-1">
              Complete your profile
            </p>
            <p className="text-sm leading-snug mb-3">
              A stronger profile gets you better matches.
            </p>
            <Link
              href="/profile"
              className="block text-center w-full bg-white text-brandViolet text-sm font-medium rounded-lg py-2 hover:bg-brandViolet-soft transition-colors"
            >
              Improve profile
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
