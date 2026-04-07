import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/server/auth/guards";
import { handleRouteError } from "@/server/http/errors";
import {
  portfolioClaimPrepareSchema,
  preparePortfolioClaim,
} from "@/server/vaults/live-transactions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    vaultId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await portfolioClaimPrepareSchema.parseAsync(
      await request.json().catch(() => ({})),
    );
    const session = await requireCurrentSession(["investor"]);
    const { vaultId } = await context.params;
    const result = await preparePortfolioClaim(vaultId, session);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
