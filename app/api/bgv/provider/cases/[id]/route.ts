import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function serverAuth(){const c=cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>c.getAll(),setAll:()=>{}}});}
function admin(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});}

export async function PATCH(request:Request,{params}:{params:{id:string}}){
 const auth=serverAuth(),{data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const db=admin();
 const {data:member}=await db.from("bgv_provider_members").select("provider_org_id").eq("user_id",user.id).eq("status","Active").maybeSingle();
 if(!member)return NextResponse.json({error:"Provider access is not configured."},{status:403});
 const {data:link}=await db.from("bgv_provider_cases").select("background_check_id,company_id").eq("id",params.id).eq("provider_org_id",member.provider_org_id).eq("status","Active").maybeSingle();
 if(!link)return NextResponse.json({error:"Case not found."},{status:404});
 const body=await request.json(); const now=new Date().toISOString();
 const {data:current}=await db.from("background_checks").select("*").eq("id",link.background_check_id).single();
 if(!current)return NextResponse.json({error:"Case not found."},{status:404});

 const patch:any={last_provider_update_at:now,updated_at:now,updated_by:user.id};
 if(body.providerStatus!==undefined)patch.provider_status=String(body.providerStatus||"").trim()||null;
 if(body.status!==undefined)patch.status=String(body.status);
 if(body.reportUrl!==undefined)patch.report_url=String(body.reportUrl||"").trim()||null;
 if(body.reportReceivedAt!==undefined)patch.report_received_at=body.reportReceivedAt||null;
 if(body.completedAt!==undefined)patch.completed_at=body.completedAt||null;
 if(body.overallNote!==undefined)patch.overall_note=String(body.overallNote||"").trim()||null;
 if(body.consentStatus!==undefined){patch.consent_status=String(body.consentStatus||"Not requested");patch.consent_at=body.consentAt||((String(body.consentStatus)==="Granted")?now:null);}
 if(body.unableToProceedReason!==undefined)patch.unable_to_proceed_reason=String(body.unableToProceedReason||"").trim()||null;

 const acknowledgingStop=body.stopRequestStatus==="Acknowledged";
 if(acknowledgingStop){
   if(current.stop_request_status!=="Requested")return NextResponse.json({error:"There is no pending employer stop request."},{status:400});
   patch.stop_request_status="Acknowledged";
   patch.stopped_at=now;
   patch.stopped_by=user.id;
   patch.status="Cancelled";
   patch.provider_status="Stopped";
 }

 if(patch.status==="Unable to proceed" && !String(patch.unable_to_proceed_reason||current.unable_to_proceed_reason||"").trim())
   return NextResponse.json({error:"Enter the reason the verification cannot proceed."},{status:400});

 const {data:check,error}=await db.from("background_checks").update(patch).eq("id",link.background_check_id).select("*").single();
 if(error||!check)return NextResponse.json({error:error?.message||"Could not update case."},{status:500});

 if(Array.isArray(body.items)){
  for(const item of body.items){
   if(String(item.status||"") === "Unable to verify" && !String(item.unableToProceedReason||"").trim())
     return NextResponse.json({error:"Enter the reason this check cannot be verified."},{status:400});
   if(item.id){
    await db.from("background_check_items").update({
      status:String(item.status||"Pending"),result_summary:String(item.resultSummary||"").trim()||null,
      reviewer_note:String(item.reviewerNote||"").trim()||null,
      unable_to_proceed_reason:String(item.unableToProceedReason||"").trim()||null,
      completed_at:item.completedAt||null,updated_at:now
    }).eq("id",item.id).eq("background_check_id",check.id).eq("company_id",link.company_id);
   }
  }
 }
 if(Array.isArray(body.newItems)){
  for(const item of body.newItems){
   const type=String(item.checkType||"").trim();
   if(type) await db.from("background_check_items").insert({background_check_id:check.id,company_id:link.company_id,check_type:type,status:String(item.status||"Pending"),provider:check.provider_name,requested_at:now});
  }
 }

 await db.from("background_check_events").insert({
   background_check_id:check.id,company_id:link.company_id,actor_id:user.id,
   event_type:acknowledgingStop?"provider_stop_acknowledged":"provider_case_updated",
   metadata:{
     provider_status:patch.provider_status||null,status:patch.status||null,consent_status:patch.consent_status||null,
     unable_to_proceed_reason:patch.unable_to_proceed_reason||null,stop_acknowledged:acknowledgingStop,
     report_url_changed:body.reportUrl!==undefined,items_updated:Array.isArray(body.items)?body.items.length:0,new_items:Array.isArray(body.newItems)?body.newItems.length:0
   }
 });
 return NextResponse.json({ok:true,check});
}