import { createClient } from "@supabase/supabase-js";

// Server-side client with service role (bypasses RLS) — server only
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Public bucket name
export const STORAGE_BUCKET = "rag-as-a-service";
