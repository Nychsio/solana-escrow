// Shared pieces of the devnet demo scripts (escrow v2: accept_job, bonds, crank, revisions).
import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  KEYS_DIR,
  ROOT,
  connection,
  loadKeypair,
  readMint,
  txLink,
  verifySignatures,
} from "./common";
import { Escrow } from "../target/types/escrow";

export const AMOUNT = new BN(100_000_000); // 100 tokens at 6 decimals
export const BOND_BPS = 2000; // each side posts 20%
export const tokens = (raw: bigint) => (Number(raw) / 1e6).toFixed(6);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function loadContext() {
  const mint = readMint();
  if (!mint) throw new Error("No demo mint found. Run `yarn demo:setup` first.");
  const client = loadKeypair(path.join(KEYS_DIR, "client.json"));
  const freelancer = loadKeypair(path.join(KEYS_DIR, "freelancer.json"));
  const crankerFile = path.join(KEYS_DIR, "cranker.json");
  const cranker = fs.existsSync(crankerFile) ? loadKeypair(crankerFile) : null;
  const idl = JSON.parse(
    fs.readFileSync(path.join(ROOT, "target/idl/escrow.json"), "utf8")
  );
  // Each Program instance pays fees with its own wallet.
  const programFor = (payer: Keypair) =>
    new Program<Escrow>(
      idl,
      new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
        commitment: "confirmed",
      })
    );
  return {
    mint,
    client,
    freelancer,
    cranker,
    program: programFor(client),
    programFor,
    clientToken: getAssociatedTokenAddressSync(mint, client.publicKey),
    freelancerToken: getAssociatedTokenAddressSync(mint, freelancer.publicKey),
  };
}
export type Ctx = ReturnType<typeof loadContext>;

export const chainNow = async () =>
  (await connection.getBlockTime(await connection.getSlot()))!;

export const balanceOf = async (account: PublicKey) =>
  (await getAccount(connection, account)).amount;

export function newEscrow(ctx: Ctx) {
  const id = new BN(Date.now());
  const [escrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), ctx.client.publicKey.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
    ctx.program.programId
  );
  const vault = getAssociatedTokenAddressSync(ctx.mint, escrow, true);
  return { id, escrow, vault };
}
export type Esc = ReturnType<typeof newEscrow>;

export const createCall = (
  ctx: Ctx,
  e: Esc,
  o: {
    deadlineTs: number;
    review: number;
    dispute: number;
    bondBps?: number;
  }
) =>
  ctx.program.methods
    .create(
      e.id,
      AMOUNT,
      new BN(o.deadlineTs),
      new BN(o.review),
      new BN(o.dispute),
      o.bondBps ?? BOND_BPS
    )
    .accountsPartial({
      client: ctx.client.publicKey,
      freelancer: ctx.freelancer.publicKey,
      mint: ctx.mint,
      clientToken: ctx.clientToken,
      escrow: e.escrow,
      vault: e.vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([ctx.client])
    .rpc();

// The freelancer signs the terms they just read from the chain (accept_job binds them).
export const acceptJobCall = async (ctx: Ctx, e: Esc) => {
  const a = await ctx.program.account.escrow.fetch(e.escrow);
  return ctx.program.methods
    .acceptJob(a.amount, a.bondAmount, a.deadlineTs, a.reviewWindowSecs, a.disputeWindowSecs)
    .accountsPartial({
      freelancer: ctx.freelancer.publicKey,
      escrow: e.escrow,
      mint: ctx.mint,
      vault: e.vault,
      freelancerToken: ctx.freelancerToken,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([ctx.freelancer])
    .rpc();
};

export const deliverCall = (ctx: Ctx, e: Esc, text = "demo deliverable") =>
  ctx.program.methods
    .markDelivered(Array.from(createHash("sha256").update(text).digest()))
    .accountsPartial({ freelancer: ctx.freelancer.publicKey, escrow: e.escrow })
    .signers([ctx.freelancer])
    .rpc();

export const releaseCall = (ctx: Ctx, e: Esc) =>
  ctx.program.methods
    .release()
    .accountsPartial({
      client: ctx.client.publicKey,
      escrow: e.escrow,
      mint: ctx.mint,
      vault: e.vault,
      freelancerToken: ctx.freelancerToken,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([ctx.client])
    .rpc();

export const rejectCall = (ctx: Ctx, e: Esc) =>
  ctx.program.methods
    .reject()
    .accountsPartial({
      client: ctx.client.publicKey,
      escrow: e.escrow,
      mint: ctx.mint,
      vault: e.vault,
      clientToken: ctx.clientToken,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([ctx.client])
    .rpc();

export const closeCall = (ctx: Ctx, e: Esc) =>
  ctx.program.methods
    .closeEscrow()
    .accountsPartial({
      client: ctx.client.publicKey,
      escrow: e.escrow,
      mint: ctx.mint,
      vault: e.vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([ctx.client])
    .rpc();

// Prints each step with its Explorer link and re-checks every signature at the end.
export class Run {
  private n = 0;
  readonly sigs: Record<string, string> = {};
  async step(label: string, sig: Promise<string>) {
    const s = await sig;
    this.sigs[label] = s;
    console.log(`${++this.n}. ${label.padEnd(22)} ${txLink(s)}`);
    return s;
  }
  verify = () => verifySignatures(this.sigs);
}
