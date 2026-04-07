import { getPublicEnv } from "@/lib/env";

export function getSolanaProviderConfig() {
  const env = getPublicEnv();

  return {
    cluster: env.solanaCluster,
    endpoint: env.heliusRpcUrl,
    walletStandard: true,
  };
}
