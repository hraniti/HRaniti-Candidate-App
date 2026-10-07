import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function serverAuth(){const c=cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>c.getAll(),setAll:()=>{}}});}
function admin(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});}

export async function GET(){
 const auth=serverAuth(),{data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const db=admin();
 const {data:member}=await db.from("bgv_provider_members").select("provider_org_id,full_name,email,role").eq("user_id",user.id).eq("status","Active").maybeSingle();
 if(!member)return NextResponse.json({error:"Provider access is not configured."},{status:403});
 const {data:cases,error}=await db.from("bgv_provider_cases").select("id,background_check_id,company_id,status,background_checks(*)").eq("provider_org_id",member.provider_org_id).eq("status","Active").order("assigned_at",{ascending:false});
 if(error)return NextResponse.json({error:error.message},{status:500});
 const checkIds=(cases||[]).map((x:any)=>x.background_check_id);
 const {data:items}=checkIds.length?await db.from("background_check_items").select("id,background_check_id,check_type,status,provider,result_summary,reviewer_note,completed_at,unable_to_proceed_reason").in("background_check_id",checkIds):{data:[]};
 return NextResponse.json({member,cases:cases||[],items:items||[]});
}