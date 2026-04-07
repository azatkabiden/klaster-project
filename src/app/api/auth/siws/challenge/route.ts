import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuthChallengeCookie } from "@/server/auth/session";
import { issueWalletAuthChallenge } from "@/server/auth/siws";
import { handleRouteError } from "@/server/http/errors";

export const runtime = "nodejs";

const challengeRequestSchema = z.object({
  walletAddress: z.string().trim().min(32).max(64),
});

export async function POST(request: NextRequest) {
  try {
    const body = challengeRequestSchema.parse(await request.json());
    const { challenge, token } = await issueWalletAuthChallenge(
      body.walletAddress,
      request,
    );
    const response = NextResponse.json({
      expiration: challenge.expirationTime,
      message: challenge.message,
      nonce: challenge.nonce,
      statement: challenge.statement,
    });

    response.cookies.set(createAuthChallengeCookie(token));

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
