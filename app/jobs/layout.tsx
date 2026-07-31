"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import CandidateShell from "@/components/CandidateShell";

const SUB_NAV = [
  { href: "/jobs", label: "Discover", tab: null },
  { href: "/jobs/saved", label: "Saved", tab: null },
  { href: "/jobs/applications?tab=applied", label: "Applied", tab: "applied" },
  { href: "/jobs/applications?tab=interviews", label: "Interviews", tab: "interviews" },
  { href: "/jobs/applications?tab=offers", label: "Offers", tab: "offers" },
];

function SubNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const currentTab = params.get("tab");

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-6 -mx-1 px-1">
      {SUB_NAV.map((item) => {
        const active =
          item.tab === null
            ? pathname === item.href.split("?")[0] && !currentTab
            : pathname === "/jobs/applications" && currentTab === item.tab;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 text-sm px-4 py-2 rounded-full border transition-colors ${
              active ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line hover:border-ink/40"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <CandidateShell>
      <div className="px-4 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">Career Opportunities</h1>
        <p className="text-ink-soft mb-6 text-[15px]">Your AI career assistant — not just a job board.</p>
        <Suspense fallback={null}>
          <SubNav />
        </Suspense>
        {children}
      </div>
      </div>
    </CandidateShell>
  );
}
