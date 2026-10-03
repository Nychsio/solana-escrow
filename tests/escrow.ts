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
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { assert } from "chai";
import { Escrow } from "../target/types/escrow";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const program = anchor.workspace.escrow as Program<Escrow>;

  const client = Keypair.generate();
  const freelancer = Keypair.generate();
  const stranger = Keypair.generate();
  const DECIMALS = 6;
  const MINTED = 100_000_000_000;
  const AMOUNT = new BN(250_000_000);
  const HASH = Array.from({ length: 32 }, (_, i) => i + 1);
  const LONG = 7 * 24 * 60 * 60;

  let mint: PublicKey;
  let clientToken: PublicKey;
  let freelancerToken: PublicKey;
  let nextId = 1;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Deadlines are compared against the validator clock, not the local one.
  const chainNow = async () => {
    const time = await connection.getBlockTime(await connection.getSlot());
    assert.isNotNull(time);
    return time as number;
  };

  // The default local validator only produces a block (and moves its clock)
  // when a transaction arrives, so each wait step also sends a no-op transfer.
  const waitUntilAfter = async (ts: number) => {
    while ((await chainNow()) <= ts + 1) {
      await sleep(500);
      await provider.sendAndConfirm(
        new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: stranger.publicKey,
            toPubkey: stranger.publicKey,
            lamports: 1,
          })
        ),
        [stranger]
      );
    }
  };

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

  const create = (
    id: BN,
    amount: BN,
    deadlineTs: number,
    reviewWindowSecs: number
  ) => {
    const escrow = escrowPda(id);
    return program.methods
      .create(id, amount, new BN(deadlineTs), new BN(reviewWindowSecs))
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

  // Opens a funded escrow and returns its address plus its deadline.
  const open = async (deadlineInSecs: number, reviewWindowSecs: number) => {
    const id = new BN(nextId++);
    const deadlineTs = (await chainNow()) + deadlineInSecs;
    await create(id, AMOUNT, deadlineTs, reviewWindowSecs);
    return { escrow: escrowPda(id), deadlineTs };
  };

  const markDelivered = (escrow: PublicKey, signer = freelancer) =>
    program.methods
      .markDelivered(HASH)
      .accountsPartial({ freelancer: signer.publicKey, escrow })
      .signers([signer])
      .rpc();

  const reject = (escrow: PublicKey, signer = client) =>
    program.methods
      .reject()
      .accountsPartial({ client: signer.publicKey, escrow })
      .signers([signer])
      .rpc();

  const release = (
    escrow: PublicKey,
    signer = client,
    destination = freelancerToken
  ) =>
    program.methods
      .release()
      .accountsPartial({
        client: signer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        freelancerToken: destination,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();

  const claimIfSilent = (
    escrow: PublicKey,
    signer = freelancer,
    destination = freelancerToken
  ) =>
    program.methods
      .claimIfSilent()
      .accountsPartial({
        freelancer: signer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        freelancerToken: destination,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();

  const refundIfLate = (
    escrow: PublicKey,
    signer = client,
    destination = clientToken
  ) =>
    program.methods
      .refundIfLate()
      .accountsPartial({
        client: signer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        clientToken: destination,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();

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

  const balance = async (account: PublicKey) =>
    (await getAccount(connection, account)).amount.toString();

  const stateOf = async (escrow: PublicKey) =>
    (await program.account.escrow.fetch(escrow)).state;

  // Asserts that `action` moved exactly AMOUNT from the vault to `destination`.
  const expectPayout = async (
    escrow: PublicKey,
    destination: PublicKey,
    action: () => Promise<unknown>
  ) => {
    const before = new BN(await balance(destination));
    await action();
    assert.equal(await balance(destination), before.add(AMOUNT).toString());
    assert.equal(await balance(vaultOf(escrow)), "0");
  };

  before(async () => {
    for (const wallet of [client, freelancer, stranger]) {
      const sig = await connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction({
        signature: sig,
        ...(await connection.getLatestBlockhash()),
      });
    }

    mint = await createMint(
      connection,
      client,
      client.publicKey,
      null,
      DECIMALS
    );
    const tokenAccount = async (owner: PublicKey) =>
      (await getOrCreateAssociatedTokenAccount(connection, client, mint, owner))
        .address;
    clientToken = await tokenAccount(client.publicKey);
    freelancerToken = await tokenAccount(freelancer.publicKey);
    await mintTo(connection, client, mint, clientToken, client, MINTED);
  });

  describe("create", () => {
    it("funds the vault and sets state to Funded", async () => {
      const id = new BN(nextId++);
      const deadlineTs = (await chainNow()) + LONG;
      const before = new BN(await balance(clientToken));
      await create(id, AMOUNT, deadlineTs, 3600);

      const escrow = escrowPda(id);
      const vault = await getAccount(connection, vaultOf(escrow));
      assert.equal(vault.amount.toString(), AMOUNT.toString());
      assert.isTrue(vault.owner.equals(escrow));
      assert.equal(await balance(clientToken), before.sub(AMOUNT).toString());

      const account = await program.account.escrow.fetch(escrow);
      assert.isTrue(account.client.equals(client.publicKey));
      assert.isTrue(account.freelancer.equals(freelancer.publicKey));
      assert.isTrue(account.mint.equals(mint));
      assert.equal(account.id.toString(), id.toString());
      assert.equal(account.amount.toString(), AMOUNT.toString());
      assert.equal(account.deadlineTs.toString(), deadlineTs.toString());
      assert.equal(account.reviewWindowSecs.toString(), "3600");
      assert.isNull(account.deliveredAt);
      assert.deepEqual(account.deliverableHash, new Array(32).fill(0));
      assert.deepEqual(account.state, { funded: {} });
    });

    it("rejects zero amount", async () => {
      const deadlineTs = (await chainNow()) + LONG;
      await expectError(
        create(new BN(nextId++), new BN(0), deadlineTs, 3600),
        "InvalidAmount"
      );
    });

    it("rejects a deadline in the past", async () => {
      const deadlineTs = (await chainNow()) - 3600;
      await expectError(
        create(new BN(nextId++), AMOUNT, deadlineTs, 3600),
        "DeadlineInPast"
      );
    });

    it("rejects creating the same escrow id twice", async () => {
      const id = new BN(nextId++);
      const deadlineTs = (await chainNow()) + LONG;
      await create(id, AMOUNT, deadlineTs, 3600);
      try {
        await create(id, AMOUNT, deadlineTs, 3600);
      } catch {
        return;
      }
      assert.fail("expected duplicate escrow to fail");
    });
  });

  describe("release", () => {
    it("client pays the freelancer straight from Funded", async () => {
      const { escrow } = await open(LONG, 3600);
      await expectPayout(escrow, freelancerToken, () => release(escrow));
      assert.deepEqual(await stateOf(escrow), { released: {} });
    });

    it("client accepts a delivery", async () => {
      const { escrow } = await open(LONG, 3600);
      await markDelivered(escrow);

      const account = await program.account.escrow.fetch(escrow);
      assert.deepEqual(account.state, { delivered: {} });
      assert.deepEqual(account.deliverableHash, HASH);
      assert.isNotNull(account.deliveredAt);

      await expectPayout(escrow, freelancerToken, () => release(escrow));
      assert.deepEqual(await stateOf(escrow), { released: {} });
    });

    it("cannot pay out twice", async () => {
      const { escrow } = await open(LONG, 3600);
      await release(escrow);
      await expectError(release(escrow), "InvalidState");
    });

    it("cannot send the payout to someone else's token account", async () => {
      const { escrow } = await open(LONG, 3600);
      await expectError(
        release(escrow, client, clientToken),
        "ConstraintTokenOwner"
      );
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
    });
  });

  describe("claim_if_silent", () => {
    it("freelancer claims only after the review window", async () => {
      const { escrow } = await open(LONG, 3);
      await expectError(claimIfSilent(escrow), "InvalidState");

      await markDelivered(escrow);
      await expectError(claimIfSilent(escrow), "ReviewWindowOpen");

      const account = await program.account.escrow.fetch(escrow);
      await waitUntilAfter((account.deliveredAt as BN).toNumber() + 3);

      await expectError(reject(escrow), "ReviewWindowClosed");
      await expectPayout(escrow, freelancerToken, () => claimIfSilent(escrow));
      assert.deepEqual(await stateOf(escrow), { released: {} });
    });
  });

  describe("refund_if_late", () => {
    it("client is refunded only after a missed deadline", async () => {
      const { escrow, deadlineTs } = await open(4, 3600);
      await expectError(refundIfLate(escrow), "DeadlineNotReached");

      await waitUntilAfter(deadlineTs);

      await expectError(markDelivered(escrow), "DeadlinePassed");
      await expectPayout(escrow, clientToken, () => refundIfLate(escrow));
      assert.deepEqual(await stateOf(escrow), { refunded: {} });
      await expectError(refundIfLate(escrow), "InvalidState");
    });

    it("no refund once the work was delivered on time", async () => {
      const { escrow, deadlineTs } = await open(4, 3600);
      await markDelivered(escrow);
      await expectError(markDelivered(escrow), "InvalidState");

      await waitUntilAfter(deadlineTs);

      await expectError(refundIfLate(escrow), "InvalidState");
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
    });
  });

  describe("reject", () => {
    it("is not available before a delivery", async () => {
      const { escrow } = await open(LONG, 3600);
      await expectError(reject(escrow), "InvalidState");
    });

    it("freezes the funds and blocks every way out", async () => {
      const { escrow, deadlineTs } = await open(4, 3);
      await markDelivered(escrow);
      const account = await program.account.escrow.fetch(escrow);
      await reject(escrow);
      assert.deepEqual(await stateOf(escrow), { frozen: {} });

      // Past both the deadline and the review window, so only the state blocks.
      await waitUntilAfter(
        Math.max(deadlineTs, (account.deliveredAt as BN).toNumber() + 3)
      );

      await expectError(release(escrow), "InvalidState");
      await expectError(claimIfSilent(escrow), "InvalidState");
      await expectError(refundIfLate(escrow), "InvalidState");
      await expectError(markDelivered(escrow), "InvalidState");
      await expectError(reject(escrow), "InvalidState");

      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
      assert.deepEqual(await stateOf(escrow), { frozen: {} });
    });
  });

  describe("wrong signer", () => {
    it("rejects every instruction called by the wrong party", async () => {
      const { escrow } = await open(LONG, 3600);

      await expectError(markDelivered(escrow, client), "Unauthorized");
      await expectError(markDelivered(escrow, stranger), "Unauthorized");
      await expectError(release(escrow, freelancer), "Unauthorized");
      await expectError(release(escrow, stranger), "Unauthorized");
      await expectError(
        refundIfLate(escrow, freelancer, freelancerToken),
        "Unauthorized"
      );

      await markDelivered(escrow);

      await expectError(reject(escrow, freelancer), "Unauthorized");
      await expectError(reject(escrow, stranger), "Unauthorized");
      await expectError(
        claimIfSilent(escrow, client, clientToken),
        "Unauthorized"
      );
      await expectError(claimIfSilent(escrow, stranger), "Unauthorized");

      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
      assert.deepEqual(await stateOf(escrow), { delivered: {} });
    });
  });
});
