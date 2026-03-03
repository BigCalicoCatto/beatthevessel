use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Game, GameStatus, Player, PlayerStatus, Ship};
use crate::errors::BeatTheVesselError;

#[derive(Accounts)]
#[instruction(wager_amount: u64)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", creator.key().as_ref()],
        bump = player_account.bump,
    )]
    pub player_account: Account<'info, Player>,

    #[account(
        init,
        payer = creator,
        space = Game::SPACE,
        seeds = [b"game", creator.key().as_ref()],
        bump,
    )]
    pub game: Account<'info, Game>,

    /// CHECK: Platform treasury
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateGame>, wager_amount: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = &mut ctx.accounts.player_account;
    let creator = ctx.accounts.creator.key();
    let clock = Clock::get()?;

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.creator.to_account_info(),
            to:   game.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, wager_amount)?;

    game.player_one       = creator;
    game.player_two       = System::id();
    game.wager_amount     = wager_amount;
    game.player_one_paid  = true;
    game.player_two_paid  = false;
    game.player_one_commit = [0u8; 32];
    game.player_two_commit = [0u8; 32];
    game.player_one_shots  = [0u8; 100];
    game.player_two_shots  = [0u8; 100];

    let blank_ship = Ship { size: 0, row: 0, col: 0, horizontal: true, sunk: false };
    game.player_one_ships = [blank_ship; 4];
    game.player_two_ships = [blank_ship; 4];

    game.current_turn     = creator;
    game.turn_number      = 0;
    game.last_move_slot   = clock.unix_timestamp;
    game.status           = GameStatus::WaitingForPlayer;
    game.winner           = System::id();
    game.platform_fee_paid = false;
    game.bump             = ctx.bumps.game;

    player.status       = PlayerStatus::InLobby;
    player.current_game = game.key();

    msg!("Game created by {}. Wager: {} lamports.", creator, wager_amount);
    Ok(())
}
