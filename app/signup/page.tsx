"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

function HranitiLogo() {
  return (
    <div className="flex items-center gap-3" aria-label="HRaniti">
      <svg width="44" height="44" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="17" r="17" fill="#7B00FF" />
        <path d="M17 50c0-18.2 14.8-33 33-33v33H17Z" fill="#7B00FF" />
        <path d="M50 17h33c0 18.2-14.8 33-33 33V17Z" fill="#FF3D3D" />
        <path d="M17 50h66c0 18.2-14.8 33-33 33S17 68.2 17 50Z" fill="#18C8E8" />
      </svg>
      <div>
        <div className="text-[27px] font-semibold tracking-[-0.045em] text-[#102D52] leading-none">HRaniti</div>
        <div className="mt-1 text-[10px] tracking-[0.08em] text-[#6E8298]">Where change begins</div>
      </div>
    </div>
  );
}

const options = [
  {
    title: "Your next great hire starts here.",
    description: "Find the right people for your next role — simply and confidently.",
    cta: "Hire Talent",
    href: "/employer/signup",
    tone: "employer",
    visual: "talent",
  },
  {
    title: "Your next chapter starts here.",
    description: "Discover opportunities that fit your skills, goals and ambitions.",
    cta: "Explore Opportunities",
    href: "/talent/signup",
    tone: "talent",
    visual: "career",
  },
] as const;

function EmployerIllustration() {
  return (
    <div className="relative mx-auto h-[220px] w-full max-w-[430px]">
      <div className="absolute inset-x-8 top-5 h-[185px] rounded-[34px] bg-[#EAF4F2]" />
      <div className="absolute left-[18%] top-10 h-[145px] w-[64%] rounded-[20px] bg-white shadow-[0_20px_50px_rgba(16,45,82,0.10)] border border-[#E1ECEB]">
        <div className="flex items-center gap-2 px-5 pt-5">
          <div className="h-9 w-9 rounded-full bg-[#D7EFEB]" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-24 rounded-full bg-[#BFD8D5]" />
            <div className="h-2 w-16 rounded-full bg-[#E4EEED]" />
          </div>
        </div>
        <div className="mt-5 space-y-3 px-5">
          {[78, 62, 70].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-[#F0F5F4]" />
              <div className="h-2 rounded-full bg-[#DDE9E7]" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-1/2 h-10 w-44 -translate-x-1/2 rounded-t-[18px] bg-[#B9D9D5]" />
      <div className="absolute bottom-[-3px] left-[37%] h-2 w-[26%] rounded-full bg-[#87B7B2]" />
    </div>
  );
}

function CareerIllustration() {
  return (
    <div className="relative mx-auto h-[220px] w-full max-w-[430px]">
      <div className="absolute inset-x-10 top-6 h-[180px] rounded-[38px] bg-[#F1F5FA]" />
      <div className="absolute left-[20%] top-12 h-[145px] w-[58%] rounded-[28px] bg-white shadow-[0_20px_50px_rgba(16,45,82,0.08)] border border-[#E6EDF3]">
        <div className="absolute right-5 top-5 h-11 w-11 rounded-full bg-[#DDF2F1]" />
        <div className="absolute left-6 top-8 h-3 w-24 rounded-full bg-[#D7E3EA]" />
        <div className="absolute left-6 top-14 h-2 w-32 rounded-full bg-[#EAF0F4]" />
        <div className="absolute bottom-8 left-6 right-6 flex gap-2">
          <div className="h-8 flex-1 rounded-xl bg-[#E8F5F2]" />
          <div className="h-8 w-12 rounded-xl bg-[#EAF0FA]" />
        </div>
      </div>
      <div className="absolute bottom-2 left-[28%] h-20 w-28 rounded-t-[50%] bg-[#DDECEB]" />
      <div className="absolute bottom-0 left-[41%] h-16 w-20 rounded-t-[45%] bg-[#F2D9C9]" />
      <div className="absolute bottom-0 right-[27%] h-28 w-16 rounded-t-[35%] bg-[#B9D8D5]" />
    </div>
  );
}

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-[#FBFCFB] text-[#102D52]">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-7 sm:px-10 lg:px-14">
        <HranitiLogo />
        <div className="hidden text-right sm:block">
          <p className="text-[12px] tracking-[0.08em] text-[#8393A5]">Better people</p>
          <p className="mt-0.5 text-[12px] tracking-[0.08em] text-[#A1AEBB]">Better opportunities</p>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-105px)] w-full max-w-[1440px] grid-cols-1 lg:grid-cols-2">
        {options.map((item, index) => (
          <div
            key={item.cta}
            className={`flex flex-col items-center justify-center px-7 pb-16 pt-8 text-center sm:px-12 lg:px-16 lg:pb-24 lg:pt-10 ${index === 0 ? "border-b border-[#E5ECEC] lg:border-b-0 lg:border-r" : ""}`}
          >
            <div className="w-full max-w-[520px]">
              {item.visual === "talent" ? <EmployerIllustration /> : <CareerIllustration />}

              <div className="mx-auto mt-5 max-w-[500px]">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#78909C]">
                  {item.tone === "employer" ? "For employers" : "For talent"}
                </p>
                <h1 className="text-[36px] font-medium leading-[1.12] tracking-[-0.035em] text-[#102D52] sm:text-[44px] lg:text-[48px]">
                  {item.title}
                </h1>
                <p className="mx-auto mt-5 max-w-[410px] text-[16px] leading-7 text-[#708195] sm:text-[17px]">
                  {item.description}
                </p>

                <Link
                  href={item.href}
                  className={`group mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-7 text-[15px] font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#102D52]/10 ${item.tone === "employer" ? "bg-[#1E756F] text-white hover:-translate-y-0.5 hover:bg-[#195F5A]" : "bg-[#102D52] text-white hover:-translate-y-0.5 hover:bg-[#183E68]"}`}
                >
                  {item.cta}
                  <ArrowRight size={17} strokeWidth={2.2} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </section>

      <footer className="pb-7 text-center text-[11px] tracking-[0.05em] text-[#9AA7B4]">
        A simpler way to connect people and opportunity.
      </footer>
    </main>
  );
}
