import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
function hashToken(token:string) { return createHash("sha256").update(token).digest("hex"); }
function esc(v:string){return v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({error:"Authentication required."},{status:401});
    const body = await request.json();
    const backgroundCheckId = String(body.backgroundCheckId||"");
    const action = String(body.action||"invite");
    const providerName = String(body.providerName||"").trim();
    const email = String(body.email||"").trim().toLowerCase();
    const fullName = String(body.fullName||"").trim();
    if (!backgroundCheckId) return NextResponse.json({error:"Case is required."},{status:400});
    if (action==="invite" && (!providerName || !email)) return NextResponse.json({error:"Provider name and provider email are required."},{status:400});
    if (action==="stop" && !String(body.reason||"").trim()) return NextResponse.json({error:"A stop reason is required."},{status:400});

    const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!url||!anon) return NextResponse.json({error:"Supabase configuration is incomplete."},{status:500});
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:userData,error:userError}=await userClient.auth.getUser();
    if(userError||!userData.user) return NextResponse.json({error:"Your session is no longer valid."},{status:401});

    const admin=adminClient();
    const {data:membership}=await admin.from("company_team_members").select("company_id,role,permissions,status").eq("user_id",userData.user.id).eq("status","Active").limit(1).maybeSingle();
    if(!membership?.company_id) return NextResponse.json({error:"You are not an active company member."},{status:403});
    const role=String(membership.role||""); const bgvLevel=membership.permissions?.bgv;
    if(!["Owner","Admin"].includes(role) && bgvLevel!=="initiate") return NextResponse.json({error:"You do not have permission to assign BGV provider access."},{status:403});

    if(action==="email"){
      const to=String(body.to||"").trim().toLowerCase(), subject=String(body.subject||"Background verification update").trim(), message=String(body.message||"").trim();
      if(!to||!message)return NextResponse.json({error:"Recipient and message are required."},{status:400});
      const {data:emailCheck,error:emailCheckError}=await admin.from("background_checks").select("id,company_id,candidate_name,verification_method").eq("id",backgroundCheckId).eq("company_id",membership.company_id).single();
      if(emailCheckError||!emailCheck)return NextResponse.json({error:"BGV case not found."},{status:404});
      if(emailCheck.verification_method!=="Internal")return NextResponse.json({error:"Candidate email is available from internal verification cases."},{status:400});
      if(!process.env.RESEND_API_KEY||!process.env.RESEND_FROM_EMAIL)return NextResponse.json({error:"Email sending is not configured yet."},{status:503});
      const safe=message.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br/>");
      const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[to],subject,html:`<p>Hello ${esc(emailCheck.candidate_name)},</p><p>${safe}</p><p>Regards,<br/>HRANITI</p>`})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)return NextResponse.json({error:result?.message||"Email provider rejected the message."},{status:502});
      await admin.from("background_check_events").insert({background_check_id:emailCheck.id,company_id:membership.company_id,actor_id:userData.user.id,event_type:"internal_bgv_email_sent",metadata:{to,subject,email_id:result?.id||null}});
      return NextResponse.json({ok:true,emailId:result?.id||null});
    }

    const {data:check,error:checkError}=await admin.from("background_checks").select("id,company_id,candidate_name,provider_org_id").eq("id",backgroundCheckId).eq("company_id",membership.company_id).single();
    if(action==="followup"){
      const {data:followCheck,error:followError}=await admin.from("background_checks").select("id,company_id,candidate_name,job_title,status,provider_name,provider_org_id,stop_request_status").eq("id",backgroundCheckId).eq("company_id",membership.company_id).single();
      if(followError||!followCheck)return NextResponse.json({error:"BGV case not found."},{status:404});
      if(followCheck.verification_method==="Internal")return NextResponse.json({error:"Provider follow-up is only available for external provider cases."},{status:400});
      if(["Clear","Completed","Cancelled"].includes(String(followCheck.status||"")))return NextResponse.json({error:"This verification is no longer active."},{status:400});
      if(!followCheck.provider_org_id)return NextResponse.json({error:"Connect the provider to this case before sending a follow-up."},{status:400});
      const {data:pm}=await admin.from("bgv_provider_members").select("email,full_name").eq("provider_org_id",followCheck.provider_org_id).eq("status","Active").not("email","is",null).limit(1).maybeSingle();
      if(!pm?.email)return NextResponse.json({error:"No active provider contact is available for this case."},{status:400});
      if(!process.env.RESEND_API_KEY||!process.env.RESEND_FROM_EMAIL)return NextResponse.json({error:"Email sending is not configured yet."},{status:503});
      const appUrl=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\\/$/,"");
      const html=`<p>Hello ${esc(pm.full_name||"")},</p><p>This is a follow-up on the background verification for <strong>${esc(followCheck.candidate_name)}</strong>.${followCheck.job_title?` The role is <strong>${esc(followCheck.job_title)}</strong>.`:""}</p><p>Please update the provider status, pending checks and expected completion date in the HRANITI provider portal.</p><p><a href="${appUrl}/provider/bgv">Open provider portal</a></p><p>Regards,<br/>HRANITI</p>`;
      const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[pm.email],subject:`BGV follow-up — ${followCheck.candidate_name}`,html})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)return NextResponse.json({error:result?.message||"Email provider rejected the follow-up."},{status:502});
      await admin.from("background_check_events").insert({background_check_id:followCheck.id,company_id:membership.company_id,actor_id:userData.user.id,event_type:"provider_followup_sent",metadata:{to:pm.email,email_id:result?.id||null}});
      return NextResponse.json({ok:true,emailSent:true,emailId:result?.id||null});
    }
    if(action==="stop"){
      const {data:stopCheck,error:stopError}=await admin.from("background_checks").select("id,company_id,candidate_name,status,verification_method,provider_org_id,stop_request_status").eq("id",backgroundCheckId).eq("company_id",membership.company_id).single();
      if(stopError||!stopCheck)return NextResponse.json({error:"BGV case not found."},{status:404});
      if(stopCheck.verification_method==="Internal")return NextResponse.json({error:"Internal verification does not need a provider stop request."},{status:400});
      if(["Clear","Completed","Cancelled"].includes(String(stopCheck.status||"")))return NextResponse.json({error:"This verification is no longer active."},{status:400});
      const reason=String(body.reason||"").trim(), now=new Date().toISOString();
      const {data:updated,error:updateError}=await admin.from("background_checks").update({stop_request_status:"Requested",stop_requested_at:now,stop_requested_by:userData.user.id,stop_reason:reason,updated_at:now,updated_by:userData.user.id}).eq("id",stopCheck.id).select("*").single();
      if(updateError)return NextResponse.json({error:updateError.message},{status:500});
      await admin.from("background_check_events").insert({background_check_id:stopCheck.id,company_id:membership.company_id,actor_id:userData.user.id,event_type:"provider_stop_requested",metadata:{reason}});
      let providerEmail:string|null=null;
      if(stopCheck.provider_org_id){const {data:pm}=await admin.from("bgv_provider_members").select("email").eq("provider_org_id",stopCheck.provider_org_id).eq("status","Active").not("email","is",null).limit(1).maybeSingle();providerEmail=pm?.email||null;}
      let emailSent=false;
      if(providerEmail&&process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL){
        const appUrl=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\\/$/,"");
        const html=`<p>Hello,</p><p>The employer has requested that the BGV provider stop verification for <strong>${esc(stopCheck.candidate_name)}</strong>.</p><p><strong>Reason:</strong> ${esc(reason)}</p><p>Please open the HRANITI provider portal and acknowledge the stop request.</p><p><a href="${appUrl}/provider/bgv">Open provider portal</a></p>`;
        const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[providerEmail],subject:"Stop BGV verification — action required",html})});
        emailSent=response.ok;
      }
      return NextResponse.json({ok:true,check:updated,emailSent});
    }
    if(checkError||!check) return NextResponse.json({error:"BGV case not found."},{status:404});

    let orgId=check.provider_org_id as string|null;
    if(!orgId){
      const {data:existingOrg}=await admin.from("bgv_provider_organizations").select("id").ilike("name",providerName).limit(1).maybeSingle();
      if(existingOrg) orgId=existingOrg.id;
      else {
        const {data:createdOrg,error:createdOrgError}=await admin.from("bgv_provider_organizations").insert({name:providerName}).select("id").single();
        if(createdOrgError||!createdOrg) return NextResponse.json({error:createdOrgError?.message||"Could not create provider organization."},{status:500});
        orgId=createdOrg.id;
      }
      await admin.from("background_checks").update({provider_org_id:orgId,provider_name:providerName,updated_at:new Date().toISOString()}).eq("id",check.id);
    } else {
      await admin.from("background_checks").update({provider_name:providerName,updated_at:new Date().toISOString()}).eq("id",check.id);
    }

    const token=randomBytes(32).toString("hex");
    const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
    const {error:inviteError}=await admin.from("bgv_provider_invites").insert({
      provider_org_id:orgId,company_id:membership.company_id,background_check_id:check.id,email,full_name:fullName||null,
      token_hash:hashToken(token),expires_at:expires,created_by:userData.user.id
    });
    if(inviteError) return NextResponse.json({error:inviteError.message},{status:500});

    const appUrl=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\/$/,"");
    const inviteUrl=appUrl+"/provider/accept?token="+token;
    let emailSent=false;
    if(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL){
      const html=`<p>Hello ${esc(fullName||"")},</p><p>You have been invited to access a background verification case for <strong>${esc(check.candidate_name)}</strong> in HRANITI.</p><p><a href="${inviteUrl}">Open secure provider access</a></p><p>This one-time link expires in 7 days.</p>`;
      const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[email],subject:"HRANITI BGV provider access",html})});
      emailSent=response.ok;
    }

    await admin.from("background_check_events").insert({
      background_check_id:check.id,company_id:membership.company_id,actor_id:userData.user.id,
      event_type:"provider_access_invited",metadata:{provider_name:providerName,email,email_sent:emailSent}
    });
    return NextResponse.json({ok:true,inviteUrl,emailSent});
  } catch(e:any) {
    return NextResponse.json({error:e?.message||"Could not create provider access."},{status:500});
  }
}