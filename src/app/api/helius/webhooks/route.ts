import { type NextRequest, NextResponse } from "next/server";
import {
  ingestHeliusWebhook,
  isHeliusAuthorizationValid,
} from "@/server/helius/webhooks";
import { AppError, handleRouteError } from "@/server/http/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!isHeliusAuthorizationValid(request.headers.get("authorization"))) {
      throw new AppError(401, "Webhook authorization failed.");
    }

    const result = await ingestHeliusWebhook(await request.json());

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
