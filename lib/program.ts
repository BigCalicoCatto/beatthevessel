import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Idl } from '@coral-xyz/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import idl from '../beat-the-vessel/target/idl/beat_the_vessel.json';

export const PROGRAM_ID = new PublicKey('GcQeeFpckZ9PJNz427wG8pQxrWkNtS3U66GrGPVSe2bm');
export const CONNECTION = new Connection(clusterApiUrl('devnet'), 'confirmed');
export const TREASURY = new PublicKey('B42RaDsfmXCH17gHagkubwUoYe67MjdruEDPKVbsc92j');

export function getProgram(wallet: AnchorWallet) {
  const provider = new AnchorProvider(CONNECTION, wallet, { commitment: 'confirmed' });
  return new Program(idl as Idl, provider);
}

export function getGamePDA(creatorPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('game'), creatorPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function getPlayerPDA(walletPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('player'), walletPubkey.toBuffer()],
    PROGRAM_ID
  );
}
