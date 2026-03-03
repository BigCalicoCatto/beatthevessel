use anchor_lang::prelude::*;

// ── Ship definition ──────────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ShipSize {
    Two   = 2,
    Three = 3,
    Four  = 4,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct Ship {
    pub size:       u8,   // 2, 3, or 4
    pub row:        u8,   // 0-9
    pub col:        u8,   // 0-9
    pub horizontal: bool, // true = horizontal, false = vertical
    pub sunk:       bool,
}

// ── Game status ───────────────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum GameStatus {
    WaitingForPlayer,  // created, nobody joined yet
    Active,            // both players in, game running
    Finished,          // someone won
    Cancelled,         // abandoned / refunded
}

// ── Main Game account ─────────────────────────────────────────────────────────
#[account]
pub struct Game {
    // Players
    pub player_one:         Pubkey,       // creator
    pub player_two:         Pubkey,       // joiner (default = system program = empty)

    // Wager
    pub wager_amount:       u64,          // in lamports
    pub player_one_paid:    bool,
    pub player_two_paid:    bool,

    // Board commits (hashed boards, revealed at end)
    pub player_one_commit:  [u8; 32],     // sha256(board + secret)
    pub player_two_commit:  [u8; 32],

    // Shot boards — tracks what each player has fired at
    // 100 cells (10x10), each cell: 0=unfired, 1=miss, 2=hit
    pub player_one_shots:   [u8; 100],
    pub player_two_shots:   [u8; 100],

    // Ships (revealed progressively as they're sunk)
    pub player_one_ships:   [Ship; 4],
    pub player_two_ships:   [Ship; 4],

    // Turn tracking
    pub current_turn:       Pubkey,       // whose turn it is
    pub turn_number:        u32,
    pub last_move_slot:     i64,          // unix timestamp of last move (for timeout)

    // Game status
    pub status:             GameStatus,
    pub winner:             Pubkey,       // set when game finishes

    // Platform fee
    pub platform_fee_paid:  bool,

    // Bump for PDA
    pub bump:               u8,
}

impl Game {
    // 10x10 board = 100 cells
    pub const BOARD_SIZE: usize = 100;

    // 4 ships: 1×size4, 2×size3, 1×size2
    pub const SHIP_COUNT: usize = 4;
    pub const TOTAL_SHIP_CELLS: u8 = 4 + 3 + 3 + 2; // = 12

    // Space calculation for the account
    pub const SPACE: usize = 8          // discriminator
        + 32                            // player_one
        + 32                            // player_two
        + 8                             // wager_amount
        + 1                             // player_one_paid
        + 1                             // player_two_paid
        + 32                            // player_one_commit
        + 32                            // player_two_commit
        + 100                           // player_one_shots
        + 100                           // player_two_shots
        + (4 * 8)                       // player_one_ships (4 ships × 8 bytes)
        + (4 * 8)                       // player_two_ships
        + 32                            // current_turn
        + 4                             // turn_number
        + 8                             // last_move_slot
        + 1                             // status
        + 32                            // winner
        + 1                             // platform_fee_paid
        + 1;                            // bump

    // Helper: convert (row, col) to array index
    pub fn cell_index(row: u8, col: u8) -> usize {
        (row as usize) * 10 + (col as usize)
    }

    // Helper: check if it's a specific player's turn
    pub fn is_turn(&self, player: &Pubkey) -> bool {
        self.current_turn == *player
    }

    // Helper: count hits on a shot board
    pub fn count_hits(shots: &[u8; 100]) -> u8 {
        shots.iter().filter(|&&s| s == 2).count() as u8
    }

    // Helper: check if all ships are sunk (all 12 cells hit)
    pub fn all_ships_sunk(shots: &[u8; 100]) -> bool {
        Self::count_hits(shots) >= Self::TOTAL_SHIP_CELLS
    }
}