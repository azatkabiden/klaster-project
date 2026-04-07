use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};
use anchor_spl::token_interface::{
    self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};
use anchor_spl::token_2022::{spl_token_2022, Token2022};
use anchor_spl::token_2022::spl_token_2022::extension::BaseStateWithExtensions;

declare_id!("23G3S9gNH4x3PPJ8sJwvLfjFhQSJ2JJukZGrR29RQiTe");

const HOLDER_POSITION_SEED: &[u8] = b"holder_position";
const INDEX_SCALE: u128 = 1_000_000_000_000;
const MAX_METADATA_URI_LEN: usize = 160;
const MAX_PROOF_HASH_LEN: usize = 96;
const MAX_PLATFORM_FEE_BPS: u16 = 10_000;
const VAULT_AUTHORITY_SEED: &[u8] = b"vault_authority";
const VAULT_SEED: &[u8] = b"vault";

#[program]
pub mod klaster_vault {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        args: InitializeVaultArgs,
    ) -> Result<()> {
        require_gt!(args.total_shares, 0, VaultError::InvalidTotalShares);
        require_gt!(
            args.public_tranche_shares,
            0,
            VaultError::InvalidPublicTranche
        );
        require_gte!(
            args.total_shares,
            args.public_tranche_shares,
            VaultError::InvalidPublicTranche
        );
        require_gt!(args.share_price_usdc, 0, VaultError::InvalidSharePrice);
        require!(
            args.platform_fee_bps < MAX_PLATFORM_FEE_BPS,
            VaultError::InvalidPlatformFeeBps
        );
        require!(
            args.public_metadata_uri.len() <= MAX_METADATA_URI_LEN,
            VaultError::InvalidMetadataUri
        );
        require!(
            args.proof_bundle_hash.len() <= MAX_PROOF_HASH_LEN,
            VaultError::InvalidProofBundleHash
        );
        require!(
            ctx.accounts.share_mint.decimals == 0,
            VaultError::InvalidShareMintDecimals
        );
        require!(
            ctx.accounts.share_mint.supply == 0,
            VaultError::ShareMintMustStartEmpty
        );
        validate_share_mint(&ctx.accounts.share_mint)?;
        require_keys_eq!(
            ctx.accounts.operator_settlement_token_account.mint,
            ctx.accounts.usdc_mint.key(),
            VaultError::InvalidUsdcAccountMint
        );
        require_keys_eq!(
            ctx.accounts.revenue_pool_token_account.mint,
            ctx.accounts.usdc_mint.key(),
            VaultError::InvalidUsdcAccountMint
        );
        require_keys_eq!(
            ctx.accounts.operator_settlement_token_account.owner,
            ctx.accounts.operator.key(),
            VaultError::InvalidOperatorSettlementOwner
        );
        require_keys_eq!(
            ctx.accounts.revenue_pool_token_account.owner,
            ctx.accounts.vault_authority.key(),
            VaultError::InvalidRevenuePoolOwner
        );
        require_keys_eq!(
            ctx.accounts.platform_treasury_token_account.mint,
            ctx.accounts.usdc_mint.key(),
            VaultError::InvalidUsdcAccountMint
        );

        let vault = &mut ctx.accounts.vault;
        vault.authority_bump = ctx.bumps.vault_authority;
        vault.bump = ctx.bumps.vault;
        vault.admin = ctx.accounts.admin.key();
        vault.operator = ctx.accounts.operator.key();
        vault.operator_settlement_token_account =
            ctx.accounts.operator_settlement_token_account.key();
        vault.platform_fee_bps = args.platform_fee_bps;
        vault.platform_treasury_token_account =
            ctx.accounts.platform_treasury_token_account.key();
        vault.proof_bundle_hash = args.proof_bundle_hash;
        vault.public_metadata_uri = args.public_metadata_uri;
        vault.public_tranche_shares = args.public_tranche_shares;
        vault.remaining_public_shares = args.public_tranche_shares;
        vault.revenue_index = 0;
        vault.revenue_pool_token_account = ctx.accounts.revenue_pool_token_account.key();
        vault.share_mint = ctx.accounts.share_mint.key();
        vault.share_price_usdc = args.share_price_usdc;
        vault.status = VaultStatus::PendingReview;
        vault.total_platform_fees_collected = 0;
        vault.total_primary_sale_proceeds = 0;
        vault.total_revenue_claimed = 0;
        vault.total_revenue_deposited = 0;
        vault.total_shares = args.total_shares;
        vault.usdc_mint = ctx.accounts.usdc_mint.key();

        Ok(())
    }

    pub fn approve_vault(ctx: Context<ApproveVault>) -> Result<()> {
        let vault_key = ctx.accounts.vault.key();
        let operator_key = ctx.accounts.operator.key();
        let position_bump = ctx.bumps.operator_position;
        let (minted_amount, revenue_index, authority_bump_value) = {
            let vault = &mut ctx.accounts.vault;
            vault.require_admin(ctx.accounts.admin.key())?;

            let minted_amount = vault.approve()?;
            (minted_amount, vault.revenue_index, vault.authority_bump)
        };
        let position = &mut ctx.accounts.operator_position;
        position.ensure_identity(vault_key, operator_key, position_bump)?;
        position.credit_shares(revenue_index, minted_amount)?;
        let authority_bump = [authority_bump_value];
        let authority_seeds = [
            VAULT_AUTHORITY_SEED,
            vault_key.as_ref(),
            authority_bump.as_ref(),
        ];
        let signer_seeds = &[&authority_seeds[..]];

        mint_shares(
            &ctx.accounts.share_token_program,
            &ctx.accounts.share_mint,
            &ctx.accounts.operator_share_token_account,
            &ctx.accounts.vault_authority,
            signer_seeds,
            minted_amount,
        )?;

        Ok(())
    }

    pub fn migrate_vault(
        ctx: Context<MigrateVault>,
        args: MigrateVaultArgs,
    ) -> Result<()> {
        require!(
            args.platform_fee_bps < MAX_PLATFORM_FEE_BPS,
            VaultError::InvalidPlatformFeeBps
        );

        let vault_info = ctx.accounts.vault.to_account_info();
        let current_space = 8 + Vault::INIT_SPACE;
        require!(
            vault_info.data_len() != current_space,
            VaultError::VaultAlreadyMigrated
        );
        require_eq!(
            vault_info.data_len(),
            8 + LegacyVault::INIT_SPACE,
            VaultError::InvalidVaultAccountSize
        );
        require_keys_eq!(
            *vault_info.owner,
            crate::ID,
            VaultError::InvalidVaultAccount
        );

        let legacy_vault = deserialize_legacy_vault(&vault_info)?;
        require_keys_eq!(
            legacy_vault.admin,
            ctx.accounts.admin.key(),
            VaultError::InvalidAdmin
        );
        require_keys_eq!(
            ctx.accounts.platform_treasury_token_account.mint,
            legacy_vault.usdc_mint,
            VaultError::InvalidUsdcAccountMint
        );

        let (expected_vault_key, expected_bump) = Pubkey::find_program_address(
            &[VAULT_SEED, legacy_vault.share_mint.as_ref()],
            &crate::ID,
        );
        require_keys_eq!(
            expected_vault_key,
            vault_info.key(),
            VaultError::InvalidVaultAccount
        );
        require_eq!(
            legacy_vault.bump,
            expected_bump,
            VaultError::InvalidVaultAccount
        );

        ensure_rent_exempt_size(
            &ctx.accounts.admin,
            &ctx.accounts.vault,
            &ctx.accounts.system_program,
            current_space,
        )?;
        vault_info.resize(current_space)?;

        let migrated_vault = migrate_legacy_vault(
            legacy_vault,
            args.platform_fee_bps,
            ctx.accounts.platform_treasury_token_account.key(),
        );
        serialize_vault(&vault_info, &migrated_vault)?;

        Ok(())
    }

    pub fn purchase_shares(ctx: Context<PurchaseShares>, shares: u64) -> Result<()> {
        let buyer = ctx.accounts.buyer.key();
        let vault_key = ctx.accounts.vault.key();
        let position_bump = ctx.bumps.buyer_position;
        let (payment_amount, revenue_index, authority_bump_value) = {
            let vault = &mut ctx.accounts.vault;
            let payment_amount = vault.record_purchase(shares)?;
            (payment_amount, vault.revenue_index, vault.authority_bump)
        };

        let position = &mut ctx.accounts.buyer_position;
        position.ensure_identity(vault_key, buyer, position_bump)?;
        position.credit_shares(revenue_index, shares)?;
        let authority_bump = [authority_bump_value];
        let authority_seeds = [
            VAULT_AUTHORITY_SEED,
            vault_key.as_ref(),
            authority_bump.as_ref(),
        ];
        let signer_seeds = &[&authority_seeds[..]];

        transfer_usdc(
            &ctx.accounts.usdc_token_program,
            &ctx.accounts.buyer,
            &ctx.accounts.buyer_usdc_token_account,
            &ctx.accounts.operator_settlement_token_account,
            &ctx.accounts.usdc_mint,
            payment_amount,
        )?;
        mint_shares(
            &ctx.accounts.share_token_program,
            &ctx.accounts.share_mint,
            &ctx.accounts.buyer_share_token_account,
            &ctx.accounts.vault_authority,
            signer_seeds,
            shares,
        )?;

        Ok(())
    }

    pub fn deposit_revenue(ctx: Context<DepositRevenue>, amount: u64) -> Result<()> {
        let split = {
            let vault = &mut ctx.accounts.vault;
            vault.require_operator(ctx.accounts.operator.key())?;
            vault.record_revenue_deposit(amount)?
        };

        if split.platform_fee_amount > 0 {
            transfer_usdc(
                &ctx.accounts.usdc_token_program,
                &ctx.accounts.operator,
                &ctx.accounts.operator_usdc_token_account,
                &ctx.accounts.platform_treasury_token_account,
                &ctx.accounts.usdc_mint,
                split.platform_fee_amount,
            )?;
        }

        transfer_usdc(
            &ctx.accounts.usdc_token_program,
            &ctx.accounts.operator,
            &ctx.accounts.operator_usdc_token_account,
            &ctx.accounts.revenue_pool_token_account,
            &ctx.accounts.usdc_mint,
            split.distributable_amount,
        )?;

        Ok(())
    }

    pub fn claim_yield(ctx: Context<ClaimYield>) -> Result<()> {
        let vault_key = ctx.accounts.vault.key();
        let (revenue_index, authority_bump_value) = {
            let vault = &mut ctx.accounts.vault;
            vault.require_claimable()?;
            (vault.revenue_index, vault.authority_bump)
        };

        let position = &mut ctx.accounts.holder_position;
        position.require_holder(ctx.accounts.holder.key())?;
        let claimable = position.claim(revenue_index)?;
        ctx.accounts.vault.record_claim(claimable)?;
        let authority_bump = [authority_bump_value];
        let authority_seeds = [
            VAULT_AUTHORITY_SEED,
            vault_key.as_ref(),
            authority_bump.as_ref(),
        ];
        let signer_seeds = &[&authority_seeds[..]];

        transfer_from_vault(
            &ctx.accounts.usdc_token_program,
            &ctx.accounts.vault_authority,
            &ctx.accounts.revenue_pool_token_account,
            &ctx.accounts.holder_usdc_token_account,
            &ctx.accounts.usdc_mint,
            signer_seeds,
            claimable,
        )?;

        Ok(())
    }

    pub fn pause_vault(ctx: Context<PauseVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.require_admin(ctx.accounts.admin.key())?;
        vault.pause()
    }

    pub fn resume_vault(ctx: Context<PauseVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.require_admin(ctx.accounts.admin.key())?;
        vault.resume()
    }
}

