"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

const options = [
  {
    eyebrow: "FOR EMPLOYERS",
    title: "Your next great hire starts here.",
    description: "Find, evaluate and connect with top talent — faster, smarter and simpler.",
    cta: "Hire Talent",
    href: "/employer/signup",
    image: "/signup/employer-hero.webp?v=3",
    alt: "Professional woman reviewing talent profiles at her desk",
    tone: "employer",
  },
  {
    eyebrow: "FOR TALENT",
    title: "Your next chapter starts here.",
    description: "Discover opportunities that match your skills, goals and potential.",
    cta: "Explore Opportunities",
    href: "/talent/signup",
    image: "/signup/talent-hero.webp?v=3",
    alt: "Professional woman exploring career opportunities",
    tone: "talent",
  },
] as const;

export default function WelcomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FCFCFA] text-[#173454]">
      <header className="mx-auto flex h-[82px] w-full max-w-[1600px] items-center justify-between px-7 sm:px-10 lg:px-14 xl:px-20">
        <Image
          src="/brand/hraniti-wordmark.svg"
          alt="HRaniti"
          width={205}
          height={46}
          priority
          className="h-auto w-[150px] sm:w-[175px] lg:w-[190px]"
        />

        <div className="hidden items-center gap-2 text-[13px] font-medium text-[#74879B] sm:flex lg:text-[14px]">
          <span>Better People</span>
          <span className="text-[#8DA0B2]">›</span>
          <span>Better Opportunities</span>
          <span className="text-[#8DA0B2]">›</span>
          <span>A Brighter Future</span>
          <span className="ml-1 text-[#8DA0B2]">›</span>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-82px)] w-full max-w-[1600px] grid-cols-1 lg:grid-cols-2">
        {options.map((item, index) => (
          <div
            key={item.cta}
            className={
              index === 0
                ? "flex min-h-[650px] flex-col items-center border-b border-[#E4E9E8] px-7 pb-8 pt-2 text-center sm:px-12 lg:min-h-0 lg:border-b-0 lg:border-r lg:px-12 xl:px-20"
                : "flex min-h-[650px] flex-col items-center px-7 pb-8 pt-2 text-center sm:px-12 lg:min-h-0 lg:px-12 xl:px-20"
            }
          >
            <div className="flex w-full max-w-[620px] flex-1 flex-col items-center justify-center">
              <div className="relative w-full max-w-[570px] overflow-hidden rounded-[30%_30%_24%_24%] bg-white shadow-[0_16px_45px_rgba(35,61,83,0.055)]">
                <img
                  src={item.image}
                  alt={item.alt}
                  width={900}
                  height={500}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="block h-auto w-full object-cover"
                />
              </div>

              <div className="mt-4 max-w-[600px]">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7890A0]">
                  {item.eyebrow}
                </p>

                <h1 className="mx-auto max-w-[590px] text-[34px] font-medium leading-[1.08] tracking-[-0.045em] text-[#173454] sm:text-[40px] lg:text-[42px] xl:text-[46px]">
                  {item.title}
                </h1>

                <p className="mx-auto mt-3 max-w-[500px] text-[15px] leading-6 text-[#71859A] sm:text-[16px]">
                  {item.description}
                </p>

                <a
                  href={item.href}
                  className={
                    item.tone === "employer"
                      ? "group mt-5 inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#167D73] px-8 text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(16,45,82,0.09)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#126B63] focus:outline-none focus:ring-4 focus:ring-[#173454]/10"
                      : "group mt-5 inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#168AF2] px-8 text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(16,45,82,0.09)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0877D8] focus:outline-none focus:ring-4 focus:ring-[#173454]/10"
                  }
                >
                  {item.cta}
                  <ArrowRight size={18} strokeWidth={2.1} className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
