import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";
export const runtime="nodejs";
function valid(hashValue:string,token:string){try{const expected=createHash("sha256").update(token).digest("hex");return timingSafeEqual(Buffer.from(expected),Buffer.from(token?expected:""));}catch{return false;}}
function esc(v:unknown){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]??c));}
export async function POST(request:Request){
 try{
  const body=await request.json(), interviewId=String(body.interviewId||""), token=String(body.token||""), response=String(body.response||""), note=String(body.note||"").trim();
  if(!interviewId||!token)return NextResponse.json({error:"This interview link is invalid."},{status:401});
  if(!["Confirmed","Reschedule requested","Declined"].includes(response))return NextResponse.json({error:"Invalid response."},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!service)return NextResponse.json({error:"Server configuration is incomplete."},{status:500});
  const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:invite}=await admin.from("interview_invitations").select("*").eq("interview_id",interviewId).eq("invite_type","Candidate").maybeSingle();
  if(!invite||new Date(invite.expires_at).getTime()<Date.now())return NextResponse.json({error:"This interview link is invalid or expired."},{status:401});
  const expected=hashToken(token);
  if(expected!==invite.token_hash)return NextResponse.json({error:"This interview link is invalid or expired."},{status:401});
  const {data:interview}=await admin.from("interview_requests").select("*").eq("id",interviewId).single();
  if(!interview)return NextResponse.json({error:"Interview not found."},{status:404});
  if(["Completed","Cancelled","Declined"].includes(String(interview.status)))return NextResponse.json({error:"This interview is no longer awaiting a candidate response."},{status:409});
  const now=new Date().toISOString();
  const nextStatus=response==="Confirmed"?"Confirmed":response;
  await admin.from("interview_requests").update({status:nextStatus,candidate_response:response,candidate_confirmed_at:response==="Confirmed"?now:null,notes:note?(interview.notes?interview.notes+"\n\n":"")+"Candidate: "+note:interview.notes}).eq("id",interviewId);
  await admin.from("interview_invitations").update({status:response==="Confirmed"?"Accepted":response==="Declined"?"Declined":"Reschedule requested",submitted_at:now,updated_at:now}).eq("id",invite.id);
  if(response==="Confirmed"&&process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL){
    const {data:app}=await admin.from("applications").select("user_id,job_id").eq("id",interview.application_id).single();
    const {data:job}=app?await admin.from("jobs").select("title,company_id").eq("id",app.job_id).single():{data:null};
    const {data:candidate}=app?await admin.from("profiles").select("full_name,email").eq("id",app.user_id).single():{data:null};
    const {data:company}=job?await admin.from("companies").select("name").eq("id",job.company_id).single():{data:null};
    const whenValue=interview.confirmed_time||interview.proposed_times?.[0];
    if(whenValue&&candidate?.email){
      const when=new Date(whenValue),tz=interview.timezone||"UTC";
      let display=when.toLocaleString("en-GB"); try{display=new Intl.DateTimeFormat("en-GB",{dateStyle:"full",timeStyle:"short",timeZone:tz}).format(when);}catch{}
      const html="<div style=\"max-width:620px;margin:32px auto;background:#fff;border:1px solid #e1e8e7;border-radius:18px;padding:36px;font-family:Arial,sans-serif;color:#173454\"><div style=\"font-weight:700;font-size:22px\">"+esc(company?.name||"HRaniti")+"</div><p>Thank you, "+esc(candidate.full_name||"Candidate")+". Your interview is confirmed.</p><p><strong>"+esc(job?.title||"Interview")+"</strong><br/>"+esc(display)+" · "+esc(tz)+"<br/>"+esc(String(interview.duration_minutes||60))+" minutes</p>"+(interview.meeting_link?"<p><a href=\""+esc(interview.meeting_link)+"\">Join "+esc(interview.meeting_provider||"meeting")+"</a></p>":"")+"<p>We look forward to speaking with you.</p></div>";
      await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"interview-confirmed#"+interviewId+"#"+invite.id},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[candidate.email],subject:"Interview confirmed — "+(job?.title||"your interview"),html}));
      for(const mins of (interview.reminder_minutes||[])){
        const scheduled=new Date(when.getTime()-Number(mins)*60000);
        if(scheduled.getTime()>Date.now()&&scheduled.getTime()<Date.now()+30*86400000){
          const label=Number(mins)>=1440?String(Math.round(Number(mins)/1440))+" day":Number(mins)>=60?String(Math.round(Number(mins)/60))+" hour":String(Number(mins))+" minutes";
          const reminderHtml="<p>Hello "+esc(candidate.full_name||"Candidate")+",</p><p>This is a reminder for your interview at "+esc(display)+".</p>"+(interview.meeting_link?"<p><a href=\""+esc(interview.meeting_link)+"\">Join meeting</a></p>":"");
          await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"interview-reminder#"+interviewId+"#"+mins},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[candidate.email],subject:"Reminder: interview in "+label+" — "+(job?.title||"your interview"),html:reminderHtml,scheduled_at:scheduled.toISOString(),tags:[{name:"category",value:"interview_reminder"},{name:"interview_id",value:interviewId}]} )});
        }
      }
    }
  }
  return NextResponse.json({ok:true,status:response});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to record response."},{status:500});}
}
function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}
