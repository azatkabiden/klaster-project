import { getPublicEnv, getServerEnv } from "@/lib/env";

export function getReadModelRuntimeAvailability() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  return {
    hasProgramRuntime: Boolean(publicEnv.heliusRpcUrl && publicEnv.programId),
    hasSupabaseReadRuntime: Boolean(
      publicEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey,
    ),
    publicEnv,
  };
}
