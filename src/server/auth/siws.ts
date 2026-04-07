import { assertRegionAllowed } from "@/server/auth/region";
import {
  type AppSession,
  type AuthChallenge,
  createAuthChallengeToken,
  createSessionToken,
} from "@/server/auth/session";
import {
  assertWalletAddress,
  verifyWalletSignature,
} from "@/server/auth/wallet";
import { AppError } from "@/server/http/errors";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";

const NONCE_LENGTH = 16;

function createNonce() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, NONCE_LENGTH);
}

function getOrigin(request: Request) {
  return new URL(request.url).origin;
}

function buildAuthStatement() {
  return "Sign in to KlasterAI with your Solana wallet.";
}

export function buildWalletAuthMessage(input: {
  expirationTime: string;
  nonce: string;
  origin: string;
  statement: string;
  walletAddress: string;
}) {
  const originUrl = new URL(input.origin);

  return [
    "KlasterAI wants you to sign in with your Solana account:",
    input.walletAddress,
    "",
    input.statement,
    "",
    `URI: ${originUrl.origin}`,
    "Version: 1",
    `Chain ID: ${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet"}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${new Date().toISOString()}`,
    `Expiration Time: ${input.expirationTime}`,
  ].join("\n");
}

async function findOrCreateProfile(input: {
  displayName?: string;
  regionCode: string | null;
  walletAddress: string;
}) {
  const client = createSupabaseServiceRoleClient();
  const walletAddress = input.walletAddress.trim();
  const existingProfile = await client
    .from("profiles")
    .select("id, role, wallet_address")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (existingProfile.error) {
    throw new Error(existingProfile.error.message);
  }

  if (existingProfile.data) {
    if (input.displayName || input.regionCode) {
      const updates: {
        display_name?: string | null;
        region_code?: string | null;
      } = {};

      if (input.displayName !== undefined) {
        updates.display_name = input.displayName;
      }

      if (input.regionCode !== null) {
        updates.region_code = input.regionCode;
      }

      const updateResult = await client
        .from("profiles")
        .update(updates)
        .eq("id", existingProfile.data.id);

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }
    }

    return {
      id: existingProfile.data.id,
      role: existingProfile.data.role as AppSession["role"],
      walletAddress: existingProfile.data.wallet_address,
    };
  }

  const insertedProfile = await client
    .from("profiles")
    .insert({
      display_name: input.displayName ?? null,
      region_code: input.regionCode,
      role: "investor",
      wallet_address: walletAddress,
    })
    .select("id, role, wallet_address")
    .single();

  if (insertedProfile.error) {
    throw new Error(insertedProfile.error.message);
  }

  return {
    id: insertedProfile.data.id,
    role: insertedProfile.data.role as AppSession["role"],
    walletAddress: insertedProfile.data.wallet_address,
  };
}

export async function issueWalletAuthChallenge(
  walletAddress: string,
  request: Request,
) {
  assertWalletAddress(walletAddress);
  assertRegionAllowed(request.headers);

  const nonce = createNonce();
  const statement = buildAuthStatement();
  const expirationTime = new Date(Date.now() + 1000 * 60 * 10).toISOString();
  const message = buildWalletAuthMessage({
    expirationTime,
    nonce,
    origin: getOrigin(request),
    statement,
    walletAddress,
  });
  const challenge: AuthChallenge = {
    expirationTime,
    message,
    nonce,
    statement,
    walletAddress,
  };

  return {
    challenge,
    token: await createAuthChallengeToken(challenge),
  };
}

export async function verifyWalletAuth(input: {
  challengeToken: string | undefined;
  displayName?: string;
  fallbackRegionCode?: string;
  message: string;
  request: Request;
  signature: string;
  walletAddress: string;
}) {
  const challenge = await import("@/server/auth/session").then((module) =>
    module.readAuthChallengeToken(input.challengeToken),
  );

  if (challenge.walletAddress !== input.walletAddress) {
    throw new AppError(
      401,
      "The signed wallet does not match the active challenge.",
    );
  }

  if (challenge.message !== input.message) {
    throw new AppError(
      401,
      "The signed message does not match the active challenge.",
    );
  }

  const regionCode = assertRegionAllowed(
    input.request.headers,
    input.fallbackRegionCode,
  );
  const isValid = await verifyWalletSignature({
    message: input.message,
    signature: input.signature,
    walletAddress: input.walletAddress,
  });

  if (!isValid) {
    throw new AppError(401, "Wallet signature verification failed.");
  }

  const profile = await findOrCreateProfile({
    displayName: input.displayName,
    regionCode,
    walletAddress: input.walletAddress,
  });
  const session: AppSession = {
    profileId: profile.id,
    regionCode,
    role: profile.role,
    walletAddress: profile.walletAddress,
  };

  return {
    session,
    sessionToken: await createSessionToken(session),
  };
}
