import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  CHALLENGE_COOKIE_NAME,
  clearAuthChallengeCookie,
  createSessionCookie,
} from "@/server/auth/session";
import { verifyWalletAuth } from "@/server/auth/siws";
import { handleRouteError } from "@/server/http/errors";

export const runtime = "nodejs";

const verifyRequestSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  message: z.string().trim().min(1),
  regionCode: z.string().trim().min(2).max(8).optional(),
  signature: z.string().trim().min(64),
  walletAddress: z.string().trim().min(32).max(64),
});

export async function POST(request: NextRequest) {
  try {
    const body = verifyRequestSchema.parse(await request.json());
    const cookieStore = await cookies();
    const { session, sessionToken } = await verifyWalletAuth({
      challengeToken: cookieStore.get(CHALLENGE_COOKIE_NAME)?.value,
      displayName: body.displayName,
      fallbackRegionCode: body.regionCode,
      message: body.message,
      request,
      signature: body.signature,
      walletAddress: body.walletAddress,
    });
    const response = NextResponse.json({
      profileId: session.profileId,
      role: session.role,
      walletAddress: session.walletAddress,
    });

    response.cookies.set(createSessionCookie(sessionToken));
    response.cookies.set(clearAuthChallengeCookie());

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
