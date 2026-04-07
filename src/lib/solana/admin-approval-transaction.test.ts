import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminApprovalBundle } from "@/lib/solana/admin-approval";

const {
  mockGenerateKeyPairSigner,
  mockGetCreateAccountInstruction,
  mockGetCreateAssociatedTokenIdempotentInstructionAsync,
  mockGetInitializeMint2Instruction,
  mockGetInitializeNonTransferableMintInstruction,
  mockGetMintSize,
  mockResolveVaultTransactionAccounts,
  mockGetInitializeVaultInstructionAsync,
  mockGetApproveVaultInstructionAsync,
  mockFindVaultPda,
} = vi.hoisted(() => ({
  mockGenerateKeyPairSigner: vi.fn(),
  mockGetApproveVaultInstructionAsync: vi.fn(),
  mockGetCreateAccountInstruction: vi.fn(),
  mockGetCreateAssociatedTokenIdempotentInstructionAsync: vi.fn(),
  mockGetInitializeMint2Instruction: vi.fn(),
  mockGetInitializeNonTransferableMintInstruction: vi.fn(),
  mockGetInitializeVaultInstructionAsync: vi.fn(),
  mockGetMintSize: vi.fn(),
  mockFindVaultPda: vi.fn(),
  mockResolveVaultTransactionAccounts: vi.fn(),
}));

vi.mock("@solana/signers", () => ({
  generateKeyPairSigner: mockGenerateKeyPairSigner,
}));

vi.mock("@solana-program/system", () => ({
  getCreateAccountInstruction: mockGetCreateAccountInstruction,
}));

vi.mock("@solana-program/token-2022", () => ({
  getCreateAssociatedTokenIdempotentInstructionAsync:
    mockGetCreateAssociatedTokenIdempotentInstructionAsync,
  getInitializeMint2Instruction: mockGetInitializeMint2Instruction,
  getInitializeNonTransferableMintInstruction:
    mockGetInitializeNonTransferableMintInstruction,
  getMintSize: mockGetMintSize,
}));

vi.mock("@/lib/solana/vault-transaction-accounts", () => ({
  parseUsdcAtomicAmount: vi.fn((value: string) =>
    BigInt(value.replace(".", "")),
  ),
  resolveVaultTransactionAccounts: mockResolveVaultTransactionAccounts,
}));

vi.mock("@/programs/klaster-vault/generated/instructions", () => ({
  getApproveVaultInstructionAsync: mockGetApproveVaultInstructionAsync,
  getInitializeVaultInstructionAsync: mockGetInitializeVaultInstructionAsync,
}));

vi.mock("@/programs/klaster-vault/generated/pdas", () => ({
  findVaultPda: mockFindVaultPda,
}));

import { buildAdminApprovalTransactionPlan } from "@/lib/solana/admin-approval-transaction";

const mockAdminSigner = {
  address: "admin-wallet",
};

const mockSolana = {
  runtime: {
    rpc: {
      getMinimumBalanceForRentExemption: vi.fn(() => ({
        send: vi.fn().mockResolvedValue(BigInt(2039280)),
      })),
    },
  },
  splToken: vi.fn(),
};

function createBundle(
  overrides: Partial<AdminApprovalBundle> = {},
): AdminApprovalBundle {
  return {
    adminWalletAddress: "admin-wallet",
    bootstrapMode: "full",
    existingShareMintAddress: null,
    existingVaultAddress: null,
    operatorWalletAddress: "operator-wallet",
    platformFeeBps: 1000,
    platformTreasuryOwnerAddress: "treasury-wallet",
    programAddress: "program-address",
    proofBundleHash: "proof-hash",
    publicMetadataHash: "metadata-hash",
    publicMetadataUri: "ipfs://vault-metadata",
    publicShareSupply: 120,
    sharePriceUsdc: "15.25",
    shareTokenProgram: "token-2022-program",
    totalShares: 240,
    usdcMint: "usdc-mint",
    usdcTokenProgram: "token-program",
    vaultId: "vault-id",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateKeyPairSigner.mockResolvedValue({
    address: "share-mint-signer",
  });
  mockGetCreateAccountInstruction.mockReturnValue("ix-create-account");
  mockGetCreateAssociatedTokenIdempotentInstructionAsync
    .mockResolvedValueOnce("ix-create-operator-usdc")
    .mockResolvedValueOnce("ix-create-revenue-pool")
    .mockResolvedValueOnce("ix-create-treasury-usdc")
    .mockResolvedValueOnce("ix-create-operator-share");
  mockGetInitializeMint2Instruction.mockReturnValue("ix-initialize-mint");
  mockGetInitializeNonTransferableMintInstruction.mockReturnValue(
    "ix-initialize-non-transferable",
  );
  mockGetMintSize.mockReturnValue(82);
  mockResolveVaultTransactionAccounts.mockResolvedValue({
    operatorSettlementTokenAccount: "operator-usdc-ata",
    operatorShareTokenAccount: "operator-share-ata",
    platformTreasuryTokenAccount: "treasury-usdc-ata",
    revenuePoolTokenAccount: "revenue-pool-ata",
    vaultAuthority: "vault-authority",
  });
  mockGetInitializeVaultInstructionAsync.mockResolvedValue(
    "ix-initialize-vault",
  );
  mockGetApproveVaultInstructionAsync.mockResolvedValue("ix-approve-vault");
  mockFindVaultPda.mockResolvedValue(["vault-pda"]);
});

