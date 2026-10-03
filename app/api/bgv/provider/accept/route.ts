import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}
function admin(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Supabase server configuration is incomplete.");return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});}

export async function POST(request:Request){
 try{
  const {token,password,fullName}=await request.json();
  if(typeof token!=="string"||typeof password!=="string"||password.length<8)return NextResponse.json({error:"Use the invitation link and choose a password with at least 8 characters."},{status:400});
  const db=admin();
  const {data:invite,error}=await db.from("bgv_provider_invites").select("*").eq("token_hash",hashToken(token)).is("used_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(error||!invite)return NextResponse.json({error:"This invitation is invalid, expired or already used."},{status:410});
  const {data:userData,error:userError}=await db.auth.admin.createUser({email:invite.email,password,email_confirm:true,user_metadata:{account_type:"bgv_provider"}});
  if(userError||!userData.user){
    return NextResponse.json({error:userError?.message?.toLowerCase().includes("already")?"An account already exists for this email. Please sign in at the provider portal.":userError?.message||"Could not create provider account."},{status:409});
  }
  await db.from("bgv_provider_members").insert({provider_org_id:invite.provider_org_id,user_id:userData.user.id,full_name:String(fullName||invite.full_name||"").trim()||null,email:invite.email,role:"Provider",status:"Active"});
  await db.from("bgv_provider_invites").update({used_at:new Date().toISOString()}).eq("id",invite.id);
  return NextResponse.json({ok:true,email:invite.email});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not create provider account."},{status:500});}
}