fn validate_share_mint(mint: &InterfaceAccount<'_, Mint>) -> Result<()> {
    let mint_info = mint.to_account_info();
    require!(
        *mint_info.owner == Token2022::id(),
        VaultError::ShareMintNotToken2022
    );

    let mint_data = mint_info.try_borrow_data()?;
    let mint_state =
        spl_token_2022::extension::StateWithExtensions::<spl_token_2022::state::Mint>::unpack(
            &mint_data,
        )?;
    let mint_extensions = mint_state.get_extension_types()?;

    require!(
        mint_extensions.contains(&spl_token_2022::extension::ExtensionType::NonTransferable),
        VaultError::ShareMintNotNonTransferable
    );

    Ok(())
}

fn mint_shares<'info>(
    token_program: &Interface<'info, TokenInterface>,
    mint: &InterfaceAccount<'info, Mint>,
    recipient: &InterfaceAccount<'info, TokenAccount>,
    authority: &UncheckedAccount<'info>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    token_interface::mint_to(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            MintTo {
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
                to: recipient.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )
}

fn transfer_usdc<'info>(
    token_program: &Interface<'info, TokenInterface>,
    authority: &Signer<'info>,
    source: &InterfaceAccount<'info, TokenAccount>,
    destination: &InterfaceAccount<'info, TokenAccount>,
    mint: &InterfaceAccount<'info, Mint>,
    amount: u64,
) -> Result<()> {
    token_interface::transfer_checked(
        CpiContext::new(
            token_program.to_account_info(),
            TransferChecked {
                authority: authority.to_account_info(),
                from: source.to_account_info(),
                mint: mint.to_account_info(),
                to: destination.to_account_info(),
            },
        ),
        amount,
        mint.decimals,
    )
}

