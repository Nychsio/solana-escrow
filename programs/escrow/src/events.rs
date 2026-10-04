use anchor_lang::prelude::*;

// One event per state transition, so an indexer or the UI can follow an escrow from
// the transaction logs alone. Amounts are in the mint's base units.

#[event]
pub struct EscrowCreated {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub mint: Pubkey,
    pub id: u64,
    pub amount: u64,
    pub bond_amount: u64,
    pub deadline_ts: i64,
}

#[event]
pub struct JobAccepted {
    pub escrow: Pubkey,
    pub freelancer: Pubkey,
    pub bond_amount: u64,
}

#[event]
pub struct Withdrawn {
    pub escrow: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Delivered {
    pub escrow: Pubkey,
    pub delivered_at: i64,
    pub deliverable_hash: [u8; 32],
    /// All zeros for an open delivery; otherwise the hash of the key that unlocks the work.
    pub key_hash: [u8; 32],
}

/// The client approved a sealed delivery (or conceded a dispute over one). No money
/// moved yet: the freelancer is paid in the transaction that reveals the key.
#[event]
pub struct Approved {
    pub escrow: Pubkey,
    pub approved_at: i64,
    pub conceded: bool,
}

/// The key to a sealed delivery, published in the same transaction that pays for it.
#[event]
pub struct KeyRevealed {
    pub escrow: Pubkey,
    pub key: [u8; 32],
}

/// Emitted by `release` and by `claim_if_silent`. `conceded` is true when the client
/// released from `Frozen`, i.e. gave in during a dispute and forfeited their bond.
#[event]
pub struct Released {
    pub escrow: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub conceded: bool,
}

/// Emitted by `refund_if_late`.
#[event]
pub struct Refunded {
    pub escrow: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Rejected {
    pub escrow: Pubkey,
    pub client_bond: u64,
    pub frozen_at: i64,
}

#[event]
pub struct SettlementProposed {
    pub escrow: Pubkey,
    /// 1 = client, 2 = freelancer.
    pub proposer: u8,
    pub freelancer_bps: u16,
}

#[event]
pub struct Settled {
    pub escrow: Pubkey,
    pub burned: u64,
    pub to_freelancer: u64,
    pub to_client: u64,
}

#[event]
pub struct Burned {
    pub escrow: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Cancelled {
    pub escrow: Pubkey,
    pub to_client: u64,
    pub to_freelancer: u64,
}

#[event]
pub struct Closed {
    pub escrow: Pubkey,
    pub dust_burned: u64,
}
