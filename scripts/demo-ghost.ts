// Ghosting on devnet: create -> accept_job -> (freelancer vanishes, deadline passes) ->
// refund_if_late called by a THIRD wallet. The client gets the amount plus the ghost's bond.
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { connection } from "./common";
import {
  AMOUNT, Run, acceptJobCall, balanceOf, chainNow, closeCall, createCall, loadContext, newEscrow, sleep, tokens,
} from "./demo-lib";

const DEADLINE_SECS = 15;

async function main() {
  const ctx = loadContext();
  if (!ctx.cranker) throw new Error("No cranker wallet. Run `yarn demo:setup` first.");
  const e = newEscrow(ctx);
  const run = new Run();
  console.log("escrow ", e.escrow.toBase58());
  console.log("cranker", ctx.cranker.publicKey.toBase58(), "(neither client nor freelancer)");

  const clientStart = await balanceOf(ctx.clientToken);
  const deadlineTs = (await chainNow()) + DEADLINE_SECS;
  await run.step("create", createCall(ctx, e, { deadlineTs, review: 120, dispute: 120 }));
  await run.step("accept_job", acceptJobCall(ctx, e));
  console.log("   vault (amount + bond)", tokens(await balanceOf(e.vault)));

  console.log(`   freelancer disappears; waiting for the deadline (${DEADLINE_SECS}s)...`);
  while ((await chainNow()) <= deadlineTs + 1) await sleep(2000);

  const crankerProgram = ctx.programFor(ctx.cranker);
  await run.step(
    "refund_if_late (cranker)",
    crankerProgram.methods.refundIfLate()
      .accountsPartial({
        caller: ctx.cranker.publicKey, escrow: e.escrow, mint: ctx.mint, vault: e.vault,
        clientToken: ctx.clientToken, tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.cranker]).rpc()
  );

  const state = Object.keys((await ctx.program.account.escrow.fetch(e.escrow)).state)[0];
  const net = (await balanceOf(ctx.clientToken)) - clientStart;
  const bond = BigInt(AMOUNT.toString()) / BigInt(5);
  console.log("   state                ", state);
  console.log("   vault                ", tokens(await balanceOf(e.vault)));
  console.log(`   client net           ${tokens(net)} (the ghost's bond, as compensation)`);
  if (state !== "refunded" || net !== bond) throw new Error("client should net exactly the freelancer's bond");
  await run.step("close_escrow", closeCall(ctx, e));
  await run.verify();
}

main().catch((err) => { console.error(err); process.exit(1); });
