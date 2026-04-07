import { NextResponse } from "next/server";
import {
  clearAuthChallengeCookie,
  clearSessionCookie,
} from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(clearSessionCookie());
  response.cookies.set(clearAuthChallengeCookie());

  return response;
}
