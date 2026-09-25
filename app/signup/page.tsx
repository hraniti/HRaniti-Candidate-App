"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

const options = [
  {
    title: "Your next great hire starts here.",
    description: "Find the right people for your next role — simply and confidently.",
    cta: "Hire Talent",
    href: "/employer/signup",
    tone: "employer",
    image: "/illustrations/hiring.svg",
    alt: "People connecting talent with a hiring opportunity",
  },
  {
    title: "Your next chapter starts here.",
    description: "Discover opportunities that fit your skills, goals and ambitions.",
    cta: "Explore Opportunities",
    href: "/talent/signup",
    tone: "talent",
    image: "/illustrations/opportunities.svg",
    alt: "People exploring a new career opportunity",
  },
] as const;

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-[#FCFDFC] text-[#102D52]">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-7 sm:px-10 lg:px-14">
        <img src="/brand/hraniti-logo.svg" alt="HRaniti — Where change begins" className="h-auto w-[205px] sm:w-[235px]" />
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
            <div className="w-full max-w-[560px]">
              <div className="mx-auto flex h-[250px] w-full max-w-[500px] items-center justify-center sm:h-[285px]">
                <img src={item.image} alt={item.alt} className="h-full w-full object-contain" />
              </div>

              <div className="mx-auto mt-3 max-w-[520px]">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#78909C]">
                  {item.tone === "employer" ? "For employers" : "For talent"}
                </p>
                <h1 className="text-[36px] font-medium leading-[1.12] tracking-[-0.035em] text-[#102D52] sm:text-[44px] lg:text-[48px]">
                  {item.title}
                </h1>
                <p className="mx-auto mt-5 max-w-[430px] text-[16px] leading-7 text-[#708195] sm:text-[17px]">
                  {item.description}
                </p>

                <a
                  href={item.href}
                  className={`group mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-7 text-[15px] font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#102D52]/10 ${item.tone === "employer" ? "bg-[#1E756F] text-white hover:-translate-y-0.5 hover:bg-[#195F5A]" : "bg-[#102D52] text-white hover:-translate-y-0.5 hover:bg-[#183E68]"}`}
                >
                  {item.cta}
                  <ArrowRight size={17} strokeWidth={2.2} className="transition-transform group-hover:translate-x-0.5" />
                </a>
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
