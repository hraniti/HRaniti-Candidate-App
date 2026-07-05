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
  end_date: string; // "Present" for ongoing roles
  description: string;
  key_impact?: string;
}

export interface Certification {
  name: string;
  provider: string;
  credential_id: string | null;
  certificate_url?: string | null;
}

export type SkillCategory = "Technical" | "Functional" | "Soft Skills" | "Languages";

export interface SkillDetail {
  name: string;
  category: SkillCategory;
  proficiency: number; // 1-5 stars
  last_used: string; // year, or "Current"
  primary: boolean;
}

export interface LanguageEntry {
  name: string;
  proficiency: "Beginner" | "Intermediate" | "Professional" | "Native" | "Review Required";
}

// --- Phase 3: Jobs / Career Opportunities -----------------------------------

export interface HiringTeamMember {
  name: string;
  role: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  career_track: string;
  skills: string[];
  applicant_count: number;
  created_at: string;
  description: string;
  employment_type: "Full-time" | "Contract" | "Freelance";
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  work_mode: "Remote" | "Hybrid" | "On-site";
  visa_sponsorship: boolean;
  urgent_hiring: boolean;
  required_skills: string[];
  preferred_skills: string[];
  nice_to_have_skills: string[];
  company_description: string;
  industry: string;
  company_size: string;
  locations: string[];
  website: string;
  perks: string[];
  hiring_team: HiringTeamMember[] | null;
  expected_review_timeline: string;
  referral_slug: string | null;
  notice_period_required: string | null;
}

export type ApplicationStatus =
  | "Applied"
  | "Interview Scheduled"
  | "Offer"
  | "Rejected"
  | "Withdrawn"
  | "Archived";

export const EMPLOYER_FEEDBACK_OPTIONS = [
  "Missing Certification",
  "Salary mismatch",
  "Location mismatch",
  "Notice period",
  "Communication",
  "Technical Skill",
  "Language",
  "Travel",
] as const;

export interface AIMatchSummary {
  highlights: string[];
  matched_skills: number;
  total_skills: number;
  confidence: number;
  data_quality: string;
  resume_parsed: number;
}

export interface InterviewCheatSheet {
  note: string;
  generated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_at: string;
  application_quality_score: number | null;
  employer_feedback: (typeof EMPLOYER_FEEDBACK_OPTIONS)[number] | null;
  next_step: string;
  expected_timeline: string | null;
  ai_match_summary: AIMatchSummary | null;
  interview_cheat_sheet: InterviewCheatSheet | null;
  withdrawn_at: string | null;
  updated_at: string;
  job?: Job;
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  saved_at: string;
  job?: Job;
}

export type AssessmentType = "AI Interview" | "Domain" | "Language" | "Coding Arena";

export interface AssessmentResult {
  id: string;
  user_id: string;
  assessment_type: AssessmentType;
  score: number;
  passed: boolean;
  completed_at: string;
  valid_until: string | null;
  cooldown_until: string | null;
}

export interface RecentJobView {
  id: string;
  title: string;
  viewed_at: string;
}

export interface AIConfidence {
  personal_info: number;
  professional_summary: number;
  experience: number;
  education: number;
  skills: number;
  certifications: number;
}

export interface AISnapshot {
  professional_summary?: string;
  experience?: Experience[];
  skills?: string[];
  certifications?: Certification[];
  education?: Education[];
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
  last_resume_upload_at: string | null;
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

  // Phase 2 additions
  skills_detail: SkillDetail[] | null;
  ai_snapshot: AISnapshot | null;
  ai_updated_at: string | null;
  preferred_industries: string[] | null;
  preferred_employment_type: string[] | null;
  open_to_buyout: boolean;
  travel_willingness: "Yes" | "No" | "Conditional" | null;
  travel_percent: number | null;
  international_opportunities_enabled: boolean;
  nationality: string | null;
  visa_expiry_date: string | null;
  current_country: string | null;
  state_province: string | null;
  city: string | null;
  languages: LanguageEntry[] | null;
  profile_visibility: "Public" | "Private" | "Only to Employers I Apply To";
  show_video_pitch: boolean;
  blocked_employers: string[] | null;
  sms_notifications: boolean;
  profile_slug: string | null;
  signup_provider: string | null;
  deletion_requested_at: string | null;
  updated_at: string | null;
  created_at: string | null;

  // Phase 3 additions
  auto_match_enabled: boolean;
  digest_frequency: "Instant" | "Daily" | "Weekly" | "Off";
  profile_photo_consent: boolean;
  recent_job_views: RecentJobView[] | null;
}
