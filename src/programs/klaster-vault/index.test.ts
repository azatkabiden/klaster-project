import { afterEach, describe, expect, it } from "vitest";

import { getKlasterVaultProgramAddress } from "@/programs/klaster-vault";

const ORIGINAL_PUBLIC_PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT;
const ORIGINAL_PROGRAM_ID = process.env.PROGRAM_ID_KLASTER_VAULT;

afterEach(() => {
  process.env.NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT = ORIGINAL_PUBLIC_PROGRAM_ID;
  process.env.PROGRAM_ID_KLASTER_VAULT = ORIGINAL_PROGRAM_ID;
});

describe("getKlasterVaultProgramAddress", () => {
  it("throws when no explicit program id is configured", () => {
    delete process.env.NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT;
    delete process.env.PROGRAM_ID_KLASTER_VAULT;

    expect(() => getKlasterVaultProgramAddress()).toThrow(
      "Missing program ID.",
    );
  });

  it("returns the explicit public program id when configured", () => {
    process.env.NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT =
      "6j9M6Jx8L9bh1fC86x5myjQ9M2rT5G4L6vM7QW8V9Yz1";

    expect(getKlasterVaultProgramAddress()).toBe(
      "6j9M6Jx8L9bh1fC86x5myjQ9M2rT5G4L6vM7QW8V9Yz1",
    );
  });
});
