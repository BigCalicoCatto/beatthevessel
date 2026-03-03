use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
pub mod instructions;

use instructions::{
    create_game::*,
    join_game::*,
    commit_board::*,
    fire::*,
    reveal::*,
    claim_win::*,
};

declare_id!("8W49HftPrZ6gubLQLB2URKsQJxxteU2kVFpSDEr74sKv");

#[program]
pub mod beat_the_vessel {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>, wager_amount: u64) -> Result<()> {
        instructions::create_game::handler(ctx, wager_amount)
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        instructions::join_game::handler(ctx)
    }

    pub fn commit_board(ctx: Context<CommitBoard>, commitment: [u8; 32]) -> Result<()> {
        instructions::commit_board::handler(ctx, commitment)
    }

    pub fn fire(ctx: Context<Fire>, row: u8, col: u8) -> Result<()> {
        instructions::fire::handler(ctx, row, col)
    }

    pub fn reveal_board(ctx: Context<RevealBoard>, secret: [u8; 32], ships: Vec<ShipPlacement>) -> Result<()> {
        instructions::reveal::handler(ctx, secret, ships)
    }

    pub fn claim_win(ctx: Context<ClaimWin>) -> Result<()> {
        instructions::claim_win::handler(ctx)
    }
}
