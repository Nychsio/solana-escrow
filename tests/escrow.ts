import * as anchor from "@anchor-lang/core";
import { Program, BN } from "@anchor-lang/core";
import {
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { Escrow } from "../target/types/escrow";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const program = anchor.workspace.escrow as Program<Escrow>;

  const client = Keypair.generate();
  const freelancer = Keypair.generate();
  const DECIMALS = 6;
  const MINTED = 1_000_000_000;
  const AMOUNT = new BN(250_000_000);
  const REVIEW_WINDOW_SECS = new BN(3 * 24 * 60 * 60);

  let mint: PublicKey;
  let clientToken: PublicKey;

  const escrowPda = (id: BN) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        id.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    )[0];

  const vaultOf = (escrow: PublicKey) =>
    getAssociatedTokenAddressSync(mint, escrow, true);

  const create = (id: BN, amount: BN, deadlineTs: BN) => {
    const escrow = escrowPda(id);
    return program.methods
      .create(id, amount, deadlineTs, REVIEW_WINDOW_SECS)
      .accountsPartial({
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        mint,
        clientToken,
        escrow,
        vault: vaultOf(escrow),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([client])
      .rpc();
  };

  const expectError = async (promise: Promise<unknown>, code: string) => {
    try {
      await promise;
    } catch (err) {
      assert.instanceOf(err, anchor.AnchorError);
      assert.equal((err as anchor.AnchorError).error.errorCode.code, code);
      return;
    }
    assert.fail(`expected ${code}`);
  };

  const nowPlus = (secs: number) =>
    new BN(Math.floor(Date.now() / 1000) + secs);

  before(async () => {
    const sig = await connection.requestAirdrop(
      client.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction({
      signature: sig,
      ...(await connection.getLatestBlockhash()),
    });

    mint = await createMint(
      connection,
      client,
      client.publicKey,
      null,
      DECIMALS
    );
    clientToken = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        client,
        mint,
        client.publicKey
      )
    ).address;
    await mintTo(connection, client, mint, clientToken, client, MINTED);
  });

  it("create funds the vault and sets state to Funded", async () => {
    const id = new BN(1);
    const deadlineTs = nowPlus(7 * 24 * 60 * 60);
    await create(id, AMOUNT, deadlineTs);

    const escrow = escrowPda(id);
    const vault = await getAccount(connection, vaultOf(escrow));
    assert.equal(vault.amount.toString(), AMOUNT.toString());
    assert.isTrue(vault.owner.equals(escrow));

    const clientAccount = await getAccount(connection, clientToken);
    assert.equal(
      clientAccount.amount.toString(),
      new BN(MINTED).sub(AMOUNT).toString()
    );

    const state = await program.account.escrow.fetch(escrow);
    assert.isTrue(state.client.equals(client.publicKey));
    assert.isTrue(state.freelancer.equals(freelancer.publicKey));
    assert.isTrue(state.mint.equals(mint));
    assert.equal(state.id.toString(), id.toString());
    assert.equal(state.amount.toString(), AMOUNT.toString());
    assert.equal(state.deadlineTs.toString(), deadlineTs.toString());
    assert.equal(
      state.reviewWindowSecs.toString(),
      REVIEW_WINDOW_SECS.toString()
    );
    assert.isNull(state.deliveredAt);
    assert.deepEqual(state.state, { funded: {} });
  });

  it("rejects zero amount", async () => {
    await expectError(
      create(new BN(2), new BN(0), nowPlus(3600)),
      "InvalidAmount"
    );
  });

  it("rejects a deadline in the past", async () => {
    await expectError(
      create(new BN(3), AMOUNT, nowPlus(-3600)),
      "DeadlineInPast"
    );
  });

  it("rejects creating the same escrow id twice", async () => {
    try {
      await create(new BN(1), AMOUNT, nowPlus(3600));
    } catch {
      return;
    }
    assert.fail("expected duplicate escrow to fail");
  });
});
