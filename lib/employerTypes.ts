// Employer-side types & constants. Kept separate from lib/types.ts (candidate
// side) so the two apps can evolve independently without merge conflicts.

export const INDUSTRIES = [
  "IT",
  "Healthcare",
  "Manufacturing",
  "Finance",
  "Education",
  "Retail",
  "Consulting",
  "Other",
];

export const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "501–1000", "1000+"];

export const HIRING_LOCATIONS = ["India", "USA", "Germany", "Sweden", "UAE", "Other"];

export const PERK_CATEGORIES: Record<string, string[]> = {
  "Work Flexibility": ["Flexible Hours", "Work From Home", "Remote First", "4-Day Work Week"],
  "Health & Wellness": [
    "Health Insurance",
    "Wellness Programs",
    "Gym Membership",
    "Mental Health Support",
  ],
  Financial: ["Annual Bonus", "Stock Options", "ESOPs", "Performance Bonus"],
  Learning: ["Learning Budget", "Certification Reimbursement", "Conference Attendance"],
  "Family & Relocation": ["Visa Sponsorship", "Relocation Assistance", "Childcare Support"],
  Lifestyle: ["Free Meals", "Commuter Benefits", "Company Events"],
};

export const CERTIFICATION_CATEGORIES: Record<string, string[]> = {
  "Workplace Awards": ["Great Place to Work", "Best Place to Work", "Top Employer"],
  "Technical Certifications": [
    "ISO Certified",
    "Microsoft Partner",
    "SAP Partner",
    "AWS Partner",
    "Google Cloud Partner",
  ],
  Rankings: ["Fortune 500", "Forbes Top Employer", "Inc. 5000"],
};

export const ONBOARDING_STEPS = [
  { key: "company", label: "Company Info", path: "/employer/onboarding/company" },
  { key: "contact", label: "Contact", path: "/employer/onboarding/contact" },
  { key: "branding", label: "Branding", path: "/employer/onboarding/branding" },
  { key: "perks", label: "Perks", path: "/employer/onboarding/perks" },
  { key: "certifications", label: "Certifications", path: "/employer/onboarding/certifications" },
  { key: "verify", label: "Verify", path: "/employer/onboarding/verify" },
];

export interface Company {
  id: string;
  name: string | null;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  hq_location: string | null;
  locations: string[];
  description: string | null;
  timezone: string | null;

  culture: string | null;
  benefits: string | null;
  tagline: string | null;
  office_photo_urls: string[];
  intro_video_url: string | null;

  primary_hr_contact_name: string | null;
  recruiter_name: string | null;
  business_email: string | null;
  business_phone: string | null;

  business_registration_number: string | null;
  gst_vat_number: string | null;
  linkedin_company_url: string | null;
  domain_verified: boolean;
  verification_tier: "none" | "auto" | "dns" | "manual";

  perks: string[];
  certifications: string[];

  plan: "Free" | "Growth" | "Enterprise";
  onboarding_step: string;
  onboarding_completed: boolean;
}

export interface EmployerProfile {
  id: string;
  company_id: string;
  full_name: string | null;
  role: string | null;
}
