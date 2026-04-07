import { encodeBase58 } from "@/lib/base58";
import { AppError } from "@/server/http/errors";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const BASE58_LOOKUP = new Map(
  Array.from(BASE58_ALPHABET).map((character, index) => [character, index]),
);

export function decodeBase58(value: string) {
  if (!value) {
    return new Uint8Array();
  }

  const bytes = [0];

  for (const character of value) {
    const carryStart = BASE58_LOOKUP.get(character);

    if (carryStart === undefined) {
      throw new AppError(400, "Invalid Base58 value.");
    }

    let carry = carryStart;

    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const character of value) {
    if (character !== "1") {
      break;
    }

    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}

export { encodeBase58 };
