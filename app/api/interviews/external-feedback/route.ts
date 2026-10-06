import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {createHash} from "crypto";
export const runtime="nodejs";
function hash(v:string){return createHash("sha256").update(v).digest("hex");}
export async function POST(request:Request){
 try{
  const {interviewId,token,ratings,recommendation,strengths,concerns,notes}=await request.json();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!service)return NextResponse.json({error:"Server configuration is incomplete."},{status:500});
  const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:invite}=await admin.from("interview_invitations").select("*").eq("interview_id",interviewId).eq("invite_type","External").maybeSingle();
  if(!invite||new Date(invite.expires_at).getTime()<Date.now()||hash(String(token||""))!==invite.token_hash)return NextResponse.json({error:"This feedback link is invalid or expired."},{status:401});
  const {data:interview}=await admin.from("interview_requests").select("id,status").eq("id",interviewId).single();
  if(!interview)return NextResponse.json({error:"Interview not found."},{status:404});
  const {error}=await admin.from("interview_feedback").insert({interview_id:interview.id,company_id:invite.company_id,interviewer_id:null,ratings:ratings||{},overall_recommendation:recommendation||null,strengths:strengths||null,concerns:concerns||null,notes:("External interviewer: "+String(invite.name||"Interviewer")+" <"+String(invite.email||"")+">\n"+String(notes||"")).trim()});
  if(error)return NextResponse.json({error:error.message},{status:500});
  await admin.from("interview_invitations").update({status:"Submitted",submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",invite.id);
  return NextResponse.json({ok:true});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to submit feedback."},{status:500});}
}
