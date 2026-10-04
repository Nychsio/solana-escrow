import {
  ArrowCounterClockwise,
  Archive,
  Checks,
  Fire,
  Flag,
  HandCoins,
  Handshake,
  Lightning,
  Prohibit,
  Scales,
  SealCheck,
  UserCheck,
  UserMinus,
  Wallet,
} from "@phosphor-icons/react";
import { BN } from "@anchor-lang/core";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { fromBase } from "../format";
import { stateOf, useProgram, vaultOf } from "../program";
import type { EscrowView } from "../pages/EscrowPage";
import { useTx } from "../tx";
import { Act, Card } from "./ui";

const SETTLE_CLIENT = 1;
const SETTLE_FREELANCER = 2;

type Pending = null | "cancel" | "concedeClient" | "concedeFreelancer";

// Buttons follow the state machine in AIcontext/main.md (v2.1). Visibility is only a hint
// based on role, state and (chain-estimated) time; the program enforces every rule.
export function Actions({ pda, esc, now, role, reload, vaultBal }: EscrowView) {
  const program = useProgram();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { busy, run } = useTx();
  const [pct, setPct] = useState(50);
  const [pending, setPending] = useState<Pending>(null);
  // Token balance of the connected wallet, to disable bond-paying buttons up front.
  const [tokenBal, setTokenBal] = useState<BN | null>(null);

  const mintKey = esc.mint;
  const stateKey = Object.keys(esc.state)[0];
  useEffect(() => {
    if (!publicKey) return;
    let alive = true;
    connection
      .getTokenAccountBalance(getAssociatedTokenAddressSync(mintKey, publicKey))
      .then((b) => alive && setTokenBal(new BN(b.value.amount)))
      .catch(() => alive && setTokenBal(new BN(0)));
    return () => {
      alive = false;
    };
  }, [publicKey, mintKey, connection, stateKey]);

  if (!publicKey)
    return (
      <Card icon={Wallet} title="Akcje">
        <p>Połącz portfel, żeby wykonać akcję.</p>
      </Card>
    );

  const state = stateOf(esc);
  const mint = esc.mint;
  const vault = vaultOf(mint, pda);
  const freelancerToken = getAssociatedTokenAddressSync(mint, esc.freelancer);
  const clientToken = getAssociatedTokenAddressSync(mint, esc.client);
  // The program pays out only to an existing token account, so every payout transaction
  // first creates the recipient's ATA if missing (idempotent: no-op when it exists).
  const ensureAta = (owner: PublicKey, ata: PublicKey) =>
    createAssociatedTokenAccountIdempotentInstruction(publicKey, ata, owner, mint);

  const exec = async (label: string, fn: () => Promise<string>) => {
    if (await run(label, fn)) await reload();
  };

  const deadline = esc.deadlineTs.toNumber();
  const reviewEnd = esc.deliveredAt ? esc.deliveredAt.toNumber() + esc.reviewWindowSecs.toNumber() : 0;
  const disputeEnd = esc.frozenAt.toNumber() + esc.disputeWindowSecs.toNumber();
  const isClient = role === "client";
  const isFreelancer = role === "freelancer";
  const bond = esc.bondAmount;
  const bondTxt = fromBase(bond);
  const lacksBond = tokenBal !== null && tokenBal.lt(bond);
  const lacksMsg = `Za mało tokenów na kaucję (${bondTxt})`;

  // accept_job: the expected_* arguments are the terms that were DISPLAYED to the freelancer in
  // this render (`esc` below is the render-time snapshot), not a fresh read of the account right
  // before signing. A fresh read would adopt whatever the account holds at that moment, which
  // defeats the check: if the terms changed after the user looked (e.g. the escrow was withdrawn
  // and re-created under the same id), the program must see the mismatch and answer TermsMismatch.
  const acceptJob = () =>
    exec(`Akceptacja zlecenia (kaucja ${bondTxt})`, () =>
      program.methods
        .acceptJob(esc.amount, esc.bondAmount, esc.deadlineTs, esc.reviewWindowSecs, esc.disputeWindowSecs)
        .accountsPartial({ freelancer: publicKey, escrow: pda, mint, vault, freelancerToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.freelancer, freelancerToken)])
        .rpc()
    );
  const withdraw = () =>
    exec("Wycofanie środków (withdraw)", () =>
      program.methods
        .withdraw()
        .accountsPartial({ client: publicKey, escrow: pda, mint, vault, clientToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.client, clientToken)])
        .rpc()
    );
  const release = (label = "Zatwierdzenie i wypłata (release)") =>
    exec(label, () =>
      program.methods
        .release()
        .accountsPartial({ client: publicKey, escrow: pda, mint, vault, freelancerToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.freelancer, freelancerToken)])
        .rpc()
    );
  // claim_if_silent and refund_if_late: any wallet may call (`caller`); the payout account is pinned
  // by the program to the right party.
  const claim = () =>
    exec("Wypłata dla zleceniobiorcy (claim_if_silent)", () =>
      program.methods
        .claimIfSilent()
        .accountsPartial({ caller: publicKey, escrow: pda, mint, vault, freelancerToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.freelancer, freelancerToken)])
        .rpc()
    );
  const refund = () =>
    exec("Zwrot środków zleceniodawcy (refund_if_late)", () =>
      program.methods
        .refundIfLate()
        .accountsPartial({ caller: publicKey, escrow: pda, mint, vault, clientToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.client, clientToken)])
        .rpc()
    );
  const cancel = async (label: string) => {
    setPending(null);
    await exec(label, () =>
      program.methods
        .cancelByFreelancer()
        .accountsPartial({ freelancer: publicKey, escrow: pda, mint, vault, clientToken, freelancerToken, tokenProgram: TOKEN_PROGRAM_ID })
        // Both parties may receive tokens (the bond can go back to the freelancer).
        .preInstructions([ensureAta(esc.client, clientToken), ensureAta(esc.freelancer, freelancerToken)])
        .rpc()
    );
  };
  const reject = () => {
    if (
      !confirm(
        `Odrzucenie zamrozi środki i wpłacasz kaucję ${bondTxt}. Będzie okno sporu na ugodę; bez ugody każdy może je SPALIĆ. Kontynuować?`
      )
    )
      return;
    exec("Odrzucenie dostawy (reject)", () =>
      program.methods
        .reject()
        .accountsPartial({ client: publicKey, escrow: pda, mint, vault, clientToken, tokenProgram: TOKEN_PROGRAM_ID })
        .rpc()
    );
  };
  const propose = () =>
    exec(`Propozycja ugody: ${pct}% dla zleceniobiorcy`, () =>
      program.methods.proposeSettlement(pct * 100).accountsPartial({ signer: publicKey, escrow: pda }).rpc()
    );
  const accept = () =>
    exec(`Przyjęcie ugody: ${esc.settleBps / 100}% dla zleceniobiorcy`, () =>
      program.methods
        // The accepted bps must equal the stored one, so a last-second swap of the proposal fails.
        .acceptSettlement(esc.settleBps)
        .accountsPartial({ signer: publicKey, escrow: pda, mint, vault, freelancerToken, clientToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.freelancer, freelancerToken), ensureAta(esc.client, clientToken)])
        .rpc()
    );
  const burn = () => {
    if (!confirm("Spalić całe saldo skarbca? Tego nie da się cofnąć.")) return;
    exec("Spalenie środków (burn_if_unsettled)", () =>
      program.methods.burnIfUnsettled().accountsPartial({ payer: publicKey, escrow: pda, mint, vault, tokenProgram: TOKEN_PROGRAM_ID }).rpc()
    );
  };
  const close = () =>
    exec("Zamknięcie umowy i odzyskanie rentu (close_escrow)", () =>
      program.methods.closeEscrow().accountsPartial({ client: publicKey, escrow: pda, mint, vault, tokenProgram: TOKEN_PROGRAM_ID }).rpc()
    );

  // Confirmation panel shared by the irreversible walk-away actions.
  const confirmPanel = (key: string, text: string, label: string, onYes: () => void) => (
    <div key={key} className="card-2">
      <p>{text}</p>
      <div className="row">
        <button className="danger" onClick={onYes}>{label}</button>
        <button onClick={() => setPending(null)}>Anuluj</button>
      </div>
    </div>
  );

  const items: React.ReactNode[] = [];
  const finished = state === "released" || state === "refunded" || state === "settled" || state === "burned";
  if (finished && isClient && vaultBal === "0")
    items.push(<Act key="cl" kind="primary" icon={Archive} label="Zamknij umowę i odzyskaj rent" caption="close_escrow · podpisuje zleceniodawca" onClick={close} />);

  // ---- Funded: waiting for the freelancer ----
  if (state === "funded") {
    if (isFreelancer && now <= deadline) {
      items.push(
        <Act key="aj" kind="primary" icon={UserCheck} label={`Akceptuj zlecenie (wpłacasz kaucję ${bondTxt})`} caption="accept_job · podpisuje zleceniobiorca" disabled={lacksBond} onClick={acceptJob} />
      );
      if (lacksBond) items.push(<p key="aj-msg" className="error">{lacksMsg}</p>);
    }
    if (isFreelancer && now > deadline) items.push(<p key="m">Termin minął, nie można już przyjąć zlecenia.</p>);
    if (isClient) items.push(<Act key="wd" icon={ArrowCounterClockwise} label="Wycofaj środki" caption="withdraw · podpisuje zleceniodawca" onClick={withdraw} />);
  }
  // ---- Accepted: the freelancer works ----
  if (state === "accepted") {
    if (isClient) items.push(<Act key="r" kind="primary" icon={SealCheck} label="Zapłać teraz" caption="release · podpisuje zleceniodawca" onClick={() => release("Wypłata dla zleceniobiorcy (release)")} />);
    if (isFreelancer && now <= deadline) items.push(<p key="m">Zgłoś dostawę w karcie Dostawa przed terminem.</p>);
  }
  // ---- Delivered: the client decides ----
  if (state === "delivered") {
    if (isClient) items.push(<Act key="r" kind="primary" icon={SealCheck} label="Zatwierdź" caption="release · podpisuje zleceniodawca" onClick={() => release()} />);
    if (isClient && now <= reviewEnd) {
      items.push(
        <Act key="rj" kind="danger" icon={Prohibit} label={`Odrzuć (wpłacasz kaucję ${bondTxt})`} caption="reject · podpisuje zleceniodawca" disabled={lacksBond} onClick={reject} />
      );
      if (lacksBond) items.push(<p key="rj-msg" className="error">{lacksMsg}</p>);
    }
    if (isFreelancer && now <= reviewEnd) items.push(<p key="m">Czekasz na decyzję zleceniodawcy do końca okna akceptacji.</p>);
  }

  // ---- Permissionless cranks: any connected wallet ----
  if ((state === "funded" || state === "accepted") && now > deadline)
    items.push(<Act key="rf" kind="primary" icon={ArrowCounterClockwise} label="Zwróć środki zleceniodawcy" caption="refund_if_late · może wywołać każdy — środki idą do zleceniodawcy" onClick={refund} />);
  if (state === "delivered" && now > reviewEnd)
    items.push(<Act key="c" kind="primary" icon={Lightning} label="Wypłać zleceniobiorcy" caption="claim_if_silent · może wywołać każdy — środki idą do zleceniobiorcy" onClick={claim} />);

  // ---- Freelancer walking away (cancel_by_freelancer) ----
  if (isFreelancer && (state === "funded" || state === "accepted" || state === "delivered")) {
    const abandoned = state === "accepted" && now > deadline;
    const label = state === "funded" ? "Odrzuć zlecenie" : state === "delivered" ? "Zrezygnuj (odzyskujesz kaucję)" : "Zrezygnuj";
    const caption = abandoned
      ? "cancel_by_freelancer · po terminie kaucja przepada na rzecz zleceniodawcy"
      : "cancel_by_freelancer · podpisuje zleceniobiorca";
    const text =
      state === "funded"
        ? "Zleceniodawca dostanie z powrotem całą kwotę. Nieodwracalne."
        : abandoned
          ? "Termin dostawy minął: zleceniodawca dostanie kwotę i Twoją kaucję. Nieodwracalne."
          : "Odzyskasz własną kaucję, zleceniodawca dostanie resztę. Nieodwracalne.";
    items.push(
      pending === "cancel" ? (
        confirmPanel("cancel", text, "Potwierdzam rezygnację", () => cancel("Rezygnacja zleceniobiorcy (cancel_by_freelancer)"))
      ) : (
        <Act key="cancel" kind="danger" icon={UserMinus} label={label} caption={caption} onClick={() => setPending("cancel")} />
      )
    );
  }

  // ---- Frozen: dispute card ----
  let dispute: React.ReactNode = null;
  if (state === "frozen") {
    const proposer = esc.settleProposer;
    const myCode = isClient ? SETTLE_CLIENT : isFreelancer ? SETTLE_FREELANCER : 0;
    // The vault holds the amount plus both bonds while Frozen; settlements split this pool.
    const pool = esc.amount.add(bond.muln(2));
    const share = (bps: number) => {
      const f = pool.muln(bps).divn(10000);
      return `zleceniobiorca ${fromBase(f)} / zleceniodawca ${fromBase(pool.sub(f))}`;
    };
    // Preview only (same formula as the program): burn = vault * elapsed / dispute_window,
    // elapsed clamped to the window.
    const win = esc.disputeWindowSecs.toNumber();
    const elapsed = Math.min(Math.max(now - esc.frozenAt.toNumber(), 0), win);
    const burned = pool.muln(elapsed).divn(win);
    const rest = pool.sub(burned);
    const fl = rest.muln(esc.settleBps).divn(10000);
    const expired = now > disputeEnd;
    dispute = (
      <Card icon={expired ? Fire : Scales} title="Spór: ugoda, ustąpienie albo spalenie" danger={expired}>
        <p>
          Aktualna propozycja:{" "}
          {proposer === 0
            ? "brak"
            : `${proposer === SETTLE_CLIENT ? "zleceniodawca" : "zleceniobiorca"} proponuje ${esc.settleBps / 100}% dla zleceniobiorcy (${share(esc.settleBps)})`}
        </p>
        {!expired && (
          <>
            <p>
              Przy akceptacji teraz spalisz {((elapsed / win) * 100).toFixed(1)}% puli ({fromBase(burned)}).
              {proposer !== 0 && <> Zleceniobiorca dostanie {fromBase(fl)}, zleceniodawca {fromBase(rest.sub(fl))}.</>} Ostateczny rachunek liczy program.
            </p>
            {role && (
              <div className="slider">
                <label>
                  Udział zleceniobiorcy: <b>{pct}%</b> <span className="muted">({share(pct * 100)})</span>
                  <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
                </label>
                <Act kind="primary" icon={Handshake} label="Zaproponuj ugodę" caption="propose_settlement · podpisuje zleceniodawca lub zleceniobiorca" disabled={busy} onClick={propose} />
              </div>
            )}
            {role && proposer !== 0 && proposer !== myCode && (
              <Act kind="primary" icon={Checks} label="Przyjmij propozycję drugiej strony" caption="accept_settlement · podpisuje druga strona" disabled={busy} onClick={accept} />
            )}
            {!role && <p>Tylko strony umowy mogą proponować ugodę.</p>}
          </>
        )}
        {/* Conceding is possible until the pool is burned, so it stays available after the window. */}
        {isClient &&
          (pending === "concedeClient" ? (
            confirmPanel("cc", "Zleceniobiorca dostanie całą pulę (kwotę i obie kaucje). Tracisz swoją kaucję. Nieodwracalne.", "Potwierdzam ustąpienie", () => {
              setPending(null);
              release("Ustąpienie zleceniodawcy (release)");
            })
          ) : (
            <Act kind="neutral" icon={Flag} label="Ustąp — zleceniobiorca dostaje całą pulę" caption="release · podpisuje zleceniodawca" onClick={() => setPending("concedeClient")} />
          ))}
        {isFreelancer &&
          (pending === "concedeFreelancer" ? (
            confirmPanel("cf", "Zleceniodawca dostanie całą pulę (kwotę i obie kaucje). Tracisz swoją kaucję. Nieodwracalne.", "Potwierdzam ustąpienie", () =>
              cancel("Ustąpienie zleceniobiorcy (cancel_by_freelancer)")
            )
          ) : (
            <Act kind="neutral" icon={HandCoins} label="Ustąp — zleceniodawca dostaje całą pulę" caption="cancel_by_freelancer · podpisuje zleceniobiorca" onClick={() => setPending("concedeFreelancer")} />
          ))}
        {expired && (
          <>
            <p>Okno sporu minęło bez ugody. Każdy może spalić środki — nikt na sporze nie zyskuje.</p>
            <Act kind="danger" icon={Fire} label="Spal środki" caption="burn_if_unsettled · może wywołać każdy — środki zostaną spalone" disabled={busy} onClick={burn} />
          </>
        )}
      </Card>
    );
  }

  if (!items.length && !dispute) return null;
  return (
    <>
      {items.length > 0 && (
        <Card icon={SealCheck} title="Akcje">
          <fieldset disabled={busy} className="acts">{items}</fieldset>
        </Card>
      )}
      {dispute}
    </>
  );
}
