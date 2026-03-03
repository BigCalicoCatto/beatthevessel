use anchor_lang::prelude::*;
use crate::state::{Game, GameStatus};
use crate::errors::BeatTheVesselError;

pub const TURN_TIMEOUT_SECONDS: i64 = 20;

#[derive(Accounts)]
pub struct Fire<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game", game.player_one.as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
}

pub fn handler(ctx: Context<Fire>, row: u8, col: u8) -> Result<()> {
    let game       = &mut ctx.accounts.game;
    let player_key = ctx.accounts.player.key();
    let clock      = Clock::get()?;

    require!(game.status == GameStatus::Active, BeatTheVesselError::GameNotActive);
    require!(
        player_key == game.player_one || player_key == game.player_two,
        BeatTheVesselError::NotAParticipant
    );
    require!(game.is_turn(&player_key), BeatTheVesselError::NotYourTurn);
    require!(row < 10 && col < 10, BeatTheVesselError::OutOfBounds);
    require!(
        game.player_one_commit != [0u8; 32] && game.player_two_commit != [0u8; 32],
        BeatTheVesselError::GameNotActive
    );

    let elapsed = clock.unix_timestamp - game.last_move_slot;
    require!(elapsed <= TURN_TIMEOUT_SECONDS, BeatTheVesselError::TimerExpired);

    let is_player_one = player_key == game.player_one;
    let shots = if is_player_one {
        &mut game.player_one_shots
    } else {
        &mut game.player_two_shots
    };

    let idx = Game::cell_index(row, col);
    require!(shots[idx] == 0, BeatTheVesselError::AlreadyFired);

    shots[idx] = 1;

    game.current_turn = if is_player_one { game.player_two } else { game.player_one };
    game.turn_number      += 1;
    game.last_move_slot    = clock.unix_timestamp;

    msg!("{} fired at ({}, {}). Turn {} complete.", player_key, row, col, game.turn_number);
    Ok(())
}
