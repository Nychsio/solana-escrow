use anchor_lang::prelude::*;

use crate::errors::ErrorCode;

#[constant]
pub const ESCROW_SEED: &[u8] = b"escrow";

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub mint: Pubkey,
    /// Part of the PDA seeds; stored so payouts can re-derive the signer.
    pub id: u64,
    pub amount: u64,
    pub deadline_ts: i64,
    pub review_window_secs: u64,
    pub delivered_at: Option<i64>,
    pub state: EscrowState,
    pub bump: u8,
    pub deliverable_hash: [u8; 32],
    /// Space for future dispute resolution data, so accounts need no migration.
    pub _reserved: [u8; 64],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EscrowState {
    Funded,
    Delivered,
    Released,
    Refunded,
    Frozen,
}

impl Escrow {
    /// Single gate for every state check: an instruction lists the states it
    /// accepts, anything else (including Frozen, which nobody lists) is rejected.
    pub fn require_state(&self, allowed: &[EscrowState]) -> Result<()> {
        require!(allowed.contains(&self.state), ErrorCode::InvalidState);
        Ok(())
    }

    /// Last moment (inclusive) at which the client can still reject a delivery.
    pub fn review_ends_at(&self) -> Result<i64> {
        let delivered_at = self.delivered_at.ok_or(ErrorCode::NotDelivered)?;
        let window = i64::try_from(self.review_window_secs).unwrap_or(i64::MAX);
        Ok(delivered_at.saturating_add(window))
    }
}
