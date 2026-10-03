use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Burn, Mint, TokenAccount, TokenInterface};

use super::payout::pay_from_vault;
use crate::{errors::ErrorCode, state::*};

#[derive(Accounts)]
pub struct ProposeSettlement<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct AcceptSettlement<'info> {
    pub signer: Signer<'info>,
    #[account(mut, has_one = mint)]
    pub escrow: Account<'info, Escrow>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = escrow.freelancer,
        token::token_program = token_program,
    )]
    pub freelancer_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = escrow.client,
        token::token_program = token_program,
    )]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

/// No privileges: anyone can call it and only pays the transaction fee.
#[derive(Accounts)]
pub struct BurnIfUnsettled<'info> {
    pub payer: Signer<'info>,
    #[account(mut, has_one = mint)]
    pub escrow: Account<'info, Escrow>,
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

/// Either party offers a split of the vault; a new offer replaces the old one.
pub fn propose_settlement(ctx: Context<ProposeSettlement>, freelancer_bps: u16) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let role = escrow.party_role(&ctx.accounts.signer.key())?;
    escrow.require_state(&[EscrowState::Frozen])?;
    require!(freelancer_bps <= MAX_BPS, ErrorCode::InvalidBps);
    let now = Clock::get()?.unix_timestamp;
    require!(now <= escrow.dispute_ends_at(), ErrorCode::DisputeWindowClosed);

    escrow.settle_proposer = role;
    escrow.settle_bps = freelancer_bps;
    Ok(())
}

/// The other party agrees to exactly the stored split; the vault is divided and the escrow closes.
pub fn accept_settlement(ctx: Context<AcceptSettlement>, freelancer_bps: u16) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let role = escrow.party_role(&ctx.accounts.signer.key())?;
    escrow.require_state(&[EscrowState::Frozen])?;
    require!(escrow.settle_proposer != SETTLE_NONE, ErrorCode::NoProposal);
    require!(role != escrow.settle_proposer, ErrorCode::ProposerCannotAccept);
    // Binds the acceptance to the offer the signer actually saw.
    require!(freelancer_bps == escrow.settle_bps, ErrorCode::SettlementMismatch);
    let now = Clock::get()?.unix_timestamp;
    require!(now <= escrow.dispute_ends_at(), ErrorCode::DisputeWindowClosed);

    let balance = ctx.accounts.vault.amount;
    let freelancer_amount =
        u64::try_from(u128::from(balance) * u128::from(freelancer_bps) / u128::from(MAX_BPS))
            .map_err(|_| ErrorCode::InvalidBps)?;
    let client_amount = balance - freelancer_amount;
    escrow.state = EscrowState::Settled;

    for (destination, amount) in [
        (&ctx.accounts.freelancer_token, freelancer_amount),
        (&ctx.accounts.client_token, client_amount),
    ] {
        if amount > 0 {
            pay_from_vault(
                &ctx.accounts.escrow,
                &ctx.accounts.vault,
                &ctx.accounts.mint,
                destination,
                &ctx.accounts.token_program,
                amount,
            )?;
        }
    }
    Ok(())
}

/// Nobody settled in time: anyone can burn the vault, so nobody profits from a dispute.
pub fn burn_if_unsettled(ctx: Context<BurnIfUnsettled>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Frozen])?;
    let now = Clock::get()?.unix_timestamp;
    require!(now > escrow.dispute_ends_at(), ErrorCode::DisputeWindowOpen);
    escrow.state = EscrowState::Burned;

    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.escrow.to_account_info(),
    };
    ctx.accounts.escrow.with_signer_seeds(|seeds| {
        let cpi_ctx =
            CpiContext::new_with_signer(ctx.accounts.token_program.key(), cpi_accounts, seeds);
        token_interface::burn(cpi_ctx, ctx.accounts.vault.amount)
    })
}
