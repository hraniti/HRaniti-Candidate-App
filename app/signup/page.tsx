"use client";

import { ArrowRight } from "lucide-react";

const options = [
  {
    eyebrow: "FOR EMPLOYERS",
    title: "Your next great hire starts here.",
    description: "Find, evaluate and connect with top talent — faster, smarter and simpler.",
    cta: "Hire Talent",
    href: "/employer/signup",
    image: "/signup/employer-hero.webp",
    alt: "Professional woman reviewing talent profiles at her desk",
    tone: "employer",
  },
  {
    eyebrow: "FOR TALENT",
    title: "Your next chapter starts here.",
    description: "Discover opportunities that match your skills, goals and potential.",
    cta: "Explore Opportunities",
    href: "/talent/signup",
    image: "/signup/talent-hero.webp",
    alt: "Professional woman exploring career opportunities",
    tone: "talent",
  },
] as const;

export default function WelcomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FCFCFA] text-[#173454]">
      <header className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-7 py-7 sm:px-10 lg:px-14 xl:px-20">
        <img
          src="/brand/hraniti-wordmark.svg"
          alt="HRaniti — Where change begins"
          className="h-auto w-[170px] sm:w-[190px] lg:w-[205px]"
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

      <section className="mx-auto grid w-full max-w-[1600px] grid-cols-1 lg:grid-cols-2">
        {options.map((item, index) => (
          <div
            key={item.cta}
            className={index === 0 ? "flex min-h-[calc(100vh-105px)] flex-col items-center border-b border-[#E4E9E8] px-7 pb-12 pt-5 text-center sm:px-12 lg:border-b-0 lg:border-r lg:px-12 xl:px-20" : "flex min-h-[calc(100vh-105px)] flex-col items-center px-7 pb-12 pt-5 text-center sm:px-12 lg:px-12 xl:px-20"}
          >
            <div className="flex w-full max-w-[650px] flex-1 flex-col items-center justify-center">
              <div className="relative w-full max-w-[620px] overflow-hidden rounded-[30%_30%_25%_25%] bg-white shadow-[0_18px_55px_rgba(35,61,83,0.06)]">
                <div className="aspect-[1.68/1]">
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="mt-7 max-w-[610px]">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7890A0]">
                  {item.eyebrow}
                </p>

                <h1 className="mx-auto max-w-[590px] text-[37px] font-medium leading-[1.13] tracking-[-0.045em] text-[#173454] sm:text-[45px] lg:text-[46px] xl:text-[50px]">
                  {item.title}
                </h1>

                <p className="mx-auto mt-5 max-w-[500px] text-[16px] leading-7 text-[#71859A] sm:text-[17px]">
                  {item.description}
                </p>

                <a
                  href={item.href}
                  className={item.tone === "employer" ? "group mt-7 inline-flex min-h-[58px] items-center justify-center gap-3 rounded-full bg-[#167D73] px-9 text-[15px] font-semibold text-white shadow-[0_10px_25px_rgba(16,45,82,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#126B63] focus:outline-none focus:ring-4 focus:ring-[#173454]/10" : "group mt-7 inline-flex min-h-[58px] items-center justify-center gap-3 rounded-full bg-[#168AF2] px-9 text-[15px] font-semibold text-white shadow-[0_10px_25px_rgba(16,45,82,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0877D8] focus:outline-none focus:ring-4 focus:ring-[#173454]/10"}
                >
                  {item.cta}
                  <ArrowRight size={18} strokeWidth={2.1} className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="pb-6 text-center text-[10px] tracking-[0.08em] text-[#A2AFBA] sm:pb-4">
        A simpler way to connect people and opportunity.
      </div>
    </main>
  );
}
