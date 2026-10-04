// Dispute path on devnet: create -> accept_job -> mark_delivered -> reject -> propose -> accept (decay) -> close_escrow.
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { connection, feeOf } from "./common";
import {
  AMOUNT, Run, acceptJobCall, balanceOf, chainNow, closeCall, createCall, deliverCall,
  loadContext, newEscrow, rejectCall, sleep, tokens,
} from "./demo-lib";

const DISPUTE_WINDOW_SECS = 60;
const WAIT_BEFORE_ACCEPT_SECS = 20; // about a third of the window
const FREELANCER_BPS = 7000;

async function main() {
  const ctx = loadContext();
  const e = newEscrow(ctx);
  const run = new Run();
  console.log("escrow", e.escrow.toBase58());

  await run.step("create", createCall(ctx, e, { deadlineTs: (await chainNow()) + 600, review: 120, dispute: DISPUTE_WINDOW_SECS }));
  await run.step("accept_job", acceptJobCall(ctx, e));
  await run.step("mark_delivered", deliverCall(ctx, e));
  await run.step("reject (Frozen)", rejectCall(ctx, e));
  console.log("   vault (amount + 2 bonds)", tokens(await balanceOf(e.vault)));

  await run.step(
    "propose_settlement",
    ctx.program.methods.proposeSettlement(FREELANCER_BPS)
      .accountsPartial({ signer: ctx.client.publicKey, escrow: e.escrow })
      .signers([ctx.client]).rpc()
  );
  console.log(`   (${FREELANCER_BPS} bps for the freelancer) waiting ${WAIT_BEFORE_ACCEPT_SECS}s so the decay burn grows...`);
  await sleep(WAIT_BEFORE_ACCEPT_SECS * 1000);

  const supplyBefore = (await getMint(connection, ctx.mint)).supply;
  const vaultBefore = await balanceOf(e.vault);
  const clientBefore = await balanceOf(ctx.clientToken);
  const freelancerBefore = await balanceOf(ctx.freelancerToken);

  await run.step(
    "accept_settlement",
    ctx.program.methods.acceptSettlement(FREELANCER_BPS)
      .accountsPartial({
        signer: ctx.freelancer.publicKey, escrow: e.escrow, mint: ctx.mint, vault: e.vault,
        freelancerToken: ctx.freelancerToken, clientToken: ctx.clientToken, tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.freelancer]).rpc()
  );
  const burned = supplyBefore - (await getMint(connection, ctx.mint)).supply;
  const toFreelancer = (await balanceOf(ctx.freelancerToken)) - freelancerBefore;
  const toClient = (await balanceOf(ctx.clientToken)) - clientBefore;
  console.log(`   vault before      ${tokens(vaultBefore)}`);
  console.log(`   burned            ${tokens(burned)} (${(Number(burned) * 100 / Number(vaultBefore)).toFixed(1)}%)`);
  console.log(`   to freelancer     ${tokens(toFreelancer)}`);
  console.log(`   to client         ${tokens(toClient)}`);
  if (burned + toFreelancer + toClient !== vaultBefore) throw new Error("payouts + burn do not add up to the vault balance");
  console.log("   check             burned + payouts = vault balance");

  const rent = (await connection.getBalance(e.escrow)) + (await connection.getBalance(e.vault));
  const solBefore = await connection.getBalance(ctx.client.publicKey);
  const closeSig = await run.step("close_escrow", closeCall(ctx, e));
  const fee = await feeOf(closeSig);
  const solChange = (await connection.getBalance(ctx.client.publicKey)) - solBefore;
  console.log(`   rent returned     ${rent} lamports, tx fee ${fee}, client SOL change ${solChange}`);
  if (solChange !== rent - fee) throw new Error("rent refund mismatch");
  await run.verify();
}

main().catch((err) => { console.error(err); process.exit(1); });
