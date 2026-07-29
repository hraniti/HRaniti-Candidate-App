"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, Sparkles } from "lucide-react";

export default function EmployerShell({
  children,
  jobCount,
}: {
  children: React.ReactNode;
  jobCount?: number;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/employer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/employer/jobs", label: "Jobs", icon: Briefcase, count: jobCount },
  ];

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-paper-raised border-r border-line flex flex-col min-h-screen sticky top-0">
        <Link href="/employer/dashboard" className="flex items-center gap-2 px-5 py-5">
          <img src="/brand/logo-icon.png" alt="" className="h-7 w-auto" />
          <span className="font-display italic text-lg text-ink">HRaniti</span>
        </Link>

        <nav className="px-3 mt-2">
          <p className="px-2 mb-2 text-[10px] font-mono tracking-widest uppercase text-ink-faint">
            Workspace
          </p>
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
                  active
                    ? "bg-brandViolet-soft text-brandViolet font-medium"
                    : "text-ink-soft hover:bg-paper-deep"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={17} />
                  {item.label}
                </span>
                {typeof item.count === "number" && item.count > 0 && (
                  <span
                    className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                      active ? "bg-brandViolet text-white" : "bg-paper-deep text-ink-faint"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="p-4">
          <div className="rounded-xl p-4 bg-brandViolet text-white">
            <p className="text-[10px] font-mono tracking-widest uppercase opacity-80 mb-1">
              Current Plan
            </p>
            <p className="font-display text-lg mb-3">Free</p>
            <button
              onClick={() => alert("Paid plans are coming soon!")}
              className="w-full bg-white text-brandViolet text-sm font-medium rounded-lg py-2 hover:bg-brandViolet-soft transition-colors"
            >
              Upgrade to Growth
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
