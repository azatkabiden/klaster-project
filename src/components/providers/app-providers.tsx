"use client";

import { createDefaultClient } from "@solana/client";
import { SolanaProvider } from "@solana/react-hooks";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { getPublicEnv } from "@/lib/env";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const runtime = getPublicEnv();
  const client = useMemo(
    () =>
      createDefaultClient({
        cluster: runtime.solanaCluster,
        rpc: runtime.heliusRpcUrl
          ? (runtime.heliusRpcUrl as `http${string}`)
          : undefined,
        walletConnectors: "default",
      }),
    [runtime.heliusRpcUrl, runtime.solanaCluster],
  );

  return (
    <SolanaProvider client={client} walletPersistence={{ autoConnect: true }}>
      {children}
    </SolanaProvider>
  );
}
