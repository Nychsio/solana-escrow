// Happy path on devnet: create -> accept_job -> mark_delivered -> release -> close_escrow, with 20% bonds.
import {
  AMOUNT, Run, acceptJobCall, balanceOf, closeCall, createCall, chainNow, deliverCall,
  loadContext, newEscrow, releaseCall, tokens,
} from "./demo-lib";
import { getAccount } from "@solana/spl-token";
import { connection } from "./common";

async function main() {
  const ctx = loadContext();
  const e = newEscrow(ctx);
  const run = new Run();
  console.log("escrow", e.escrow.toBase58());

  const clientStart = await balanceOf(ctx.clientToken);
  const freelancerStart = await balanceOf(ctx.freelancerToken);
  const deadlineTs = (await chainNow()) + 600;

  await run.step("create", createCall(ctx, e, { deadlineTs, review: 120, dispute: 120 }));
  console.log("   vault (amount)       ", tokens(await balanceOf(e.vault)));
  await run.step("accept_job", acceptJobCall(ctx, e));
  console.log("   vault (+ freelancer bond)", tokens(await balanceOf(e.vault)));
  await run.step("mark_delivered", deliverCall(ctx, e));
  await run.step("release", releaseCall(ctx, e));

  const state = Object.keys((await ctx.program.account.escrow.fetch(e.escrow)).state)[0];
  console.log("\nstate                ", state);
  console.log("vault                ", tokens(await balanceOf(e.vault)));
  console.log("freelancer net       ", tokens((await balanceOf(ctx.freelancerToken)) - freelancerStart), "(bond returned + amount)");
  console.log("client net           ", tokens((await balanceOf(ctx.clientToken)) - clientStart));
  if ((await balanceOf(ctx.freelancerToken)) - freelancerStart !== BigInt(AMOUNT.toString())) {
    throw new Error("freelancer should net exactly the amount");
  }
  await run.step("close_escrow", closeCall(ctx, e));
  await run.verify();
}

main().catch((err) => { console.error(err); process.exit(1); });
