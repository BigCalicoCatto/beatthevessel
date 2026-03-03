use anchor_lang::prelude::*;

#[error_code]
pub enum BeatTheVesselError {
    #[msg("Game is not waiting for a player to join.")]
    GameNotWaiting,
    #[msg("Game is not active.")]
    GameNotActive,
    #[msg("You are already in this game.")]
    AlreadyInGame,
    #[msg("Wager amount does not match.")]
    WagerMismatch,
    #[msg("It is not your turn.")]
    NotYourTurn,
    #[msg("You have already fired at this cell.")]
    AlreadyFired,
    #[msg("Cell is out of bounds. Must be between 0-9.")]
    OutOfBounds,
    #[msg("Turn timer has not expired yet.")]
    TimerNotExpired,
    #[msg("Turn timer has expired. Opponent wins.")]
    TimerExpired,
    #[msg("Invalid ship placement. Ships cannot overlap.")]
    ShipsOverlap,
    #[msg("Invalid ship placement. Ship is out of bounds.")]
    ShipOutOfBounds,
    #[msg("Invalid board commit. Hash does not match revealed board.")]
    InvalidBoardCommit,
    #[msg("Board has already been committed.")]
    BoardAlreadyCommitted,
    #[msg("Player profile already exists.")]
    PlayerAlreadyExists,
    #[msg("You are not a participant in this game.")]
    NotAParticipant,
    #[msg("Game is not finished yet.")]
    GameNotFinished,
    #[msg("Payout has already been processed.")]
    AlreadyPaid,
    #[msg("No games available within acceptable wager range.")]
    NoMatchFound,
}
