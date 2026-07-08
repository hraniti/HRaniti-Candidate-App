"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, QuestionBankItem, QuestionType, Difficulty } from "@/lib/types";
import Button from "@/components/Button";
import { Search, Bookmark, BookmarkCheck, ChevronDown, Mic, Square, Lock } from "lucide-react";

const TYPE_ICONS: Record<QuestionType, string> = {
  Technical: "💻",
  Behavioural: "🧭",
  Language: "🗣️",
  Cultural: "🌍",
  Case: "📊",
};

const FREE_PREVIEW_LIMIT = 3;

export default function QuestionBankPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<QuestionType | "">("");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedAnswer, setExpandedAnswer] = useState<string | null>(null);
  const [practiceOpen, setPracticeOpen] = useState<string | null>(null);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: p }, { data: q }, { data: b }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("question_bank").select("*").order("created_at"),
        supabase.from("bookmarked_questions").select("question_id").eq("user_id", user.id),
      ]);
      setProfile(p as Profile);
      setQuestions((q as QuestionBankItem[]) ?? []);
      setBookmarks(new Set((b ?? []).map((x) => x.question_id)));
      setLoading(false);
    })();
  }, []);

  async function toggleBookmark(questionId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const isBookmarked = bookmarks.has(questionId);
    setBookmarks((prev) => {
      const next = new Set(prev);
      isBookmarked ? next.delete(questionId) : next.add(questionId);
      return next;
    });
    if (isBookmarked) {
      await supabase.from("bookmarked_questions").delete().eq("user_id", user.id).eq("question_id", questionId);
    } else {
      await supabase.from("bookmarked_questions").insert({ user_id: user.id, question_id: questionId });
    }
  }

  const categories = useMemo(() => Array.from(new Set(questions.map((q) => q.category))), [questions]);

  const filtered = useMemo(() => {
    let list = questions;
    if (search.trim()) list = list.filter((q) => q.question_text.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter) list = list.filter((q) => q.type === typeFilter);
    if (difficultyFilter) list = list.filter((q) => q.difficulty === difficultyFilter);
    if (categoryFilter) list = list.filter((q) => q.category === categoryFilter);
    if (showBookmarkedOnly) list = list.filter((q) => bookmarks.has(q.id));
    return list;
  }, [questions, search, typeFilter, difficultyFilter, categoryFilter, showBookmarkedOnly, bookmarks]);

  if (loading || !profile) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  const isPaid = profile.subscription_tier === "paid";

  return (
    <div>
      {!isPaid && (
        <div className="paper-card p-5 mb-6 border-gold/50 bg-gold/5">
          <p className="text-sm font-medium text-ink mb-1">Full Question Bank is a paid feature</p>
          <p className="text-xs text-ink-soft">
            You're seeing a free preview ({FREE_PREVIEW_LIMIT} questions per filter). Upgrade for full access and AI-scored practice answers — ₹999/month.
          </p>
        </div>
      )}

      <div className="paper-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions"
            className="w-full rounded-lg border border-line pl-8 pr-3 py-2 text-sm focus:border-ink outline-none"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as QuestionType | "")} className="rounded-lg border border-line px-2 py-2 text-sm bg-white">
          <option value="">Any type</option>
          {Object.keys(TYPE_ICONS).map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value as Difficulty | "")} className="rounded-lg border border-line px-2 py-2 text-sm bg-white">
          <option value="">Any difficulty</option>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-line px-2 py-2 text-sm bg-white">
          <option value="">Any category</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <input type="checkbox" checked={showBookmarkedOnly} onChange={(e) => setShowBookmarkedOnly(e.target.checked)} /> Bookmarked only
        </label>
      </div>

      <div className="space-y-3">
        {filtered.map((q, i) => {
          const locked = !isPaid && i >= FREE_PREVIEW_LIMIT;
          return (
            <div key={q.id} className={`paper-card p-5 ${locked ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-mono text-ink-soft">{TYPE_ICONS[q.type]} #{i + 1}</span>
                <button onClick={() => !locked && toggleBookmark(q.id)} disabled={locked} className="text-ink-soft hover:text-gold">
                  {bookmarks.has(q.id) ? <BookmarkCheck size={16} className="text-gold fill-gold" /> : <Bookmark size={16} />}
                </button>
              </div>
              <p className="text-sm font-medium text-ink mb-2">{q.question_text}</p>
              <div className="flex gap-2 mb-3">
                <span className="text-[11px] font-mono bg-paper rounded-full px-2 py-0.5 text-ink-soft">{q.difficulty}</span>
                <span className="text-[11px] font-mono bg-paper rounded-full px-2 py-0.5 text-ink-soft">{q.category}</span>
              </div>

              {locked ? (
                <p className="text-xs text-gold inline-flex items-center gap-1"><Lock size={12} /> Upgrade to unlock</p>
              ) : (
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setExpandedAnswer(expandedAnswer === q.id ? null : q.id)}
                    className="text-xs text-ink inline-flex items-center gap-1 hover:text-ink-light"
                  >
                    <ChevronDown size={12} className={expandedAnswer === q.id ? "rotate-180" : ""} /> View Answer
                  </button>
                  <button
                    onClick={() => (isPaid ? setPracticeOpen(practiceOpen === q.id ? null : q.id) : null)}
                    className={`text-xs inline-flex items-center gap-1 ${isPaid ? "text-ink hover:text-ink-light" : "text-ink-soft"}`}
                  >
                    {!isPaid && <Lock size={11} />} Practice Answer
                  </button>
                </div>
              )}

              {expandedAnswer === q.id && !locked && (
                <p className="text-xs text-ink-soft bg-paper rounded-lg p-3 mt-3">{q.model_answer ?? "No model answer available."}</p>
              )}
              {practiceOpen === q.id && !locked && isPaid && <PracticeAnswer questionId={q.id} />}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-ink-soft italic text-center py-10">No questions match these filters.</p>}
      </div>
    </div>
  );
}

function PracticeAnswer({ questionId }: { questionId: string }) {
  const [answer, setAnswer] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);
  const mediaRecorder = useState<{ current: MediaRecorder | null }>({ current: null })[0];
  const chunks = useState<{ current: Blob[] }>({ current: [] })[0];

  async function toggleRecording() {
    if (recording) {
      mediaRecorder.current?.stop();
      setRecording(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setTranscribing(true);
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "answer.webm");
      const res = await fetch("/api/mock-interview/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (data.text) setAnswer((prev) => (prev ? prev + " " + data.text : data.text));
      setTranscribing(false);
    };
    recorder.start();
    mediaRecorder.current = recorder;
    setRecording(true);
  }

  async function scoreAnswer() {
    setScoring(true);
    const res = await fetch("/api/question-bank/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, answer }),
    });
    const data = await res.json();
    setScoring(false);
    if (data.score !== undefined) setResult(data);
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type or record your practice answer…"
        rows={3}
        className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-ink outline-none mb-2"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={toggleRecording}
          disabled={transcribing}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
            recording ? "bg-alert text-white border-alert" : "bg-white text-ink border-line"
          }`}
        >
          {recording ? <Square size={12} /> : <Mic size={12} />}
          {recording ? "Stop" : transcribing ? "Transcribing…" : "Record"}
        </button>
        <Button variant="secondary" loading={scoring} disabled={!answer.trim()} onClick={scoreAnswer}>
          Score my answer
        </Button>
      </div>
      {result && (
        <div className="mt-3 bg-verified/5 border border-verified/20 rounded-lg p-3">
          <p className="font-mono text-sm text-ink mb-1">Score: {result.score}%</p>
          <p className="text-xs text-ink-soft">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}
