use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash;
use crate::state::{Game, GameStatus, Player, PlayerStatus, Ship};
use crate::errors::BeatTheVesselError;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ShipPlacement {
    pub size:       u8,
    pub row:        u8,
    pub col:        u8,
    pub horizontal: bool,
}

#[derive(Accounts)]
pub struct RevealBoard<'info> {
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

pub fn handler(ctx: Context<RevealBoard>, secret: [u8; 32], ships: Vec<ShipPlacement>) -> Result<()> {
    let game        = &mut ctx.accounts.game;
    let player_acct = &mut ctx.accounts.player_account;
    let player_key  = ctx.accounts.player.key();

    require!(
        game.status == GameStatus::Active || game.status == GameStatus::Finished,
        BeatTheVesselError::GameNotActive
    );
    require!(
        player_key == game.player_one || player_key == game.player_two,
        BeatTheVesselError::NotAParticipant
    );
    require!(ships.len() == Game::SHIP_COUNT, BeatTheVesselError::InvalidBoardCommit);

    let is_player_one = player_key == game.player_one;

    let mut board = [0u8; 100];
    for ship in &ships {
        require!(ship.size >= 2 && ship.size <= 4, BeatTheVesselError::InvalidBoardCommit);
        place_ship(&mut board, ship)?;
    }

    let mut preimage = [0u8; 132];
    preimage[..100].copy_from_slice(&board);
    preimage[100..].copy_from_slice(&secret);
    let computed_hash = hash::hash(&preimage).to_bytes();

    let stored_commit = if is_player_one { game.player_one_commit } else { game.player_two_commit };
    require!(computed_hash == stored_commit, BeatTheVesselError::InvalidBoardCommit);

    let opponent_shots = if is_player_one {
        &mut game.player_two_shots
    } else {
        &mut game.player_one_shots
    };

    for i in 0..100usize {
        if opponent_shots[i] == 1 {
            opponent_shots[i] = if board[i] == 1 { 2 } else { 1 };
        }
    }

    let opponent_shots_snap = if is_player_one { game.player_two_shots } else { game.player_one_shots };

    let revealed_ships: [Ship; 4] = std::array::from_fn(|i| {
        let sp = &ships[i];
        let sunk = is_ship_sunk(&board, sp, &opponent_shots_snap);
        Ship { size: sp.size, row: sp.row, col: sp.col, horizontal: sp.horizontal, sunk }
    });

    if is_player_one {
        game.player_one_ships = revealed_ships;
    } else {
        game.player_two_ships = revealed_ships;
    }

    if Game::all_ships_sunk(&opponent_shots_snap) {
        let winner = if is_player_one { game.player_two } else { game.player_one };
        game.status = GameStatus::Finished;
        game.winner = winner;
        player_acct.status = PlayerStatus::Lost;
        msg!("All ships sunk! Winner: {}", winner);
    } else {
        msg!("Board revealed for {}. Game continues.", player_key);
    }

    Ok(())
}

fn place_ship(board: &mut [u8; 100], ship: &ShipPlacement) -> Result<()> {
    for i in 0..ship.size {
        let (r, c) = if ship.horizontal {
            (ship.row, ship.col + i)
        } else {
            (ship.row + i, ship.col)
        };
        require!(r < 10 && c < 10, BeatTheVesselError::ShipOutOfBounds);
        let idx = Game::cell_index(r, c);
        require!(board[idx] == 0, BeatTheVesselError::ShipsOverlap);
        board[idx] = 1;
    }
    Ok(())
}

fn is_ship_sunk(board: &[u8; 100], ship: &ShipPlacement, shots: &[u8; 100]) -> bool {
    for i in 0..ship.size {
        let (r, c) = if ship.horizontal {
            (ship.row, ship.col + i)
        } else {
            (ship.row + i, ship.col)
        };
        if r >= 10 || c >= 10 { return false; }
        let idx = Game::cell_index(r, c);
        if board[idx] != 1 || shots[idx] != 2 { return false; }
    }
    true
}
