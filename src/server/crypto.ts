const textEncoder = new TextEncoder();

export function getJsonString(value: unknown) {
  return JSON.stringify(value);
}

export async function sha256Hex(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? textEncoder.encode(value) : value;
  const input = new Uint8Array(bytes.byteLength);

  input.set(bytes);

  const digest = await crypto.subtle.digest("SHA-256", input);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
