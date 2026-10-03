// Prepares devnet for the demo: two funded wallets and a test mint.
// Idempotent: reruns reuse the saved wallets and mint and only top up what is missing.
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  DECIMALS,
  connection,
  funderKeypair,
  loadOrCreateKeypair,
  readMint,
  writeMint,
} from "./common";

const MIN_SOL = 0.05 * LAMPORTS_PER_SOL;
const TOKENS_FOR_CLIENT = 1000n * 10n ** BigInt(DECIMALS);

async function topUpSol(name: string, wallet: PublicKey) {
  const balance = await connection.getBalance(wallet);
  if (balance >= MIN_SOL) {
    console.log(`${name}: ${balance / LAMPORTS_PER_SOL} SOL, enough`);
    return;
  }
  const funder = funderKeypair();
  const lamports = MIN_SOL - balance;
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: funder.publicKey,
        toPubkey: wallet,
        lamports,
      })
    ),
    [funder]
  );
  console.log(`${name}: sent ${lamports / LAMPORTS_PER_SOL} SOL from ${funder.publicKey}`);
}

async function main() {
  const client = loadOrCreateKeypair("client");
  const freelancer = loadOrCreateKeypair("freelancer");
  console.log("client     ", client.publicKey.toBase58());
  console.log("freelancer ", freelancer.publicKey.toBase58());

  await topUpSol("client", client.publicKey);
  await topUpSol("freelancer", freelancer.publicKey);

  let mint = readMint();
  if (mint && (await connection.getAccountInfo(mint))) {
    console.log("mint (reused)", mint.toBase58());
  } else {
    mint = await createMint(connection, client, client.publicKey, null, DECIMALS);
    writeMint(mint);
    console.log("mint (created)", mint.toBase58());
  }

  const clientToken = await getOrCreateAssociatedTokenAccount(
    connection,
    client,
    mint,
    client.publicKey
  );
  // The payout destination must exist before release, so create it up front.
  await getOrCreateAssociatedTokenAccount(
    connection,
    client,
    mint,
    freelancer.publicKey
  );

  const held = (await getAccount(connection, clientToken.address)).amount;
  if (held < TOKENS_FOR_CLIENT) {
    await mintTo(
      connection,
      client,
      mint,
      clientToken.address,
      client,
      TOKENS_FOR_CLIENT - held
    );
  }
  const now = (await getAccount(connection, clientToken.address)).amount;
  console.log(`client token balance: ${Number(now) / 10 ** DECIMALS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
