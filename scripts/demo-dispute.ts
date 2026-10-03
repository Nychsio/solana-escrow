// Dispute path on devnet: create -> mark_delivered -> reject -> propose -> accept (with decay) -> close_escrow.
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
const DISPUTE_WINDOW_SECS = 60;
const WAIT_BEFORE_ACCEPT_SECS = 20; // ~1/3 of the window, so about a third burns
const FREELANCER_BPS = 7000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
  const freelancerToken = getAssociatedTokenAddressSync(mint, freelancer.publicKey);
  const balanceOf = async (account: PublicKey) =>
    (await getAccount(connection, account)).amount;

  console.log("escrow", escrow.toBase58());
  console.log("vault ", vault.toBase58());

  const sigs: Record<string, string> = {};
  const chainNow = (await connection.getBlockTime(await connection.getSlot()))!;

  sigs.create = await program.methods
    .create(id, AMOUNT, new BN(chainNow + 600), new BN(120), new BN(DISPUTE_WINDOW_SECS))
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
  console.log("\n1. create            ", txLink(sigs.create));
  console.log("   vault             ", tokens(await balanceOf(vault)), "tokens");

  const hash = Array.from(createHash("sha256").update("demo dispute deliverable").digest());
  sigs.mark_delivered = await program.methods
    .markDelivered(hash)
    .accountsPartial({ freelancer: freelancer.publicKey, escrow })
    .signers([freelancer])
    .rpc();
  console.log("2. mark_delivered    ", txLink(sigs.mark_delivered));

  sigs.reject = await program.methods
    .reject()
    .accountsPartial({ client: client.publicKey, escrow })
    .signers([client])
    .rpc();
  console.log("3. reject (Frozen)   ", txLink(sigs.reject));

  sigs.propose_settlement = await program.methods
    .proposeSettlement(FREELANCER_BPS)
    .accountsPartial({ signer: client.publicKey, escrow })
    .signers([client])
    .rpc();
  console.log("4. propose_settlement", txLink(sigs.propose_settlement), `(${FREELANCER_BPS} bps for the freelancer)`);

  console.log(`   waiting ${WAIT_BEFORE_ACCEPT_SECS}s so the decay burn grows...`);
  await sleep(WAIT_BEFORE_ACCEPT_SECS * 1000);

  const supplyBefore = (await getMint(connection, mint)).supply;
  const vaultBefore = await balanceOf(vault);
  const clientBefore = await balanceOf(clientToken);
  const freelancerBefore = await balanceOf(freelancerToken);

  sigs.accept_settlement = await program.methods
    .acceptSettlement(FREELANCER_BPS)
    .accountsPartial({
      signer: freelancer.publicKey,
      escrow,
      mint,
      vault,
      freelancerToken,
      clientToken,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([freelancer])
    .rpc();
  console.log("5. accept_settlement ", txLink(sigs.accept_settlement));

  const burned = supplyBefore - (await getMint(connection, mint)).supply;
  const toFreelancer = (await balanceOf(freelancerToken)) - freelancerBefore;
  const toClient = (await balanceOf(clientToken)) - clientBefore;
  console.log(`   vault before      ${tokens(vaultBefore)}`);
  console.log(`   burned            ${tokens(burned)} (${(Number(burned) * 100 / Number(vaultBefore)).toFixed(1)}%)`);
  console.log(`   to freelancer     ${tokens(toFreelancer)}`);
  console.log(`   to client         ${tokens(toClient)}`);
  if (burned + toFreelancer + toClient !== vaultBefore) {
    throw new Error("payouts + burn do not add up to the vault balance");
  }
  console.log("   check             burned + payouts = vault balance");

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
  console.log("6. close_escrow      ", txLink(sigs.close_escrow));

  const fee = await feeOf(sigs.close_escrow);
  const solAfter = await connection.getBalance(client.publicKey);
  console.log(`   rent returned     ${rent} lamports (escrow + vault), tx fee ${fee}`);
  console.log(`   client SOL change ${solAfter - solBefore} lamports (= rent - fee)`);
  console.log(`   accounts gone     escrow ${(await connection.getAccountInfo(escrow)) === null}, vault ${(await connection.getAccountInfo(vault)) === null}`);
  if (solAfter - solBefore !== rent - fee) throw new Error("rent refund mismatch");

  await verifySignatures(sigs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
