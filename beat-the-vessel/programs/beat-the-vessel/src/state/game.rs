use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ShipSize {
    Two   = 2,
    Three = 3,
    Four  = 4,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct Ship {
    pub size:       u8,
    pub row:        u8,
    pub col:        u8,
    pub horizontal: bool,
    pub sunk:       bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum GameStatus {
    WaitingForPlayer,
    Active,
    Finished,
    Cancelled,
}

#[account]
pub struct Game {
    pub player_one:         Pubkey,
    pub player_two:         Pubkey,
    pub wager_amount:       u64,
    pub player_one_paid:    bool,
    pub player_two_paid:    bool,
    pub player_one_commit:  [u8; 32],
    pub player_two_commit:  [u8; 32],
    pub player_one_shots:   [u8; 100],
    pub player_two_shots:   [u8; 100],
    pub player_one_ships:   [Ship; 4],
    pub player_two_ships:   [Ship; 4],
    pub current_turn:       Pubkey,
    pub turn_number:        u32,
    pub last_move_slot:     i64,
    pub status:             GameStatus,
    pub winner:             Pubkey,
    pub platform_fee_paid:  bool,
    pub bump:               u8,
}

impl Game {
    pub const BOARD_SIZE: usize = 100;
    pub const SHIP_COUNT: usize = 4;
    pub const TOTAL_SHIP_CELLS: u8 = 4 + 3 + 3 + 2;

    pub const SPACE: usize = 8
        + 32 + 32 + 8 + 1 + 1
        + 32 + 32
        + 100 + 100
        + (4 * 8) + (4 * 8)
        + 32 + 4 + 8
        + 1 + 32 + 1 + 1;

    pub fn cell_index(row: u8, col: u8) -> usize {
        (row as usize) * 10 + (col as usize)
    }

    pub fn is_turn(&self, player: &Pubkey) -> bool {
        self.current_turn == *player
    }

    pub fn count_hits(shots: &[u8; 100]) -> u8 {
        shots.iter().filter(|&&s| s == 2).count() as u8
    }

    pub fn all_ships_sunk(shots: &[u8; 100]) -> bool {
        Self::count_hits(shots) >= Self::TOTAL_SHIP_CELLS
    }
}
