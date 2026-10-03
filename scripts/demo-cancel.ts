// Cancel path on devnet: create -> mark_delivered -> cancel_by_freelancer -> close_escrow.
// The freelancer hands the whole vault back to the client; nothing burns.
import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import { createHash } from "crypto";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import {
  KEYS_DIR,
  ROOT,
  connection,
  feeOf,
  loadKeypair,
  readMint,
  txLink,
  verifySignatures,
} from "./common";
import { Escrow } from "../target/types/escrow";

const AMOUNT = new BN(100_000_000); // 100 tokens at 6 decimals
const tokens = (raw: bigint) => (Number(raw) / 1e6).toFixed(6);

async function main() {
  const mint = readMint();
  if (!mint) throw new Error("No demo mint found. Run `yarn demo:setup` first.");
  const client = loadKeypair(path.join(KEYS_DIR, "client.json"));
  const freelancer = loadKeypair(path.join(KEYS_DIR, "freelancer.json"));

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
  const balanceOf = async (account: PublicKey) =>
    (await getAccount(connection, account)).amount;

  console.log("escrow", escrow.toBase58());
  console.log("vault ", vault.toBase58());

  const sigs: Record<string, string> = {};
  const chainNow = (await connection.getBlockTime(await connection.getSlot()))!;
  const clientStart = await balanceOf(clientToken);
  const supplyStart = (await getMint(connection, mint)).supply;

  sigs.create = await program.methods
    .create(id, AMOUNT, new BN(chainNow + 600), new BN(120), new BN(120))
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
  console.log("\n1. create               ", txLink(sigs.create));
  console.log("   vault                ", tokens(await balanceOf(vault)), "tokens");

  const hash = Array.from(createHash("sha256").update("demo cancel deliverable").digest());
  sigs.mark_delivered = await program.methods
    .markDelivered(hash)
    .accountsPartial({ freelancer: freelancer.publicKey, escrow })
    .signers([freelancer])
    .rpc();
  console.log("2. mark_delivered       ", txLink(sigs.mark_delivered));

  sigs.cancel_by_freelancer = await program.methods
    .cancelByFreelancer()
    .accountsPartial({
      freelancer: freelancer.publicKey,
      escrow,
      mint,
      vault,
      clientToken,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([freelancer])
    .rpc();
  console.log("3. cancel_by_freelancer ", txLink(sigs.cancel_by_freelancer));

  const state = Object.keys((await program.account.escrow.fetch(escrow)).state)[0];
  const clientEnd = await balanceOf(clientToken);
  const burned = supplyStart - (await getMint(connection, mint)).supply;
  console.log("   state                ", state);
  console.log("   vault                ", tokens(await balanceOf(vault)));
  console.log(`   client tokens        ${tokens(clientStart)} -> ${tokens(clientEnd)} (back to the start)`);
  console.log("   burned               ", tokens(burned));
  if (state !== "refunded" || clientEnd !== clientStart || burned !== 0n) {
    throw new Error("cancel did not return the full vault without burning");
  }

  const rent = (await connection.getBalance(escrow)) + (await connection.getBalance(vault));
  const solBefore = await connection.getBalance(client.publicKey);
  sigs.close_escrow = await program.methods
    .closeEscrow()
    .accountsPartial({
      client: client.publicKey,
      escrow,
      mint,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([client])
    .rpc();
  console.log("4. close_escrow         ", txLink(sigs.close_escrow));

  const fee = await feeOf(sigs.close_escrow);
  const solAfter = await connection.getBalance(client.publicKey);
  console.log(`   rent returned        ${rent} lamports (escrow + vault), tx fee ${fee}`);
  console.log(`   client SOL change    ${solAfter - solBefore} lamports (= rent - fee)`);
  if (solAfter - solBefore !== rent - fee) throw new Error("rent refund mismatch");

  await verifySignatures(sigs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
