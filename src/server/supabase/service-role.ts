import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";

function requireValue(value: string, label: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${label}.`);
  }

  return value;
}

export function createSupabaseServiceRoleClient() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  return createClient(
    requireValue(publicEnv.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    requireValue(serverEnv.supabaseServiceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
