// Happy path on devnet: create -> mark_delivered -> release, one Explorer link per transaction.
import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import { createHash } from "crypto";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import {
  ROOT,
  connection,
  loadKeypair,
  readMint,
  txLink,
} from "./common";
import * as common from "./common";
import { Escrow } from "../target/types/escrow";

const AMOUNT = new BN(100_000_000); // 100 tokens at 6 decimals
const DEADLINE_SECS = 600;
const REVIEW_WINDOW_SECS = 60;
const DISPUTE_WINDOW_SECS = 120;

async function main() {
  const mint = readMint();
  if (!mint) throw new Error("No demo mint found. Run `yarn demo:setup` first.");
  const client = loadKeypair(path.join(common.KEYS_DIR, "client.json"));
  const freelancer = loadKeypair(path.join(common.KEYS_DIR, "freelancer.json"));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(client),
    { commitment: "confirmed" }
  );
  const idl = JSON.parse(
    fs.readFileSync(path.join(ROOT, "target/idl/escrow.json"), "utf8")
  );
  const program = new Program<Escrow>(idl, provider);

  const id = new BN(Date.now());
  const [escrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), client.publicKey.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  const vault = getAssociatedTokenAddressSync(mint, escrow, true);
  const clientToken = getAssociatedTokenAddressSync(mint, client.publicKey);
  const freelancerToken = getAssociatedTokenAddressSync(mint, freelancer.publicKey);

  console.log("program   ", program.programId.toBase58());
  console.log("escrow    ", escrow.toBase58());
  console.log("vault     ", vault.toBase58());

  // Deadlines are checked against the cluster clock, not this machine's.
  const chainNow = (await connection.getBlockTime(await connection.getSlot()))!;

  const createSig = await program.methods
    .create(
      id,
      AMOUNT,
      new BN(chainNow + DEADLINE_SECS),
      new BN(REVIEW_WINDOW_SECS),
      new BN(DISPUTE_WINDOW_SECS)
    )
    .accountsPartial({
      client: client.publicKey,
      freelancer: freelancer.publicKey,
      mint,
      clientToken,
      escrow,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([client])
    .rpc();
  console.log("\n1. create          ", txLink(createSig));
  console.log("   vault balance   ", (await getAccount(connection, vault)).amount.toString());

  const hash = Array.from(createHash("sha256").update("demo deliverable").digest());
  const deliveredSig = await program.methods
    .markDelivered(hash)
    .accountsPartial({ freelancer: freelancer.publicKey, escrow })
    .signers([freelancer])
    .rpc();
  console.log("2. mark_delivered  ", txLink(deliveredSig));

  const before = (await getAccount(connection, freelancerToken)).amount;
  const releaseSig = await program.methods
    .release()
    .accountsPartial({
      client: client.publicKey,
      escrow,
      mint,
      vault,
      freelancerToken,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([client])
    .rpc();
  console.log("3. release         ", txLink(releaseSig));

  const after = (await getAccount(connection, freelancerToken)).amount;
  const state = (await program.account.escrow.fetch(escrow)).state;
  console.log("\nstate             ", Object.keys(state)[0]);
  console.log("vault balance     ", (await getAccount(connection, vault)).amount.toString());
  console.log("freelancer gained ", (after - before).toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
