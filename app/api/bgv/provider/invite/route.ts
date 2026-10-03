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
function hashToken(token:string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({error:"Authentication required."},{status:401});
    const body = await request.json();
    const backgroundCheckId = String(body.backgroundCheckId||"");
    const providerName = String(body.providerName||"").trim();
    const email = String(body.email||"").trim().toLowerCase();
    const fullName = String(body.fullName||"").trim();
    if (!backgroundCheckId || !providerName || !email) return NextResponse.json({error:"Case, provider name and provider email are required."},{status:400});

    const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!url||!anon) return NextResponse.json({error:"Supabase configuration is incomplete."},{status:500});
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:userData,error:userError}=await userClient.auth.getUser();
    if(userError||!userData.user) return NextResponse.json({error:"Your session is no longer valid."},{status:401});

    const admin=adminClient();
    const {data:membership}=await admin.from("company_team_members").select("company_id,role,permissions,status").eq("user_id",userData.user.id).eq("status","Active").limit(1).maybeSingle();
    if(!membership?.company_id) return NextResponse.json({error:"You are not an active company member."},{status:403});
    const role=String(membership.role||"");
    const bgvLevel=membership.permissions?.bgv;
    if(!["Owner","Admin"].includes(role) && bgvLevel!=="initiate") return NextResponse.json({error:"You do not have permission to assign BGV provider access."},{status:403});

    const {data:check,error:checkError}=await admin.from("background_checks").select("id,company_id,candidate_name,provider_org_id").eq("id",backgroundCheckId).eq("company_id",membership.company_id).single();
    if(checkError||!check) return NextResponse.json({error:"BGV case not found."},{status:404});

    let orgId=check.provider_org_id as string|null;
    if(!orgId){
      const {data:existingOrg}=await admin.from("bgv_provider_organizations").select("id").ilike("name",providerName).limit(1).maybeSingle();
      if(existingOrg){
        orgId=existingOrg.id;
      } else {
        const {data:createdOrg,error:createdOrgError}=await admin.from("bgv_provider_organizations").insert({name:providerName}).select("id").single();
        if(createdOrgError||!createdOrg) return NextResponse.json({error:createdOrgError?.message||"Could not create provider organization."},{status:500});
        orgId=createdOrg.id;
      }
      await admin.from("background_checks").update({provider_org_id:orgId,provider_name:providerName,updated_at:new Date().toISOString()}).eq("id",check.id);
    } else {
      await admin.from("background_checks").update({provider_name:providerName,updated_at:new Date().toISOString()}).eq("id",check.id);
    }}