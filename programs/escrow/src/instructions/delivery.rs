use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{errors::ErrorCode, events::*, state::*};

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
/// The freelancer signs the exact terms they saw: the PDA address depends only on
/// (client, id), so an escrow withdrawn, closed and recreated under the same id would
/// otherwise silently land the freelancer on different terms.
pub fn accept_job(
    ctx: Context<AcceptJob>,
    expected_amount: u64,
    expected_bond_amount: u64,
    expected_deadline_ts: i64,
    expected_review_window_secs: u64,
    expected_dispute_window_secs: u64,
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Funded])?;
    require!(
        escrow.amount == expected_amount
            && escrow.bond_amount == expected_bond_amount
            && escrow.deadline_ts == expected_deadline_ts
            && escrow.review_window_secs == expected_review_window_secs
            && escrow.dispute_window_secs == expected_dispute_window_secs,
        ErrorCode::TermsMismatch
    );
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
    emit!(JobAccepted {
        escrow: ctx.accounts.escrow.key(),
        freelancer: ctx.accounts.freelancer.key(),
        bond_amount: bond,
    });
    Ok(())
}

/// Freelancer reports delivery before the deadline; starts the review window.
/// `key_hash` all zeros = open delivery (the client sees the work and the freelancer is
/// paid as before). Non-zero = sealed: `deliverable_hash` is the hash of the ciphertext,
/// `key_hash` the hash of the key, and the freelancer is paid only by revealing the key.
pub fn mark_delivered(
    ctx: Context<MarkDelivered>,
    deliverable_hash: [u8; 32],
    key_hash: [u8; 32],
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Accepted])?;
    let now = Clock::get()?.unix_timestamp;
    require!(now <= escrow.deadline_ts, ErrorCode::DeadlinePassed);

    escrow.delivered_at = Some(now);
    escrow.deliverable_hash = deliverable_hash;
    escrow.key_hash = key_hash;
    escrow.state = EscrowState::Delivered;
    emit!(Delivered {
        escrow: ctx.accounts.escrow.key(),
        delivered_at: now,
        deliverable_hash,
        key_hash,
    });
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
    emit!(Rejected {
        escrow: ctx.accounts.escrow.key(),
        client_bond: bond,
        frozen_at: now,
    });
    Ok(())
}
