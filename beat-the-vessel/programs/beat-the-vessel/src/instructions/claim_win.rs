use anchor_lang::prelude::*;
use crate::state::{Game, GameStatus, Player, PlayerStatus};
use crate::errors::BeatTheVesselError;
use crate::instructions::fire::TURN_TIMEOUT_SECONDS;

pub const WINNER_BPS: u64 = 9_000;
pub const FEE_BPS:    u64 = 1_000;
pub const BPS_BASE:   u64 = 10_000;

#[derive(Accounts)]
pub struct ClaimWin<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", claimant.key().as_ref()],
        bump = claimant_player.bump,
    )]
    pub claimant_player: Account<'info, Player>,

    #[account(
        mut,
        seeds = [b"game", game.player_one.as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,

    /// CHECK: Verified inside handler via game.winner
    #[account(mut)]
    pub winner_wallet: UncheckedAccount<'info>,

    /// CHECK: Platform treasury
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimWin>) -> Result<()> {
    let game     = &mut ctx.accounts.game;
    let claimant = ctx.accounts.claimant.key();
    let clock    = Clock::get()?;

    require!(
        claimant == game.player_one || claimant == game.player_two,
        BeatTheVesselError::NotAParticipant
    );

    match game.status {
        GameStatus::Finished => {
            require!(
                ctx.accounts.winner_wallet.key() == game.winner,
                BeatTheVesselError::NotAParticipant
            );
        }
        GameStatus::Active => {
            let elapsed = clock.unix_timestamp - game.last_move_slot;
            require!(elapsed > TURN_TIMEOUT_SECONDS, BeatTheVesselError::TimerNotExpired);
            require!(!game.is_turn(&claimant), BeatTheVesselError::NotYourTurn);
            require!(
                ctx.accounts.winner_wallet.key() == claimant,
                BeatTheVesselError::NotAParticipant
            );
            game.status = GameStatus::Finished;
            game.winner = claimant;
        }
        _ => return err!(BeatTheVesselError::GameNotFinished),
    }

    require!(!game.platform_fee_paid, BeatTheVesselError::AlreadyPaid);
    game.platform_fee_paid = true;

    let total_pot = game.wager_amount.checked_mul(2).unwrap();
    let winner_amount = total_pot.checked_mul(WINNER_BPS).unwrap().checked_div(BPS_BASE).unwrap();
    let fee_amount = total_pot.checked_sub(winner_amount).unwrap();

    **game.to_account_info().try_borrow_mut_lamports()? -= winner_amount;
    **ctx.accounts.winner_wallet.try_borrow_mut_lamports()? += winner_amount;

    **game.to_account_info().try_borrow_mut_lamports()? -= fee_amount;
    **ctx.accounts.treasury.try_borrow_mut_lamports()? += fee_amount;

    let claimant_player = &mut ctx.accounts.claimant_player;
    claimant_player.status       = PlayerStatus::Won;
    claimant_player.games_played += 1;
    claimant_player.games_won    += 1;
    claimant_player.total_won    = claimant_player.total_won.saturating_add(winner_amount);

    msg!("Winner {} receives {} lamports. Treasury receives {} lamports.", game.winner, winner_amount, fee_amount);
    Ok(())
}
