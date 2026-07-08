"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, SavedPitch } from "@/lib/types";
import Button from "@/components/Button";
import { Video, Square, Upload, RotateCcw, Save, Share2, Lock, Sparkles, TrendingUp, Trash2 } from "lucide-react";

export default function VideoPitchPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pitches, setPitches] = useState<SavedPitch[]>([]);
  const [loading, setLoading] = useState(true);

  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coaching, setCoaching] = useState<{ positives: string[]; improvements: string[]; tips: string[]; score: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: p }, { data: sp }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("saved_pitches").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProfile(p as Profile);
    setPitches((sp as SavedPitch[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
      chunks.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recorder.ondataavailable = (e) => chunks.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "video/webm" });
        setRecordedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch {
      setError("Couldn't access your camera/microphone. Check browser permissions.");
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  function retake() {
    setRecordedBlob(null);
    setPreviewUrl(null);
    setCoaching(null);
  }

  function handleUpload(file: File) {
    if (file.size > 100 * 1024 * 1024) {
      setError("File is larger than 100MB.");
      return;
    }
    setRecordedBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function analyze() {
    if (!recordedBlob) return;
    setAnalyzing(true);
    setError(null);
    const form = new FormData();
    form.append("video", recordedBlob, "pitch.webm");
    try {
      const res = await fetch("/api/video-pitch/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoaching(data.feedback);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function savePitch(share: boolean) {
    if (!recordedBlob || !profile) return;
    setSaving(true);
    setError(null);
    try {
      const path = `${profile.id}/${Date.now()}-pitch.webm`;
      const { error: uploadError } = await supabase.storage.from("video-pitches").upload(path, recordedBlob, {
        contentType: "video/webm",
      });
      if (uploadError) throw uploadError;
      const { data: signed } = await supabase.storage.from("video-pitches").createSignedUrl(path, 60 * 60 * 24 * 365);
      const videoUrl = signed?.signedUrl ?? path;

      const { data: pitch, error: insertError } = await supabase
        .from("saved_pitches")
        .insert({
          user_id: profile.id,
          video_url: videoUrl,
          score: coaching?.score ?? null,
          ai_feedback: coaching,
          status: share ? "Shared with Employers" : "Saved",
        })
        .select()
        .single();
      if (insertError) throw insertError;

      await supabase
        .from("profiles")
        .update({ current_video_pitch_url: videoUrl, show_video_pitch: share ? true : profile.show_video_pitch })
        .eq("id", profile.id);

      setPitches((prev) => [pitch as SavedPitch, ...prev]);
      retake();
    } catch (e: any) {
      setError(e.message || "Couldn't save your pitch.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePitch(id: string) {
    setPitches((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("saved_pitches").delete().eq("id", id);
  }

  if (loading || !profile) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;
  const isPaid = profile.subscription_tier === "paid";

  return (
    <div>
      <section className="paper-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={15} className="text-gold" />
          <p className="text-sm font-medium text-ink">Candidates with a video pitch get 2x more employer profile views.</p>
        </div>
        <p className="text-xs text-ink-soft">Your video pitch is your 60-second handshake. Make it count.</p>
      </section>

      <section className="paper-card p-6 mb-6">
        {!previewUrl ? (
          <>
            <video ref={videoRef} className="w-full rounded-lg bg-ink aspect-video mb-4" />
            {error && <p className="text-sm text-alert mb-3">{error}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              {!recording ? (
                <Button onClick={startRecording}><Video size={14} /> Start Recording</Button>
              ) : (
                <Button className="!bg-alert" onClick={stopRecording}><Square size={14} /> Stop</Button>
              )}
              <label className="inline-flex items-center gap-1.5 text-sm text-ink cursor-pointer">
                <Upload size={14} /> Upload a video (MP4/MOV, max 100MB)
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <video src={previewUrl} controls className="w-full rounded-lg bg-ink aspect-video mb-4" />
            {error && <p className="text-sm text-alert mb-3">{error}</p>}

            {!coaching && (
              <div className="mb-4">
                {isPaid ? (
                  <button onClick={analyze} disabled={analyzing} className="inline-flex items-center gap-1.5 text-sm text-ink hover:text-ink-light">
                    <Sparkles size={13} className="text-gold" /> {analyzing ? "Analyzing…" : "Get AI Coaching"}
                  </button>
                ) : (
                  <p className="text-xs text-gold inline-flex items-center gap-1"><Lock size={12} /> AI Coaching is a paid add-on</p>
                )}
              </div>
            )}

            {coaching && (
              <div className="paper-card p-4 mb-4 bg-paper">
                <p className="font-mono text-sm text-ink mb-2">Pitch Quality Score: {coaching.score}%</p>
                {coaching.positives.map((p, i) => <p key={i} className="text-xs text-verified mb-1">✓ {p}</p>)}
                {coaching.improvements.map((p, i) => <p key={i} className="text-xs text-gold mb-1">⚠ {p}</p>)}
                {coaching.tips.map((p, i) => <p key={i} className="text-xs text-ink-soft mb-1">💡 {p}</p>)}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={retake}><RotateCcw size={14} /> Retake</Button>
              <Button variant="secondary" loading={saving} onClick={() => savePitch(false)}><Save size={14} /> Save Pitch</Button>
              <Button loading={saving} onClick={() => savePitch(true)}><Share2 size={14} /> Share with Employers</Button>
            </div>
          </>
        )}
      </section>

      {pitches.length > 0 && (
        <section className="paper-card p-6">
          <h2 className="font-medium text-ink mb-3">Saved Pitches</h2>
          <div className="space-y-2">
            {pitches.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-line last:border-0 py-2 text-sm">
                <div>
                  <p className="text-ink">{new Date(p.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-ink-soft">{p.status}{p.score != null ? ` · ${p.score}%` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <a href={p.video_url} target="_blank" rel="noreferrer" className="text-xs text-ink underline underline-offset-4">View</a>
                  <button onClick={() => deletePitch(p.id)} className="text-ink-soft hover:text-alert">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
