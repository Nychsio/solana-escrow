use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Deadline must be in the future")]
    DeadlineInPast,
    #[msg("Escrow is not in a state that allows this instruction")]
    InvalidState,
    #[msg("Signer is not the party allowed to call this instruction")]
    Unauthorized,
    #[msg("Delivery deadline has already passed")]
    DeadlinePassed,
    #[msg("Delivery deadline has not passed yet")]
    DeadlineNotReached,
    #[msg("Review window is still open")]
    ReviewWindowOpen,
    #[msg("Review window has already closed")]
    ReviewWindowClosed,
    #[msg("Escrow has no delivery timestamp")]
    NotDelivered,
    #[msg("Dispute window must be greater than zero")]
    InvalidDisputeWindow,
    #[msg("Settlement share must be at most 10000 basis points")]
    InvalidBps,
    #[msg("Dispute window is still open")]
    DisputeWindowOpen,
    #[msg("Dispute window has already closed")]
    DisputeWindowClosed,
    #[msg("No settlement has been proposed")]
    NoProposal,
    #[msg("The proposer cannot accept their own settlement")]
    ProposerCannotAccept,
    #[msg("Accepted share does not match the proposed one")]
    SettlementMismatch,
    #[msg("Vault still holds tokens")]
    VaultNotEmpty,
    #[msg("This mint is not supported (Token-2022 extension outside the allow-list)")]
    UnsupportedMint,
    #[msg("The escrow terms differ from what the freelancer agreed to")]
    TermsMismatch,
    #[msg("Client and freelancer must be different wallets")]
    SameParty,
    #[msg("A deadline or window is longer than the 90 day maximum")]
    WindowTooLong,
    #[msg("Review window must be greater than zero")]
    InvalidReviewWindow,
}
