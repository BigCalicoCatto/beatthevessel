use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum PlayerStatus {
    Idle,
    InLobby,
    Playing,
    Won,
    Lost,
}

#[account]
pub struct Player {
    pub authority:      Pubkey,
    pub username:       [u8; 32],
    pub status:         PlayerStatus,
    pub games_played:   u32,
    pub games_won:      u32,
    pub games_lost:     u32,
    pub total_wagered:  u64,
    pub total_won:      u64,
    pub current_game:   Pubkey,
    pub bump:           u8,
}

impl Player {
    pub const SPACE: usize = 8
        + 32 + 32 + 1
        + 4 + 4 + 4
        + 8 + 8
        + 32 + 1;

    pub fn username_string(&self) -> String {
        let end = self.username.iter().position(|&b| b == 0).unwrap_or(32);
        String::from_utf8_lossy(&self.username[..end]).to_string()
    }

    pub fn win_rate(&self) -> u8 {
        if self.games_played == 0 { return 0; }
        ((self.games_won as f64 / self.games_played as f64) * 100.0) as u8
    }
}
