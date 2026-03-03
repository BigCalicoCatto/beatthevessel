use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum PlayerStatus {
    Idle,          // not in a game
    InLobby,       // created/joined a game, waiting
    Playing,       // game is active
    Won,
    Lost,
}

#[account]
pub struct Player {
    pub authority:      Pubkey,        // wallet address
    pub username:       [u8; 32],      // stored as fixed bytes (max 32 chars)
    pub status:         PlayerStatus,
    
    // Stats
    pub games_played:   u32,
    pub games_won:      u32,
    pub games_lost:     u32,
    pub total_wagered:  u64,           // lifetime SOL wagered (in lamports)
    pub total_won:      u64,           // lifetime SOL won (in lamports)

    // Current game they're in (if any)
    pub current_game:   Pubkey,        // default = system program = none

    // Bump for PDA
    pub bump:           u8,
}

impl Player {
    pub const SPACE: usize = 8         // discriminator
        + 32                           // authority
        + 32                           // username
        + 1                            // status
        + 4                            // games_played
        + 4                            // games_won
        + 4                            // games_lost
        + 8                            // total_wagered
        + 8                            // total_won
        + 32                           // current_game
        + 1;                           // bump

    // Helper: get username as a string
    pub fn username_string(&self) -> String {
        let end = self.username.iter().position(|&b| b == 0).unwrap_or(32);
        String::from_utf8_lossy(&self.username[..end]).to_string()
    }

    // Helper: win rate as percentage (0-100)
    pub fn win_rate(&self) -> u8 {
        if self.games_played == 0 {
            return 0;
        }
        ((self.games_won as f64 / self.games_played as f64) * 100.0) as u8
    }
}