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
    /// How long after `reject` the parties may settle before the funds burn.
    pub dispute_window_secs: u64,
    pub frozen_at: i64,
    /// SETTLE_NONE / SETTLE_CLIENT / SETTLE_FREELANCER.
    pub settle_proposer: u8,
    /// Freelancer's share of the vault in basis points, as last proposed.
    pub settle_bps: u16,
    /// Spare space (carved out of the original 64 bytes) so the account size never changes.
    /// Each side's deposit (the freelancer's at accept_job, the client's at reject).
    pub bond_amount: u64,
    pub _reserved: [u8; 37],
}

/// The account size shipped with the first dispute-ready layout; new fields must come out of `_reserved`.
const _: () = assert!(Escrow::INIT_SPACE == 235);

pub const MAX_BPS: u16 = 10_000;
/// Longest deadline (from now) and longest review or dispute window: 90 days.
pub const MAX_WINDOW_SECS: i64 = 90 * 24 * 60 * 60;
pub const SETTLE_NONE: u8 = 0;
pub const SETTLE_CLIENT: u8 = 1;
pub const SETTLE_FREELANCER: u8 = 2;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EscrowState {
    Funded,
    Delivered,
    Released,
    Refunded,
    Frozen,
    Settled,
    Burned,
    /// Appended last so the Borsh indices of the older variants never change.
    Accepted,
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

    /// Last moment (inclusive) for settlement while the escrow is Frozen.
    pub fn dispute_ends_at(&self) -> i64 {
        let window = i64::try_from(self.dispute_window_secs).unwrap_or(i64::MAX);
        self.frozen_at.saturating_add(window)
    }

    /// Which party a signer is (SETTLE_CLIENT / SETTLE_FREELANCER), or Unauthorized.
    pub fn party_role(&self, signer: &Pubkey) -> Result<u8> {
        if *signer == self.client {
            Ok(SETTLE_CLIENT)
        } else if *signer == self.freelancer {
            Ok(SETTLE_FREELANCER)
        } else {
            err!(ErrorCode::Unauthorized)
        }
    }

    /// Runs `f` with the escrow PDA's signer seeds. Every vault movement
    /// (payout or burn) signs through here, so the seeds exist in one place only.
    pub fn with_signer_seeds<R>(&self, f: impl FnOnce(&[&[&[u8]]]) -> R) -> R {
        let id = self.id.to_le_bytes();
        f(&[&[ESCROW_SEED, self.client.as_ref(), id.as_ref(), &[self.bump]]])
    }
}
