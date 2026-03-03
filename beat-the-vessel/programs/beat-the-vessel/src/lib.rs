use anchor_lang::prelude::*;

declare_id!("8W49HftPrZ6gubLQLB2URKsQJxxteU2kVFpSDEr74sKv");

#[program]
pub mod beat_the_vessel {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
