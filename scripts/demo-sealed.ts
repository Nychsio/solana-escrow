// Sealed delivery on devnet: the freelancer is paid only by revealing the key.
// create -> accept_job -> mark_delivered(sealed) -> release (approve, no payout) ->
// claim_with_key (money out, key on chain) -> read the key from the account -> decrypt -> close_escrow.
//
// The .sealed file format is the one the web app uses (app/src/seal.ts):
//   "SEAL1" (5 B) | name length (1 B) | file name (UTF-8) | IV (12 B) | AES-256-GCM ciphertext + tag
// deliverable_hash = SHA-256 of the whole .sealed file; key_hash = SHA-256 of the raw 32-byte key.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { readFileSync } from "fs";
import { basename, join } from "path";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ROOT } from "./common";
import {
  AMOUNT, Run, acceptJobCall, balanceOf, chainNow, closeCall, createCall, deliverRaw,
  loadContext, newEscrow, releaseCall, tokens,
} from "./demo-lib";

const MAGIC = Buffer.from("SEAL1");
const sha256 = (data: Buffer) => Array.from(createHash("sha256").update(data).digest());

// WebCrypto's AES-GCM output is ciphertext followed by the 16-byte tag, so node's is concatenated the same way.
function seal(data: Buffer, name: string, key: Buffer): Buffer {
  const nameBytes = Buffer.from(name, "utf8");
  if (nameBytes.length > 255) throw new Error("file name too long");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);
  return Buffer.concat([MAGIC, Buffer.from([nameBytes.length]), nameBytes, iv, ct]);
}

function unseal(sealed: Buffer, key: Buffer): { name: string; data: Buffer } {
  if (sealed.length < MAGIC.length + 1 + 12 + 16 || !sealed.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("not a .sealed file (bad header)");
  }
  const nameLen = sealed[MAGIC.length];
  const start = MAGIC.length + 1;
  const name = sealed.subarray(start, start + nameLen).toString("utf8");
  const iv = sealed.subarray(start + nameLen, start + nameLen + 12);
  const body = sealed.subarray(start + nameLen + 12);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(body.subarray(body.length - 16));
  return { name, data: Buffer.concat([decipher.update(body.subarray(0, body.length - 16)), decipher.final()]) };
}

async function main() {
  const ctx = loadContext();
  const e = newEscrow(ctx);
  const run = new Run();
  console.log("escrow", e.escrow.toBase58());

  // Off chain: the freelancer seals the work and commits to the whole file and to the key.
  const path = join(ROOT, "README.md");
  const original = readFileSync(path);
  const key = randomBytes(32);
  const sealed = seal(original, basename(path), key);
  console.log(`work: ${basename(path)} (${original.length} B) -> .sealed ${sealed.length} B (SEAL1, AES-256-GCM)`);

  const freelancerStart = await balanceOf(ctx.freelancerToken);
  await run.step("create", createCall(ctx, e, { deadlineTs: (await chainNow()) + 600, review: 120, dispute: 120 }));
  await run.step("accept_job", acceptJobCall(ctx, e));
  await run.step("mark_delivered (sealed)", deliverRaw(ctx, e, sha256(sealed), sha256(key)));
  const delivered = await ctx.program.account.escrow.fetch(e.escrow);
  console.log("   on chain now      only hashes: .sealed file", Buffer.from(delivered.deliverableHash).toString("hex").slice(0, 16) + "...",
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
        freelancerToken: ctx.freelancerToken, clientToken: ctx.clientToken, tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.freelancer]).rpc()
  );
  const paid = (await balanceOf(ctx.freelancerToken)) - freelancerStart;
  console.log("   freelancer net    ", tokens(paid), "(amount; the 20% bond came back too)");
  if (paid !== BigInt(AMOUNT.toString())) throw new Error("freelancer should net exactly the amount");

  // The client reads the key from the account (the same transaction that paid), checks the file
  // against the committed hash, and decrypts.
  const released = await ctx.program.account.escrow.fetch(e.escrow);
  const revealed = Buffer.from(released.revealedKey);
  console.log("   key on chain      ", revealed.toString("hex").slice(0, 16) + "...", "matches:", revealed.equals(key));
  const fileMatchesHash = Buffer.from(sha256(sealed)).equals(Buffer.from(released.deliverableHash));
  const { name, data } = unseal(sealed, revealed);
  console.log(`   .sealed matches deliverable_hash: ${fileMatchesHash}; decrypted "${name}" (${data.length} B), identical to the original: ${data.equals(original)}`);
  if (!fileMatchesHash || !data.equals(original)) throw new Error("decrypted work differs from the original");

  await run.step("close_escrow", closeCall(ctx, e));
  await run.verify();
}

main().catch((err) => { console.error(err); process.exit(1); });