fn transfer_from_vault<'info>(
    token_program: &Interface<'info, TokenInterface>,
    authority: &UncheckedAccount<'info>,
    source: &InterfaceAccount<'info, TokenAccount>,
    destination: &InterfaceAccount<'info, TokenAccount>,
    mint: &InterfaceAccount<'info, Mint>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            TransferChecked {
                authority: authority.to_account_info(),
                from: source.to_account_info(),
                mint: mint.to_account_info(),
                to: destination.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        mint.decimals,
    )
}

fn ensure_rent_exempt_size<'info>(
    payer: &Signer<'info>,
    account: &UncheckedAccount<'info>,
    system_program: &Program<'info, System>,
    new_size: usize,
) -> Result<()> {
    let account_info = account.to_account_info();
    let required_lamports = Rent::get()?.minimum_balance(new_size);
    let current_lamports = account_info.lamports();

    if current_lamports >= required_lamports {
        return Ok(());
    }

    invoke(
        &system_instruction::transfer(
            &payer.key(),
            &account.key(),
            required_lamports.saturating_sub(current_lamports),
        ),
        &[
            payer.to_account_info(),
            account_info,
            system_program.to_account_info(),
        ],
    )?;

    Ok(())
}

fn deserialize_legacy_vault(account_info: &AccountInfo<'_>) -> Result<LegacyVault> {
    let data = account_info.try_borrow_data()?;
    require!(
        data.len() >= 8 && &data[..8] == Vault::DISCRIMINATOR,
        VaultError::InvalidVaultAccount
    );

    let mut data_slice: &[u8] = &data[8..];
    LegacyVault::deserialize(&mut data_slice)
        .map_err(|_| error!(VaultError::InvalidLegacyVaultLayout))
}

fn migrate_legacy_vault(
    legacy_vault: LegacyVault,
    platform_fee_bps: u16,
    platform_treasury_token_account: Pubkey,
) -> Vault {
    Vault {
        authority_bump: legacy_vault.authority_bump,
        bump: legacy_vault.bump,
        platform_fee_bps,
        status: legacy_vault.status,
        admin: legacy_vault.admin,
        operator: legacy_vault.operator,
        share_mint: legacy_vault.share_mint,
        usdc_mint: legacy_vault.usdc_mint,
        operator_settlement_token_account: legacy_vault.operator_settlement_token_account,
        platform_treasury_token_account,
        revenue_pool_token_account: legacy_vault.revenue_pool_token_account,
        total_shares: legacy_vault.total_shares,
        public_tranche_shares: legacy_vault.public_tranche_shares,
        remaining_public_shares: legacy_vault.remaining_public_shares,
        minted_shares: legacy_vault.minted_shares,
        share_price_usdc: legacy_vault.share_price_usdc,
        revenue_index: legacy_vault.revenue_index,
        total_platform_fees_collected: 0,
        total_primary_sale_proceeds: legacy_vault.total_primary_sale_proceeds,
        total_revenue_deposited: legacy_vault.total_revenue_deposited,
        total_revenue_claimed: legacy_vault.total_revenue_claimed,
        public_metadata_uri: legacy_vault.public_metadata_uri,
        proof_bundle_hash: legacy_vault.proof_bundle_hash,
    }
}

