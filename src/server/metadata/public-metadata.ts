import { PinataSDK } from "pinata";
import { getServerEnv } from "@/lib/env";
import { getJsonString, sha256Hex } from "@/server/crypto";

type PublicVaultMetadata = {
  nodeCategory: string;
  nodeLabel: string;
  proofBundleHash: string;
  publicShareSupply: number;
  sharePriceUsdc: number;
  slug: string;
  totalShares: number;
  valuationUsdc: number;
  verificationSummary: Record<string, unknown> | null;
  vaultId: string;
  hardwareSummary: Record<string, unknown>;
};

function createPinataClient() {
  const pinataJwt = getServerEnv().pinataJwt;

  if (!pinataJwt) {
    throw new Error("Missing required environment variable: PINATA_JWT.");
  }

  return new PinataSDK({
    pinataJwt,
  });
}

export async function publishVaultPublicMetadata(
  metadata: PublicVaultMetadata,
) {
  const pinata = createPinataClient();
  const upload = await pinata.upload.public
    .json({
      version: 1,
      vault: metadata,
    })
    .name(`klasterai-vault-${metadata.slug}.json`);
  const payloadHash = await sha256Hex(getJsonString(metadata));

  return {
    cid: upload.cid,
    metadataHash: payloadHash,
    uri: `ipfs://${upload.cid}`,
  };
}
