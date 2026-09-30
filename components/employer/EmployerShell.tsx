"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  LayoutDashboard, UsersRound, BriefcaseBusiness, UserRoundSearch, CalendarDays,
  Video, FileCheck2, ShieldCheck, UserCheck, BarChart3, CreditCard, Settings,
  Search, Inbox, Bell, Sparkles, ChevronDown, X, ArrowRight
} from "lucide-react";

const navGroups = [
  {
    label: "WORKSPACE",
    items: [{ href: "/employer/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "TALENT",
    items: [{ href: "/employer/talent-pool", label: "Talent Pool", icon: UsersRound }],
  },
  {
    label: "HIRING",
    items: [
      { href: "/employer/jobs", label: "Jobs", icon: BriefcaseBusiness },
      { href: "/employer/applicants", label: "Applicants", icon: UserRoundSearch },
      { href: "/employer/interviews", label: "Interviews", icon: Video },
      { href: "/employer/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/employer/offers", label: "Offers", icon: FileCheck2 },
      { href: "/employer/bgv", label: "BGV", icon: ShieldCheck },
      { href: "/employer/hires", label: "Hires", icon: UserCheck },
      { href: "/employer/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { href: "/employer/billing", label: "Billing & Plan", icon: CreditCard },
      { href: "/employer/profile", label: "Profile", icon: UserRoundSearch },
      { href: "/employer/settings", label: "Settings", icon: Settings },
    ],
  },
];

const searchable = navGroups.flatMap((group) => group.items);

export default function EmployerShell({
  children,
  jobCount,
}: {
  children: React.ReactNode;
  jobCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [utility, setUtility] = useState<"inbox" | "notifications" | "ai" | "account" | null>(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return searchable.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 6);
  }, [search]);

  function navigate(href: string) {
    setSearch("");
    setUtility(null);
    setMobileOpen(false);
    router.push(href);
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] text-[#173454]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[242px] bg-white/95 border-r border-[#DDE5EA] flex flex-col transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-[72px] px-7 flex items-center border-b border-[#EEF2F4]">
          <Link href="/employer/dashboard" onClick={() => setMobileOpen(false)} aria-label="HRaniti home">
            <img src="/brand/hraniti-wordmark.svg" alt="HRaniti" className="h-8 w-auto" />
          </Link>
          <button className="ml-auto lg:hidden p-2 rounded-lg hover:bg-[#F3F7F7]" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          {navGroups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex ? "mt-7" : ""}>
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.16em] text-[#8A99A5]">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/employer/dashboard" && pathname?.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-colors ${active ? "bg-[#E7F3F1] text-[#167D73] font-medium" : "text-[#526A7D] hover:bg-[#F5F8F8] hover:text-[#173454]"}`}
                    >
                      <Icon size={17} strokeWidth={1.8} />
                      <span>{item.label}</span>
                      {item.label === "Jobs" && typeof jobCount === "number" && jobCount > 0 && (
                        <span className="ml-auto text-[11px] rounded-full bg-[#F0F4F5] px-2 py-0.5 text-[#71859A]">{jobCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-[#EEF2F4]">
          <p className="text-[12px] text-[#71859A]">Better talent.</p>
          <p className="text-[12px] text-[#71859A]">Brighter futures.</p>
          <div className="mt-3 h-0.5 w-7 bg-[#167D73]" />
        </div>
      </aside>

      {mobileOpen && <button className="fixed inset-0 z-30 bg-[#173454]/15 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}

      <div className="lg:pl-[242px] min-h-screen">
        <header className="sticky top-0 z-30 h-[72px] bg-[#FCFCFA]/95 backdrop-blur border-b border-[#DDE5EA]">
          <div className="h-full px-4 sm:px-7 flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-white" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <span className="block w-5 h-0.5 bg-[#173454] mb-1" /><span className="block w-5 h-0.5 bg-[#173454] mb-1" /><span className="block w-5 h-0.5 bg-[#173454]" />
            </button>

            <div className="relative flex-1 max-w-[520px]">
              <div className="h-11 bg-white border border-[#DDE5EA] rounded-full flex items-center px-4 gap-3 shadow-[0_2px_8px_rgba(23,52,84,0.03)]">
                <Search size={17} className="text-[#71859A]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && results[0]) navigate(results[0].href); }}
                  placeholder="Search candidates, jobs, recruiters, interviews..."
                  className="flex-1 bg-transparent outline-none text-[13px] text-[#173454] placeholder:text-[#8EA0AE]"
                  aria-label="Global search"
                />
                <kbd className="hidden sm:block text-[10px] text-[#9AA8B3] border border-[#E2E8EC] rounded-md px-1.5 py-0.5">⌘ K</kbd>
              </div>
              {results.length > 0 && (
                <div className="absolute left-0 right-0 top-14 bg-white border border-[#DDE5EA] rounded-2xl shadow-[0_18px_50px_rgba(23,52,84,0.12)] p-2">
                  {results.map((r) => <button key={r.href} onClick={() => navigate(r.href)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-[#526A7D] hover:bg-[#F3F8F7]"><r.icon size={16} />{r.label}<ArrowRight size={14} className="ml-auto" /></button>)}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => setUtility(utility === "inbox" ? null : "inbox")} className="relative p-2.5 rounded-xl text-[#526A7D] hover:bg-white" aria-label="Inbox">
                <Inbox size={18} strokeWidth={1.8} /><span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#167D73]" />
              </button>
              <button onClick={() => setUtility(utility === "notifications" ? null : "notifications")} className="relative p-2.5 rounded-xl text-[#526A7D] hover:bg-white" aria-label="Notifications">
                <Bell size={18} strokeWidth={1.8} /><span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#D56A55]" />
              </button>
              <button onClick={() => setUtility(utility === "ai" ? null : "ai")} className={`hidden sm:flex items-center gap-2 h-10 px-3.5 rounded-full border text-[13px] font-medium transition-colors ${utility === "ai" ? "bg-[#E7F3F1] border-[#B9DDD7] text-[#167D73]" : "bg-white border-[#DDE5EA] text-[#526A7D] hover:border-[#B9DDD7]"}`}>
                <Sparkles size={15} /> AI Assistant
              </button>
              <button onClick={() => setUtility(utility === "account" ? null : "account")} className="ml-1 flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full hover:bg-white" aria-label="Account menu">
                <span className="w-8 h-8 rounded-full bg-[#EAF0F2] flex items-center justify-center text-[11px] font-semibold text-[#173454]">HR</span>
                <span className="hidden xl:block text-left"><span className="block text-[12px] font-medium text-[#173454]">HRaniti</span><span className="block text-[10px] text-[#8A99A5]">Admin</span></span>
                <ChevronDown size={14} className="text-[#71859A]" />
              </button>
            </div>
          </div>

          {utility && (
            <div className="absolute right-5 top-[62px] w-[300px] bg-white border border-[#DDE5EA] rounded-2xl shadow-[0_18px_50px_rgba(23,52,84,0.12)] p-4">
              {utility === "ai" && <div><p className="text-sm font-semibold text-[#173454]">HRaniti AI Assistant</p><p className="text-xs text-[#71859A] mt-1">Ask for hiring insights, candidate summaries, interview questions, or drafting help.</p><div className="mt-3 flex gap-2"><button onClick={() => navigate("/employer/reports")} className="text-xs px-3 py-2 rounded-lg bg-[#E7F3F1] text-[#167D73]">Open insights</button><button onClick={() => setUtility(null)} className="text-xs px-3 py-2 rounded-lg border border-[#DDE5EA] text-[#526A7D]">Close</button></div></div>}
              {utility === "inbox" && <div><p className="text-sm font-semibold text-[#173454]">Inbox</p><p className="text-xs text-[#71859A] mt-1">Your candidate and team conversations will appear here.</p><button onClick={() => navigate("/employer/applicants")} className="mt-3 text-xs text-[#167D73]">Go to Applicants →</button></div>}
              {utility === "notifications" && <div><p className="text-sm font-semibold text-[#173454]">Notifications</p><p className="text-xs text-[#71859A] mt-1">Hiring updates, approvals and interview activity will appear here.</p><div className="mt-3 flex items-center gap-3"><button onClick={() => navigate("/employer/approvals")} className="text-xs font-medium text-[#167D73]">Open approvals →</button><button onClick={() => setUtility(null)} className="text-xs text-[#71859A]">Close</button></div></div>}
              {utility === "account" && <div><p className="text-sm font-semibold text-[#173454]">HRaniti</p><p className="text-xs text-[#71859A] mt-1">Employer workspace</p><div className="mt-3 border-t border-[#EEF2F4] pt-3 space-y-1"><button onClick={() => navigate("/employer/profile")} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-[#F5F8F8]">Profile</button><button onClick={() => navigate("/employer/settings")} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-[#F5F8F8]">Settings</button><button onClick={() => setUtility(null)} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-[#F5F8F8]">Close</button></div></div>}
            </div>
          )}
        </header>

        <main className="min-h-[calc(100vh-72px)]">{children}</main>
      </div>
    </div>
  );
}