fn serialize_vault(account_info: &AccountInfo<'_>, vault: &Vault) -> Result<()> {
    let mut data = account_info.try_borrow_mut_data()?;
    data.fill(0);
    let mut data_slice: &mut [u8] = &mut data;
    vault.try_serialize(&mut data_slice)?;
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeVaultArgs {
    pub total_shares: u64,
    pub public_tranche_shares: u64,
    pub share_price_usdc: u64,
    pub platform_fee_bps: u16,
    pub public_metadata_uri: String,
    pub proof_bundle_hash: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MigrateVaultArgs {
    pub platform_fee_bps: u16,
}

#[derive(Accounts)]
#[instruction(args: InitializeVaultArgs)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub operator: SystemAccount<'info>,
    /// CHECK: PDA authority used only for token CPIs after validation via seeds.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, vault.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = admin,
        seeds = [VAULT_SEED, share_mint.key().as_ref()],
        bump,
        space = 8 + Vault::INIT_SPACE
    )]
    pub vault: Account<'info, Vault>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub share_mint: InterfaceAccount<'info, Mint>,
    pub operator_settlement_token_account: InterfaceAccount<'info, TokenAccount>,
    pub platform_treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    pub revenue_pool_token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: MigrateVaultArgs)]
pub struct MigrateVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: legacy vault accounts may not deserialize into the current layout until migrated.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
    pub platform_treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub operator: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, share_mint.key().as_ref()],
        bump = vault.bump,
        constraint = vault.operator == operator.key() @ VaultError::InvalidOperator,
        constraint = vault.share_mint == share_mint.key() @ VaultError::InvalidShareMint
    )]
    pub vault: Account<'info, Vault>,
    /// CHECK: PDA authority used only for token CPIs after validation via seeds.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, vault.key().as_ref()],
        bump = vault.authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub share_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        constraint = operator_share_token_account.owner == operator.key() @ VaultError::InvalidShareAccountOwner,
        constraint = operator_share_token_account.mint == share_mint.key() @ VaultError::InvalidShareMint
    )]
    pub operator_share_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = admin,
        seeds = [HOLDER_POSITION_SEED, vault.key().as_ref(), operator.key().as_ref()],
        bump,
        space = 8 + HolderPosition::INIT_SPACE
    )]
    pub operator_position: Account<'info, HolderPosition>,
    pub share_token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseShares<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, share_mint.key().as_ref()],
        bump = vault.bump,
        constraint = vault.share_mint == share_mint.key() @ VaultError::InvalidShareMint,
        constraint = vault.usdc_mint == usdc_mint.key() @ VaultError::InvalidUsdcMint
    )]
    pub vault: Box<Account<'info, Vault>>,
    /// CHECK: PDA authority used only for token CPIs after validation via seeds.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, vault.key().as_ref()],
        bump = vault.authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub share_mint: Box<InterfaceAccount<'info, Mint>>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        constraint = buyer_usdc_token_account.owner == buyer.key() @ VaultError::InvalidBuyerUsdcOwner,
        constraint = buyer_usdc_token_account.mint == usdc_mint.key() @ VaultError::InvalidUsdcAccountMint
    )]
    pub buyer_usdc_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        address = vault.operator_settlement_token_account @ VaultError::InvalidOperatorSettlementAccount,
        constraint = operator_settlement_token_account.mint == usdc_mint.key() @ VaultError::InvalidUsdcAccountMint
    )]
    pub operator_settlement_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = buyer_share_token_account.owner == buyer.key() @ VaultError::InvalidShareAccountOwner,
        constraint = buyer_share_token_account.mint == share_mint.key() @ VaultError::InvalidShareMint
    )]
    pub buyer_share_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = buyer,
        seeds = [HOLDER_POSITION_SEED, vault.key().as_ref(), buyer.key().as_ref()],
        bump,
        space = 8 + HolderPosition::INIT_SPACE
    )]
    pub buyer_position: Box<Account<'info, HolderPosition>>,
    pub share_token_program: Interface<'info, TokenInterface>,
    pub usdc_token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositRevenue<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.share_mint.as_ref()],
        bump = vault.bump,
        constraint = vault.usdc_mint == usdc_mint.key() @ VaultError::InvalidUsdcMint
    )]
    pub vault: Account<'info, Vault>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        constraint = operator_usdc_token_account.owner == operator.key() @ VaultError::InvalidOperatorUsdcOwner,
        constraint = operator_usdc_token_account.mint == usdc_mint.key() @ VaultError::InvalidUsdcAccountMint
    )]
    pub operator_usdc_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        address = vault.revenue_pool_token_account @ VaultError::InvalidRevenuePoolAccount,
        constraint = revenue_pool_token_account.mint == usdc_mint.key() @ VaultError::InvalidUsdcAccountMint
    )]
    pub revenue_pool_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        address = vault.platform_treasury_token_account @ VaultError::InvalidPlatformTreasuryAccount,
        constraint = platform_treasury_token_account.mint == usdc_mint.key() @ VaultError::InvalidUsdcAccountMint
    )]
    pub platform_treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    pub usdc_token_program: Interface<'info, TokenInterface>,
}

pub struct RevenueDepositSplit {
    pub distributable_amount: u64,
    pub platform_fee_amount: u64,
}

