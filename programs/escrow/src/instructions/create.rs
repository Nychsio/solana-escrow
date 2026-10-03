use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{errors::ErrorCode, state::*};

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

pub fn create(
    ctx: Context<Create>,
    id: u64,
    amount: u64,
    deadline_ts: i64,
    review_window_secs: u64,
    dispute_window_secs: u64,
) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(dispute_window_secs > 0, ErrorCode::InvalidDisputeWindow);
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
        deliverable_hash: [0; 32],
        dispute_window_secs,
        frozen_at: 0,
        settle_proposer: SETTLE_NONE,
        settle_bps: 0,
        _reserved: [0; 45],
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
