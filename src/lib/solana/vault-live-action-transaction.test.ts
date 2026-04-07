import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  OperatorDepositBundle,
  PortfolioClaimBundle,
} from "@/lib/solana/vault-live-actions";

const {
  mockGetClaimYieldInstructionAsync,
  mockGetCreateAssociatedTokenIdempotentInstructionAsync,
  mockGetDepositRevenueInstruction,
  mockResolveVaultTransactionAccounts,
} = vi.hoisted(() => ({
  mockGetClaimYieldInstructionAsync: vi.fn(),
  mockGetCreateAssociatedTokenIdempotentInstructionAsync: vi.fn(),
  mockGetDepositRevenueInstruction: vi.fn(),
  mockResolveVaultTransactionAccounts: vi.fn(),
}));

vi.mock("@solana-program/token-2022", () => ({
  getCreateAssociatedTokenIdempotentInstructionAsync:
    mockGetCreateAssociatedTokenIdempotentInstructionAsync,
}));

vi.mock("@/programs/klaster-vault/generated/instructions", () => ({
  getClaimYieldInstructionAsync: mockGetClaimYieldInstructionAsync,
  getDepositRevenueInstruction: mockGetDepositRevenueInstruction,
}));

vi.mock("@/lib/solana/vault-transaction-accounts", () => ({
  parseUsdcAtomicAmount: vi.fn((value: string) =>
    BigInt(value.replace(".", "")),
  ),
  resolveVaultTransactionAccounts: mockResolveVaultTransactionAccounts,
}));

import {
  buildOperatorDepositTransactionPlan,
  buildPortfolioClaimTransactionPlan,
} from "@/lib/solana/vault-live-action-transaction";

const mockDepositSigner = { address: "operator-wallet" };
const mockClaimSigner = { address: "holder-wallet" };
const mockSolana = {
  runtime: {
    rpc: {},
  },
  splToken: vi.fn(),
};

function createOperatorBundle(
  overrides: Partial<OperatorDepositBundle> = {},
): OperatorDepositBundle {
  return {
    amountUsdc: "125.50",
    operatorWalletAddress: "operator-wallet",
    platformTreasuryOwnerAddress: "treasury-wallet",
    programAddress: "program-address",
    usdcMint: "usdc-mint",
    usdcTokenProgram: "token-program",
    vaultAddress: "vault-address",
    vaultId: "vault-id",
    ...overrides,
  };
}

function createClaimBundle(
  overrides: Partial<PortfolioClaimBundle> = {},
): PortfolioClaimBundle {
  return {
    holderWalletAddress: "holder-wallet",
    programAddress: "program-address",
    usdcMint: "usdc-mint",
    usdcTokenProgram: "token-program",
    vaultAddress: "vault-address",
    vaultId: "vault-id",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveVaultTransactionAccounts.mockResolvedValue({
    holderUsdcTokenAccount: "holder-usdc-ata",
    operatorUsdcTokenAccount: "operator-usdc-ata",
    platformTreasuryTokenAccount: "treasury-usdc-ata",
    revenuePoolTokenAccount: "revenue-pool-ata",
    vaultAuthority: "vault-authority",
  });
  mockGetCreateAssociatedTokenIdempotentInstructionAsync
    .mockResolvedValueOnce("ix-create-operator-usdc")
    .mockResolvedValueOnce("ix-create-revenue-pool")
    .mockResolvedValueOnce("ix-create-treasury-usdc")
    .mockResolvedValueOnce("ix-create-holder-usdc");
  mockGetDepositRevenueInstruction.mockReturnValue("ix-deposit-revenue");
  mockGetClaimYieldInstructionAsync.mockResolvedValue("ix-claim-yield");
});

describe("vault live action transaction helpers", () => {
  it("builds the operator deposit transaction with ATA guards first", async () => {
    const plan = await buildOperatorDepositTransactionPlan({
      bundle: createOperatorBundle(),
      operatorSigner: mockDepositSigner as never,
      solana: mockSolana as never,
    });

    expect(plan.instructions).toEqual([
      "ix-create-operator-usdc",
      "ix-create-revenue-pool",
      "ix-create-treasury-usdc",
      "ix-deposit-revenue",
    ]);
    expect(mockGetDepositRevenueInstruction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(12550),
        operator: mockDepositSigner,
        operatorUsdcTokenAccount: "operator-usdc-ata",
        platformTreasuryTokenAccount: "treasury-usdc-ata",
        revenuePoolTokenAccount: "revenue-pool-ata",
      }),
      {
        programAddress: "program-address",
      },
    );
  });

  it("builds the per-vault claim transaction with an idempotent holder ATA create", async () => {
    mockGetCreateAssociatedTokenIdempotentInstructionAsync.mockReset();
    mockGetCreateAssociatedTokenIdempotentInstructionAsync.mockResolvedValue(
      "ix-create-holder-usdc",
    );

    const plan = await buildPortfolioClaimTransactionPlan({
      bundle: createClaimBundle(),
      holderSigner: mockClaimSigner as never,
      solana: mockSolana as never,
    });

    expect(plan.instructions).toEqual([
      "ix-create-holder-usdc",
      "ix-claim-yield",
    ]);
    expect(mockGetClaimYieldInstructionAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        holder: mockClaimSigner,
        holderUsdcTokenAccount: "holder-usdc-ata",
        revenuePoolTokenAccount: "revenue-pool-ata",
        vault: "vault-address",
      }),
      {
        programAddress: "program-address",
      },
    );
  });
});