#[derive(Accounts)]
pub struct ClaimYield<'info> {
    #[account(mut)]
    pub holder: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.share_mint.as_ref()],
        bump = vault.bump,
        constraint = vault.usdc_mint == usdc_mint.key() @ VaultError::InvalidUsdcMint
    )]
    pub vault: Account<'info, Vault>,
    /// CHECK: PDA authority used only for token CPIs after validation via seeds.
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, vault.key().as_ref()],
        bump = vault.authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [HOLDER_POSITION_SEED, vault.key().as_ref(), holder.key().as_ref()],
        bump = holder_position.bump
    )]
    pub holder_position: Account<'info, HolderPosition>,
    #[account(
        mut,
        address = vault.revenue_pool_token_account @ VaultError::InvalidRevenuePoolAccount,
        constraint = revenue_pool_token_account.mint == usdc_mint.key() @ VaultError::InvalidUsdcAccountMint
    )]
    pub revenue_pool_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = holder_usdc_token_account.owner == holder.key() @ VaultError::InvalidHolderUsdcOwner,
        constraint = holder_usdc_token_account.mint == usdc_mint.key() @ VaultError::InvalidUsdcAccountMint
    )]
    pub holder_usdc_token_account: InterfaceAccount<'info, TokenAccount>,
    pub usdc_token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct PauseVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.share_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
}

#[account]
#[derive(InitSpace)]
pub struct HolderPosition {
    pub bump: u8,
    pub vault: Pubkey,
    pub holder: Pubkey,
    pub shares: u64,
    pub pending_claims: u64,
    pub revenue_index_checkpoint: u128,
    pub total_claimed: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct LegacyVault {
    pub authority_bump: u8,
    pub bump: u8,
    pub status: VaultStatus,
    pub admin: Pubkey,
    pub operator: Pubkey,
    pub share_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub operator_settlement_token_account: Pubkey,
    pub revenue_pool_token_account: Pubkey,
    pub total_shares: u64,
    pub public_tranche_shares: u64,
    pub remaining_public_shares: u64,
    pub minted_shares: u64,
    pub share_price_usdc: u64,
    pub revenue_index: u128,
    pub total_primary_sale_proceeds: u64,
    pub total_revenue_deposited: u64,
    pub total_revenue_claimed: u64,
    #[max_len(MAX_METADATA_URI_LEN)]
    pub public_metadata_uri: String,
    #[max_len(MAX_PROOF_HASH_LEN)]
    pub proof_bundle_hash: String,
}

impl HolderPosition {
    fn claim(&mut self, vault_revenue_index: u128) -> Result<u64> {
        self.sync_pending_claims(vault_revenue_index)?;
        require_gt!(self.pending_claims, 0, VaultError::NothingToClaim);

        let claimable = self.pending_claims;
        self.pending_claims = 0;
        self.total_claimed = self
            .total_claimed
            .checked_add(claimable)
            .ok_or(VaultError::MathOverflow)?;

        Ok(claimable)
    }

    fn credit_shares(&mut self, vault_revenue_index: u128, shares: u64) -> Result<()> {
        require_gt!(shares, 0, VaultError::InvalidShareAmount);
        self.sync_pending_claims(vault_revenue_index)?;
        self.shares = self
            .shares
            .checked_add(shares)
            .ok_or(VaultError::MathOverflow)?;
        Ok(())
    }

    fn ensure_identity(&mut self, vault: Pubkey, holder: Pubkey, bump: u8) -> Result<()> {
        if self.vault == Pubkey::default() && self.holder == Pubkey::default() {
            self.bump = bump;
            self.vault = vault;
            self.holder = holder;
            self.shares = 0;
            self.pending_claims = 0;
            self.revenue_index_checkpoint = 0;
            self.total_claimed = 0;
            return Ok(());
        }

        require_keys_eq!(self.vault, vault, VaultError::PositionVaultMismatch);
        require_keys_eq!(self.holder, holder, VaultError::PositionHolderMismatch);

        Ok(())
    }

    fn require_holder(&self, holder: Pubkey) -> Result<()> {
        require_keys_eq!(self.holder, holder, VaultError::PositionHolderMismatch);
        Ok(())
    }

    fn sync_pending_claims(&mut self, vault_revenue_index: u128) -> Result<()> {
        let delta_index = vault_revenue_index
            .checked_sub(self.revenue_index_checkpoint)
            .ok_or(VaultError::RevenueIndexRegression)?;
        let accrued = (self.shares as u128)
            .checked_mul(delta_index)
            .ok_or(VaultError::MathOverflow)?
            / INDEX_SCALE;
        let accrued: u64 = accrued.try_into().map_err(|_| VaultError::MathOverflow)?;

        self.pending_claims = self
            .pending_claims
            .checked_add(accrued)
            .ok_or(VaultError::MathOverflow)?;
        self.revenue_index_checkpoint = vault_revenue_index;

        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority_bump: u8,
    pub bump: u8,
    pub platform_fee_bps: u16,
    pub status: VaultStatus,
    pub admin: Pubkey,
    pub operator: Pubkey,
    pub share_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub operator_settlement_token_account: Pubkey,
    pub platform_treasury_token_account: Pubkey,
    pub revenue_pool_token_account: Pubkey,
    pub total_shares: u64,
    pub public_tranche_shares: u64,
    pub remaining_public_shares: u64,
    pub minted_shares: u64,
    pub share_price_usdc: u64,
    pub revenue_index: u128,
    pub total_platform_fees_collected: u64,
    pub total_primary_sale_proceeds: u64,
    pub total_revenue_deposited: u64,
    pub total_revenue_claimed: u64,
    #[max_len(MAX_METADATA_URI_LEN)]
    pub public_metadata_uri: String,
    #[max_len(MAX_PROOF_HASH_LEN)]
    pub proof_bundle_hash: String,
}

impl Vault {
    fn approve(&mut self) -> Result<u64> {
        require!(
            self.status == VaultStatus::PendingReview,
            VaultError::VaultAlreadyVerified
        );

        let operator_reserve_shares = self.operator_reserve_shares();
        self.minted_shares = self
            .minted_shares
            .checked_add(operator_reserve_shares)
            .ok_or(VaultError::MathOverflow)?;
        self.status = VaultStatus::Verified;

        Ok(operator_reserve_shares)
    }

