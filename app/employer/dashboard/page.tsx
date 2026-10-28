"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";
import { BriefcaseBusiness, UsersRound, CalendarDays, FileText, UserCheck, ArrowUpRight, RefreshCw, ReceiptText, CircleAlert } from "lucide-react";

type Company = { name: string | null; primary_hr_contact_name: string | null; onboarding_completed: boolean };
type Submission = { id: string; candidate_name: string | null; candidate_email: string | null; job_id: string | null; status: string | null; created_at: string | null; joining_date?: string | null };
type Invoice = { id: string; invoice_type: string | null; status: string | null; total_amount: number | null; currency: string | null; due_date: string | null };

export default function EmployerDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState({ openJobs: 0, applicants: 0, submissions: 0, interviewsToday: 0, offersPending: 0, hiresThisMonth: 0, receivables: 0, payables: 0 });
  const [recent, setRecent] = useState<Submission[]>([]);
  const [jobTitles, setJobTitles] = useState<Record<string, string>>([]);
  const [invoiceRows, setInvoiceRows] = useState<Invoice[]>([]);

  async function load() {
    setRefreshing(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data: companyRow, error: companyError } = await supabase.from("companies").select("name,primary_hr_contact_name,onboarding_completed").eq("id", companyId).single();
      if (companyError) throw companyError;
      if (companyRow && !companyRow.onboarding_completed) { router.replace("/employer/onboarding/company"); return; }
      setCompany(companyRow as Company);

      const [jobsResult, submissionsResult, invoicesResult, applicationsResult, offersResult] = await Promise.all([
        supabase.from("jobs").select("id,title,status,created_at").eq("company_id", companyId).order("created_at", { ascending: false }),
        supabase.from("agency_submissions").select("id,candidate_name,candidate_email,job_id,status,created_at,joining_date").eq("workspace_company_id", companyId).order("created_at", { ascending: false }).limit(8),
        supabase.from("agency_invoices").select("id,invoice_type,status,total_amount,currency,due_date").eq("workspace_company_id", companyId),
        supabase.from("applications").select("id,job_id,applied_at"),
        supabase.from("offers").select("id,status,start_date,created_at").eq("company_id", companyId),
      ]);
      if (jobsResult.error) throw jobsResult.error;
      if (submissionsResult.error) throw submissionsResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      const jobs = jobsResult.data ?? [];
      const submissions = submissionsResult.data ?? [];
      const invoices = (invoicesResult.data ?? []) as Invoice[];
      const applications = applicationsResult.error ? [] : (applicationsResult.data ?? []);
      const offers = offersResult.error ? [] : (offersResult.data ?? []);
      const titles: Record<string, string> = {};
      jobs.forEach((j: any) => { titles[j.id] = j.title; });
      setJobTitles(titles);
      setRecent(submissions);
      setInvoiceRows(invoices);
      const today = new Date();
      const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const pendingInvoiceStatuses = ["Draft", "Paid", "Void", "Rejected"];
      const receivable = invoices.filter(i => i.invoice_type === "Company Receivable" && !pendingInvoiceStatuses.includes(i.status ?? "")).reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
      const payable = invoices.filter(i => i.invoice_type === "Recruiter Payable" && !pendingInvoiceStatuses.includes(i.status ?? "")).reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
      const joined = submissions.filter(s => s.status === "Joined" && s.created_at && s.created_at >= monthStart);
      const jobIds = new Set(jobs.map((j: any) => j.id));
      const openJobs = jobs.filter((j: any) => ["active", "open", "Open", "Active"].includes(j.status ?? "")).length;
      const todayInterviewResult = await supabase.from("interview_requests").select("id,confirmed_time,status").gte("confirmed_time", dayStart).lt("confirmed_time", dayEnd);
      setMetrics({
        openJobs,
        applicants: applications.filter((a: any) => jobIds.has(a.job_id)).length,
        submissions: (submissionsResult.data ?? []).length,
        interviewsToday: todayInterviewResult.error ? 0 : (todayInterviewResult.data ?? []).filter((i: any) => !["cancelled", "canceled", "declined"].includes((i.status ?? "").toLowerCase())).length,
        offersPending: offers.filter((o: any) => ["draft", "pending approval", "awaiting approval", "approved", "sent", "awaiting acceptance", "awaiting_acceptance"].includes((o.status ?? "").toLowerCase())).length,
        hiresThisMonth: joined.length,
        receivables: receivable,
        payables: payable,
      });
    } catch (e: any) {
      setError(e?.message || "We couldn't load dashboard data. Please refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const firstName = company?.primary_hr_contact_name?.split(" ")[0] || "there";
  const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  const cards = [
    { label: "Open jobs", value: metrics.openJobs, icon: BriefcaseBusiness, href: "/employer/jobs", tone: "blue" },
    { label: "Applicants", value: metrics.applicants, icon: UsersRound, href: "/employer/applicants", tone: "teal" },
    { label: "Submissions", value: metrics.submissions, icon: FileText, href: "/employer/submissions", tone: "lavender" },
    { label: "Interviews today", value: metrics.interviewsToday, icon: CalendarDays, href: "/employer/interviews", tone: "peach" },
    { label: "Offers in progress", value: metrics.offersPending, icon: FileText, href: "/employer/offers", tone: "teal" },
    { label: "Joined this month", value: metrics.hiresThisMonth, icon: UserCheck, href: "/employer/hires", tone: "blue" },
  ] as const;
  const tones: Record<string, string> = { blue: "bg-[#EEF6FD] border-[#D7E8F6]", teal: "bg-[#EEF8F6] border-[#D9ECE8]", lavender: "bg-[#F4F1FB] border-[#E4DFF4]", peach: "bg-[#FFF6EF] border-[#F3E3D5]" };

  if (loading && !company) return <EmployerShell><div className="mx-auto max-w-6xl p-8 text-sm text-[#71859A]">Loading your dashboard…</div></EmployerShell>;

  return <EmployerShell jobCount={metrics.openJobs}>
    <main className="min-h-screen bg-[#FCFCFA] px-5 py-8 text-[#173454] sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-semibold tracking-[.16em] text-[#167D73]">HRANITI WORKSPACE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Good morning, {firstName}</h1><p className="mt-2 text-sm text-[#71859A]">Your recruitment activity, priorities and business at a glance.</p></div>
          <button onClick={load} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-4 py-2.5 text-sm disabled:opacity-60"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""}/>Refresh data</button>
        </header>
        {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-[#F0D5C9] bg-[#FFF8F4] p-4 text-sm text-[#8C4B32]"><CircleAlert size={17} className="mt-0.5 shrink-0"/><div><p className="font-medium">Dashboard data could not be fully loaded</p><p className="mt-1">{error}</p></div></div>}
        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(card => <button key={card.label} onClick={() => router.push(card.href)} className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tones[card.tone]}`}><div className="flex items-center justify-between"><span className="text-sm text-[#526A7D]">{card.label}</span><card.icon size={18} className="text-[#167D73]"/></div><p className="mt-4 text-3xl font-semibold">{loading ? "—" : card.value}</p><span className="mt-3 inline-flex items-center gap-1 text-xs text-[#167D73]">View details <ArrowUpRight size={13}/></span></button>)}
        </section>
        <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-[#DDE5EA] bg-white p-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Recent submissions</h2><p className="mt-1 text-xs text-[#71859A]">Latest candidate submissions recorded in your workspace.</p></div><button onClick={() => router.push("/employer/submissions")} className="inline-flex items-center gap-1 text-xs text-[#167D73]">All submissions <ArrowUpRight size={13}/></button></div>
            {loading ? <p className="py-8 text-sm text-[#71859A]">Loading submissions…</p> : recent.length === 0 ? <div className="py-8 text-center"><FileText size={22} className="mx-auto text-[#9AA8B3]"/><p className="mt-2 text-sm font-medium">No submissions yet</p><p className="mt-1 text-xs text-[#71859A]">Create your first submission to see activity here.</p><button onClick={() => router.push("/employer/submissions")} className="mt-3 rounded-lg bg-[#167D73] px-3 py-2 text-xs text-white">Create submission</button></div> : <div className="mt-3 divide-y divide-[#EEF2F4]">{recent.slice(0,6).map(row => <button key={row.id} onClick={() => router.push("/employer/submissions")} className="flex w-full items-center gap-3 py-3 text-left hover:bg-[#FAFCFC]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF8F6] text-xs font-semibold text-[#167D73]">{(row.candidate_name || "C").split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{row.candidate_name || row.candidate_email || "Candidate"}</span><span className="mt-1 block truncate text-xs text-[#71859A]">{row.job_id ? jobTitles[row.job_id] || "Role" : "Role not linked"} · {row.status || "No status"}</span></span><span className="shrink-0 text-xs text-[#71859A]">{row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</span></button>)}</div>}
          </div>
          <div className="rounded-2xl border border-[#DDE5EA] bg-white p-5">
            <h2 className="font-semibold">Business snapshot</h2><p className="mt-1 text-xs text-[#71859A]">Amounts based on recorded invoice entries, not bank reconciliation.</p>
            <button onClick={() => router.push("/employer/invoices")} className="mt-4 flex w-full items-center gap-3 rounded-xl border border-[#EEF2F4] p-4 text-left hover:bg-[#FAFCFC]"><ReceiptText size={19} className="text-[#167D73]"/><span className="min-w-0 flex-1"><span className="block text-sm font-medium">Client receivables</span><span className="mt-1 block text-xs text-[#71859A]">Outstanding recorded invoices</span></span><span className="text-sm font-semibold">{money(metrics.receivables)}</span></button>
            <button onClick={() => router.push("/employer/invoices")} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[#EEF2F4] p-4 text-left hover:bg-[#FAFCFC]"><ReceiptText size={19} className="text-[#167D73]"/><span className="min-w-0 flex-1"><span className="block text-sm font-medium">Recruiter payables</span><span className="mt-1 block text-xs text-[#71859A]">Recorded recruiter payment entries</span></span><span className="text-sm font-semibold">{money(metrics.payables)}</span></button>
            <div className="mt-4 rounded-xl bg-[#F7F9F8] p-3 text-xs leading-5 text-[#71859A]">Dashboard figures come from saved workspace records. Interview and offer totals show zero when their source query is unavailable; verify these counts against their tabs during testing.</div>
          </div>
        </section>
      </div>
    </main>
  </EmployerShell>;
}
