"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Globe2,
  Link2,
  Mail,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { INDUSTRIES, COMPANY_SIZES } from "@/lib/employerTypes";
import { COUNTRIES } from "@/lib/countries";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

const inputClass =
  "h-14 w-full rounded-xl border border-[#DDE5EA] bg-white px-4 text-[15px] text-[#173454] outline-none transition placeholder:text-[#9AABBA] focus:border-[#167D73] focus:ring-4 focus:ring-[#167D73]/10";

export default function CompanyInfoStep() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [location, setLocation] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/employer/signup");
        return;
      }

      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (data) {
        setCompanyName(data.name === "Untitled Company" ? "" : data.name ?? "");
        setWebsite(data.website ?? "");
        setIndustry(data.industry ?? "");
        setCompanySize(data.size ?? "");
        setCompanyEmail(data.business_email ?? "");
        setLocation(data.hq_location ?? "");
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setCountryOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter((country) => country.toLowerCase().includes(query));
  }, [countrySearch]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail.trim());
  const canContinue =
    companyName.trim().length > 1 &&
    website.trim().length > 3 &&
    industry.length > 0 &&
    companySize.length > 0 &&
    emailValid &&
    location.length > 0;

  async function handleContinue() {
    if (!canContinue) return;

    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/employer/signup");
      return;
    }

    const companyId = await getOrCreateCompanyId(supabase, user);
    const normalizedWebsite = /^https?:\/\//i.test(website.trim())
      ? website.trim()
      : `https://${website.trim()}`;

    const { error: saveError } = await supabase
      .from("companies")
      .update({
        name: companyName.trim(),
        website: normalizedWebsite,
        industry,
        size: companySize,
        business_email: companyEmail.trim().toLowerCase(),
        hq_location: location,
        onboarding_step: "done",
        onboarding_completed: true,
      })
      .eq("id", companyId);

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    router.push("/employer/dashboard");
  }

  if (loading) return null;

  return (
    <main className="min-h-screen bg-[#FCFCFA] text-[#173454]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 lg:grid-cols-[38%_62%]">
        <section className="relative flex min-h-[560px] flex-col border-b border-[#E4E9E8] px-7 py-8 sm:px-12 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-14 xl:px-20 xl:py-10">
          <Image
            src="/brand/hraniti-wordmark.svg"
            alt="HRaniti"
            width={215}
            height={48}
            priority
            className="h-auto w-[155px] sm:w-[175px]"
          />

          <div className="my-auto max-w-[430px] py-16 lg:py-20">
            <span className="inline-flex rounded-full bg-[#EAF3F2] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#167D73]">
              For employers
            </span>

            <h1 className="mt-7 text-[42px] font-medium leading-[1.08] tracking-[-0.045em] text-[#173454] sm:text-[48px] xl:text-[54px]">
              Build your
              <br />
              hiring workspace.
            </h1>

            <p className="mt-6 max-w-[390px] text-[16px] leading-7 text-[#71859A]">
              Tell us a little about your company. This helps us personalize your experience and connect you with the right talent.
            </p>

            <div className="mt-10 space-y-6">
              <Benefit icon={<Users size={20} strokeWidth={1.7} />} title="Access pre-vetted talent" text="Find the right people, faster." />
              <Benefit icon={<BriefcaseBusiness size={20} strokeWidth={1.7} />} title="Streamline your hiring" text="Less admin. More hiring." />
              <Benefit icon={<Building2 size={20} strokeWidth={1.7} />} title="A trusted partner" text="Built for modern teams." />
            </div>
          </div>
        </section>

        <section className="flex items-center px-7 py-12 sm:px-12 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-[850px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7890A0]">
              Set up your hiring profile
            </p>

            <h2 className="mt-5 text-[38px] font-medium leading-[1.08] tracking-[-0.045em] text-[#173454] sm:text-[46px]">
              Tell us about your company
            </h2>

            <p className="mt-4 max-w-[650px] text-[16px] leading-7 text-[#71859A]">
              These details help us set up your hiring workspace.
            </p>

            <div className="mt-11 grid grid-cols-1 gap-x-7 gap-y-7 sm:grid-cols-2">
              <FormField label="Company Name" required icon={<Building2 size={19} strokeWidth={1.7} />}>
                <input
                  className={inputClass}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Technologies"
                />
              </FormField>

              <FormField label="Company Website" required icon={<Link2 size={19} strokeWidth={1.7} />}>
                <input
                  className={inputClass}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.company.com"
                  inputMode="url"
                />
              </FormField>

              <FormField label="Industry" required icon={<BriefcaseBusiness size={19} strokeWidth={1.7} />}>
                <div className="relative">
                  <select
                    className={`${inputClass} appearance-none pr-11`}
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7890A0]" size={18} />
                </div>
              </FormField>

              <FormField label="Company Size" required icon={<Users size={19} strokeWidth={1.7} />}>
                <div className="relative">
                  <select
                    className={`${inputClass} appearance-none pr-11`}
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                  >
                    <option value="">Select company size</option>
                    {COMPANY_SIZES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7890A0]" size={18} />
                </div>
              </FormField>

              <FormField label="Company Email" required icon={<Mail size={19} strokeWidth={1.7} />}>
                <input
                  className={inputClass}
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="name@company.com"
                  inputMode="email"
                />
              </FormField>

              <FormField label="Location" required icon={<Globe2 size={19} strokeWidth={1.7} />}>
                <div className="relative" ref={countryRef}>
                  <button
                    type="button"
                    onClick={() => setCountryOpen((open) => !open)}
                    className={`${inputClass} flex items-center justify-between text-left ${location ? "text-[#173454]" : "text-[#9AABBA]"}`}
                    aria-haspopup="listbox"
                    aria-expanded={countryOpen}
                  >
                    <span>{location || "Search country..."}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-[#7890A0] transition-transform ${countryOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {countryOpen && (
                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[#DDE5EA] bg-white shadow-[0_18px_45px_rgba(23,52,84,0.12)]">
                      <div className="border-b border-[#E8EEF1] p-3">
                        <div className="relative">
                          <input
                            autoFocus
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search country..."
                            className="h-11 w-full rounded-lg border border-[#DDE5EA] bg-[#FCFCFA] px-3 text-[14px] text-[#173454] outline-none focus:border-[#167D73] focus:ring-4 focus:ring-[#167D73]/10"
                          />
                          {countrySearch && (
                            <button
                              type="button"
                              onClick={() => setCountrySearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7890A0]"
                              aria-label="Clear country search"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto p-1" role="listbox">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((country) => (
                            <button
                              type="button"
                              key={country}
                              role="option"
                              aria-selected={location === country}
                              onClick={() => {
                                setLocation(country);
                                setCountrySearch("");
                                setCountryOpen(false);
                              }}
                              className={`w-full rounded-lg px-3 py-2.5 text-left text-[14px] transition hover:bg-[#F1F7F6] ${location === country ? "bg-[#EAF3F2] font-medium text-[#167D73]" : "text-[#173454]"}`}
                            >
                              {country}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-8 text-center text-[14px] text-[#7890A0]">
                            No countries found.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </FormField>
            </div>

            {error && <p className="mt-6 text-sm text-[#B42318]">{error}</p>}

            <div className="mt-10 flex flex-col items-center">
              <button
                type="button"
                disabled={!canContinue || saving}
                onClick={handleContinue}
                className="group inline-flex h-14 w-full max-w-[390px] items-center justify-center gap-3 rounded-xl bg-[#167D73] px-7 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(22,125,115,0.16)] transition hover:-translate-y-0.5 hover:bg-[#126B63] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
              >
                {saving ? "Saving..." : "Continue"}
                {!saving && <ArrowRight size={18} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />}
              </button>
              <p className="mt-4 text-center text-[12px] text-[#8BA0B0]">
                You can update your company details anytime from Settings.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FormField({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2.5 flex items-center gap-2 text-[14px] font-medium text-[#173454]">
        <span className="text-[#5F7F98]">{icon}</span>
        {label}
        {required && <span className="text-[#D84B4B]">*</span>}
      </span>
      {children}
    </label>
  );
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0F5F4] text-[#167D73]">
        {icon}
      </span>
      <div>
        <p className="text-[14px] font-medium text-[#173454]">{title}</p>
        <p className="mt-1 text-[13px] text-[#7890A0]">{text}</p>
      </div>
    </div>
  );
}
