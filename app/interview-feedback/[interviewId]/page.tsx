import {createClient} from "@supabase/supabase-js";
import {createHash} from "crypto";
import ExternalFeedback from "./ExternalFeedback";
export const dynamic="force-dynamic";
function hash(v:string){return createHash("sha256").update(v).digest("hex");}
export default async function Page({params,searchParams}:{params:{interviewId:string},searchParams:{token?:string}}){
 const id=params.interviewId,token=searchParams?.token||"",url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!service)return <main className="p-8">Feedback service is not configured.</main>;
 const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:invite}=await admin.from("interview_invitations").select("*").eq("interview_id",id).eq("invite_type","External").maybeSingle();
 if(!invite||new Date(invite.expires_at).getTime()<Date.now()||hash(token)!==invite.token_hash)return <main className="min-h-screen bg-[#FCFCFA] flex items-center justify-center p-6"><div className="rounded-2xl border border-[#DDE5EA] bg-white p-8 text-center"><h1 className="text-xl font-semibold text-[#173454]">Feedback link unavailable</h1><p className="mt-2 text-sm text-[#71859A]">This secure link is invalid or expired.</p></div></main>;
 const {data:interview}=await admin.from("interview_requests").select("*").eq("id",id).single();
 if(!interview)return <main className="p-8">Interview not found.</main>;
 const {data:app}=await admin.from("applications").select("job_id,user_id").eq("id",interview.application_id).single();
 const {data:job}=app?await admin.from("jobs").select("title,company_id").eq("id",app.job_id).single():{data:null};
 const {data:candidate}=app?await admin.from("profiles").select("full_name").eq("id",app.user_id).single():{data:null};
 const {data:company}=job?await admin.from("companies").select("name").eq("id",job.company_id).single():{data:null};
 const criteria=Array.isArray(interview.scorecard_criteria)?interview.scorecard_criteria:[];
 return <main className="min-h-screen bg-[#FCFCFA] py-8 px-4 sm:py-12"><div className="mx-auto max-w-2xl"><div className="overflow-hidden rounded-2xl border border-[#DDE5EA] bg-white shadow-sm"><div className="border-b border-[#E6ECEF] px-6 py-6 sm:px-10"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#167D73]">{company?.name||"HRaniti"}</p><h1 className="mt-2 text-2xl font-semibold text-[#173454]">Interview feedback</h1><p className="mt-1 text-sm text-[#71859A]">{invite.name||"Interviewer"} · {candidate?.full_name||"Candidate"} · {job?.title||"Role"}</p></div><div className="px-6 py-7 sm:px-10"><ExternalFeedback interviewId={id} token={token} criteria={criteria}/></div></div></div></main>;
}
