use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Burn, CloseAccount, Mint, TokenAccount, TokenInterface,
};

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
    /// Mutable because leftover dust is burned.
    #[account(mut)]
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

/// Reclaims the rent once the escrow is over. Anyone can send tokens to an
/// associated token account, so a vault may hold dust after the payout; that
/// dust is burned (nobody can claim it) so it cannot block the close.
pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
    ctx.accounts.escrow.require_state(&[
        EscrowState::Released,
        EscrowState::Refunded,
        EscrowState::Settled,
        EscrowState::Burned,
    ])?;

    let dust = ctx.accounts.vault.amount;
    if dust > 0 {
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        ctx.accounts.escrow.with_signer_seeds(|seeds| {
            let cpi_ctx =
                CpiContext::new_with_signer(ctx.accounts.token_program.key(), cpi_accounts, seeds);
            token_interface::burn(cpi_ctx, dust)
        })?;
    }

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
