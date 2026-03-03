use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Game, GameStatus, Player, PlayerStatus};
use crate::errors::BeatTheVesselError;

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub joiner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", joiner.key().as_ref()],
        bump = player_account.bump,
    )]
    pub player_account: Account<'info, Player>,

    #[account(
        mut,
        seeds = [b"game", game.player_one.as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinGame>) -> Result<()> {
    let game   = &mut ctx.accounts.game;
    let player = &mut ctx.accounts.player_account;
    let joiner = ctx.accounts.joiner.key();
    let clock  = Clock::get()?;

    require!(game.status == GameStatus::WaitingForPlayer, BeatTheVesselError::GameNotWaiting);
    require!(joiner != game.player_one, BeatTheVesselError::AlreadyInGame);

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.joiner.to_account_info(),
            to:   game.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, game.wager_amount)?;

    game.player_two      = joiner;
    game.player_two_paid = true;
    game.status          = GameStatus::Active;
    game.last_move_slot  = clock.unix_timestamp;

    player.status       = PlayerStatus::InLobby;
    player.current_game = game.key();

    msg!("{} joined game {}. Game is Active.", joiner, game.key());
    Ok(())
}
