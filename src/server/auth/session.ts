import { jwtVerify, SignJWT } from "jose";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { getServerEnv } from "@/lib/env";
import { AppError } from "@/server/http/errors";

export const SESSION_COOKIE_NAME = "klasterai_session";
export const CHALLENGE_COOKIE_NAME = "klasterai_auth_challenge";

export type AppRole = "investor" | "operator" | "admin";

export type AppSession = {
  profileId: string;
  role: AppRole;
  walletAddress: string;
  regionCode: string | null;
};

type SessionTokenPayload = {
  profileId: string;
  regionCode: string | null;
  role: AppRole;
  walletAddress: string;
};

export type AuthChallenge = {
  expirationTime: string;
  message: string;
  nonce: string;
  statement: string;
  walletAddress: string;
};

const textEncoder = new TextEncoder();

function isSecureCookie() {
  return process.env.NODE_ENV === "production";
}

function getSessionSecret() {
  const secret = getServerEnv().sessionSecret;

  if (!secret) {
    throw new Error("Missing required environment variable: SESSION_SECRET.");
  }

  return textEncoder.encode(secret);
}

function getCookieOptions(
  maxAge: number,
): Omit<ResponseCookie, "name" | "value"> {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: isSecureCookie(),
  };
}

async function signToken(payload: Record<string, unknown>, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSessionSecret());
}

async function verifyToken<T extends Record<string, unknown>>(token: string) {
  const verified = await jwtVerify(token, getSessionSecret());

  return verified.payload as T;
}

export async function createSessionToken(session: AppSession) {
  return signToken(
    {
      profileId: session.profileId,
      regionCode: session.regionCode,
      role: session.role,
      walletAddress: session.walletAddress,
    },
    "7d",
  );
}

export async function readSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken<SessionTokenPayload>(token);

    return {
      profileId: payload.profileId,
      regionCode: payload.regionCode ?? null,
      role: payload.role,
      walletAddress: payload.walletAddress,
    } satisfies AppSession;
  } catch {
    return null;
  }
}

export function createSessionCookie(value: string): ResponseCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value,
    ...getCookieOptions(60 * 60 * 24 * 7),
  };
}

export function clearSessionCookie(): ResponseCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    ...getCookieOptions(0),
  };
}

export async function createAuthChallengeToken(challenge: AuthChallenge) {
  return signToken(challenge, "10m");
}

export async function readAuthChallengeToken(token: string | undefined) {
  if (!token) {
    throw new AppError(401, "No active wallet sign-in challenge was found.");
  }

  try {
    return await verifyToken<AuthChallenge>(token);
  } catch {
    throw new AppError(401, "The wallet sign-in challenge has expired.");
  }
}

export function createAuthChallengeCookie(value: string): ResponseCookie {
  return {
    name: CHALLENGE_COOKIE_NAME,
    value,
    ...getCookieOptions(60 * 10),
  };
}

export function clearAuthChallengeCookie(): ResponseCookie {
  return {
    name: CHALLENGE_COOKIE_NAME,
    value: "",
    ...getCookieOptions(0),
  };
}
