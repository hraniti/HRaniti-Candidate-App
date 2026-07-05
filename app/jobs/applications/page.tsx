"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationStatus } from "@/lib/types";
import Button from "@/components/Button";
import { ChevronRight, Sparkles, Clock } from "lucide-react";

type Category = "applied" | "interviews" | "offers" | "archived";

const CATEGORY_STATUSES: Record<Category, ApplicationStatus[]> = {
  applied: ["Applied"],
  interviews: ["Interview Scheduled"],
  offers: ["Offer"],
  archived: ["Rejected", "Withdrawn", "Archived"],
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  Applied: "bg-paper text-ink-soft border-line",
  "Interview Scheduled": "bg-gold/10 text-gold border-gold/30",
  Offer: "bg-verified/10 text-verified border-verified/30",
  Rejected: "bg-alert/10 text-alert border-alert/30",
  Withdrawn: "bg-paper text-ink-soft border-line",
  Archived: "bg-paper text-ink-soft border-line",
};

function ApplicationsInner() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const category = (params.get("tab") as Category) ?? "applied";

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [cheatSheets, setCheatSheets] = useState<Record<string, { note: string; generated_at: string }>>({});

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("applications")
        .select("*, job:jobs(*)")
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false });
      setApplications((data as Application[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function loadCheatSheet(app: Application) {
    if (app.interview_cheat_sheet) {
      setCheatSheets((prev) => ({ ...prev, [app.id]: app.interview_cheat_sheet! }));
      return;
    }
    const res = await fetch("/api/jobs/cheat-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: app.id }),
    });
    const data = await res.json();
    if (data.cheatSheet) setCheatSheets((prev) => ({ ...prev, [app.id]: data.cheatSheet }));
  }

  async function withdraw(applicationId: string) {
    setApplications((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: "Withdrawn" } : a)));
    await fetch("/api/jobs/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });
  }

  const filtered = applications.filter((a) => CATEGORY_STATUSES[category].includes(a.status));

  useEffect(() => {
    // Auto-generate cheat sheets for any interview-scheduled apps once loaded.
    if (category === "interviews") {
      filtered.forEach((a) => {
        if (!cheatSheets[a.id]) loadCheatSheet(a);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, applications]);

  if (loading) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  return (
    <div className="space-y-4">
      {filtered.length === 0 && (
        <p className="text-sm text-ink-soft italic text-center py-10">Nothing here yet.</p>
      )}
      {filtered.map((app) => (
        <div key={app.id} className="paper-card p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <button
                onClick={() => router.push(`/jobs/${app.job_id}`)}
                className="font-medium text-ink hover:underline text-left"
              >
                {app.job?.title ?? "Job"}
              </button>
              <p className="text-sm text-ink-soft">{app.job?.company}</p>
            </div>
            <span className={`text-[11px] font-mono rounded-full border px-2.5 py-1 ${STATUS_STYLES[app.status]}`}>
              {app.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft mb-3">
            <span>Applied {new Date(app.applied_at).toLocaleDateString()}</span>
            {app.application_quality_score != null && (
              <span>Application Ready: {app.application_quality_score}%</span>
            )}
            {app.expected_timeline && <span>Review timeline: {app.expected_timeline}</span>}
          </div>

          <p className="text-sm text-ink mb-2">Next step: {app.next_step}</p>

          {app.employer_feedback && (
            <p className="text-xs text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 mb-3 inline-block">
              Employer feedback: {app.employer_feedback}
            </p>
          )}

          {app.status === "Interview Scheduled" && cheatSheets[app.id] && (
            <div className="text-xs bg-verified/5 border border-verified/20 rounded-lg p-3 mb-3">
              <p className="inline-flex items-center gap-1.5 font-medium text-ink mb-1">
                <Sparkles size={12} className="text-gold" /> AI Prep Note
              </p>
              <p className="text-ink-soft">{cheatSheets[app.id].note}</p>
              <p className="text-[10px] text-ink-soft/70 mt-1 inline-flex items-center gap-1">
                <Clock size={10} /> Generated {new Date(cheatSheets[app.id].generated_at).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/jobs/${app.job_id}`)} className="text-sm text-ink inline-flex items-center gap-1 hover:text-ink-light">
              View Application <ChevronRight size={14} />
            </button>
            {app.status === "Applied" && (
              <Button variant="ghost" onClick={() => withdraw(app.id)}>
                Withdraw
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<p className="font-mono text-sm text-ink-soft">Loading…</p>}>
      <ApplicationsInner />
    </Suspense>
  );
}
