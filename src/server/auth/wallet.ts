import { decodeBase58 } from "@/server/auth/base58";
import { AppError } from "@/server/http/errors";

const textEncoder = new TextEncoder();

function getEd25519Subtle() {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    throw new Error("Web Crypto is not available in this runtime.");
  }

  return subtle;
}

export function assertWalletAddress(walletAddress: string) {
  const publicKeyBytes = decodeBase58(walletAddress);

  if (publicKeyBytes.length !== 32) {
    throw new AppError(400, "Wallet address is invalid.");
  }

  return publicKeyBytes;
}

export function decodeWalletSignature(signature: string) {
  const signatureBytes = decodeBase58(signature);

  if (signatureBytes.length !== 64) {
    throw new AppError(400, "Wallet signature is invalid.");
  }

  return signatureBytes;
}

export async function verifyWalletSignature(input: {
  message: string;
  signature: string;
  walletAddress: string;
}) {
  const subtle = getEd25519Subtle();
  const publicKeyBytes = assertWalletAddress(input.walletAddress);
  const signatureBytes = decodeWalletSignature(input.signature);

  const key = await subtle.importKey(
    "raw",
    publicKeyBytes,
    {
      name: "Ed25519",
    },
    false,
    ["verify"],
  );

  return subtle.verify(
    "Ed25519",
    key,
    signatureBytes,
    textEncoder.encode(input.message),
  );
}
