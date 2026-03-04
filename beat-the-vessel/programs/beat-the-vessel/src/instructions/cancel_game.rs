use anchor_lang::prelude::*;
use crate::state::{Game, GameStatus, Player, PlayerStatus};
use crate::errors::BeatTheVesselError;

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", creator.key().as_ref()],
        bump = player_account.bump,
    )]
    pub player_account: Account<'info, Player>,

    #[account(
        mut,
        seeds = [b"game", creator.key().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelGame>) -> Result<()> {
    let game   = &mut ctx.accounts.game;
    let player = &mut ctx.accounts.player_account;
    let creator = ctx.accounts.creator.key();

    require!(game.player_one == creator, BeatTheVesselError::NotAParticipant);
    require!(game.status == GameStatus::WaitingForPlayer, BeatTheVesselError::GameNotWaiting);

    // Refund wager back to creator
    **game.to_account_info().try_borrow_mut_lamports()? -= game.wager_amount;
    **ctx.accounts.creator.try_borrow_mut_lamports()? += game.wager_amount;

    game.status = GameStatus::Cancelled;
    player.status = PlayerStatus::Idle;
    player.current_game = System::id();

    msg!("Game cancelled. {} SOL refunded to {}", game.wager_amount, creator);
    Ok(())
}
