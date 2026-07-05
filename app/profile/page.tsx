"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { useDebouncedSave } from "@/lib/useDebouncedSave";
import AppHeader from "@/components/AppHeader";
import ReadinessBar from "@/components/profile/ReadinessBar";
import { SaveIndicator } from "@/components/profile/shared";
import Tab1Professional from "@/components/profile/Tab1Professional";
import Tab2Preferences from "@/components/profile/Tab2Preferences";
import Tab3Eligibility from "@/components/profile/Tab3Eligibility";
import Tab4Privacy from "@/components/profile/Tab4Privacy";

const TABS = [
  { key: "professional", label: "Professional Profile" },
  { key: "preferences", label: "Job Preferences" },
  { key: "eligibility", label: "Personal & Eligibility" },
  { key: "privacy", label: "Privacy & Account" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function MyProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("professional");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data as Profile);
      setLoading(false);
    })();
  }, []);

  const { status, queueSave: rawQueueSave, saveNow } = useDebouncedSave<Profile>(async (patch) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) throw error;
  });

  // Wrap queueSave so local state and the debounced backend write stay in sync,
  // and so the tab components can rely on `profile` reflecting the latest edits
  // even before the 2-second save actually fires.
  function queueSave(patch: Partial<Profile>) {
    setProfile((p) => (p ? { ...p, ...patch } : p));
    rawQueueSave(patch);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center">
        <p className="font-mono text-sm text-ink-soft">Loading your profile…</p>
      </main>
    );
  }
  if (!profile) return null;

  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:py-14">
      <div className="max-w-2xl mx-auto">
        <AppHeader />

        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-3xl sm:text-4xl text-ink">My Profile</h1>
          <SaveIndicator status={status} />
        </div>
        <p className="text-ink-soft mb-6 text-[15px]">
          This is your professional profile — what employers see when they search.
        </p>

        <ReadinessBar profile={profile} />

        {/* Tab nav */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`shrink-0 text-sm px-4 py-2 rounded-full border transition-colors ${
                activeTab === t.key
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink-soft border-line hover:border-ink/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "professional" && (
          <Tab1Professional profile={profile} queueSave={queueSave} saveNow={saveNow} />
        )}
        {activeTab === "preferences" && (
          <Tab2Preferences profile={profile} queueSave={queueSave} saveNow={saveNow} />
        )}
        {activeTab === "eligibility" && (
          <Tab3Eligibility profile={profile} queueSave={queueSave} saveNow={saveNow} />
        )}
        {activeTab === "privacy" && <Tab4Privacy profile={profile} queueSave={queueSave} />}
      </div>
    </main>
  );
}
