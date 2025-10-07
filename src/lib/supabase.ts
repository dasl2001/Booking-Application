import { createClient } from "@supabase/supabase-js";
export function supa(jwt?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} } }
  );
}
