"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppHeader from "@/components/AppHeader";

const SUB_NAV = [
  { href: "/referrals", label: "Dashboard" },
  { href: "/referrals/refer", label: "Refer Someone" },
  { href: "/referrals/my-referrals", label: "My Referrals" },
  { href: "/referrals/payments", label: "Payment Centre" },
];

export default function ReferralsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:py-14">
      <div className="max-w-2xl mx-auto">
        <AppHeader />
        <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">💰 Referral Rewards</h1>
        <p className="text-ink-soft mb-6 text-[15px]">Earn ₹4,000–₹10,000 for every successful hire.</p>

        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 -mx-1 px-1">
          {SUB_NAV.map((item) => {
            const active = pathname === item.href;
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

        {children}
      </div>
    </main>
  );
}
