import { getPublicEnv, getServerEnv } from "@/lib/env";

export type WalletAuthMode = "demo" | "live";

export function hasSupabaseServiceRoleRuntime() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  return Boolean(publicEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey);
}

export function hasWalletSessionRuntime() {
  return Boolean(
    getServerEnv().sessionSecret && hasSupabaseServiceRoleRuntime(),
  );
}

export function getWalletAuthMode(): WalletAuthMode {
  return hasWalletSessionRuntime() ? "live" : "demo";
}
