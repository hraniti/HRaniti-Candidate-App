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
 const body=await request.json();
 const now=new Date().toISOString();
 const patch:any={last_provider_update_at:now,updated_at:now,updated_by:user.id};
 if(body.providerStatus!==undefined)patch.provider_status=String(body.providerStatus||"").trim()||null;
 if(body.status!==undefined)patch.status=String(body.status);
 if(body.reportUrl!==undefined)patch.report_url=String(body.reportUrl||"").trim()||null;
 if(body.reportReceivedAt!==undefined)patch.report_received_at=body.reportReceivedAt||null;
 if(body.completedAt!==undefined)patch.completed_at=body.completedAt||null;
 if(body.overallNote!==undefined)patch.overall_note=String(body.overallNote||"").trim()||null;
 const {data:check,error}=await db.from("background_checks").update(patch).eq("id",link.background_check_id).select("*").single();
 if(error||!check)return NextResponse.json({error:error?.message||"Could not update case."},{status:500});
 if(Array.isArray(body.items)){
  for(const item of body.items){
   if(!item.id)continue;
   await db.from("background_check_items").update({status:String(item.status||"Pending"),result_summary:String(item.resultSummary||"").trim()||null,reviewer_note:String(item.reviewerNote||"").trim()||null,completed_at:item.completedAt||null,updated_at:now}).eq("id",item.id).eq("background_check_id",check.id).eq("company_id",link.company_id);
  }
 }
 await db.from("background_check_events").insert({background_check_id:check.id,company_id:link.company_id,actor_id:user.id,event_type:"provider_case_updated",metadata:{provider_status:patch.provider_status||null,status:patch.status||null,report_url_changed:body.reportUrl!==undefined,items_updated:Array.isArray(body.items)?body.items.length:0}});
 return NextResponse.json({ok:true,check});
}