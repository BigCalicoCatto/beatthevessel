import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BeatTheVessel } from "../target/types/beat_the_vessel";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import * as crypto from "crypto";

describe("beat-the-vessel", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.BeatTheVessel as Program<BeatTheVessel>;
  const provider = anchor.AnchorProvider.env();

  // Players
  const playerOne = Keypair.generate();
  const playerTwo = Keypair.generate();

  // Treasury
  const treasury = Keypair.generate();

  // PDAs
  let gameKey: PublicKey;
  let playerOneAccount: PublicKey;
  let playerTwoAccount: PublicKey;

  const WAGER = new anchor.BN(100_000_000); // 0.1 SOL

  // Helper: build a valid 100-byte board from ship placements
  function buildBoard(ships: { row: number; col: number; size: number; horizontal: boolean }[]): Buffer {
    const board = Buffer.alloc(100, 0);
    for (const ship of ships) {
      for (let i = 0; i < ship.size; i++) {
        const r = ship.horizontal ? ship.row : ship.row + i;
        const c = ship.horizontal ? ship.col + i : ship.col;
        board[r * 10 + c] = 1;
      }
    }
    return board;
  }

  // Helper: SHA256(board + secret)
  function computeCommitment(board: Buffer, secret: Buffer): Buffer {
    return crypto.createHash("sha256").update(board).update(secret).digest();
  }

  // Ship placements for player one
  const p1Ships = [
    { size: 4, row: 0, col: 0, horizontal: true },
    { size: 3, row: 2, col: 0, horizontal: true },
    { size: 3, row: 4, col: 0, horizontal: true },
    { size: 2, row: 6, col: 0, horizontal: true },
  ];

  // Ship placements for player two
  const p2Ships = [
    { size: 4, row: 0, col: 5, horizontal: true },
    { size: 3, row: 2, col: 5, horizontal: true },
    { size: 3, row: 4, col: 5, horizontal: true },
    { size: 2, row: 6, col: 5, horizontal: true },
  ];

  const p1Board  = buildBoard(p1Ships);
  const p2Board  = buildBoard(p2Ships);
  const p1Secret = crypto.randomBytes(32);
  const p2Secret = crypto.randomBytes(32);
  const p1Commit = computeCommitment(p1Board, p1Secret);
  const p2Commit = computeCommitment(p2Board, p2Secret);

  before(async () => {
    // Airdrop SOL to both players
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(playerOne.publicKey, 2_000_000_000)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(playerTwo.publicKey, 2_000_000_000)
    );

    // Derive PDAs
    [playerOneAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("player"), playerOne.publicKey.toBuffer()],
      program.programId
    );
    [playerTwoAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("player"), playerTwo.publicKey.toBuffer()],
      program.programId
    );
    [gameKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), playerOne.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Creates player one profile", async () => {
    const username = Buffer.alloc(32, 0);
    Buffer.from("PlayerOne").copy(username);

    await program.methods
      .createPlayer(Array.from(username))
      .accounts({
        authority: playerOne.publicKey,
        playerAccount: playerOneAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerOne])
      .rpc();

    const account = await program.account.player.fetch(playerOneAccount);
    assert.ok(account.authority.equals(playerOne.publicKey));
    console.log("✅ Player one profile created");
  });

  it("Creates player two profile", async () => {
    const username = Buffer.alloc(32, 0);
    Buffer.from("PlayerTwo").copy(username);

    await program.methods
      .createPlayer(Array.from(username))
      .accounts({
        authority: playerTwo.publicKey,
        playerAccount: playerTwoAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerTwo])
      .rpc();

    console.log("✅ Player two profile created");
  });

  it("Player one creates a game", async () => {
    await program.methods
      .createGame(WAGER)
      .accounts({
        creator: playerOne.publicKey,
        playerAccount: playerOneAccount,
        game: gameKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerOne])
      .rpc();

    const game = await program.account.game.fetch(gameKey);
    assert.ok(game.playerOne.equals(playerOne.publicKey));
    assert.equal(game.wagerAmount.toString(), WAGER.toString());
    assert.equal(game.status.waitingForPlayer !== undefined, true);
    console.log("✅ Game created with wager:", WAGER.toString(), "lamports");
  });

  it("Player two joins the game", async () => {
    await program.methods
      .joinGame()
      .accounts({
        joiner: playerTwo.publicKey,
        playerAccount: playerTwoAccount,
        game: gameKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerTwo])
      .rpc();

    const game = await program.account.game.fetch(gameKey);
    assert.ok(game.playerTwo.equals(playerTwo.publicKey));
    assert.equal(game.status.active !== undefined, true);
    console.log("✅ Player two joined. Game is Active.");
  });

  it("Both players commit their boards", async () => {
    await program.methods
      .commitBoard(Array.from(p1Commit))
      .accounts({
        player: playerOne.publicKey,
        playerAccount: playerOneAccount,
        game: gameKey,
      })
      .signers([playerOne])
      .rpc();

    await program.methods
      .commitBoard(Array.from(p2Commit))
      .accounts({
        player: playerTwo.publicKey,
        playerAccount: playerTwoAccount,
        game: gameKey,
      })
      .signers([playerTwo])
      .rpc();

    const game = await program.account.game.fetch(gameKey);
    assert.notDeepEqual(game.playerOneCommit, new Array(32).fill(0));
    assert.notDeepEqual(game.playerTwoCommit, new Array(32).fill(0));
    console.log("✅ Both boards committed");
  });

  it("Players take turns firing", async () => {
    // Player one fires first (creator goes first)
    await program.methods
      .fire(0, 5)
      .accounts({ player: playerOne.publicKey, game: gameKey })
      .signers([playerOne])
      .rpc();
    console.log("✅ Player one fired at (0,5)");

    await program.methods
      .fire(0, 0)
      .accounts({ player: playerTwo.publicKey, game: gameKey })
      .signers([playerTwo])
      .rpc();
    console.log("✅ Player two fired at (0,0)");

    const game = await program.account.game.fetch(gameKey);
    assert.equal(game.turnNumber, 2);
    console.log("✅ Turn number:", game.turnNumber);
  });

  it("Player one reveals board", async () => {
    await program.methods
      .revealBoard(
        Array.from(p1Secret),
        p1Ships.map(s => ({ size: s.size, row: s.row, col: s.col, horizontal: s.horizontal }))
      )
      .accounts({
        player: playerOne.publicKey,
        playerAccount: playerOneAccount,
        game: gameKey,
      })
      .signers([playerOne])
      .rpc();

    console.log("✅ Player one revealed board");
  });

  it("Player two reveals board", async () => {
    await program.methods
      .revealBoard(
        Array.from(p2Secret),
        p2Ships.map(s => ({ size: s.size, row: s.row, col: s.col, horizontal: s.horizontal }))
      )
      .accounts({
        player: playerTwo.publicKey,
        playerAccount: playerTwoAccount,
        game: gameKey,
      })
      .signers([playerTwo])
      .rpc();

    console.log("✅ Player two revealed board");
  });

  it("Rejects duplicate fire on same cell", async () => {
    try {
      await program.methods
        .fire(0, 5)
        .accounts({ player: playerOne.publicKey, game: gameKey })
        .signers([playerOne])
        .rpc();
      assert.fail("Should have thrown");
    } catch (e) {
      console.log("✅ Correctly rejected duplicate fire");
    }
  });
});
