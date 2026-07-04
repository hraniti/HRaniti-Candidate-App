import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase instance. Safe to use in "use client" components.
// NEXT_PUBLIC_* vars are exposed to the browser by design — the anon key
// is meant to be public as long as Row Level Security policies are on
// (see supabase/schema.sql).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
