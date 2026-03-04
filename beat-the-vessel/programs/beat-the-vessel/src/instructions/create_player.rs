use anchor_lang::prelude::*;
use crate::state::{Player, PlayerStatus};

#[derive(Accounts)]
pub struct CreatePlayer<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Player::SPACE,
        seeds = [b"player", authority.key().as_ref()],
        bump,
    )]
    pub player_account: Account<'info, Player>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreatePlayer>, username: [u8; 32]) -> Result<()> {
    let player = &mut ctx.accounts.player_account;

    player.authority     = ctx.accounts.authority.key();
    player.username      = username;
    player.status        = PlayerStatus::Idle;
    player.games_played  = 0;
    player.games_won     = 0;
    player.games_lost    = 0;
    player.total_wagered = 0;
    player.total_won     = 0;
    player.current_game  = System::id();
    player.bump          = ctx.bumps.player_account;

    msg!("Player profile created for {}", ctx.accounts.authority.key());
    Ok(())
}
