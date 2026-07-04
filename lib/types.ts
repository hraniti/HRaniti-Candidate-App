export type CareerTrack =
  | "ERP"
  | "Data & Analytics"
  | "AI / ML"
  | "Cloud / DevOps"
  | "Semiconductor & Embedded"
  | "Life Sciences & Pharma"
  | "Other Technology";

export const CAREER_TRACKS: CareerTrack[] = [
  "ERP",
  "Data & Analytics",
  "AI / ML",
  "Cloud / DevOps",
  "Semiconductor & Embedded",
  "Life Sciences & Pharma",
  "Other Technology",
];

export interface Education {
  degree: string;
  institution: string;
  field_of_study: string;
  graduation_year: string;
}

export interface Experience {
  company: string;
  title: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface Certification {
  name: string;
  provider: string;
  credential_id: string | null;
}

export interface AIConfidence {
  personal_info: number;
  professional_summary: number;
  experience: number;
  education: number;
  skills: number;
  certifications: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  professional_summary: string | null;
  career_track: CareerTrack | null;
  education: Education[] | null;
  experience: Experience[] | null;
  skills: string[] | null;
  certifications: Certification[] | null;
  ai_confidence: AIConfidence | null;
  current_company: string | null;
  current_designation: string | null;
  years_experience: string | null;
  current_location: string | null;
  resume_uploaded: boolean;
  preferences_completed: boolean;
  preferred_role: string | null;
  preferred_locations: string[] | null;
  open_to_international: string[] | null;
  work_preference: string[] | null;
  current_salary: number | null;
  expected_salary: number | null;
  salary_currency: string | null;
  notice_period: string | null;
  availability_status: string | null;
  visa_required: boolean | null;
  visa_status: string | null;
  show_profile_to_recruiters: boolean;
  allow_resume_download: boolean;
  show_assessments: boolean;
  allow_direct_contact: boolean;
  receive_match_alerts: boolean;
  checklist: Record<string, boolean> | null;
}
