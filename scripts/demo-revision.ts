// Revision on devnet: create -> accept_job -> mark_delivered -> request_revision -> mark_delivered -> release.
import { AMOUNT, Run, acceptJobCall, balanceOf, chainNow, createCall, deliverCall, loadContext, newEscrow, releaseCall, tokens } from "./demo-lib";

async function main() {
  const ctx = loadContext();
  const e = newEscrow(ctx);
  const run = new Run();
  console.log("escrow", e.escrow.toBase58());
  const view = async () => {
    const a = await ctx.program.account.escrow.fetch(e.escrow);
    return `${Object.keys(a.state)[0]}, revisions used ${a.revisionsUsed}/${a.maxRevisions}, deadline in ${a.deadlineTs.toNumber() - (await chainNow())}s`;
  };

  const freelancerStart = await balanceOf(ctx.freelancerToken);
  await run.step("create", createCall(ctx, e, { deadlineTs: (await chainNow()) + 300, review: 120, dispute: 120, maxRevisions: 1, revisionWindow: 600 }));
  await run.step("accept_job", acceptJobCall(ctx, e));
  await run.step("mark_delivered (v1)", deliverCall(ctx, e, "first version"));
  console.log("   ", await view());

  await run.step(
    "request_revision",
    ctx.program.methods.requestRevision()
      .accountsPartial({ client: ctx.client.publicKey, escrow: e.escrow })
      .signers([ctx.client]).rpc()
  );
  console.log("   ", await view(), "(deadline moved out, back to accepted)");

  await run.step("mark_delivered (v2)", deliverCall(ctx, e, "second version"));
  await run.step("release", releaseCall(ctx, e));
  const net = (await balanceOf(ctx.freelancerToken)) - freelancerStart;
  console.log("   ", await view());
  console.log("    freelancer net  ", tokens(net));
  if (net !== BigInt(AMOUNT.toString())) throw new Error("freelancer should net exactly the amount");
  await run.verify();
}

main().catch((err) => { console.error(err); process.exit(1); });
