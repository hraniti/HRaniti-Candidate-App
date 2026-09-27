"use client";

import { useRouter } from "next/navigation";
import EmployerShell from "@/components/employer/EmployerShell";
import { Plus, Settings, UsersRound, BriefcaseBusiness, CalendarDays, FileCheck2, ShieldCheck, UserCheck, BarChart3, CreditCard, UserRound } from "lucide-react";

const iconMap: Record<string, any> = { talent: UsersRound, jobs: BriefcaseBusiness, applicants: UsersRound, interviews: CalendarDays, calendar: CalendarDays, offers: FileCheck2, bgv: ShieldCheck, hires: UserCheck, reports: BarChart3, billing: CreditCard, profile: UserRound, settings: Settings };

export default function EmployerSectionPage({ section, eyebrow, title, description, actionLabel, actionHref, children }: {
  section: string; eyebrow: string; title: string; description: string; actionLabel?: string; actionHref?: string; children?: React.ReactNode;
}) {
  const router = useRouter();
  const Icon = iconMap[section] ?? Settings;
  return (
    <EmployerShell>
      <div className="px-5 sm:px-7 lg:px-9 py-8 max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[#8A99A5] mb-2">{eyebrow}</p>
            <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#173454]">{title}</h1>
            <p className="text-[14px] text-[#71859A] mt-2 max-w-2xl">{description}</p>
          </div>
          {actionLabel && actionHref && <button onClick={() => router.push(actionHref)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#167D73] text-white px-4 py-2.5 text-[13px] font-medium hover:bg-[#126A62] transition-colors"><Plus size={15}/>{actionLabel}</button>}
        </div>
        {children ?? <EmptyState icon={Icon} title={"Your " + title.toLowerCase() + " will appear here"} description="This workspace is ready. As activity is added to HRaniti, you’ll see it here." />}
      </div>
    </EmployerShell>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return <div className="bg-white border border-[#DDE5EA] rounded-2xl p-12 text-center"><span className="mx-auto w-12 h-12 rounded-2xl bg-[#E7F3F1] text-[#167D73] flex items-center justify-center"><Icon size={21}/></span><h2 className="mt-5 text-[16px] font-semibold text-[#173454]">{title}</h2><p className="mt-2 text-[13px] text-[#71859A] max-w-md mx-auto">{description}</p></div>;
}
