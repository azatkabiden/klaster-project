/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/klaster_vault.json`.
 */
export type KlasterVault = {
  "address": "23G3S9gNH4x3PPJ8sJwvLfjFhQSJ2JJukZGrR29RQiTe",
  "metadata": {
    "name": "klasterVault",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "approveVault",
      "discriminator": [
        134,
        37,
        229,
        89,
        220,
        36,
        41,
        219
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "operator"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "shareMint"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "shareMint",
          "writable": true
        },
        {
          "name": "operatorShareTokenAccount",
          "writable": true
        },
        {
          "name": "operatorPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  108,
                  100,
                  101,
                  114,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "operator"
              }
            ]
          }
        },
        {
          "name": "shareTokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimYield",
      "discriminator": [
        49,
        74,
        111,
        7,
        186,
        22,
        61,
        165
      ],
      "accounts": [
        {
          "name": "holder",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.share_mint",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "holderPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  108,
                  100,
                  101,
                  114,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "revenuePoolTokenAccount",
          "writable": true
        },
        {
          "name": "holderUsdcTokenAccount",
          "writable": true
        },
        {
          "name": "usdcTokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "depositRevenue",
      "discriminator": [
        224,
        212,
        82,
        100,
        60,
        240,
        220,
        29
      ],
      "accounts": [
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.share_mint",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "operatorUsdcTokenAccount",
          "writable": true
        },
        {
          "name": "revenuePoolTokenAccount",
          "writable": true
        },
        {
          "name": "platformTreasuryTokenAccount",
          "writable": true
        },
        {
          "name": "usdcTokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeVault",
      "discriminator": [
        48,
        191,
        163,
        44,
        71,
        129,
        63,
        164
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "operator"
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "shareMint"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "shareMint",
          "writable": true
        },
        {
          "name": "operatorSettlementTokenAccount"
        },
        {
          "name": "platformTreasuryTokenAccount"
        },
        {
          "name": "revenuePoolTokenAccount"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initializeVaultArgs"
            }
          }
        }
      ]
    },
    {
      "name": "migrateVault",
      "discriminator": [
        139,
        151,
        25,
        211,
        120,
        164,
        24,
        215
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "platformTreasuryTokenAccount"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "migrateVaultArgs"
            }
          }
        }
      ]
    },
    {
      "name": "pauseVault",
      "discriminator": [
        250,
        6,
        228,
        57,
        6,
        104,
        19,
        210
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.share_mint",
                "account": "vault"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "purchaseShares",
      "discriminator": [
        171,
        132,
        3,
        224,
        99,
        69,
        214,
        250
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "shareMint"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "shareMint",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "buyerUsdcTokenAccount",
          "writable": true
        },
        {
          "name": "operatorSettlementTokenAccount",
          "writable": true
        },
        {
          "name": "buyerShareTokenAccount",
          "writable": true
        },
        {
          "name": "buyerPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  108,
                  100,
                  101,
                  114,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "shareTokenProgram"
        },
        {
          "name": "usdcTokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "shares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "resumeVault",
      "discriminator": [
        68,
        98,
        85,
        13,
        31,
        76,
        166,
        50
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.share_mint",
                "account": "vault"
              }
            ]
          }
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "holderPosition",
      "discriminator": [
        48,
        115,
        169,
        131,
        27,
        29,
        223,
        126
      ]
    },
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAdmin",
      "msg": "The admin signer does not match the vault admin."
    },
    {
      "code": 6001,
      "name": "invalidBuyerUsdcOwner",
      "msg": "Buyer USDC token account owner is invalid."
    },
    {
      "code": 6002,
      "name": "invalidDepositAmount",
      "msg": "Deposit amount is invalid."
    },
    {
      "code": 6003,
      "name": "invalidHolderUsdcOwner",
      "msg": "Holder USDC token account owner is invalid."
    },
    {
      "code": 6004,
      "name": "invalidOperator",
      "msg": "Operator account does not match the vault operator."
    },
    {
      "code": 6005,
      "name": "invalidOperatorSettlementAccount",
      "msg": "Operator settlement account is invalid."
    },
    {
      "code": 6006,
      "name": "invalidOperatorSettlementOwner",
      "msg": "Operator settlement owner must be the operator wallet."
    },
    {
      "code": 6007,
      "name": "invalidOperatorUsdcOwner",
      "msg": "Operator USDC token account owner is invalid."
    },
    {
      "code": 6008,
      "name": "invalidProofBundleHash",
      "msg": "Proof bundle hash exceeds the configured maximum length."
    },
    {
      "code": 6009,
      "name": "invalidMetadataUri",
      "msg": "Public metadata URI exceeds the configured maximum length."
    },
    {
      "code": 6010,
      "name": "invalidPlatformFeeBps",
      "msg": "Platform fee basis points must be between 0 and 9999."
    },
    {
      "code": 6011,
      "name": "invalidPlatformTreasuryAccount",
      "msg": "Platform treasury account is invalid."
    },
    {
      "code": 6012,
      "name": "invalidLegacyVaultLayout",
      "msg": "Legacy vault data could not be decoded for migration."
    },
    {
      "code": 6013,
      "name": "invalidPublicTranche",
      "msg": "Public tranche supply must be positive and not exceed total shares."
    },
    {
      "code": 6014,
      "name": "invalidRevenuePoolAccount",
      "msg": "Revenue pool token account does not match the vault configuration."
    },
    {
      "code": 6015,
      "name": "invalidRevenuePoolOwner",
      "msg": "Revenue pool token account owner must be the vault authority."
    },
    {
      "code": 6016,
      "name": "invalidShareAmount",
      "msg": "Share amount is invalid."
    },
    {
      "code": 6017,
      "name": "invalidShareAccountOwner",
      "msg": "Share token account owner does not match the expected wallet."
    },
    {
      "code": 6018,
      "name": "invalidShareMint",
      "msg": "Share mint account is invalid."
    },
    {
      "code": 6019,
      "name": "invalidShareMintDecimals",
      "msg": "Vault shares must use a zero-decimal share mint."
    },
    {
      "code": 6020,
      "name": "invalidSharePrice",
      "msg": "Share price must be positive."
    },
    {
      "code": 6021,
      "name": "invalidTotalShares",
      "msg": "Total shares must be positive."
    },
    {
      "code": 6022,
      "name": "invalidUsdcMint",
      "msg": "USDC mint account is invalid."
    },
    {
      "code": 6023,
      "name": "invalidUsdcAccountMint",
      "msg": "Token account mint must match the configured USDC mint."
    },
    {
      "code": 6024,
      "name": "claimsDisabled",
      "msg": "Claims are currently disabled for this vault."
    },
    {
      "code": 6025,
      "name": "depositTooSmall",
      "msg": "Deposit is too small for the current minted supply."
    },
    {
      "code": 6026,
      "name": "insufficientPublicShares",
      "msg": "Not enough public shares remain for this purchase."
    },
    {
      "code": 6027,
      "name": "mathOverflow",
      "msg": "Math overflow detected."
    },
    {
      "code": 6028,
      "name": "noMintedSupply",
      "msg": "No minted supply exists yet."
    },
    {
      "code": 6029,
      "name": "nothingToClaim",
      "msg": "Nothing is claimable for this holder."
    },
    {
      "code": 6030,
      "name": "positionHolderMismatch",
      "msg": "Holder position is tied to a different holder."
    },
    {
      "code": 6031,
      "name": "positionVaultMismatch",
      "msg": "Holder position is tied to a different vault."
    },
    {
      "code": 6032,
      "name": "revenueIndexRegression",
      "msg": "Revenue index cannot move backwards."
    },
    {
      "code": 6033,
      "name": "shareMintMustStartEmpty",
      "msg": "Share mint must start with zero supply before approval."
    },
    {
      "code": 6034,
      "name": "shareMintNotToken2022",
      "msg": "Vault shares must use the Token-2022 program."
    },
    {
      "code": 6035,
      "name": "shareMintNotNonTransferable",
      "msg": "Vault shares must use the non-transferable Token-2022 extension."
    },
    {
      "code": 6036,
      "name": "vaultAlreadyVerified",
      "msg": "Vault is already verified."
    },
    {
      "code": 6037,
      "name": "vaultAlreadyMigrated",
      "msg": "Vault account already uses the current layout."
    },
    {
      "code": 6038,
      "name": "invalidVaultAccount",
      "msg": "Vault account is invalid."
    },
    {
      "code": 6039,
      "name": "invalidVaultAccountSize",
      "msg": "Vault account size does not match a supported layout."
    },
    {
      "code": 6040,
      "name": "vaultNotPaused",
      "msg": "Vault must be paused before it can be resumed."
    },
    {
      "code": 6041,
      "name": "vaultNotVerified",
      "msg": "Vault must be verified for this action."
    }
  ],
  "types": [
    {
      "name": "holderPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "pendingClaims",
            "type": "u64"
          },
          {
            "name": "revenueIndexCheckpoint",
            "type": "u128"
          },
          {
            "name": "totalClaimed",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "initializeVaultArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalShares",
            "type": "u64"
          },
          {
            "name": "publicTrancheShares",
            "type": "u64"
          },
          {
            "name": "sharePriceUsdc",
            "type": "u64"
          },
          {
            "name": "platformFeeBps",
            "type": "u16"
          },
          {
            "name": "publicMetadataUri",
            "type": "string"
          },
          {
            "name": "proofBundleHash",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "migrateVaultArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "platformFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "vault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authorityBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "platformFeeBps",
            "type": "u16"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "vaultStatus"
              }
            }
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "shareMint",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "operatorSettlementTokenAccount",
            "type": "pubkey"
          },
          {
            "name": "platformTreasuryTokenAccount",
            "type": "pubkey"
          },
          {
            "name": "revenuePoolTokenAccount",
            "type": "pubkey"
          },
          {
            "name": "totalShares",
            "type": "u64"
          },
          {
            "name": "publicTrancheShares",
            "type": "u64"
          },
          {
            "name": "remainingPublicShares",
            "type": "u64"
          },
          {
            "name": "mintedShares",
            "type": "u64"
          },
          {
            "name": "sharePriceUsdc",
            "type": "u64"
          },
          {
            "name": "revenueIndex",
            "type": "u128"
          },
          {
            "name": "totalPlatformFeesCollected",
            "type": "u64"
          },
          {
            "name": "totalPrimarySaleProceeds",
            "type": "u64"
          },
          {
            "name": "totalRevenueDeposited",
            "type": "u64"
          },
          {
            "name": "totalRevenueClaimed",
            "type": "u64"
          },
          {
            "name": "publicMetadataUri",
            "type": "string"
          },
          {
            "name": "proofBundleHash",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "vaultStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pendingReview"
          },
          {
            "name": "verified"
          },
          {
            "name": "paused"
          }
        ]
      }
    }
  ]
};
