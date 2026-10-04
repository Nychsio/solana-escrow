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
    /// Size of each side's bond (`amount * bond_bps / 10000`, fixed at create). The
    /// freelancer posts it in accept_job and the client matches it in reject, so the
    /// vault holds amount + one bond after acceptance and amount + two bonds when Frozen.
    pub bond_amount: u64,
    /// Sealed delivery: sha256 of the key that decrypts the work (all zeros = open delivery).
    /// `deliverable_hash` then commits to the ciphertext.
    pub key_hash: [u8; 32],
    /// The key, stored by claim_with_key in the transaction that pays the freelancer.
    pub revealed_key: [u8; 32],
    /// When the client approved a sealed delivery (starts the key-reveal window).
    pub approved_at: i64,
    /// Unused space left from the original 64 reserved bytes. New fields must be carved
    /// out of it so the account size (and every existing account) stays the same.
    pub _reserved: [u8; 37],
}

/// The account size: 235 B of the earlier layout plus 72 B for the sealed delivery fields
/// (key_hash, revealed_key, approved_at). From here on a new field must shrink `_reserved`
/// by the same number of bytes, and this assertion fails the build if not.
const _: () = assert!(Escrow::INIT_SPACE == 307);

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
    /// Appended after the older variants so their Borsh indices never change.
    Accepted,
    /// Sealed delivery approved by the client; the freelancer is paid when the key is revealed.
    Approved,
}

impl Escrow {
    /// A sealed delivery commits to a key; the freelancer is paid only by revealing it.
    pub fn is_sealed(&self) -> bool {
        self.key_hash != [0u8; 32]
    }

    /// Single gate for every state check: an instruction lists the states it accepts and
    /// anything else is rejected. Frozen is accepted by exactly four instructions
    /// (propose_settlement, accept_settlement, burn_if_unsettled and the two concessions,
    /// release and cancel_by_freelancer); the end states by none except close_escrow.
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