    fn operator_reserve_shares(&self) -> u64 {
        self.total_shares
            .saturating_sub(self.public_tranche_shares)
    }

    fn pause(&mut self) -> Result<()> {
        require!(
            self.status == VaultStatus::Verified,
            VaultError::VaultNotVerified
        );
        self.status = VaultStatus::Paused;
        Ok(())
    }

    fn record_claim(&mut self, amount: u64) -> Result<()> {
        self.total_revenue_claimed = self
            .total_revenue_claimed
            .checked_add(amount)
            .ok_or(VaultError::MathOverflow)?;
        Ok(())
    }

    fn record_purchase(&mut self, shares: u64) -> Result<u64> {
        require!(
            self.status == VaultStatus::Verified,
            VaultError::VaultNotVerified
        );
        require_gt!(shares, 0, VaultError::InvalidShareAmount);
        require_gte!(
            self.remaining_public_shares,
            shares,
            VaultError::InsufficientPublicShares
        );

        let payment_amount = shares
            .checked_mul(self.share_price_usdc)
            .ok_or(VaultError::MathOverflow)?;
        self.remaining_public_shares = self
            .remaining_public_shares
            .checked_sub(shares)
            .ok_or(VaultError::MathOverflow)?;
        self.minted_shares = self
            .minted_shares
            .checked_add(shares)
            .ok_or(VaultError::MathOverflow)?;
        self.total_primary_sale_proceeds = self
            .total_primary_sale_proceeds
            .checked_add(payment_amount)
            .ok_or(VaultError::MathOverflow)?;

        Ok(payment_amount)
    }

    fn record_revenue_deposit(&mut self, amount: u64) -> Result<RevenueDepositSplit> {
        require_gt!(amount, 0, VaultError::InvalidDepositAmount);
        require_gt!(self.minted_shares, 0, VaultError::NoMintedSupply);
        require!(
            self.status == VaultStatus::Verified || self.status == VaultStatus::Paused,
            VaultError::VaultNotVerified
        );
        require!(
            self.platform_fee_bps < MAX_PLATFORM_FEE_BPS,
            VaultError::InvalidPlatformFeeBps
        );

        let platform_fee_amount = (amount as u128)
            .checked_mul(self.platform_fee_bps as u128)
            .ok_or(VaultError::MathOverflow)?
            / MAX_PLATFORM_FEE_BPS as u128;
        let platform_fee_amount: u64 = platform_fee_amount
            .try_into()
            .map_err(|_| VaultError::MathOverflow)?;
        let distributable_amount = amount
            .checked_sub(platform_fee_amount)
            .ok_or(VaultError::MathOverflow)?;
        require_gt!(distributable_amount, 0, VaultError::DepositTooSmall);

        let revenue_delta = (distributable_amount as u128)
            .checked_mul(INDEX_SCALE)
            .ok_or(VaultError::MathOverflow)?
            / self.minted_shares as u128;
        require_gt!(revenue_delta, 0, VaultError::DepositTooSmall);

        self.revenue_index = self
            .revenue_index
            .checked_add(revenue_delta)
            .ok_or(VaultError::MathOverflow)?;
        self.total_revenue_deposited = self
            .total_revenue_deposited
            .checked_add(distributable_amount)
            .ok_or(VaultError::MathOverflow)?;
        self.total_platform_fees_collected = self
            .total_platform_fees_collected
            .checked_add(platform_fee_amount)
            .ok_or(VaultError::MathOverflow)?;

        Ok(RevenueDepositSplit {
            distributable_amount,
            platform_fee_amount,
        })
    }

    fn require_admin(&self, admin: Pubkey) -> Result<()> {
        require_keys_eq!(self.admin, admin, VaultError::InvalidAdmin);
        Ok(())
    }

    fn require_claimable(&self) -> Result<()> {
        require!(
            self.status == VaultStatus::Verified,
            VaultError::ClaimsDisabled
        );
        Ok(())
    }

    fn require_operator(&self, operator: Pubkey) -> Result<()> {
        require_keys_eq!(self.operator, operator, VaultError::InvalidOperator);
        Ok(())
    }

