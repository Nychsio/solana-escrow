use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct AcceptJob<'info> {
    pub freelancer: Signer<'info>,
    #[account(mut, has_one = freelancer @ ErrorCode::Unauthorized, has_one = mint)]
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
pub struct MarkDelivered<'info> {
    pub freelancer: Signer<'info>,
    #[account(mut, has_one = freelancer @ ErrorCode::Unauthorized)]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct Reject<'info> {
    pub client: Signer<'info>,
    #[account(mut, has_one = client @ ErrorCode::Unauthorized, has_one = mint)]
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

/// Freelancer takes the job and puts up their bond; the client can no longer withdraw.
pub fn accept_job(ctx: Context<AcceptJob>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Funded])?;
    let now = Clock::get()?.unix_timestamp;
    require!(now <= escrow.deadline_ts, ErrorCode::DeadlinePassed);
    escrow.state = EscrowState::Accepted;

    let bond = escrow.bond_amount;
    if bond > 0 {
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.freelancer_token.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.freelancer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, bond, ctx.accounts.mint.decimals)?;
    }
    Ok(())
}

/// Freelancer reports delivery before the deadline; starts the review window.
pub fn mark_delivered(ctx: Context<MarkDelivered>, deliverable_hash: [u8; 32]) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Accepted])?;
    let now = Clock::get()?.unix_timestamp;
    require!(now <= escrow.deadline_ts, ErrorCode::DeadlinePassed);

    escrow.delivered_at = Some(now);
    escrow.deliverable_hash = deliverable_hash;
    escrow.state = EscrowState::Delivered;
    Ok(())
}

/// Client disputes the delivery inside the review window. The funds stay in
/// the vault until the parties settle or the dispute window runs out (see dispute.rs).
pub fn reject(ctx: Context<Reject>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Delivered])?;
    let now = Clock::get()?.unix_timestamp;
    require!(now <= escrow.review_ends_at()?, ErrorCode::ReviewWindowClosed);

    escrow.frozen_at = now;
    escrow.state = EscrowState::Frozen;

    // The client matches the freelancer's bond, so a malicious reject is not free.
    let bond = escrow.bond_amount;
    if bond > 0 {
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.client_token.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.client.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, bond, ctx.accounts.mint.decimals)?;
    }
    Ok(())
}
