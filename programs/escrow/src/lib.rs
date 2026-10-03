use anchor_lang::prelude::*;

pub mod errors;
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
    ) -> Result<()> {
        instructions::create::create(ctx, id, amount, deadline_ts, review_window_secs)
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

    pub fn reject(ctx: Context<Reject>) -> Result<()> {
        instructions::delivery::reject(ctx)
    }
}
