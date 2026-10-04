// One-off devnet cleanup of two leftover demo escrows made through the UI:
//   Bhdm8N... (Burned)  -> close_escrow (already done from the UI at 21:50:11, so only verified)
//   AqcFzY... (Funded, deadline passed) -> refund_if_late, then close_escrow
// Every precondition is checked before the first transaction is sent.
import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import {
  KEYS_DIR,
  ROOT,
  connection,
  loadKeypair,
  txLink,
  verifySignatures,
} from "./common";
import { Escrow } from "../target/types/escrow";

const BURNED = new PublicKey("Bhdm8NUuiR8R5XMQoqfvx7Vprc7CRJRGwwHUHvZcjVN3");
const FUNDED = new PublicKey("AqcFzYXWnqMtmEB88dJ3PGiap5RoYTxsaRMyaKDVVg28");
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const client = loadKeypair(path.join(KEYS_DIR, "client.json"));
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(client), {
    commitment: "confirmed",
  });
  const idl = JSON.parse(fs.readFileSync(path.join(ROOT, "target/idl/escrow.json"), "utf8"));
  const program = new Program<Escrow>(idl, provider);

  const burnedAlreadyClosed = (await connection.getAccountInfo(BURNED)) === null;
  const funded = await program.account.escrow.fetch(FUNDED);
  const chainNow = (await connection.getBlockTime(await connection.getSlot()))!;
  const stateName = (e: typeof funded) => Object.keys(e.state)[0];
  const vaultOf = (e: typeof funded, pda: PublicKey) => getAssociatedTokenAddressSync(e.mint, pda, true);

  console.log(`burned: ${burnedAlreadyClosed ? "already closed, skipping" : "still open"}`);
  console.log(`funded: client ${funded.client.toBase58()}, state ${stateName(funded)}, deadline ${funded.deadlineTs}`);
  if (!funded.client.equals(client.publicKey)) {
    throw new Error(`funded escrow belongs to ${funded.client.toBase58()}, not to .demo-keys client ${client.publicKey.toBase58()}`);
  }
  if (stateName(funded) !== "funded" || chainNow <= funded.deadlineTs.toNumber()) {
    throw new Error("expected the second escrow to be Funded with the deadline passed");
  }
  if (!burnedAlreadyClosed) throw new Error("burned escrow is still open: close it first (not expected)");
  if (DRY_RUN) return console.log("dry run: all preconditions hold, nothing sent");

  const sigs: Record<string, string> = {};
  const close = (e: typeof funded, pda: PublicKey) =>
    program.methods
      .closeEscrow()
      .accountsPartial({
        client: client.publicKey,
        escrow: pda,
        mint: e.mint,
        vault: vaultOf(e, pda),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([client])
      .rpc();

  sigs.refund_if_late = await program.methods
    .refundIfLate()
    .accountsPartial({
      caller: client.publicKey,
      escrow: FUNDED,
      mint: funded.mint,
      vault: vaultOf(funded, FUNDED),
      clientToken: getAssociatedTokenAddressSync(funded.mint, client.publicKey),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([client])
    .rpc();
  console.log("refund_if_late         ", txLink(sigs.refund_if_late));

  sigs["close (funded)"] = await close(funded, FUNDED);
  console.log("close_escrow (refunded)", txLink(sigs["close (funded)"]));

  await verifySignatures(sigs);
  for (const pda of [BURNED, FUNDED]) {
    console.log(pda.toBase58(), "exists:", (await connection.getAccountInfo(pda)) !== null);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
