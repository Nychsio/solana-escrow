// Sealed delivery on devnet: the freelancer is paid only by revealing the key.
// create -> accept_job -> mark_delivered(sealed) -> release (approve, no payout) ->
// claim_with_key (money out, key on chain) -> read the key from the account -> decrypt -> close_escrow.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ROOT } from "./common";
import {
  AMOUNT, Run, acceptJobCall, balanceOf, chainNow, closeCall, createCall, deliverRaw,
  loadContext, newEscrow, releaseCall, tokens,
} from "./demo-lib";

const sha256 = (data: Buffer) => Array.from(createHash("sha256").update(data).digest());

// AES-256-GCM, output = iv (12) || ciphertext || auth tag (16).
const encrypt = (key: Buffer, plaintext: Buffer) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]);
};
const decrypt = (key: Buffer, blob: Buffer) => {
  const decipher = createDecipheriv("aes-256-gcm", key, blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(blob.length - 16));
  return Buffer.concat([decipher.update(blob.subarray(12, blob.length - 16)), decipher.final()]);
};

async function main() {
  const ctx = loadContext();
  const e = newEscrow(ctx);
  const run = new Run();
  console.log("escrow", e.escrow.toBase58());

  // Off chain: the freelancer encrypts the work and commits to the ciphertext and the key.
  const original = readFileSync(join(ROOT, "README.md"));
  const key = randomBytes(32);
  const ciphertext = encrypt(key, original);
  console.log(`work: README.md (${original.length} B) -> ciphertext ${ciphertext.length} B (AES-256-GCM)`);

  const freelancerStart = await balanceOf(ctx.freelancerToken);
  await run.step("create", createCall(ctx, e, { deadlineTs: (await chainNow()) + 600, review: 120, dispute: 120 }));
  await run.step("accept_job", acceptJobCall(ctx, e));
  await run.step("mark_delivered (sealed)", deliverRaw(ctx, e, sha256(ciphertext), sha256(key)));
  const delivered = await ctx.program.account.escrow.fetch(e.escrow);
  console.log("   on chain now      only hashes: ciphertext", Buffer.from(delivered.deliverableHash).toString("hex").slice(0, 16) + "...",
    "key", Buffer.from(delivered.keyHash).toString("hex").slice(0, 16) + "...");
  console.log("   revealed key      ", Buffer.from(delivered.revealedKey).toString("hex").slice(0, 16) + "... (still zeros: the client cannot read the work yet)");

  await run.step("release (approve)", releaseCall(ctx, e));
  const approved = await ctx.program.account.escrow.fetch(e.escrow);
  console.log("   state             ", Object.keys(approved.state)[0], "| vault", tokens(await balanceOf(e.vault)), "(no payout yet)");

  await run.step(
    "claim_with_key",
    ctx.program.methods.claimWithKey(Array.from(key))
      .accountsPartial({
        caller: ctx.freelancer.publicKey, escrow: e.escrow, mint: ctx.mint, vault: e.vault,
        freelancerToken: ctx.freelancerToken, tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.freelancer]).rpc()
  );
  const paid = (await balanceOf(ctx.freelancerToken)) - freelancerStart;
  console.log("   freelancer net    ", tokens(paid), "(amount; the 20% bond came back too)");
  if (paid !== BigInt(AMOUNT.toString())) throw new Error("freelancer should net exactly the amount");

  // The client reads the key from the account (the same transaction that paid) and decrypts.
  const released = await ctx.program.account.escrow.fetch(e.escrow);
  const revealed = Buffer.from(released.revealedKey);
  const decrypted = decrypt(revealed, ciphertext);
  console.log("   key on chain      ", revealed.toString("hex").slice(0, 16) + "...", "matches:", revealed.equals(key));
  if (!decrypted.equals(original)) throw new Error("decrypted work differs from the original");
  console.log(`   decrypted ${decrypted.length} B, identical to the original: true`);

  await run.step("close_escrow", closeCall(ctx, e));
  await run.verify();
}

main().catch((err) => { console.error(err); process.exit(1); });
