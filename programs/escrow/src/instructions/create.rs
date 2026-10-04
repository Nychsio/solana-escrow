use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::spl_token_2022::{
        self,
        extension::{BaseStateWithExtensions, ExtensionType, StateWithExtensions},
    },
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{errors::ErrorCode, events::*, state::*};

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct Create<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: only stored as the payout recipient; does not sign `create`.
    pub freelancer: UncheckedAccount<'info>,
    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = client,
        token::token_program = token_program,
    )]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = client,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [ESCROW_SEED, client.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    /// Vault: ATA owned by the escrow PDA, so only this program can sign for it.
    #[account(
        init,
        payer = client,
        associated_token::mint = mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Token-2022 extensions the escrow tolerates. Everything else is refused (deny by
/// default): it could move, freeze, tax or pause the vault behind the program's back.
/// A plain freeze authority is not an extension and is accepted (USDC has one).
const ALLOWED_EXTENSIONS: [ExtensionType; 6] = [
    ExtensionType::MetadataPointer,
    ExtensionType::TokenMetadata,
    ExtensionType::GroupPointer,
    ExtensionType::GroupMemberPointer,
    ExtensionType::TokenGroup,
    ExtensionType::TokenGroupMember,
];

fn check_mint_supported(mint: &AccountInfo) -> Result<()> {
    // Classic SPL Token mints have no extensions.
    if *mint.owner != spl_token_2022::ID {
        return Ok(());
    }
    let data = mint.try_borrow_data()?;
    let state = StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&data)?;
    for extension in state.get_extension_types()? {
        require!(
            ALLOWED_EXTENSIONS.contains(&extension),
            ErrorCode::UnsupportedMint
        );
    }
    Ok(())
}

pub fn create(
    ctx: Context<Create>,
    id: u64,
    amount: u64,
    deadline_ts: i64,
    review_window_secs: u64,
    dispute_window_secs: u64,
    bond_bps: u16,
) -> Result<()> {
    check_mint_supported(&ctx.accounts.mint.to_account_info())?;
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(dispute_window_secs > 0, ErrorCode::InvalidDisputeWindow);
    require!(bond_bps <= MAX_BPS, ErrorCode::InvalidBps);
    let bond_amount = u64::try_from(u128::from(amount) * u128::from(bond_bps) / u128::from(MAX_BPS))
        .map_err(|_| ErrorCode::InvalidBps)?;
    let now = Clock::get()?.unix_timestamp;
    require!(deadline_ts > now, ErrorCode::DeadlineInPast);

    ctx.accounts.escrow.set_inner(Escrow {
        client: ctx.accounts.client.key(),
        freelancer: ctx.accounts.freelancer.key(),
        mint: ctx.accounts.mint.key(),
        id,
        amount,
        deadline_ts,
        review_window_secs,
        delivered_at: None,
        state: EscrowState::Funded,
        bump: ctx.bumps.escrow,
        deliverable_hash: [0; 32],
        dispute_window_secs,
        frozen_at: 0,
        settle_proposer: SETTLE_NONE,
        settle_bps: 0,
        bond_amount,
        _reserved: [0; 37],
    });

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.client_token.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.client.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
    token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

    emit!(EscrowCreated {
        escrow: ctx.accounts.escrow.key(),
        client: ctx.accounts.client.key(),
        freelancer: ctx.accounts.freelancer.key(),
        mint: ctx.accounts.mint.key(),
        id,
        amount,
        bond_amount,
        deadline_ts,
    });
    Ok(())
}
