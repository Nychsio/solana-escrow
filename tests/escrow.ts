import * as anchor from "@anchor-lang/core";
import { Program, BN } from "@anchor-lang/core";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeTransferFeeConfigInstruction,
  createMint,
  ExtensionType,
  getAccount,
  getAssociatedTokenAddressSync,
  getMintLen,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  transfer,
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
  let strangerToken: PublicKey;
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
    disputeWindowSecs = 3600,
    bondBps = 0
  ) => {
    const escrow = escrowPda(id);
    return program.methods
      .create(
        id,
        amount,
        new BN(deadlineTs),
        new BN(reviewWindowSecs),
        new BN(disputeWindowSecs),
        bondBps
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

  // Creates an escrow and, unless told otherwise, has the freelancer accept the job
  // (state Accepted). Returns its address plus its deadline.
  const open = async (
    deadlineInSecs: number,
    reviewWindowSecs: number,
    disputeWindowSecs = 3600,
    amount = AMOUNT,
    opts: {
      accept?: boolean;
      bondBps?: number;
    } = {}
  ) => {
    const id = new BN(nextId++);
    const deadlineTs = (await chainNow()) + deadlineInSecs;
    await create(
      id,
      amount,
      deadlineTs,
      reviewWindowSecs,
      disputeWindowSecs,
      opts.bondBps ?? 0
    );
    const escrow = escrowPda(id);
    if (opts.accept !== false) await acceptJob(escrow);
    return { escrow, deadlineTs };
  };

  type Terms = {
    amount: BN;
    bondAmount: BN;
    deadlineTs: BN;
    reviewWindowSecs: BN;
    disputeWindowSecs: BN;
  };
  const termsOf = async (escrow: PublicKey): Promise<Terms> => {
    const a = await program.account.escrow.fetch(escrow);
    return {
      amount: a.amount,
      bondAmount: a.bondAmount,
      deadlineTs: a.deadlineTs,
      reviewWindowSecs: a.reviewWindowSecs,
      disputeWindowSecs: a.disputeWindowSecs,
    };
  };

  // By default the freelancer accepts the terms currently on chain; the TermsMismatch
  // tests pass the terms they "saw earlier" instead.
  const acceptJob = async (
    escrow: PublicKey,
    signer = freelancer,
    source = freelancerToken,
    terms?: Terms
  ) => {
    const t = terms ?? (await termsOf(escrow));
    return program.methods
      .acceptJob(
        t.amount,
        t.bondAmount,
        t.deadlineTs,
        t.reviewWindowSecs,
        t.disputeWindowSecs
      )
      .accountsPartial({
        freelancer: signer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        freelancerToken: source,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();
  };

  const withdraw = (escrow: PublicKey, signer = client) =>
    program.methods
      .withdraw()
      .accountsPartial({
        client: signer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        clientToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();

  const markDelivered = (escrow: PublicKey, signer = freelancer) =>
    program.methods
      .markDelivered(HASH)
      .accountsPartial({ freelancer: signer.publicKey, escrow })
      .signers([signer])
      .rpc();

  const reject = (escrow: PublicKey, signer = client) =>
    program.methods
      .reject()
      .accountsPartial({
        client: signer.publicKey,
        escrow,
        mint,
        vault: vaultOf(escrow),
        clientToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
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
        caller: signer.publicKey,
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
        caller: signer.publicKey,
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
        freelancerToken,
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
  const freeze = async (
    disputeWindowSecs = 3600,
    amount = AMOUNT,
    opts: { bondBps?: number } = {}
  ) => {
    const { escrow } = await open(LONG, 3600, disputeWindowSecs, amount, opts);
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
    await expectError(acceptJob(escrow), "InvalidState");
    await expectError(withdraw(escrow), "InvalidState");
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
    strangerToken = await tokenAccount(stranger.publicKey);
    await mintTo(connection, client, mint, clientToken, client, MINTED);
    await mintTo(connection, client, mint, freelancerToken, client, MINTED);
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
      assert.equal(account.bondAmount.toString(), "0");
      assert.deepEqual(account.reserved, new Array(37).fill(0));
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
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, { accept: false });
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
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, { accept: false });
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
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, { accept: false });
      const strangerToken = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          client,
          mint,
          stranger.publicKey
        )
      ).address;
      await expectError(
        cancel(escrow, freelancer, strangerToken),
        "ConstraintTokenOwner"
      );
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
      assert.deepEqual(await stateOf(escrow), { funded: {} });
    });
  });

  describe("mint validation and dust", () => {
    // Creates a Token-2022 mint (client is the mint authority) with the given extensions.
    const newMint2022 = async (
      extensions: ExtensionType[],
      init: (mint: PublicKey) => ReturnType<typeof createInitializeMintInstruction>[]
    ) => {
      const keypair = Keypair.generate();
      const space = getMintLen(extensions);
      const lamports = await connection.getMinimumBalanceForRentExemption(space);
      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: client.publicKey,
          newAccountPubkey: keypair.publicKey,
          space,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        ...init(keypair.publicKey),
        createInitializeMintInstruction(
          keypair.publicKey,
          DECIMALS,
          client.publicKey,
          null,
          TOKEN_2022_PROGRAM_ID
        )
      );
      await provider.sendAndConfirm(tx, [client, keypair]);
      return keypair.publicKey;
    };

    // Same call as `create`, but for an arbitrary mint and token program.
    const createFor = async (mint2022: PublicKey, id: BN) => {
      const clientAta = getAssociatedTokenAddressSync(
        mint2022,
        client.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      await provider.sendAndConfirm(
        new Transaction().add(
          createAssociatedTokenAccountIdempotentInstruction(
            client.publicKey,
            clientAta,
            client.publicKey,
            mint2022,
            TOKEN_2022_PROGRAM_ID
          )
        ),
        [client]
      );
      await mintTo(
        connection,
        client,
        mint2022,
        clientAta,
        client,
        MINTED,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const escrow = escrowPda(id);
      const deadlineTs = (await chainNow()) + LONG;
      await program.methods
        .create(
          id,
          AMOUNT,
          new BN(deadlineTs),
          new BN(3600),
          new BN(3600),
          0
        )
        .accountsPartial({
          client: client.publicKey,
          freelancer: freelancer.publicKey,
          mint: mint2022,
          clientToken: clientAta,
          escrow,
          vault: getAssociatedTokenAddressSync(
            mint2022,
            escrow,
            true,
            TOKEN_2022_PROGRAM_ID
          ),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([client])
        .rpc();
      return { escrow, clientAta };
    };

    it("rejects a Token-2022 mint with PermanentDelegate", async () => {
      const bad = await newMint2022(
        [ExtensionType.PermanentDelegate],
        (m) => [
          createInitializePermanentDelegateInstruction(
            m,
            stranger.publicKey,
            TOKEN_2022_PROGRAM_ID
          ),
        ]
      );
      await expectError(createFor(bad, new BN(nextId++)), "UnsupportedMint");
    });

    it("rejects a Token-2022 mint with TransferFeeConfig", async () => {
      const bad = await newMint2022(
        [ExtensionType.TransferFeeConfig],
        (m) => [
          createInitializeTransferFeeConfigInstruction(
            m,
            client.publicKey,
            client.publicKey,
            100,
            BigInt(1_000_000),
            TOKEN_2022_PROGRAM_ID
          ),
        ]
      );
      await expectError(createFor(bad, new BN(nextId++)), "UnsupportedMint");
    });

    it("accepts a plain Token-2022 mint and pays out on release", async () => {
      const good = await newMint2022([], () => []);
      const id = new BN(nextId++);
      const { escrow } = await createFor(good, id);
      const vault = getAssociatedTokenAddressSync(
        good,
        escrow,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const freelancerAta = getAssociatedTokenAddressSync(
        good,
        freelancer.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      await provider.sendAndConfirm(
        new Transaction().add(
          createAssociatedTokenAccountIdempotentInstruction(
            client.publicKey,
            freelancerAta,
            freelancer.publicKey,
            good,
            TOKEN_2022_PROGRAM_ID
          )
        ),
        [client]
      );

      await program.methods
        .release()
        .accountsPartial({
          client: client.publicKey,
          escrow,
          mint: good,
          vault,
          freelancerToken: freelancerAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([client])
        .rpc();

      const paid = await getAccount(
        connection,
        freelancerAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      assert.equal(paid.amount.toString(), AMOUNT.toString());
      assert.deepEqual(await stateOf(escrow), { released: {} });
    });

    it("close_escrow burns dust sent to the vault after the payout", async () => {
      const { escrow } = await open(LONG, 3600);
      await release(escrow);
      // Anyone can send tokens to an associated token account.
      await transfer(
        connection,
        client,
        clientToken,
        vaultOf(escrow),
        client,
        7
      );
      assert.equal(await balance(vaultOf(escrow)), "7");
      const supplyBefore = (await getMint(connection, mint)).supply;

      await closeEscrow(escrow);

      assert.equal(
        (await getMint(connection, mint)).supply.toString(),
        (supplyBefore - BigInt(7)).toString()
      );
      assert.isNull(await connection.getAccountInfo(escrow));
      assert.isNull(await connection.getAccountInfo(vaultOf(escrow)));
    });
  });

  describe("bonds and job acceptance", () => {
    const BOND_BPS = 2000;
    const BOND = (AMOUNT.toNumber() * BOND_BPS) / 10000; // 50_000_000
    const withBond = { bondBps: BOND_BPS };
    const bal = async (account: PublicKey) => Number(await balance(account));

    it("accept_job moves the freelancer's bond into the vault", async () => {
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, {
        accept: false,
        ...withBond,
      });
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
      const account = await program.account.escrow.fetch(escrow);
      assert.equal(account.bondAmount.toNumber(), BOND);
      assert.deepEqual(account.state, { funded: {} });

      const before = await bal(freelancerToken);
      await acceptJob(escrow);

      assert.equal(await bal(vaultOf(escrow)), AMOUNT.toNumber() + BOND);
      assert.equal(await bal(freelancerToken), before - BOND);
      assert.deepEqual(await stateOf(escrow), { accepted: {} });
    });

    it("accept_job is only for the freelancer, once, before the deadline", async () => {
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, { accept: false });
      await expectError(acceptJob(escrow, client, clientToken), "Unauthorized");
      await expectError(acceptJob(escrow, stranger), "Unauthorized");
      await acceptJob(escrow);
      await expectError(acceptJob(escrow), "InvalidState");

      const late = await open(4, 3600, 3600, AMOUNT, { accept: false });
      await waitUntilAfter(late.deadlineTs);
      await expectError(acceptJob(late.escrow), "DeadlinePassed");
    });

    it("accept_job refuses terms that changed since the freelancer looked", async () => {
      // Withdraw, close and recreate under the same id: same PDA, same link, new deadline.
      const id = new BN(nextId++);
      const escrow = escrowPda(id);
      await create(id, AMOUNT, (await chainNow()) + LONG, 3600, 3600, BOND_BPS);
      const seen = await termsOf(escrow);
      await withdraw(escrow);
      await closeEscrow(escrow);
      await create(id, AMOUNT, (await chainNow()) + LONG + 3600, 3600, 3600, BOND_BPS);

      await expectError(acceptJob(escrow, freelancer, freelancerToken, seen), "TermsMismatch");
      assert.deepEqual(await stateOf(escrow), { funded: {} });
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());

      // Each single term is bound, not just the deadline.
      const now = await termsOf(escrow);
      const variants: Terms[] = [
        { ...now, amount: now.amount.addn(1) },
        { ...now, bondAmount: now.bondAmount.addn(1) },
        { ...now, deadlineTs: now.deadlineTs.addn(1) },
        { ...now, reviewWindowSecs: now.reviewWindowSecs.addn(1) },
        { ...now, disputeWindowSecs: now.disputeWindowSecs.addn(1) },
      ];
      for (const wrong of variants) {
        await expectError(acceptJob(escrow, freelancer, freelancerToken, wrong), "TermsMismatch");
      }

      // The current terms go through.
      await acceptJob(escrow, freelancer, freelancerToken, now);
      assert.deepEqual(await stateOf(escrow), { accepted: {} });
    });

    it("the freelancer needs the tokens for the bond", async () => {
      const broke = Keypair.generate();
      const brokeToken = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          client,
          mint,
          broke.publicKey
        )
      ).address;
      const id = new BN(nextId++);
      const escrow = escrowPda(id);
      const deadlineTs = (await chainNow()) + LONG;
      await program.methods
        .create(id, AMOUNT, new BN(deadlineTs), new BN(3600), new BN(3600), BOND_BPS)
        .accountsPartial({
          client: client.publicKey,
          freelancer: broke.publicKey,
          mint,
          clientToken,
          escrow,
          vault: vaultOf(escrow),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([client])
        .rpc();

      let failed = false;
      try {
        await acceptJob(escrow, broke, brokeToken);
      } catch {
        failed = true;
      }
      assert.isTrue(failed, "accept_job must fail without tokens for the bond");
      assert.deepEqual(await stateOf(escrow), { funded: {} });
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
    });

    it("withdraw returns the funds before acceptance, and is client-only", async () => {
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, {
        accept: false,
        ...withBond,
      });
      await expectError(withdraw(escrow, freelancer), "Unauthorized");
      await expectError(withdraw(escrow, stranger), "Unauthorized");

      await expectPayout(escrow, clientToken, () => withdraw(escrow));
      assert.deepEqual(await stateOf(escrow), { refunded: {} });
      await closeEscrow(escrow);
      assert.isNull(await connection.getAccountInfo(escrow));
    });

    it("withdraw is refused once the freelancer accepted", async () => {
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, withBond);
      await expectError(withdraw(escrow), "InvalidState");
      assert.equal(await bal(vaultOf(escrow)), AMOUNT.toNumber() + BOND);
    });

    it("mark_delivered needs an accepted job", async () => {
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, { accept: false });
      await expectError(markDelivered(escrow), "InvalidState");
    });

    it("release pays the amount plus the freelancer's bond", async () => {
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, withBond);
      await markDelivered(escrow);
      const before = await bal(freelancerToken);
      await release(escrow);
      assert.equal(await bal(freelancerToken), before + AMOUNT.toNumber() + BOND);
      assert.equal(await balance(vaultOf(escrow)), "0");
    });

    it("refund_if_late from Accepted gives the client the amount plus the ghost's bond", async () => {
      const { escrow, deadlineTs } = await open(4, 3600, 3600, AMOUNT, withBond);
      await waitUntilAfter(deadlineTs);
      const before = await bal(clientToken);
      await refundIfLate(escrow);
      assert.equal(await bal(clientToken), before + AMOUNT.toNumber() + BOND);
      assert.deepEqual(await stateOf(escrow), { refunded: {} });
    });

    it("reject takes the client's bond, so the vault holds the amount plus both bonds", async () => {
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, withBond);
      await markDelivered(escrow);
      const before = await bal(clientToken);
      await reject(escrow);
      assert.equal(await bal(clientToken), before - BOND);
      assert.equal(await bal(vaultOf(escrow)), AMOUNT.toNumber() + 2 * BOND);
      assert.deepEqual(await stateOf(escrow), { frozen: {} });
    });

    it("a settlement burns and pays out exactly the amount plus both bonds", async () => {
      const escrow = await freeze(3600, AMOUNT, withBond);
      await propose(escrow, 6000, client);
      const result = await settle(escrow, 6000, freelancer);
      assert.equal(
        Number(result.vaultBefore),
        AMOUNT.toNumber() + 2 * BOND
      );
    });

    it("burn_if_unsettled burns the amount plus both bonds", async () => {
      const escrow = await freeze(4, AMOUNT, withBond);
      await waitForDisputeEnd(escrow);
      const supplyBefore = (await getMint(connection, mint)).supply;
      await burn(escrow);
      assert.equal(
        (supplyBefore - (await getMint(connection, mint)).supply).toString(),
        String(AMOUNT.toNumber() + 2 * BOND)
      );
      assert.equal(await balance(vaultOf(escrow)), "0");
    });

    it("cancel from Funded gives the client everything and takes nothing from the freelancer", async () => {
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, {
        accept: false,
        ...withBond,
      });
      const clientBefore = await bal(clientToken);
      const freelancerBefore = await bal(freelancerToken);
      await cancel(escrow);
      assert.equal(await bal(clientToken), clientBefore + AMOUNT.toNumber());
      assert.equal(await bal(freelancerToken), freelancerBefore);
    });

    it("cancel from Delivered returns each side exactly its own deposit", async () => {
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, withBond);
      await markDelivered(escrow);
      const clientBefore = await bal(clientToken);
      const freelancerBefore = await bal(freelancerToken);
      await cancel(escrow);
      assert.equal(await bal(clientToken), clientBefore + AMOUNT.toNumber());
      assert.equal(await bal(freelancerToken), freelancerBefore + BOND);
      assert.equal(await balance(vaultOf(escrow)), "0");
    });

    it("cancel from Frozen returns each side exactly its own deposit, no burn", async () => {
      const escrow = await freeze(3600, AMOUNT, withBond);
      const clientBefore = await bal(clientToken);
      const freelancerBefore = await bal(freelancerToken);
      const supplyBefore = (await getMint(connection, mint)).supply;
      await cancel(escrow);
      // Client: its amount plus its own bond; freelancer: its bond.
      assert.equal(
        await bal(clientToken),
        clientBefore + AMOUNT.toNumber() + BOND
      );
      assert.equal(await bal(freelancerToken), freelancerBefore + BOND);
      assert.equal(
        (await getMint(connection, mint)).supply.toString(),
        supplyBefore.toString()
      );
    });

    it("rejects a bond above 10000 bps", async () => {
      const deadlineTs = (await chainNow()) + LONG;
      await expectError(
        create(new BN(nextId++), AMOUNT, deadlineTs, 3600, 3600, 10001),
        "InvalidBps"
      );
    });
  });

  describe("permissionless crank", () => {
    it("a stranger can trigger claim_if_silent, and the money goes to the freelancer", async () => {
      const { escrow } = await open(LONG, 3);
      await markDelivered(escrow);
      const account = await program.account.escrow.fetch(escrow);
      await waitUntilAfter((account.deliveredAt as BN).toNumber() + 3);

      const strangerBefore = await balance(strangerToken);
      await expectPayout(escrow, freelancerToken, () =>
        claimIfSilent(escrow, stranger)
      );
      assert.equal(await balance(strangerToken), strangerBefore);
      assert.deepEqual(await stateOf(escrow), { released: {} });
    });

    it("claim_if_silent refuses a stranger's own token account as the destination", async () => {
      const { escrow } = await open(LONG, 3);
      await markDelivered(escrow);
      const account = await program.account.escrow.fetch(escrow);
      await waitUntilAfter((account.deliveredAt as BN).toNumber() + 3);

      await expectError(
        claimIfSilent(escrow, stranger, strangerToken),
        "ConstraintTokenOwner"
      );
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
    });

    it("a stranger can trigger refund_if_late, and the money goes to the client", async () => {
      const { escrow, deadlineTs } = await open(4, 3600);
      await waitUntilAfter(deadlineTs);

      const strangerBefore = await balance(strangerToken);
      await expectPayout(escrow, clientToken, () =>
        refundIfLate(escrow, stranger)
      );
      assert.equal(await balance(strangerToken), strangerBefore);
      assert.deepEqual(await stateOf(escrow), { refunded: {} });
    });

    it("refund_if_late refuses a stranger's own token account as the destination", async () => {
      const { escrow, deadlineTs } = await open(4, 3600);
      await waitUntilAfter(deadlineTs);

      await expectError(
        refundIfLate(escrow, stranger, strangerToken),
        "ConstraintTokenOwner"
      );
      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
    });
  });

  describe("events", () => {
    // Events are read back from the transaction logs, like an indexer would.
    const eventsOf = async (signature: string) => {
      const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      const parser = new anchor.EventParser(program.programId, program.coder);
      return Array.from(parser.parseLogs(tx!.meta!.logMessages!));
    };
    const only = async (signature: string, name: string) => {
      // The parser reports names in camelCase ("escrowCreated").
      const found = (await eventsOf(signature)).filter(
        (e) => e.name.toLowerCase() === name.toLowerCase()
      );
      assert.equal(found.length, 1, `expected one ${name} event`);
      return found[0].data as any;
    };

    it("emits an event for every step of a full job", async () => {
      const id = new BN(nextId++);
      const escrow = escrowPda(id);
      const deadlineTs = (await chainNow()) + LONG;
      const bondBps = 2000;
      const bond = (AMOUNT.toNumber() * bondBps) / 10000;

      const created = await only(
        await create(id, AMOUNT, deadlineTs, 3600, 3600, bondBps),
        "EscrowCreated"
      );
      assert.isTrue(created.escrow.equals(escrow));
      assert.isTrue(created.client.equals(client.publicKey));
      assert.isTrue(created.freelancer.equals(freelancer.publicKey));
      assert.equal(created.amount.toString(), AMOUNT.toString());
      assert.equal(created.bondAmount.toNumber(), bond);
      assert.equal(created.deadlineTs.toNumber(), deadlineTs);

      const accepted = await only(await acceptJob(escrow), "JobAccepted");
      assert.equal(accepted.bondAmount.toNumber(), bond);

      const delivered = await only(await markDelivered(escrow), "Delivered");
      assert.deepEqual(Array.from(delivered.deliverableHash), HASH);

      const released = await only(await release(escrow), "Released");
      assert.isTrue(released.to.equals(freelancer.publicKey));
      assert.equal(released.amount.toNumber(), AMOUNT.toNumber() + bond);

      const closed = await only(await closeEscrow(escrow), "Closed");
      assert.equal(closed.dustBurned.toNumber(), 0);
    });

    it("emits the dispute events", async () => {
      const escrow = await freeze(3600, AMOUNT, { bondBps: 1000 });
      const proposed = await only(await propose(escrow, 7000, client), "SettlementProposed");
      assert.equal(proposed.proposer, 1);
      assert.equal(proposed.freelancerBps, 7000);

      const settled = await only(await accept(escrow, 7000, freelancer), "Settled");
      const total =
        settled.burned.toNumber() +
        settled.toFreelancer.toNumber() +
        settled.toClient.toNumber();
      assert.equal(total, AMOUNT.toNumber() + 2 * ((AMOUNT.toNumber() * 1000) / 10000));
    });

    it("emits Rejected, Cancelled and Burned", async () => {
      const bondBps = 1000;
      const bond = (AMOUNT.toNumber() * bondBps) / 10000;
      const { escrow } = await open(LONG, 3600, 3600, AMOUNT, { bondBps });
      await markDelivered(escrow);
      const rejected = await only(await reject(escrow), "Rejected");
      assert.equal(rejected.clientBond.toNumber(), bond);

      const cancelled = await only(await cancel(escrow), "Cancelled");
      assert.equal(cancelled.toFreelancer.toNumber(), bond);
      assert.equal(cancelled.toClient.toNumber(), AMOUNT.toNumber() + bond);

      const frozen = await freeze(4);
      await waitForDisputeEnd(frozen);
      const burned = await only(await burn(frozen), "Burned");
      assert.equal(burned.amount.toString(), AMOUNT.toString());
    });
  });

  describe("wrong signer", () => {
    it("rejects every instruction called by the wrong party", async () => {
      const { escrow } = await open(LONG, 3600);

      await expectError(markDelivered(escrow, client), "Unauthorized");
      await expectError(markDelivered(escrow, stranger), "Unauthorized");
      await expectError(release(escrow, freelancer), "Unauthorized");
      await expectError(release(escrow, stranger), "Unauthorized");
      // claim_if_silent and refund_if_late are open to any caller; the destination
      // account is what is pinned (see the "crank" tests).
      await expectError(
        refundIfLate(escrow, freelancer, freelancerToken),
        "ConstraintTokenOwner"
      );

      await markDelivered(escrow);

      await expectError(reject(escrow, freelancer), "Unauthorized");
      await expectError(reject(escrow, stranger), "Unauthorized");
      await expectError(
        claimIfSilent(escrow, client, clientToken),
        "ConstraintTokenOwner"
      );
      await expectError(claimIfSilent(escrow, stranger), "ReviewWindowOpen");

      assert.equal(await balance(vaultOf(escrow)), AMOUNT.toString());
      assert.deepEqual(await stateOf(escrow), { delivered: {} });
    });
  });
});
