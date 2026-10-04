// Early-payment discount on devnet ("2/10 net 30"): the freelancer offers 2% off the amount
// if the client approves within the early window. create (discount terms) -> accept_job (the
// freelancer signs the terms) -> mark_delivered (open) -> release inside the window -> close_escrow.
import { connection, feeOf } from "./common";
import {
  AMOUNT, BOND_BPS, Run, acceptJobCall, balanceOf, chainNow, closeCall, createCall, deliverCall,
  loadContext, newEscrow, releaseCall, tokens,
} from "./demo-lib";

const DISCOUNT_BPS = 200; // 2% of the amount, never of the bonds
const EARLY_WINDOW_SECS = 90;

async function main() {
  const ctx = loadContext();
  const e = newEscrow(ctx);
  const run = new Run();
  console.log("escrow", e.escrow.toBase58());

  const clientStart = await balanceOf(ctx.clientToken);
  const freelancerStart = await balanceOf(ctx.freelancerToken);
  await run.step("create", createCall(ctx, e, {
    deadlineTs: (await chainNow()) + 600, review: 120, dispute: 120,
    earlyDiscountBps: DISCOUNT_BPS, earlyWindow: EARLY_WINDOW_SECS,
  }));
  const terms = await ctx.program.account.escrow.fetch(e.escrow);
  console.log(`   terms on chain    ${terms.earlyDiscountBps / 100}% off the amount if approved within ${terms.earlyWindowSecs}s of delivery`);
  await run.step("accept_job", acceptJobCall(ctx, e));
  await run.step("mark_delivered", deliverCall(ctx, e));
  console.log("   vault (amount + bond)", tokens(await balanceOf(e.vault)));

  const vaultBefore = await balanceOf(e.vault);
  await run.step("release (in window)", releaseCall(ctx, e));
  const toClient = (await balanceOf(ctx.clientToken)) - (clientStart - BigInt(AMOUNT.toString()));
  const freelancerNet = (await balanceOf(ctx.freelancerToken)) - freelancerStart;
  const discount = BigInt(AMOUNT.toString()) * BigInt(DISCOUNT_BPS) / BigInt(10000);
  console.log("   discount to client   ", tokens(toClient), `(= ${DISCOUNT_BPS / 100}% of ${tokens(BigInt(AMOUNT.toString()))}, not of the ${BOND_BPS / 100}% bond)`);
  console.log("   client net           ", tokens((await balanceOf(ctx.clientToken)) - clientStart), "(paid the amount minus the discount)");
  console.log("   freelancer net       ", tokens(freelancerNet), "(amount minus the discount; the bond came back)");
  console.log("   vault                ", tokens(await balanceOf(e.vault)));
  if (toClient !== discount || freelancerNet !== BigInt(AMOUNT.toString()) - discount) {
    throw new Error("the discount should be exactly 2% of the amount, paid out of the freelancer's share");
  }
  if (toClient + freelancerNet !== BigInt(AMOUNT.toString())) throw new Error("amounts do not add up");
  void vaultBefore;

  const closeSig = await run.step("close_escrow", closeCall(ctx, e));
  console.log(`   rent returned        tx fee ${await feeOf(closeSig)}, client SOL ${(await connection.getBalance(ctx.client.publicKey)) / 1e9}`);
  await run.verify();
}

main().catch((err) => { console.error(err); process.exit(1); });