    fn resume(&mut self) -> Result<()> {
        require!(self.status == VaultStatus::Paused, VaultError::VaultNotPaused);
        self.status = VaultStatus::Verified;
        Ok(())
    }
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    InitSpace
)]
pub enum VaultStatus {
    PendingReview,
    Verified,
    Paused,
}

#[error_code]
pub enum VaultError {
    #[msg("The admin signer does not match the vault admin.")]
    InvalidAdmin,
    #[msg("Buyer USDC token account owner is invalid.")]
    InvalidBuyerUsdcOwner,
    #[msg("Deposit amount is invalid.")]
    InvalidDepositAmount,
    #[msg("Holder USDC token account owner is invalid.")]
    InvalidHolderUsdcOwner,
    #[msg("Operator account does not match the vault operator.")]
    InvalidOperator,
    #[msg("Operator settlement account is invalid.")]
    InvalidOperatorSettlementAccount,
    #[msg("Operator settlement owner must be the operator wallet.")]
    InvalidOperatorSettlementOwner,
    #[msg("Operator USDC token account owner is invalid.")]
    InvalidOperatorUsdcOwner,
    #[msg("Proof bundle hash exceeds the configured maximum length.")]
    InvalidProofBundleHash,
    #[msg("Public metadata URI exceeds the configured maximum length.")]
    InvalidMetadataUri,
    #[msg("Platform fee basis points must be between 0 and 9999.")]
    InvalidPlatformFeeBps,
    #[msg("Platform treasury account is invalid.")]
    InvalidPlatformTreasuryAccount,
    #[msg("Legacy vault data could not be decoded for migration.")]
    InvalidLegacyVaultLayout,
    #[msg("Public tranche supply must be positive and not exceed total shares.")]
    InvalidPublicTranche,
    #[msg("Revenue pool token account does not match the vault configuration.")]
    InvalidRevenuePoolAccount,
    #[msg("Revenue pool token account owner must be the vault authority.")]
    InvalidRevenuePoolOwner,
    #[msg("Share amount is invalid.")]
    InvalidShareAmount,
    #[msg("Share token account owner does not match the expected wallet.")]
    InvalidShareAccountOwner,
    #[msg("Share mint account is invalid.")]
    InvalidShareMint,
    #[msg("Vault shares must use a zero-decimal share mint.")]
    InvalidShareMintDecimals,
    #[msg("Share price must be positive.")]
    InvalidSharePrice,
    #[msg("Total shares must be positive.")]
    InvalidTotalShares,
    #[msg("USDC mint account is invalid.")]
    InvalidUsdcMint,
    #[msg("Token account mint must match the configured USDC mint.")]
    InvalidUsdcAccountMint,
    #[msg("Claims are currently disabled for this vault.")]
    ClaimsDisabled,
    #[msg("Deposit is too small for the current minted supply.")]
    DepositTooSmall,
    #[msg("Not enough public shares remain for this purchase.")]
    InsufficientPublicShares,
    #[msg("Math overflow detected.")]
    MathOverflow,
    #[msg("No minted supply exists yet.")]
    NoMintedSupply,
    #[msg("Nothing is claimable for this holder.")]
    NothingToClaim,
    #[msg("Holder position is tied to a different holder.")]
    PositionHolderMismatch,
    #[msg("Holder position is tied to a different vault.")]
    PositionVaultMismatch,
    #[msg("Revenue index cannot move backwards.")]
    RevenueIndexRegression,
    #[msg("Share mint must start with zero supply before approval.")]
    ShareMintMustStartEmpty,
    #[msg("Vault shares must use the Token-2022 program.")]
    ShareMintNotToken2022,
    #[msg("Vault shares must use the non-transferable Token-2022 extension.")]
    ShareMintNotNonTransferable,
    #[msg("Vault is already verified.")]
    VaultAlreadyVerified,
    #[msg("Vault account already uses the current layout.")]
    VaultAlreadyMigrated,
    #[msg("Vault account is invalid.")]
    InvalidVaultAccount,
    #[msg("Vault account size does not match a supported layout.")]
    InvalidVaultAccountSize,
    #[msg("Vault must be paused before it can be resumed.")]
    VaultNotPaused,
    #[msg("Vault must be verified for this action.")]
    VaultNotVerified,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_vault() -> Vault {
        Vault {
            authority_bump: 255,
            bump: 254,
            platform_fee_bps: 1_000,
            status: VaultStatus::PendingReview,
            admin: Pubkey::new_unique(),
            operator: Pubkey::new_unique(),
            share_mint: Pubkey::new_unique(),
            usdc_mint: Pubkey::new_unique(),
            operator_settlement_token_account: Pubkey::new_unique(),
            platform_treasury_token_account: Pubkey::new_unique(),
            revenue_pool_token_account: Pubkey::new_unique(),
            total_shares: 1_000,
            public_tranche_shares: 700,
            remaining_public_shares: 700,
            minted_shares: 0,
            share_price_usdc: 5,
            revenue_index: 0,
            total_platform_fees_collected: 0,
            total_primary_sale_proceeds: 0,
            total_revenue_deposited: 0,
            total_revenue_claimed: 0,
            public_metadata_uri: "ipfs://metadata".to_string(),
            proof_bundle_hash: "proof-hash".to_string(),
        }
    }

    fn sample_legacy_vault() -> LegacyVault {
        LegacyVault {
            authority_bump: 255,
            bump: 254,
            status: VaultStatus::Verified,
            admin: Pubkey::new_unique(),
            operator: Pubkey::new_unique(),
            share_mint: Pubkey::new_unique(),
            usdc_mint: Pubkey::new_unique(),
            operator_settlement_token_account: Pubkey::new_unique(),
            revenue_pool_token_account: Pubkey::new_unique(),
            total_shares: 1_000,
            public_tranche_shares: 700,
            remaining_public_shares: 620,
            minted_shares: 380,
            share_price_usdc: 5,
            revenue_index: 1_500_000_000_000,
            total_primary_sale_proceeds: 1_900,
            total_revenue_deposited: 1_140,
            total_revenue_claimed: 720,
            public_metadata_uri: "ipfs://legacy-metadata".to_string(),
            proof_bundle_hash: "legacy-proof-hash".to_string(),
        }
    }

