use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, CloseAccount, Mint, TokenAccount, TokenInterface};

use crate::{errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct CloseEscrow<'info> {
    /// Receives the rent of both the vault and the escrow account.
    #[account(mut)]
    pub client: Signer<'info>,
    #[account(
        mut,
        close = client,
        has_one = client @ ErrorCode::Unauthorized,
        has_one = mint,
    )]
    pub escrow: Account<'info, Escrow>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

/// Reclaims the rent once the escrow is over and the vault is empty.
pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
    ctx.accounts.escrow.require_state(&[
        EscrowState::Released,
        EscrowState::Refunded,
        EscrowState::Settled,
        EscrowState::Burned,
    ])?;
    require!(ctx.accounts.vault.amount == 0, ErrorCode::VaultNotEmpty);

    let cpi_accounts = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.client.to_account_info(),
        authority: ctx.accounts.escrow.to_account_info(),
    };
    ctx.accounts.escrow.with_signer_seeds(|seeds| {
        let cpi_ctx =
            CpiContext::new_with_signer(ctx.accounts.token_program.key(), cpi_accounts, seeds);
        token_interface::close_account(cpi_ctx)
    })
}
