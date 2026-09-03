export type CareerTrack =
  | "ERP"
  | "AI / ML"
  | "Data & Analytics"
  | "Cloud / DevOps"
  | "Semiconductor & Embedded"
  | "Life Sciences & Pharma"
  | "Other Technology";

export const CAREER_TRACKS: CareerTrack[] = [
  "ERP",
  "AI / ML",
  "Data & Analytics",
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
  min_experience_years: number;
  reward_tier: "Entry" | "Mid" | "Senior" | "Leadership" | null;
  reward_amount_inr: number | null;
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

export type AssessmentType = "AI Interview";

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

// --- Phase 4: Interview Hub --------------------------------------------------

export interface AIInterviewQuestion {
  id: string;
  question: string;
  followUp: string;
  category: "Resume" | "Technical" | "Behavioural" | "Situational";
}

export interface AIInterviewTranscriptEntry {
  questionId: string;
  question: string;
  followUp: string;
  answer: string; // combined transcript of main + follow-up response
  videoUrl: string | null;
  skipped: boolean;
}

export interface AIInterviewScores {
  overall: number;
  technical: number;
  behavioural: number;
  communication: number;
  specificity: number;
}

export interface AIInterviewReport {
  status: "in_progress" | "completed";
  questions: AIInterviewQuestion[];
  transcript: AIInterviewTranscriptEntry[];
  scores: AIInterviewScores | null;
  notes: { questionId: string; observation: string }[] | null;
  attempt_number: number;
}

export interface AssessmentResultFull extends AssessmentResult {
  tier: null; // kept for backward shape-compat, unused in the new model
  report: AIInterviewReport;
  language: null;
  career_track: string | null;
}

export interface MockInterviewResult {
  id: string;
  user_id: string;
  interview_types: string[];
  job_description: string | null;
  company_name: string | null;
  language: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  status: "In Progress" | "Completed" | "Abandoned";
  score: number | null;
  duration_seconds: number | null;
  questions: { question: string; type: string }[];
  transcript: { question: string; answer: string; skipped: boolean }[];
  feedback: MockInterviewFeedback | null;
  proctoring_flags: { tab_switches: number; copy_paste_events: number };
  created_at: string;
  completed_at: string | null;
}

export interface MockInterviewFeedback {
  overall_score: number;
  breakdown: Record<string, number>;
  per_question: { question: string; strong: string; weak: string; suggestion: string }[];
  resources: string[];
}

export type QuestionType = "Technical" | "Behavioural" | "Language" | "Cultural" | "Case";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface QuestionBankItem {
  id: string;
  type: QuestionType;
  question_text: string;
  difficulty: Difficulty;
  category: string;
  model_answer: string | null;
  created_at: string;
}

export interface SavedPitch {
  id: string;
  user_id: string;
  video_url: string;
  score: number | null;
  ai_feedback: PitchFeedback | null;
  status: "Saved" | "Shared with Employers" | "Draft";
  created_at: string;
}

export interface PitchFeedback {
  positives: string[];
  improvements: string[];
  tips: string[];
  score: number;
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
  subscription_tier: "free" | "paid";
  current_video_pitch_url: string | null;

  // Phase 5 additions
  network_connections_count: number;
  lifetime_referral_earnings: number;
  pending_referral_earnings: number;
  referral_agreement_accepted_at: string | null;
  leaderboard_opt_in: boolean;
}

// --- Phase 5: Referral Rewards ------------------------------------------------

export type RewardTier = "Entry" | "Mid" | "Senior" | "Leadership";

export type ReferralStatus =
  | "Shared"
  | "Registered"
  | "Applied"
  | "Interviewing"
  | "Offer"
  | "Joined"
  | "Payment Processing"
  | "Paid"
  | "Rejected"
  | "Disputed";

export type ReferralType = "general" | "role_specific" | "network_import" | "resume_upload" | "existing_candidate";

export type TrustedReferrerLevel = "Bronze" | "Silver" | "Gold" | "Platinum" | "None";

export interface Referral {
  id: string;
  referrer_id: string;
  job_id: string | null;
  candidate_email: string;
  candidate_name: string | null;
  candidate_phone: string | null;
  candidate_linkedin: string | null;
  candidate_current_role: string | null;
  referral_type: ReferralType;
  slug: string;
  status: ReferralStatus;
  candidate_user_id: string | null;
  application_id: string | null;
  reward_tier: RewardTier | null;
  reward_amount_inr: number | null;
  recommendation_note: string | null;
  agreement_accepted_at: string | null;
  joined_date: string | null;
  expected_payment_date: string | null;
  paid_at: string | null;
  dispute_reason: string | null;
  created_at: string;
  expires_at: string;
  updated_at: string;
  job?: Job;
}

export interface ImportedContact {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  candidate_role: string | null;
  matched_job_ids: string[];
  created_at: string;
}

export interface ReferralPaymentMethod {
  id: string;
  user_id: string;
  method_type: "upi" | "bank";
  upi_id: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_account_holder_name: string | null;
  is_default: boolean;
  created_at: string;
}

export interface ReferralPayment {
  id: string;
  referral_id: string;
  user_id: string;
  amount_inr: number;
  currency: string;
  base_amount_inr: number | null;
  method_type: string | null;
  transaction_id: string | null;
  status: "pending" | "processing" | "paid" | "failed";
  paid_at: string | null;
  receipt_url: string | null;
  created_at: string;
  referral?: Referral;
}

export interface ReferralKYC {
  id: string;
  user_id: string;
  status: "not_required" | "pending" | "verified" | "rejected";
  id_document_url: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
}

export type ReferralBadgeKey = "first_referral" | "first_hire" | "50k_club" | "1l_club" | "top_referrer";

export interface ReferralBadgeRow {
  id: string;
  user_id: string;
  badge: ReferralBadgeKey;
  earned_at: string;
}
