// One-off: bring every open demo escrow to a terminal state and close it, so the
// account layout can change without leaving unreadable accounts on devnet.
// Refuses to touch an escrow whose client or freelancer is not a .demo-keys wallet.
import { TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { connection, verifySignatures } from "./common";
import { loadContext } from "./demo-lib";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const ctx = loadContext();
  const crankerProgram = ctx.cranker ? ctx.programFor(ctx.cranker) : ctx.program;
  const all = await ctx.program.account.escrow.all();
  const now = (await connection.getBlockTime(await connection.getSlot()))!;
  const sigs: Record<string, string> = {};

  // Check everything before sending anything.
  for (const { publicKey, account: e } of all) {
    const demo = e.client.equals(ctx.client.publicKey) && e.freelancer.equals(ctx.freelancer.publicKey);
    const vault = getAssociatedTokenAddressSync(e.mint, publicKey, true);
    const bal = (await getAccount(connection, vault).catch(() => null))?.amount ?? 0n;
    console.log(publicKey.toBase58(), Object.keys(e.state)[0], "vault", bal.toString(), "deadline in", e.deadlineTs.toNumber() - now, demo ? "demo" : "NOT DEMO");
    if (!demo) throw new Error(`${publicKey.toBase58()} does not belong to the demo wallets`);
  }
  if (DRY_RUN) return console.log("dry run: nothing sent");

  for (const { publicKey: escrow, account: e } of all) {
    const state = Object.keys(e.state)[0];
    const mint = e.mint;
    const vault = getAssociatedTokenAddressSync(mint, escrow, true);
    const clientToken = getAssociatedTokenAddressSync(mint, e.client);
    const freelancerToken = getAssociatedTokenAddressSync(mint, e.freelancer);
    const tag = escrow.toBase58().slice(0, 6);
    const base = { escrow, mint, vault, tokenProgram: TOKEN_PROGRAM_ID };

    if (state === "funded") {
      sigs[`${tag} withdraw`] = await ctx.program.methods.withdraw()
        .accountsPartial({ client: e.client, clientToken, ...base }).signers([ctx.client]).rpc();
    } else if (state === "accepted" && now > e.deadlineTs.toNumber()) {
      sigs[`${tag} refund_if_late`] = await crankerProgram.methods.refundIfLate()
        .accountsPartial({ caller: (ctx.cranker ?? ctx.client).publicKey, clientToken, ...base })
        .signers([ctx.cranker ?? ctx.client]).rpc();
    } else if (["accepted", "delivered", "frozen"].includes(state)) {
      sigs[`${tag} cancel`] = await ctx.programFor(ctx.freelancer).methods.cancelByFreelancer()
        .accountsPartial({ freelancer: e.freelancer, clientToken, freelancerToken, ...base })
        .signers([ctx.freelancer]).rpc();
    } else if (!["released", "refunded", "settled", "burned"].includes(state)) {
      throw new Error(`unexpected state ${state}`);
    }
    sigs[`${tag} close_escrow`] = await ctx.program.methods.closeEscrow()
      .accountsPartial({ client: e.client, ...base }).signers([ctx.client]).rpc();
    console.log(tag, state, "-> closed");
  }
  await verifySignatures(sigs);
  console.log("accounts left:", (await ctx.program.account.escrow.all()).length);
}

main().catch((err) => { console.error(err); process.exit(1); });
