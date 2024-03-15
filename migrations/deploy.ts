import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import * as anchor from "@coral-xyz/anchor";
import { CreateToken } from "../target/types/create_token";
import {
  PublicKey,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from "@solana/web3.js";

import {
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const TOKEN_NAME = "TestToken";
const SYMBOL = "TEST";
const URI = "";
const AMOUNT_TO_BE_MINTED = 750_000_000;
const DECIMALS = 8;

module.exports = async function (provider) {
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.CreateToken as anchor.Program<CreateToken>;

  const metadata = {
    name: TOKEN_NAME,
    symbol: SYMBOL,
    uri: URI,
  };


  // Generate new keypair to use as address for mint account.
  const mintKeypair = new Keypair();

  // Derive the PDA of the metadata account for the mint.
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintKeypair.publicKey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  // SPL Token default = 9 decimals
  const transactionSignature = await program.methods
    .createTokenMint(metadata.name, metadata.symbol, metadata.uri, DECIMALS)
    .accounts({
      payer: payer.publicKey,
      metadataAccount: metadataAddress,
      mintAccount: mintKeypair.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    })
    .signers([mintKeypair])
    .rpc();

  console.log("Success!");
  console.log(`   Mint Address: ${mintKeypair.publicKey}`);
  console.log(`   Transaction Signature: ${transactionSignature}`);

  // Amount of tokens to mint.
  const amount = new anchor.BN(AMOUNT_TO_BE_MINTED);

  const senderTokenAddress = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    payer.publicKey
  );

  // Mint the tokens to the associated token account.
  const mintTxSignature = await program.methods
    .mintToken(amount)
    .accounts({
      mintAuthority: payer.publicKey,
      recepient: payer.publicKey,
      mintAccount: mintKeypair.publicKey,
      associatedTokenAccount: senderTokenAddress,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Success!");
  console.log(`   Associated Token Account Address: ${senderTokenAddress}`);
  console.log(`   Transaction Signature: ${mintTxSignature}`);
}