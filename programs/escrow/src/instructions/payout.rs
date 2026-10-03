use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct Release<'info> {
    pub client: Signer<'info>,
    #[account(
        mut,
        has_one = client @ ErrorCode::Unauthorized,
        has_one = mint,
    )]
    pub escrow: Account<'info, Escrow>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = escrow.freelancer,
        token::token_program = token_program,
    )]
    pub freelancer_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ClaimIfSilent<'info> {
    pub freelancer: Signer<'info>,
    #[account(
        mut,
        has_one = freelancer @ ErrorCode::Unauthorized,
        has_one = mint,
    )]
    pub escrow: Account<'info, Escrow>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = freelancer,
        token::token_program = token_program,
    )]
    pub freelancer_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct RefundIfLate<'info> {
    pub client: Signer<'info>,
    #[account(
        mut,
        has_one = client @ ErrorCode::Unauthorized,
        has_one = mint,
    )]
    pub escrow: Account<'info, Escrow>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = client,
        token::token_program = token_program,
    )]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

/// Client accepts the work (or pays early) and the vault goes to the freelancer.
pub fn release(ctx: Context<Release>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Funded, EscrowState::Delivered])?;
    escrow.state = EscrowState::Released;

    pay_from_vault(
        &ctx.accounts.escrow,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.freelancer_token,
        &ctx.accounts.token_program,
        ctx.accounts.vault.amount,
    )
}

/// Client stayed silent for the whole review window: freelancer pays themselves.
pub fn claim_if_silent(ctx: Context<ClaimIfSilent>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Delivered])?;
    let now = Clock::get()?.unix_timestamp;
    require!(now > escrow.review_ends_at()?, ErrorCode::ReviewWindowOpen);
    escrow.state = EscrowState::Released;

    pay_from_vault(
        &ctx.accounts.escrow,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.freelancer_token,
        &ctx.accounts.token_program,
        ctx.accounts.vault.amount,
    )
}

/// Nothing was delivered before the deadline: client takes the funds back.
pub fn refund_if_late(ctx: Context<RefundIfLate>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Funded])?;
    let now = Clock::get()?.unix_timestamp;
    require!(now > escrow.deadline_ts, ErrorCode::DeadlineNotReached);
    escrow.state = EscrowState::Refunded;

    pay_from_vault(
        &ctx.accounts.escrow,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.client_token,
        &ctx.accounts.token_program,
        ctx.accounts.vault.amount,
    )
}

/// The only place tokens are paid out of a vault. The escrow PDA signs via
/// its seeds, which only this program can do.
pub(crate) fn pay_from_vault<'info>(
    escrow: &Account<'info, Escrow>,
    vault: &InterfaceAccount<'info, TokenAccount>,
    mint: &InterfaceAccount<'info, Mint>,
    destination: &InterfaceAccount<'info, TokenAccount>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = TransferChecked {
        from: vault.to_account_info(),
        mint: mint.to_account_info(),
        to: destination.to_account_info(),
        authority: escrow.to_account_info(),
    };
    escrow.with_signer_seeds(|seeds| {
        let cpi_ctx = CpiContext::new_with_signer(token_program.key(), cpi_accounts, seeds);
        token_interface::transfer_checked(cpi_ctx, amount, mint.decimals)
    })
}
