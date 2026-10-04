use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8");

#[program]
pub mod escrow {
    use super::*;

    pub fn create(
        ctx: Context<Create>,
        id: u64,
        amount: u64,
        deadline_ts: i64,
        review_window_secs: u64,
        dispute_window_secs: u64,
        bond_bps: u16,
        max_revisions: u8,
        revision_window_secs: u64,
    ) -> Result<()> {
        instructions::create::create(
            ctx,
            id,
            amount,
            deadline_ts,
            review_window_secs,
            dispute_window_secs,
            bond_bps,
            max_revisions,
            revision_window_secs,
        )
    }

    pub fn accept_job(ctx: Context<AcceptJob>) -> Result<()> {
        instructions::delivery::accept_job(ctx)
    }

    pub fn request_revision(ctx: Context<RequestRevision>) -> Result<()> {
        instructions::delivery::request_revision(ctx)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        instructions::payout::withdraw(ctx)
    }

    pub fn mark_delivered(ctx: Context<MarkDelivered>, deliverable_hash: [u8; 32]) -> Result<()> {
        instructions::delivery::mark_delivered(ctx, deliverable_hash)
    }

    pub fn release(ctx: Context<Release>) -> Result<()> {
        instructions::payout::release(ctx)
    }

    pub fn claim_if_silent(ctx: Context<ClaimIfSilent>) -> Result<()> {
        instructions::payout::claim_if_silent(ctx)
    }

    pub fn refund_if_late(ctx: Context<RefundIfLate>) -> Result<()> {
        instructions::payout::refund_if_late(ctx)
    }

    pub fn cancel_by_freelancer(ctx: Context<CancelByFreelancer>) -> Result<()> {
        instructions::payout::cancel_by_freelancer(ctx)
    }

    pub fn reject(ctx: Context<Reject>) -> Result<()> {
        instructions::delivery::reject(ctx)
    }

    pub fn propose_settlement(ctx: Context<ProposeSettlement>, freelancer_bps: u16) -> Result<()> {
        instructions::dispute::propose_settlement(ctx, freelancer_bps)
    }

    pub fn accept_settlement(ctx: Context<AcceptSettlement>, freelancer_bps: u16) -> Result<()> {
        instructions::dispute::accept_settlement(ctx, freelancer_bps)
    }

    pub fn burn_if_unsettled(ctx: Context<BurnIfUnsettled>) -> Result<()> {
        instructions::dispute::burn_if_unsettled(ctx)
    }

    pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
        instructions::close::close_escrow(ctx)
    }
}