    fn sample_position(holder: Pubkey, vault: Pubkey) -> HolderPosition {
        HolderPosition {
            bump: 1,
            vault,
            holder,
            shares: 0,
            pending_claims: 0,
            revenue_index_checkpoint: 0,
            total_claimed: 0,
        }
    }

    #[test]
    fn approval_mints_only_operator_reserve_shares() {
        let mut vault = sample_vault();
        let reserve = vault.approve().unwrap();

        assert_eq!(reserve, 300);
        assert_eq!(vault.status, VaultStatus::Verified);
        assert_eq!(vault.minted_shares, 300);
        assert_eq!(vault.remaining_public_shares, 700);
    }

    #[test]
    fn primary_sale_is_separate_from_revenue_pool_accounting() {
        let mut vault = sample_vault();
        vault.approve().unwrap();

        let payment = vault.record_purchase(100).unwrap();

        assert_eq!(payment, 500);
        assert_eq!(vault.total_primary_sale_proceeds, 500);
        assert_eq!(vault.total_revenue_deposited, 0);
        assert_eq!(vault.revenue_index, 0);
        assert_eq!(vault.minted_shares, 400);
    }

    #[test]
    fn newly_purchased_shares_do_not_claim_past_revenue() {
        let mut vault = sample_vault();
        let vault_key = Pubkey::new_unique();
        let mut operator_position = sample_position(vault.operator, vault_key);
        let buyer = Pubkey::new_unique();
        let mut buyer_position = sample_position(buyer, vault_key);

        let reserve = vault.approve().unwrap();
        operator_position.credit_shares(vault.revenue_index, reserve).unwrap();

        vault.record_revenue_deposit(900).unwrap();
        vault.record_purchase(100).unwrap();
        buyer_position.credit_shares(vault.revenue_index, 100).unwrap();

        let first_claim_err = buyer_position.claim(vault.revenue_index).unwrap_err();
        assert!(first_claim_err.to_string().contains("Nothing is claimable"));

        vault.record_revenue_deposit(400).unwrap();

        let buyer_claim = buyer_position.claim(vault.revenue_index).unwrap();
        let operator_claim = operator_position.claim(vault.revenue_index).unwrap();

        assert_eq!(buyer_claim, 90);
        assert_eq!(operator_claim, 1_080);
    }

    #[test]
    fn claim_cannot_double_pay() {
        let mut vault = sample_vault();
        let vault_key = Pubkey::new_unique();
        let mut operator_position = sample_position(vault.operator, vault_key);

        let reserve = vault.approve().unwrap();
        operator_position.credit_shares(vault.revenue_index, reserve).unwrap();
        vault.record_revenue_deposit(600).unwrap();

        let first_claim = operator_position.claim(vault.revenue_index).unwrap();
        vault.record_claim(first_claim).unwrap();

        assert_eq!(first_claim, 540);
        let second_claim_err = operator_position.claim(vault.revenue_index).unwrap_err();
        assert!(second_claim_err.to_string().contains("Nothing is claimable"));
    }

    #[test]
    fn performance_fee_is_retained_before_investor_distribution() {
        let mut vault = sample_vault();
        let reserve = vault.approve().unwrap();
        assert_eq!(reserve, 300);

        let split = vault.record_revenue_deposit(900).unwrap();

        assert_eq!(split.platform_fee_amount, 90);
        assert_eq!(split.distributable_amount, 810);
        assert_eq!(vault.total_platform_fees_collected, 90);
        assert_eq!(vault.total_revenue_deposited, 810);
        assert_eq!(vault.revenue_index, 2_700_000_000_000);
    }

    #[test]
    fn paused_vault_blocks_purchase_and_claim_but_not_deposit() {
        let mut vault = sample_vault();
        let reserve = vault.approve().unwrap();
        assert_eq!(reserve, 300);

        vault.pause().unwrap();
        let purchase_err = vault.record_purchase(10).unwrap_err();
        assert!(purchase_err
            .to_string()
            .contains("Vault must be verified for this action"));
        let claim_err = vault.require_claimable().unwrap_err();
        assert!(claim_err
            .to_string()
            .contains("Claims are currently disabled for this vault"));

        assert!(vault.record_revenue_deposit(300).is_ok());
        assert_eq!(vault.revenue_index, 900_000_000_000);
    }

    #[test]
    fn migrating_legacy_vault_preserves_existing_accounting() {
        let legacy_vault = sample_legacy_vault();
        let treasury = Pubkey::new_unique();

        let migrated_vault = migrate_legacy_vault(legacy_vault.clone(), 1_250, treasury);

        assert_eq!(migrated_vault.authority_bump, legacy_vault.authority_bump);
        assert_eq!(migrated_vault.bump, legacy_vault.bump);
        assert_eq!(migrated_vault.status, legacy_vault.status);
        assert_eq!(migrated_vault.platform_fee_bps, 1_250);
        assert_eq!(migrated_vault.platform_treasury_token_account, treasury);
        assert_eq!(
            migrated_vault.total_revenue_deposited,
            legacy_vault.total_revenue_deposited
        );
        assert_eq!(
            migrated_vault.total_primary_sale_proceeds,
            legacy_vault.total_primary_sale_proceeds
        );
        assert_eq!(migrated_vault.total_platform_fees_collected, 0);
        assert_eq!(migrated_vault.public_metadata_uri, legacy_vault.public_metadata_uri);
        assert_eq!(migrated_vault.proof_bundle_hash, legacy_vault.proof_bundle_hash);
    }
}
