use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{errors::ErrorCode, events::*, state::*};

#[derive(Accounts)]
pub struct Release<'info> {
    pub client: Signer<'info>,
    #[account(
        mut,
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
    #[account(
        mut,
        token::mint = mint,
        token::authority = escrow.freelancer,
        token::token_program = token_program,
    )]
    pub freelancer_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ClaimIfSilent<'info> {
    /// Anyone can trigger the payout; it can only go to the freelancer's account.
    pub caller: Signer<'info>,
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
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct RefundIfLate<'info> {
    /// Anyone can trigger the refund; it can only go to the client's account.
    pub caller: Signer<'info>,
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
        token::authority = escrow.client,
        token::token_program = token_program,
    )]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

/// Pays the freelancer for a sealed delivery in the transaction that reveals the key.
/// Anyone can send it (the freelancer, or a bot holding the key the freelancer published).
#[derive(Accounts)]
pub struct ClaimWithKey<'info> {
    pub caller: Signer<'info>,
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
    pub token_program: Interface<'info, TokenInterface>,
}

/// Returns the vault to the client when a sealed delivery was never unlocked.
#[derive(Accounts)]
pub struct RefundUnrevealed<'info> {
    pub caller: Signer<'info>,
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
        token::authority = escrow.client,
        token::token_program = token_program,
    )]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CancelByFreelancer<'info> {
    pub freelancer: Signer<'info>,
    #[account(
        mut,
        has_one = freelancer @ ErrorCode::Unauthorized,
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
    #[account(
        mut,
        token::mint = mint,
        token::authority = escrow.client,
        token::token_program = token_program,
    )]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = escrow.freelancer,
        token::token_program = token_program,
    )]
    pub freelancer_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

/// Client pulls the funded vault back before the freelancer has accepted the job.
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub client: Signer<'info>,
    #[account(
        mut,
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
    #[account(
        mut,
        token::mint = mint,
        token::authority = client,
        token::token_program = token_program,
    )]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

/// Client accepts the work (or pays early) and the vault goes to the freelancer. From
/// `Frozen` it is the client conceding the dispute: the freelancer gets the whole vault,
/// including the client's own bond, which is what makes backing down cost something.
/// For a sealed delivery (Delivered or Frozen) nothing is paid here: the client only
/// approves, and the freelancer is paid by revealing the key (claim_with_key), so money
/// and key change hands in one transaction.
pub fn release(ctx: Context<Release>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[
        EscrowState::Funded,
        EscrowState::Accepted,
        EscrowState::Delivered,
        EscrowState::Frozen,
    ])?;
    let conceded = escrow.state == EscrowState::Frozen;
    escrow.settle_proposer = SETTLE_NONE;
    escrow.settle_bps = 0;

    if escrow.is_sealed() {
        let now = Clock::get()?.unix_timestamp;
        escrow.approved_at = now;
        escrow.state = EscrowState::Approved;
        emit!(Approved {
            escrow: ctx.accounts.escrow.key(),
            approved_at: now,
            conceded,
        });
        return Ok(());
    }
    escrow.state = EscrowState::Released;

    let amount = ctx.accounts.vault.amount;
    pay_from_vault(
        &ctx.accounts.escrow,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.freelancer_token,
        &ctx.accounts.token_program,
        ctx.accounts.vault.amount,
    )?;
    emit!(Released {
        escrow: ctx.accounts.escrow.key(),
        to: ctx.accounts.escrow.freelancer,
        amount,
        conceded,
    });
    Ok(())
}

/// Client stayed silent for the whole review window: freelancer pays themselves.
pub fn claim_if_silent(ctx: Context<ClaimIfSilent>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Delivered])?;
    // A sealed delivery is paid only against the key, never by silence alone.
    require!(!escrow.is_sealed(), ErrorCode::SealedDeliveryUseKey);
    let now = Clock::get()?.unix_timestamp;
    require!(now > escrow.review_ends_at()?, ErrorCode::ReviewWindowOpen);
    escrow.state = EscrowState::Released;

    let amount = ctx.accounts.vault.amount;
    pay_from_vault(
        &ctx.accounts.escrow,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.freelancer_token,
        &ctx.accounts.token_program,
        ctx.accounts.vault.amount,
    )?;
    emit!(Released {
        escrow: ctx.accounts.escrow.key(),
        to: ctx.accounts.escrow.freelancer,
        amount,
        conceded: false,
    });
    Ok(())
}

/// Nothing was delivered before the deadline: client takes the funds back.
pub fn refund_if_late(ctx: Context<RefundIfLate>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Funded, EscrowState::Accepted])?;
    let now = Clock::get()?.unix_timestamp;
    require!(now > escrow.deadline_ts, ErrorCode::DeadlineNotReached);
    escrow.state = EscrowState::Refunded;

    let amount = ctx.accounts.vault.amount;
    pay_from_vault(
        &ctx.accounts.escrow,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.client_token,
        &ctx.accounts.token_program,
        ctx.accounts.vault.amount,
    )?;
    emit!(Refunded {
        escrow: ctx.accounts.escrow.key(),
        to: ctx.accounts.escrow.client,
        amount,
    });
    Ok(())
}

/// Client takes the funds back while the job is still unaccepted. No time rule:
/// the freelancer has put nothing in yet, so only the client's own money moves.
pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Funded])?;
    escrow.state = EscrowState::Refunded;

    let amount = ctx.accounts.vault.amount;
    pay_from_vault(
        &ctx.accounts.escrow,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.client_token,
        &ctx.accounts.token_program,
        ctx.accounts.vault.amount,
    )?;
    emit!(Withdrawn {
        escrow: ctx.accounts.escrow.key(),
        amount,
    });
    Ok(())
}

