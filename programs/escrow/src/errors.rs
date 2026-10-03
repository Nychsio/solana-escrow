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
}
