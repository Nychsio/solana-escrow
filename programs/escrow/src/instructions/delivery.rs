use anchor_lang::prelude::*;

use crate::{errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct MarkDelivered<'info> {
    pub freelancer: Signer<'info>,
    #[account(mut, has_one = freelancer @ ErrorCode::Unauthorized)]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct Reject<'info> {
    pub client: Signer<'info>,
    #[account(mut, has_one = client @ ErrorCode::Unauthorized)]
    pub escrow: Account<'info, Escrow>,
}

/// Freelancer reports delivery before the deadline; starts the review window.
pub fn mark_delivered(ctx: Context<MarkDelivered>, deliverable_hash: [u8; 32]) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Funded])?;
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
    Ok(())
}
