"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CandidateShell from "@/components/CandidateShell";

const SUB_NAV = [
  { href: "/interview-hub", label: "Assessments" },
  { href: "/interview-hub/mock-interview", label: "Mock Interview" },
  { href: "/interview-hub/question-bank", label: "Question Bank" },
  { href: "/interview-hub/video-pitch", label: "Video Pitch" },
];

export default function InterviewHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <CandidateShell>
      <div className="px-4 py-10 sm:py-14">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">Interview Hub</h1>
        <p className="text-ink-soft mb-6 text-[15px]">Verify your skills, practice with confidence, and put a face to your profile.</p>

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
      </div>
    </CandidateShell>
  );
}
