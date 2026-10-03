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
import { getMint } from "@solana/spl-token";
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
    reviewWindowSecs: number,
    disputeWindowSecs = 3600
  ) => {
    const escrow = escrowPda(id);
    return program.methods
      .create(
        id,
        amount,
        new BN(deadlineTs),
        new BN(reviewWindowSecs),
        new BN(disputeWindowSecs)
      )
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
  const open = async (
    deadlineInSecs: number,
    reviewWindowSecs: number,
    disputeWindowSecs = 3600,
    amount = AMOUNT
  ) => {
    const id = new BN(nextId++);
    const deadlineTs = (await chainNow()) + deadlineInSecs;
    await create(id, amount, deadlineTs, reviewWindowSecs, disputeWindowSecs);
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

  const propose = (escrow: PublicKey, bps: number, signer = client) =>
    program.methods
      .proposeSettlement(bps)
      .accountsPartial({ signer: signer.publicKey, escrow })
      .signers([signer])
      .rpc();

  const accept = (escrow: PublicKey, bps: number, signer = freelancer) =>
    program.methods
      .acceptSettlement(bps)
      .accountsPartial({
        signer: signer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        freelancerToken,
        clientToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();

  const burn = (escrow: PublicKey, payer = stranger) =>
    program.methods
      .burnIfUnsettled()
      .accountsPartial({
        payer: payer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

  const cancel = (
    escrow: PublicKey,
    signer = freelancer,
    destination = clientToken
  ) =>
    program.methods
      .cancelByFreelancer()
      .accountsPartial({
        freelancer: signer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        clientToken: destination,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();

  const closeEscrow = (escrow: PublicKey, signer = client) =>
    program.methods
      .closeEscrow()
      .accountsPartial({
        client: signer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();

  // Accepts a settlement and measures where the vault went. The decay burn depends
  // on the clock, so the burned amount is read from the mint supply, and the
  // invariants (nothing lost, remainder split exactly by bps) are checked on it.
  const settle = async (escrow: PublicKey, bps: number, signer = freelancer) => {
    const clientBefore = BigInt(await balance(clientToken));
    const freelancerBefore = BigInt(await balance(freelancerToken));
    const vaultBefore = BigInt(await balance(vaultOf(escrow)));
    const supplyBefore = (await getMint(connection, mint)).supply;

    await accept(escrow, bps, signer);

    const burned = supplyBefore - (await getMint(connection, mint)).supply;
    const toFreelancer =
      BigInt(await balance(freelancerToken)) - freelancerBefore;
    const toClient = BigInt(await balance(clientToken)) - clientBefore;
    assert.equal(await balance(vaultOf(escrow)), "0");
    assert.equal(
      (burned + toFreelancer + toClient).toString(),
      vaultBefore.toString()
    );
    assert.equal(
      toFreelancer.toString(),
      (((vaultBefore - burned) * BigInt(bps)) / BigInt(10000)).toString()
    );
    return { burned, toFreelancer, toClient, vaultBefore };
  };

  // Delivered and rejected inside the review window, so the escrow is Frozen.
  const freeze = async (disputeWindowSecs = 3600, amount = AMOUNT) => {
    const { escrow } = await open(LONG, 3600, disputeWindowSecs, amount);
    await markDelivered(escrow);
    await reject(escrow);
    return escrow;
  };

  const waitForDisputeEnd = async (escrow: PublicKey) => {
    const account = await program.account.escrow.fetch(escrow);
    await waitUntilAfter(
      account.frozenAt.toNumber() + account.disputeWindowSecs.toNumber()
    );
  };

  // Settled and Burned are terminal: no instruction may accept them.
  const expectEveryInstructionRejected = async (escrow: PublicKey) => {
    await expectError(markDelivered(escrow), "InvalidState");
    await expectError(reject(escrow), "InvalidState");
    await expectError(release(escrow), "InvalidState");
    await expectError(claimIfSilent(escrow), "InvalidState");
    await expectError(refundIfLate(escrow), "InvalidState");
    await expectError(propose(escrow, 5000, client), "InvalidState");
    await expectError(propose(escrow, 5000, freelancer), "InvalidState");
    await expectError(accept(escrow, 5000, freelancer), "InvalidState");
    await expectError(accept(escrow, 5000, client), "InvalidState");
    await expectError(burn(escrow), "InvalidState");
    await expectError(cancel(escrow), "InvalidState");
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
      assert.equal(account.disputeWindowSecs.toString(), "3600");
      assert.equal(account.frozenAt.toString(), "0");
      assert.equal(account.settleProposer, 0);
      assert.equal(account.settleBps, 0);
      assert.deepEqual(account.reserved, new Array(45).fill(0));
      // 8-byte discriminator + 235 bytes: the layout size must never change.
      const info = await connection.getAccountInfo(escrow);
      assert.equal(info!.data.length, 8 + 235);
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

    it("rejects a zero dispute window", async () => {
      const deadlineTs = (await chainNow()) + LONG;
      await expectError(
        create(new BN(nextId++), AMOUNT, deadlineTs, 3600, 0),
        "InvalidDisputeWindow"
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
      const frozen = await program.account.escrow.fetch(escrow);
      assert.isAtLeast(
        frozen.frozenAt.toNumber(),
        (account.deliveredAt as BN).toNumber()
      );

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

  describe("settlement", () => {
    it("propose and accept are only possible while Frozen", async () => {
      const funded = (await open(LONG, 3600)).escrow;
      await expectError(propose(funded, 5000), "InvalidState");
      await expectError(accept(funded, 5000), "InvalidState");
      await expectError(burn(funded), "InvalidState");

      const delivered = (await open(LONG, 3600)).escrow;
      await markDelivered(delivered);
      await expectError(propose(delivered, 5000, freelancer), "InvalidState");
      await expectError(accept(delivered, 5000), "InvalidState");
      await expectError(burn(delivered), "InvalidState");
    });

    it("rejects a share above 10000 bps", async () => {
      const escrow = await freeze();
      await expectError(propose(escrow, 10001), "InvalidBps");
      assert.equal(
        (await program.account.escrow.fetch(escrow)).settleProposer,
        0
      );
    });

    it("accept needs a proposal from the other party and the exact share", async () => {
      const escrow = await freeze();

      await expectError(accept(escrow, 5000, freelancer), "NoProposal");
      await expectError(accept(escrow, 5000, client), "NoProposal");

      await propose(escrow, 6000, client);
      await expectError(accept(escrow, 6000, client), "ProposerCannotAccept");
      await expectError(accept(escrow, 5999, freelancer), "SettlementMismatch");
      await expectError(accept(escrow, 10000, freelancer), "SettlementMismatch");

      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
      assert.deepEqual(await stateOf(escrow), { frozen: {} });
    });

    it("a stranger can neither propose nor accept", async () => {
      const escrow = await freeze();
      await expectError(propose(escrow, 5000, stranger), "Unauthorized");
      await expectError(accept(escrow, 5000, stranger), "Unauthorized");

      await propose(escrow, 5000, client);
      await expectError(accept(escrow, 5000, stranger), "Unauthorized");
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
    });

    for (const { bps, amount } of [
      { bps: 0, amount: AMOUNT },
      { bps: 10000, amount: AMOUNT },
      { bps: 7000, amount: AMOUNT },
      { bps: 3333, amount: new BN(1001) },
    ]) {
      it(`splits the vault at ${bps} bps (amount ${amount})`, async () => {
        const escrow = await freeze(3600, amount);
        await propose(escrow, bps, client);
        const result = await settle(escrow, bps, freelancer);

        // Right after the freeze the decay is negligible (a few seconds of 3600).
        assert.isTrue(result.burned * BigInt(100) <= result.vaultBefore);
        assert.deepEqual(await stateOf(escrow), { settled: {} });
        await expectEveryInstructionRejected(escrow);
      });
    }

    it("the freelancer can propose and the client accept", async () => {
      const escrow = await freeze();
      await propose(escrow, 2500, freelancer);
      await expectError(accept(escrow, 2500, freelancer), "ProposerCannotAccept");
      await accept(escrow, 2500, client);
      assert.deepEqual(await stateOf(escrow), { settled: {} });
    });

    it("a new proposal replaces the old one", async () => {
      const escrow = await freeze();
      await propose(escrow, 9000, freelancer);
      await propose(escrow, 4000, client);

      const account = await program.account.escrow.fetch(escrow);
      assert.equal(account.settleProposer, 1);
      assert.equal(account.settleBps, 4000);

      // The old offer can no longer be accepted, and its author is not the proposer any more.
      await expectError(accept(escrow, 9000, freelancer), "SettlementMismatch");
      await expectError(accept(escrow, 4000, client), "ProposerCannotAccept");

      await settle(escrow, 4000, freelancer);
    });
  });

  describe("burn_if_unsettled", () => {
    it("only works after the dispute window, for anyone, and burns the vault", async () => {
      const escrow = await freeze(4);
      await propose(escrow, 5000, client);
      await expectError(burn(escrow), "DisputeWindowOpen");
      await expectError(burn(escrow, client), "DisputeWindowOpen");

      await waitForDisputeEnd(escrow);

      await expectError(propose(escrow, 5000, freelancer), "DisputeWindowClosed");
      await expectError(accept(escrow, 5000, freelancer), "DisputeWindowClosed");
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());

      const clientBefore = await balance(clientToken);
      const freelancerBefore = await balance(freelancerToken);
      const supplyBefore = (await getMint(connection, mint)).supply;

      await burn(escrow, stranger);

      assert.equal(await balance(vaultOf(escrow)), "0");
      assert.equal(
        (await getMint(connection, mint)).supply.toString(),
        (supplyBefore - BigInt(AMOUNT.toString())).toString()
      );
      assert.equal(await balance(clientToken), clientBefore);
      assert.equal(await balance(freelancerToken), freelancerBefore);
      assert.deepEqual(await stateOf(escrow), { burned: {} });
      await expectEveryInstructionRejected(escrow);
    });
  });

  describe("settlement decay", () => {
    it("burns about half when accepted in the middle of the window", async () => {
      const escrow = await freeze(20);
      const frozenAt = (
        await program.account.escrow.fetch(escrow)
      ).frozenAt.toNumber();
      await propose(escrow, 7000, client);
      await waitUntilAfter(frozenAt + 8);

      const result = await settle(escrow, 7000, freelancer);

      const share = Number(result.burned) / AMOUNT.toNumber();
      assert.isAtLeast(share, 0.45);
      assert.isAtMost(share, 0.7);
      assert.deepEqual(await stateOf(escrow), { settled: {} });
    });
  });

  describe("close_escrow", () => {
    // Closing returns the rent of the escrow account and of the vault to the client.
    const expectClosed = async (escrow: PublicKey) => {
      const vault = vaultOf(escrow);
      const rent =
        (await connection.getBalance(escrow)) +
        (await connection.getBalance(vault));
      const before = await connection.getBalance(client.publicKey);

      await closeEscrow(escrow);

      assert.isNull(await connection.getAccountInfo(escrow));
      assert.isNull(await connection.getAccountInfo(vault));
      assert.equal(
        (await connection.getBalance(client.publicKey)) - before,
        rent
      );
    };

    it("is rejected while the escrow is still running", async () => {
      const funded = (await open(LONG, 3600)).escrow;
      await expectError(closeEscrow(funded), "InvalidState");

      const delivered = (await open(LONG, 3600)).escrow;
      await markDelivered(delivered);
      await expectError(closeEscrow(delivered), "InvalidState");

      const frozen = await freeze();
      await expectError(closeEscrow(frozen), "InvalidState");

      for (const escrow of [funded, delivered, frozen]) {
        assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
      }
    });

    it("only the client can close", async () => {
      const { escrow } = await open(LONG, 3600);
      await release(escrow);
      await expectError(closeEscrow(escrow, freelancer), "Unauthorized");
      await expectError(closeEscrow(escrow, stranger), "Unauthorized");
      assert.isNotNull(await connection.getAccountInfo(escrow));
    });

    it("closes a Released escrow and refunds the rent", async () => {
      const { escrow } = await open(LONG, 3600);
      await release(escrow);
      await expectClosed(escrow);
      await expectError(release(escrow), "AccountNotInitialized");
    });

    it("closes a Refunded escrow", async () => {
      const { escrow, deadlineTs } = await open(4, 3600);
      await waitUntilAfter(deadlineTs);
      await refundIfLate(escrow);
      await expectClosed(escrow);
    });

    it("closes a Settled escrow", async () => {
      const escrow = await freeze();
      await propose(escrow, 5000, client);
      await accept(escrow, 5000, freelancer);
      await expectClosed(escrow);
    });

    it("closes a Burned escrow", async () => {
      const escrow = await freeze(4);
      await waitForDisputeEnd(escrow);
      await burn(escrow);
      await expectClosed(escrow);
    });
  });

  describe("cancel_by_freelancer", () => {
    // The whole vault goes back to the client, nothing burns, and the rent can then be reclaimed.
    const expectRefundThenClose = async (
      escrow: PublicKey,
      signer = freelancer
    ) => {
      const supplyBefore = (await getMint(connection, mint)).supply;
      await expectPayout(escrow, clientToken, () => cancel(escrow, signer));
      assert.equal(
        (await getMint(connection, mint)).supply.toString(),
        supplyBefore.toString()
      );
      assert.deepEqual(await stateOf(escrow), { refunded: {} });

      await closeEscrow(escrow);
      assert.isNull(await connection.getAccountInfo(escrow));
      assert.isNull(await connection.getAccountInfo(vaultOf(escrow)));
    };

    it("returns everything to the client from Funded, then close works", async () => {
      const { escrow } = await open(LONG, 3600);
      await expectRefundThenClose(escrow);
    });

    it("returns everything to the client from Delivered", async () => {
      const { escrow } = await open(LONG, 3600);
      await markDelivered(escrow);
      await expectRefundThenClose(escrow);
    });

    it("returns everything from Frozen without burning, dropping the proposal", async () => {
      const escrow = await freeze();
      await propose(escrow, 5000, client);
      assert.equal(
        (await program.account.escrow.fetch(escrow)).settleProposer,
        1
      );

      const supplyBefore = (await getMint(connection, mint)).supply;
      await expectPayout(escrow, clientToken, () => cancel(escrow));
      assert.equal(
        (await getMint(connection, mint)).supply.toString(),
        supplyBefore.toString()
      );

      const account = await program.account.escrow.fetch(escrow);
      assert.deepEqual(account.state, { refunded: {} });
      assert.equal(account.settleProposer, 0);
      assert.equal(account.settleBps, 0);
      await closeEscrow(escrow);
      assert.isNull(await connection.getAccountInfo(escrow));
    });

    it("the client cannot call it", async () => {
      const { escrow } = await open(LONG, 3600);
      await expectError(cancel(escrow, client), "Unauthorized");
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
    });

    it("a stranger cannot call it", async () => {
      const { escrow } = await open(LONG, 3600);
      await expectError(cancel(escrow, stranger), "Unauthorized");
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
    });

    it("is rejected once the escrow is over", async () => {
      const { escrow } = await open(LONG, 3600);
      await release(escrow);
      await expectError(cancel(escrow), "InvalidState");
    });

    it("rejects a payout account that does not belong to the client", async () => {
      const { escrow } = await open(LONG, 3600);
      await expectError(
        cancel(escrow, freelancer, freelancerToken),
        "ConstraintTokenOwner"
      );
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
      assert.deepEqual(await stateOf(escrow), { funded: {} });
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
