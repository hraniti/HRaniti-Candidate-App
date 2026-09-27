"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import EmployerShell from "@/components/employer/EmployerShell";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";
import { BriefcaseBusiness, UsersRound, CalendarDays, Mail, UserCheck, ArrowUpRight, CheckCircle2, FileCheck2, ShieldCheck, Clock3 } from "lucide-react";

type Company = { name: string | null; primary_hr_contact_name: string | null; hq_location: string | null; onboarding_completed: boolean; plan: string | null };

export default function EmployerDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobCount, setJobCount] = useState(0);
  const [applicantCount, setApplicantCount] = useState(0);
  const [unlockCount, setUnlockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/"); return; }
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data } = await supabase.from("companies").select("name,primary_hr_contact_name,hq_location,onboarding_completed,plan").eq("id", companyId).single();
      if (data && !data.onboarding_completed) { router.replace("/employer/onboarding/company"); return; }
      setCompany(data as Company);

      const { count: jobs } = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("company_id", companyId);
      const { count: unlocks } = await supabase.from("candidate_unlocks").select("*", { count: "exact", head: true }).eq("company_id", companyId);
      setJobCount(jobs ?? 0);
      setUnlockCount(unlocks ?? 0);
      setApplicantCount(0);
      setLoading(false);
    })();
  }, []);

  if (loading || !company) return null;

  const firstName = company.primary_hr_contact_name?.split(" ")[0] || "there";

  const openJobs = [
    ["Senior SAP Consultant", "Bangalore · Full-time", "28", "Active"],
    ["Frontend Developer", "Bangalore · Full-time", "21", "Active"],
    ["Product Manager", "Bangalore · Full-time", "16", "Active"],
    ["Java Developer", "Bangalore · Full-time", "12", "Paused"],
    ["UI/UX Designer", "Bangalore · Full-time", "9", "Active"],
  ];

  const interviews = [
    ["09:00 AM", "Rohit Sharma", "Frontend Developer", "Video Call"],
    ["10:30 AM", "Neha Kapoor", "Product Manager", "In Person"],
    ["02:00 PM", "Arjun Mehta", "Java Developer", "Video Call"],
    ["03:30 PM", "Sneha Iyer", "UI/UX Designer", "Video Call"],
  ];

  const activities = [
    ["New applicant applied for Senior SAP Consultant", "2 hours ago"],
    ["Interview feedback received for Neha Kapoor", "3 hours ago"],
    ["Offer sent to Rohit Sharma", "5 hours ago"],
    ["BGV completed for Anjali Verma", "6 hours ago"],
  ];

  const approvals = [
    ["Job approval required", "Senior SAP Consultant", "Review"],
    ["Offer approval required", "Product Manager", "Review"],
    ["BGV exception", "Rahul Nair", "Review"],
    ["Interview feedback pending", "3 applicants", "View"],
  ];

  return (
    <EmployerShell jobCount={jobCount}>
      <div className="px-5 sm:px-7 lg:px-9 py-8 max-w-[1500px] mx-auto">
        <div className="flex items-end justify-between gap-6 mb-7">
          <div>
            <h1 className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.03em] text-[#173454]">Good morning, {firstName} 👋</h1>
            <p className="text-[15px] text-[#71859A] mt-1">Here’s what’s happening with your hiring today.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[12px] text-[#71859A]">
            <CalendarDays size={15} /> {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
          <Kpi icon={BriefcaseBusiness} label="Active Jobs" value={jobCount} tone="blue" />
          <Kpi icon={UsersRound} label="Total Applicants" value={applicantCount} tone="teal" />
          <Kpi icon={CalendarDays} label="Interviews Today" value={8} tone="lavender" />
          <Kpi icon={Mail} label="Offers Pending" value={5} tone="peach" />
          <Kpi icon={UserCheck} label="Hires This Month" value={3} tone="teal" />
        </div>

        <div className="grid xl:grid-cols-[1.35fr_1fr_1fr] gap-4 mb-4">
          <Panel title="Hiring Funnel" action="View details" onAction={() => router.push("/employer/reports")}>
            <div className="grid grid-cols-[1.05fr_0.95fr] gap-5 items-center">
              <div className="space-y-2 pt-1">
                {[["Applications", applicantCount || 248, "bg-[#5A93CF]", "w-full"], ["Screened", 176, "bg-[#58A4CF]", "w-[88%]"], ["Shortlisted", 98, "bg-[#4DB3A7]", "w-[70%]"], ["Interview", 62, "bg-[#52B9C2]", "w-[57%]"], ["Offer", 18, "bg-[#91C98A]", "w-[38%]"], ["Hired", 12, "bg-[#72A875]", "w-[28%]"]].map(([label, value, color, width]) => (
                  <div key={String(label)} className="flex items-center gap-3">
                    <div className={`h-9 rounded-r-full ${String(color)} ${String(width)}`} />
                    <div className="min-w-[76px]"><p className="text-[11px] text-[#71859A]">{label}</p><p className="text-[13px] font-semibold text-[#173454]">{value}</p></div>
                  </div>
                ))}
              </div>
              <div className="text-[12px] text-[#71859A] space-y-3">
                <p>Applications <span className="float-right text-[#173454] font-semibold">248</span></p>
                <p>Screened <span className="float-right text-[#173454] font-semibold">176</span></p>
                <p>Shortlisted <span className="float-right text-[#173454] font-semibold">98</span></p>
                <p>Interview <span className="float-right text-[#173454] font-semibold">62</span></p>
                <p>Offer <span className="float-right text-[#173454] font-semibold">18</span></p>
                <p>Hired <span className="float-right text-[#173454] font-semibold">12</span></p>
              </div>
            </div>
          </Panel>

          <Panel title="Top Open Jobs" action="View all" onAction={() => router.push("/employer/jobs")}>
            <div className="divide-y divide-[#EEF2F4]">
              {openJobs.map(([title, meta, count, status]) => (
                <button key={title} onClick={() => router.push("/employer/jobs")} className="w-full py-3 text-left flex items-center gap-3 hover:bg-[#FAFCFC]">
                  <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[#173454] truncate">{title}</p><p className="text-[10px] text-[#8A99A5] mt-1">{meta}</p></div>
                  <div className="text-right"><p className="text-[12px] font-semibold text-[#173454]">{count}</p><p className="text-[10px] text-[#8A99A5]">new applicants</p></div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${status === "Paused" ? "bg-[#FFF0E4] text-[#B86B24]" : "bg-[#E8F5EE] text-[#23805A]"}`}>{status}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Upcoming Interviews" action="View calendar" onAction={() => router.push("/employer/calendar")}>
            <div className="divide-y divide-[#EEF2F4]">
              {interviews.map(([time, name, role, mode]) => (
                <button key={time} onClick={() => router.push("/employer/interviews")} className="w-full py-3 text-left flex items-center gap-3 hover:bg-[#FAFCFC]">
                  <span className="text-[11px] text-[#71859A] w-[58px]">{time}</span>
                  <span className="w-9 h-9 rounded-full bg-[#EEF1F6] flex items-center justify-center text-[10px] font-semibold text-[#526A7D]">{name.split(" ").map(x => x[0]).join("")}</span>
                  <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[#173454] truncate">{name}</p><p className="text-[10px] text-[#8A99A5] mt-1">{role}</p></div>
                  <span className="text-[10px] text-[#71859A]">{mode}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid xl:grid-cols-[1.35fr_1fr_1fr] gap-4">
          <Panel title="Recent Activity" action="View all" onAction={() => router.push("/employer/applicants")}>
            <div className="divide-y divide-[#EEF2F4]">
              {activities.map(([text, time], i) => <button key={text} onClick={() => router.push("/employer/applicants")} className="w-full py-3 flex items-center gap-3 text-left hover:bg-[#FAFCFC]"><span className={`w-8 h-8 rounded-full flex items-center justify-center ${i === 2 ? "bg-[#FFF1E6] text-[#B86B24]" : "bg-[#E8F5EE] text-[#167D73]"}`}><CheckCircle2 size={15}/></span><span className="flex-1 text-[11px] text-[#526A7D]">{text}</span><span className="text-[10px] text-[#9AA8B3]">{time}</span></button>)}
            </div>
          </Panel>

          <Panel title="Approval Center" action="View all" onAction={() => router.push("/employer/settings")}>
            <div className="divide-y divide-[#EEF2F4]">
              {approvals.map(([title, subtitle, action]) => <div key={title} className="py-3 flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-[#F7EFEA] text-[#B86B24] flex items-center justify-center"><FileCheck2 size={15}/></span><div className="flex-1 min-w-0"><p className="text-[11px] font-medium text-[#173454]">{title}</p><p className="text-[10px] text-[#8A99A5] mt-0.5">{subtitle}</p></div><button onClick={() => router.push("/employer/settings")} className="text-[10px] px-3 py-1.5 rounded-lg border border-[#CFE1E0] text-[#167D73] hover:bg-[#F3F9F8]">{action}</button></div>)}
            </div>
          </Panel>

          <button onClick={() => router.push("/employer/talent-pool")} className="text-left rounded-2xl overflow-hidden border border-[#DDE5EA] min-h-[255px] relative bg-[#EAF2F4]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(232,243,247,0.18),rgba(232,243,247,0.9))]" />
            <div className="absolute bottom-0 left-0 right-0 p-6"><p className="text-[16px] font-semibold text-[#173454]">Let’s build your next great team</p><p className="text-[12px] text-[#526A7D] mt-2 max-w-[250px]">Find, assess and hire the right talent — faster, smarter, together.</p><span className="inline-flex items-center gap-1 mt-5 text-[12px] font-medium text-[#167D73]">Explore Talent Pool <ArrowUpRight size={14}/></span></div>
          </button>
        </div>
      </div>
    </EmployerShell>
  );
}

function Panel({ title, action, onAction, children }: { title: string; action: string; onAction: () => void; children: React.ReactNode }) {
  return <section className="bg-white border border-[#DDE5EA] rounded-2xl p-5 shadow-[0_2px_10px_rgba(23,52,84,0.025)]"><div className="flex items-center justify-between mb-3"><h2 className="text-[15px] font-semibold text-[#173454]">{title}</h2><button onClick={onAction} className="text-[11px] text-[#167D73] inline-flex items-center gap-1 hover:underline">{action} <ArrowUpRight size={13}/></button></div>{children}</section>;
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof BriefcaseBusiness; label: string; value: string | number; tone: "blue"|"teal"|"lavender"|"peach" }) {
  const tones = { blue: "bg-[#EEF6FD] border-[#D7E8F6]", teal: "bg-[#EEF8F6] border-[#D9ECE8]", lavender: "bg-[#F4F1FB] border-[#E4DFF4]", peach: "bg-[#FFF6EF] border-[#F3E3D5]" };
  return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center"><Icon size={17} className="text-[#167D73]"/></span><span className="text-[11px] text-[#526A7D]">{label}</span></div><p className="text-[25px] font-semibold text-[#173454] mt-3">{value}</p><p className="text-[10px] text-[#167D73] mt-1">↑  —  current account</p></div>;
}