describe("buildAdminApprovalTransactionPlan", () => {
  it("builds the full bootstrap sequence when the vault has no existing mint", async () => {
    const plan = await buildAdminApprovalTransactionPlan({
      adminSigner: mockAdminSigner as never,
      bundle: createBundle(),
      solana: mockSolana as never,
    });

    expect(plan.shareMintAddress).toBe("share-mint-signer");
    expect(plan.vaultAddress).toBe("vault-pda");
    expect(plan.shareMintSigner).toMatchObject({
      address: "share-mint-signer",
    });
    expect(plan.instructions).toEqual([
      "ix-create-account",
      "ix-initialize-non-transferable",
      "ix-initialize-mint",
      "ix-create-operator-usdc",
      "ix-create-revenue-pool",
      "ix-create-treasury-usdc",
      "ix-create-operator-share",
      "ix-initialize-vault",
      "ix-approve-vault",
    ]);
    expect(mockGetCreateAccountInstruction).toHaveBeenCalledWith(
      expect.objectContaining({
        newAccount: expect.objectContaining({
          address: "share-mint-signer",
        }),
        payer: mockAdminSigner,
        programAddress: "token-2022-program",
      }),
    );
    expect(mockGetInitializeVaultInstructionAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        operator: "operator-wallet",
        platformFeeBps: 1000,
        publicMetadataUri: "ipfs://vault-metadata",
        shareMint: "share-mint-signer",
        vault: "vault-pda",
      }),
      {
        programAddress: "program-address",
      },
    );
  });

  it("skips mint creation and initialize_vault when the vault is already bootstrapped", async () => {
    mockGetCreateAssociatedTokenIdempotentInstructionAsync.mockReset();
    mockGetCreateAssociatedTokenIdempotentInstructionAsync
      .mockResolvedValueOnce("ix-create-operator-usdc")
      .mockResolvedValueOnce("ix-create-revenue-pool")
      .mockResolvedValueOnce("ix-create-treasury-usdc")
      .mockResolvedValueOnce("ix-create-operator-share");

    const plan = await buildAdminApprovalTransactionPlan({
      adminSigner: mockAdminSigner as never,
      bundle: createBundle({
        bootstrapMode: "approve_only",
        existingShareMintAddress: "existing-share-mint",
        existingVaultAddress: "vault-pda",
      }),
      solana: mockSolana as never,
    });

    expect(plan.shareMintAddress).toBe("existing-share-mint");
    expect(plan.shareMintSigner).toBeNull();
    expect(plan.instructions).toEqual([
      "ix-create-operator-usdc",
      "ix-create-revenue-pool",
      "ix-create-treasury-usdc",
      "ix-create-operator-share",
      "ix-approve-vault",
    ]);
    expect(mockGetCreateAccountInstruction).not.toHaveBeenCalled();
    expect(mockGetInitializeVaultInstructionAsync).not.toHaveBeenCalled();
    expect(mockGetApproveVaultInstructionAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        operatorShareTokenAccount: "operator-share-ata",
        shareMint: "existing-share-mint",
        vault: "vault-pda",
      }),
      {
        programAddress: "program-address",
      },
    );
  });
});
