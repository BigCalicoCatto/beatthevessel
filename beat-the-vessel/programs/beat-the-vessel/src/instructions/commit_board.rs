use anchor_lang::prelude::*;
use crate::state::{Game, GameStatus, Player, PlayerStatus};
use crate::errors::BeatTheVesselError;

#[derive(Accounts)]
pub struct CommitBoard<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump = player_account.bump,
    )]
    pub player_account: Account<'info, Player>,

    #[account(
        mut,
        seeds = [b"game", game.player_one.as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
}

pub fn handler(ctx: Context<CommitBoard>, board: [u8; 100]) -> Result<()> {
    let game        = &mut ctx.accounts.game;
    let player_acct = &mut ctx.accounts.player_account;
    let player_key  = ctx.accounts.player.key();

    require!(game.status == GameStatus::Active, BeatTheVesselError::GameNotActive);
    require!(
        player_key == game.player_one || player_key == game.player_two,
        BeatTheVesselError::NotAParticipant
    );

    let is_player_one = player_key == game.player_one;
    let existing = if is_player_one { game.player_one_commit } else { game.player_two_commit };
    require!(existing == [0u8; 32], BeatTheVesselError::BoardAlreadyCommitted);

    // Store first 32 bytes as a marker that board is set
    // Full board stored in shots array repurposed temporarily
    if is_player_one {
        game.player_one_commit = [1u8; 32];
        game.player_one_shots = board;
    } else {
        game.player_two_commit = [1u8; 32];
        game.player_two_shots = board;
    }

    player_acct.status = PlayerStatus::Playing;

    let both = game.player_one_commit != [0u8; 32] && game.player_two_commit != [0u8; 32];
    if both {
        msg!("Both boards committed. Game underway!");
    } else {
        msg!("Board committed by {}. Waiting for opponent.", player_key);
    }

    Ok(())
}
