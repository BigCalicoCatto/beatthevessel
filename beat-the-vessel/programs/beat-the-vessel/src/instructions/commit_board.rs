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

pub fn handler(ctx: Context<CommitBoard>, commitment: [u8; 32]) -> Result<()> {
    let game        = &mut ctx.accounts.game;
    let player_acct = &mut ctx.accounts.player_account;
    let player_key  = ctx.accounts.player.key();

    require!(game.status == GameStatus::Active, BeatTheVesselError::GameNotActive);
    require!(
        player_key == game.player_one || player_key == game.player_two,
        BeatTheVesselError::NotAParticipant
    );

    let is_player_one = player_key == game.player_one;
    let existing_commit = if is_player_one { game.player_one_commit } else { game.player_two_commit };
    require!(existing_commit == [0u8; 32], BeatTheVesselError::BoardAlreadyCommitted);

    if is_player_one {
        game.player_one_commit = commitment;
    } else {
        game.player_two_commit = commitment;
    }

    let both_committed = game.player_one_commit != [0u8; 32] && game.player_two_commit != [0u8; 32];
    player_acct.status = PlayerStatus::Playing;

    if both_committed {
        msg!("Both boards committed. Game is fully underway!");
    } else {
        msg!("Board committed by {}. Waiting for opponent.", player_key);
    }

    Ok(())
}