/// Freelancer unwinds the deal, no burn. Only the signer gives anything up:
/// - before the deadline (Accepted) or after a delivery: they get their own bond back
///   and the client gets the rest of the vault;
/// - from `Frozen` it is the freelancer conceding the dispute: the whole vault, their
///   bond included, goes to the client (the mirror of the client's release);
/// - from Accepted after the deadline it is abandonment, so the bond goes to the client
///   too (the same outcome as refund_if_late), otherwise quitting late would be free.
pub fn cancel_by_freelancer(ctx: Context<CancelByFreelancer>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[
        EscrowState::Funded,
        EscrowState::Accepted,
        EscrowState::Delivered,
        EscrowState::Approved,
        EscrowState::Frozen,
    ])?;
    let vault_amount = ctx.accounts.vault.amount;
    let now = Clock::get()?.unix_timestamp;
    let freelancer_bond_paid = escrow.state != EscrowState::Funded;
    let abandoned = escrow.state == EscrowState::Accepted && now > escrow.deadline_ts;
    let conceded = escrow.state == EscrowState::Frozen;
    let freelancer_amount = if freelancer_bond_paid && !abandoned && !conceded {
        escrow.bond_amount.min(vault_amount)
    } else {
        0
    };
    escrow.settle_proposer = SETTLE_NONE;
    escrow.settle_bps = 0;
    escrow.state = EscrowState::Refunded;

    for (destination, amount) in [
        (&ctx.accounts.freelancer_token, freelancer_amount),
        (&ctx.accounts.client_token, vault_amount - freelancer_amount),
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
    emit!(Cancelled {
        escrow: ctx.accounts.escrow.key(),
        to_client: vault_amount - freelancer_amount,
        to_freelancer: freelancer_amount,
    });
    Ok(())
}

/// Pays the freelancer for a sealed delivery against the key. Allowed when the client
/// approved (Approved), or when the client stayed silent past the review window
/// (Delivered). The key is published on chain in the same transaction that pays, which is
/// what makes the exchange atomic: no key, no money; money moved, key public.
pub fn claim_with_key(ctx: Context<ClaimWithKey>, key: [u8; 32]) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Approved, EscrowState::Delivered])?;
    require!(escrow.is_sealed(), ErrorCode::NotSealed);
    if escrow.state == EscrowState::Delivered {
        let now = Clock::get()?.unix_timestamp;
        require!(now > escrow.review_ends_at()?, ErrorCode::ReviewWindowOpen);
    }
    require!(
        solana_sha256_hasher::hash(&key).to_bytes() == escrow.key_hash,
        ErrorCode::InvalidKey
    );
    escrow.revealed_key = key;
    escrow.state = EscrowState::Released;

    let amount = ctx.accounts.vault.amount;
    pay_from_vault(
        &ctx.accounts.escrow,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.freelancer_token,
        &ctx.accounts.token_program,
        amount,
    )?;
    emit!(Released {
        escrow: ctx.accounts.escrow.key(),
        to: ctx.accounts.escrow.freelancer,
        amount,
        conceded: false,
    });
    emit!(KeyRevealed {
        escrow: ctx.accounts.escrow.key(),
        key,
    });
    Ok(())
}

/// The freelancer never revealed the key: the client gets the whole vault, so the
/// freelancer's bond pays for not unlocking work that was approved (or left unanswered).
/// Two cases: Approved and a review window passed since approval, or a sealed Delivered
/// whose review window and the following key window have both passed.
pub fn refund_unrevealed(ctx: Context<RefundUnrevealed>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.require_state(&[EscrowState::Approved, EscrowState::Delivered])?;
    require!(escrow.is_sealed(), ErrorCode::NotSealed);
    let now = Clock::get()?.unix_timestamp;
    let window = i64::try_from(escrow.review_window_secs).unwrap_or(i64::MAX);
    let key_deadline = if escrow.state == EscrowState::Approved {
        escrow.approved_at.saturating_add(window)
    } else {
        escrow.review_ends_at()?.saturating_add(window)
    };
    require!(now > key_deadline, ErrorCode::ReviewWindowOpen);
    escrow.state = EscrowState::Refunded;

    let amount = ctx.accounts.vault.amount;
    pay_from_vault(
        &ctx.accounts.escrow,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.client_token,
        &ctx.accounts.token_program,
        amount,
    )?;
    emit!(Refunded {
        escrow: ctx.accounts.escrow.key(),
        to: ctx.accounts.escrow.client,
        amount,
    });
    Ok(())
}

/// The only place tokens are paid out of a vault. The escrow PDA signs via
/// its seeds, which only this program can do.
pub(crate) fn pay_from_vault<'info>(
    escrow: &Account<'info, Escrow>,
    vault: &InterfaceAccount<'info, TokenAccount>,
    mint: &InterfaceAccount<'info, Mint>,
    destination: &InterfaceAccount<'info, TokenAccount>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = TransferChecked {
        from: vault.to_account_info(),
        mint: mint.to_account_info(),
        to: destination.to_account_info(),
        authority: escrow.to_account_info(),
    };
    escrow.with_signer_seeds(|seeds| {
        let cpi_ctx = CpiContext::new_with_signer(token_program.key(), cpi_accounts, seeds);
        token_interface::transfer_checked(cpi_ctx, amount, mint.decimals)
    })
}
