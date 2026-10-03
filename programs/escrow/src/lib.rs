use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8");

#[program]
pub mod escrow {
    use super::*;

    /// Client opens an escrow and funds the vault. From this point the tokens
    /// can only leave the vault through this program's own instructions.
    pub fn create(
        ctx: Context<Create>,
        id: u64,
        amount: u64,
        deadline_ts: i64,
        review_window_secs: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        let now = Clock::get()?.unix_timestamp;
        require!(deadline_ts > now, ErrorCode::DeadlineInPast);

        ctx.accounts.escrow.set_inner(Escrow {
            client: ctx.accounts.client.key(),
            freelancer: ctx.accounts.freelancer.key(),
            mint: ctx.accounts.mint.key(),
            id,
            amount,
            deadline_ts,
            review_window_secs,
            delivered_at: None,
            state: EscrowState::Funded,
            bump: ctx.bumps.escrow,
        });

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.client_token.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.client.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct Create<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: only stored as the payout recipient; does not sign `create`.
    pub freelancer: UncheckedAccount<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = client,
        token::token_program = token_program,
    )]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = client,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [ESCROW_SEED, client.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    /// Vault: ATA owned by the escrow PDA, so only this program can sign for it.
    #[account(
        init,
        payer = client,
        associated_token::mint = mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[constant]
pub const ESCROW_SEED: &[u8] = b"escrow";

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub mint: Pubkey,
    /// Part of the PDA seeds; stored so later instructions can re-derive the signer.
    pub id: u64,
    pub amount: u64,
    pub deadline_ts: i64,
    pub review_window_secs: u64,
    pub delivered_at: Option<i64>,
    pub state: EscrowState,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EscrowState {
    Funded,
    Delivered,
    Released,
    Refunded,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Deadline must be in the future")]
    DeadlineInPast,
}
