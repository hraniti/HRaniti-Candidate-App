import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/signup", "/login", "/verify", "/api", "/r/", "/employer/signup", "/auth"];
const FREELANCER_ALLOWED_PATHS = [
  "/freelancer/dashboard", "/freelancer/submissions", "/freelancer/hires",
  "/freelancer/invoices", "/freelancer/profile",
  "/employer/jobs", "/employer/applicants", "/employer/talent-pool",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    }}
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p)) || path === "/";
  if (!user && !isPublic) {
    const url = request.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (user && (path.startsWith("/employer") || path.startsWith("/freelancer"))) {
    const { data: memberships, error } = await supabase.from("company_team_members").select("role,status").eq("user_id", user.id);
    if (error) {
      if (path.startsWith("/freelancer")) { const url = request.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("access","unavailable"); return NextResponse.redirect(url); }
      return response;
    }
    const activeFreelancer = (memberships || []).some((m) => m.role === "Freelance Recruiter" && !["Suspended","Disabled","Inactive"].includes(m.status || ""));
    if (activeFreelancer) {
      const allowed = FREELANCER_ALLOWED_PATHS.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
      if (!allowed) { const url = request.nextUrl.clone(); url.pathname = "/freelancer/dashboard"; url.search = ""; return NextResponse.redirect(url); }
    } else if (path.startsWith("/freelancer")) {
      const url = request.nextUrl.clone(); url.pathname = "/employer/dashboard"; url.search = ""; return NextResponse.redirect(url);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
