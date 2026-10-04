// Cancel path on devnet: create -> accept_job -> mark_delivered -> cancel_by_freelancer -> close_escrow.
// The freelancer unwinds the deal: each side gets back exactly its own deposit, nothing burns.
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { connection, feeOf } from "./common";
import {
  AMOUNT, BOND_BPS, Run, acceptJobCall, balanceOf, chainNow, closeCall, createCall, deliverCall,
  loadContext, newEscrow, tokens,
} from "./demo-lib";

async function main() {
  const ctx = loadContext();
  const e = newEscrow(ctx);
  const run = new Run();
  console.log("escrow", e.escrow.toBase58());

  const clientStart = await balanceOf(ctx.clientToken);
  const freelancerStart = await balanceOf(ctx.freelancerToken);
  const supplyStart = (await getMint(connection, ctx.mint)).supply;

  await run.step("create", createCall(ctx, e, { deadlineTs: (await chainNow()) + 600, review: 120, dispute: 120 }));
  await run.step("accept_job", acceptJobCall(ctx, e));
  await run.step("mark_delivered", deliverCall(ctx, e));
  console.log("   vault (amount + bond)", tokens(await balanceOf(e.vault)));

  await run.step(
    "cancel_by_freelancer",
    ctx.program.methods.cancelByFreelancer()
      .accountsPartial({
        freelancer: ctx.freelancer.publicKey, escrow: e.escrow, mint: ctx.mint, vault: e.vault,
        clientToken: ctx.clientToken, freelancerToken: ctx.freelancerToken, tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.freelancer]).rpc()
  );
  const state = Object.keys((await ctx.program.account.escrow.fetch(e.escrow)).state)[0];
  const burned = supplyStart - (await getMint(connection, ctx.mint)).supply;
  console.log("   state                ", state);
  console.log("   vault                ", tokens(await balanceOf(e.vault)));
  console.log(`   client tokens        ${tokens(clientStart)} -> ${tokens(await balanceOf(ctx.clientToken))} (everything back)`);
  console.log(`   freelancer tokens    ${tokens(freelancerStart)} -> ${tokens(await balanceOf(ctx.freelancerToken))} (own bond back)`);
  console.log("   burned               ", tokens(burned));
  if (state !== "refunded" || burned !== 0n || (await balanceOf(ctx.clientToken)) !== clientStart || (await balanceOf(ctx.freelancerToken)) !== freelancerStart) {
    throw new Error("cancel should return each side exactly its own deposit without burning");
  }

  const rent = (await connection.getBalance(e.escrow)) + (await connection.getBalance(e.vault));
  const solBefore = await connection.getBalance(ctx.client.publicKey);
  const closeSig = await run.step("close_escrow", closeCall(ctx, e));
  const fee = await feeOf(closeSig);
  const solChange = (await connection.getBalance(ctx.client.publicKey)) - solBefore;
  console.log(`   rent returned        ${rent} lamports, tx fee ${fee}, client SOL change ${solChange}`);
  if (solChange !== rent - fee) throw new Error("rent refund mismatch");
  await run.verify();
}

main().catch((err) => { console.error(err); process.exit(1); });
