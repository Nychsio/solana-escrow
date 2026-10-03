import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { fromBase } from "../format";
import { stateOf, useProgram, vaultOf } from "../program";
import type { EscrowView } from "../pages/EscrowPage";
import { useTx } from "../tx";

const SETTLE_CLIENT = 1;
const SETTLE_FREELANCER = 2;

// Buttons follow the action matrix in AIcontext/front.md. Visibility is only a hint
// based on role, state and (chain-estimated) time; the program enforces every rule.
export function Actions({ pda, esc, now, role, reload, vaultBal }: EscrowView) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const { busy, run } = useTx();
  const [pct, setPct] = useState(50);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (!publicKey) return <p>Połącz portfel, żeby wykonać akcję.</p>;

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

  const release = () =>
    exec("Zatwierdzenie i wypłata (release)", () =>
      program.methods
        .release()
        .accountsPartial({ client: publicKey, escrow: pda, mint, vault, freelancerToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.freelancer, freelancerToken)])
        .rpc()
    );
  const claim = () =>
    exec("Odbiór wypłaty (claim_if_silent)", () =>
      program.methods
        .claimIfSilent()
        .accountsPartial({ freelancer: publicKey, escrow: pda, mint, vault, freelancerToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.freelancer, freelancerToken)])
        .rpc()
    );
  const refund = () =>
    exec("Zwrot środków (refund_if_late)", () =>
      program.methods
        .refundIfLate()
        .accountsPartial({ client: publicKey, escrow: pda, mint, vault, clientToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.client, clientToken)])
        .rpc()
    );
  const cancel = async () => {
    setConfirmingCancel(false);
    await exec("Rezygnacja wykonawcy (cancel_by_freelancer)", () =>
      program.methods
        .cancelByFreelancer()
        .accountsPartial({ freelancer: publicKey, escrow: pda, mint, vault, clientToken, tokenProgram: TOKEN_PROGRAM_ID })
        .preInstructions([ensureAta(esc.client, clientToken)])
        .rpc()
    );
  };
  const reject = () => {
    if (
      !confirm(
        "Odrzucenie zamrozi środki. Będzie okno sporu na ugodę; bez ugody każdy może je SPALIĆ. Kontynuować?"
      )
    )
      return;
    exec("Odrzucenie dostawy (reject)", () =>
      program.methods.reject().accountsPartial({ client: publicKey, escrow: pda }).rpc()
    );
  };
  const propose = () =>
    exec(`Propozycja ugody: ${pct}% dla wykonawcy`, () =>
      program.methods.proposeSettlement(pct * 100).accountsPartial({ signer: publicKey, escrow: pda }).rpc()
    );
  const accept = () =>
    exec(`Przyjęcie ugody: ${esc.settleBps / 100}% dla wykonawcy`, () =>
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

  const items: React.ReactNode[] = [];
  const finished = state === "released" || state === "refunded" || state === "settled" || state === "burned";
  if (finished && isClient && vaultBal === "0")
    items.push(<button key="cl" className="primary" onClick={close}>Zamknij umowę i odzyskaj rent (close_escrow)</button>);
  if (state === "funded") {
    if (isClient && now <= deadline) items.push(<button key="r" className="primary" onClick={release}>Zatwierdź i wypłać (release)</button>);
    if (isClient && now > deadline) items.push(<button key="rf" className="primary" onClick={refund}>Odzyskaj środki (refund_if_late)</button>);
    if (isFreelancer && now > deadline) items.push(<p key="m">Termin dostawy minął.</p>);
  }
  if (state === "delivered") {
    if (isClient) items.push(<button key="r" className="primary" onClick={release}>Zatwierdź i wypłać (release)</button>);
    if (isClient && now <= reviewEnd) items.push(<button key="rj" className="danger" onClick={reject}>Odrzuć dostawę (reject)</button>);
    if (isFreelancer && now <= reviewEnd) items.push(<p key="m">Czekasz na decyzję klienta do końca okna akceptacji.</p>);
    if (isFreelancer && now > reviewEnd) items.push(<button key="c" className="primary" onClick={claim}>Odbierz wypłatę (claim_if_silent)</button>);
  }

  // The freelancer can always hand the whole vault back (no burn); only they lose, so no time rule.
  if (isFreelancer && (state === "funded" || state === "delivered" || state === "frozen")) {
    items.push(
      confirmingCancel ? (
        <div key="cancel" className="panel">
          <p>Klient dostanie 100% środków, ty 0. Nieodwracalne.</p>
          <button className="danger" onClick={cancel}>Potwierdzam rezygnację</button>{" "}
          <button onClick={() => setConfirmingCancel(false)}>Anuluj</button>
        </div>
      ) : (
        <button key="cancel" className="danger" onClick={() => setConfirmingCancel(true)}>
          Zrezygnuj i zwróć środki klientowi
        </button>
      )
    );
  }

  let dispute: React.ReactNode = null;
  if (state === "frozen") {
    const proposer = esc.settleProposer;
    const myCode = isClient ? SETTLE_CLIENT : isFreelancer ? SETTLE_FREELANCER : 0;
    const share = (bps: number) => {
      const f = esc.amount.muln(bps).divn(10000);
      return `wykonawca ${fromBase(f)} / klient ${fromBase(esc.amount.sub(f))}`;
    };
    // Preview only (same formula as the program): burn = vault * elapsed / dispute_window,
    // elapsed clamped to the window. While Frozen the vault holds the full amount.
    const win = esc.disputeWindowSecs.toNumber();
    const elapsed = Math.min(Math.max(now - esc.frozenAt.toNumber(), 0), win);
    const burned = esc.amount.muln(elapsed).divn(win);
    const rest = esc.amount.sub(burned);
    const fl = rest.muln(esc.settleBps).divn(10000);
    dispute = (
      <div className="panel">
        <h4 data-ov="Spór">Ugoda albo spalenie</h4>
        <p>
          Aktualna propozycja:{" "}
          {proposer === 0
            ? "brak"
            : `${proposer === SETTLE_CLIENT ? "klient" : "wykonawca"} proponuje ${esc.settleBps / 100}% dla wykonawcy (${share(esc.settleBps)})`}
        </p>
        {now <= disputeEnd ? (
          <>
            <p>
              Przy akceptacji teraz spalisz {((elapsed / win) * 100).toFixed(1)}% skarbca ({fromBase(burned)}).
              {proposer !== 0 && <> Wykonawca dostanie {fromBase(fl)}, klient {fromBase(rest.sub(fl))}.</>} Ostateczny rachunek liczy program.
            </p>
            {role && (
              <p>
                Udział wykonawcy: <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} />{" "}
                {pct}% ({share(pct * 100)}){" "}
                <button className="primary" disabled={busy} onClick={propose}>Zaproponuj (propose_settlement)</button>
              </p>
            )}
            {role && proposer !== 0 && proposer !== myCode && (
              <button className="primary" disabled={busy} onClick={accept}>Przyjmij propozycję drugiej strony (accept_settlement)</button>
            )}
            {!role && <p>Tylko strony umowy mogą proponować ugodę.</p>}
          </>
        ) : (
          <>
            <p>Okno sporu minęło bez ugody. Każdy może spalić środki — nikt na sporze nie zyskuje.</p>
            <button className="danger" disabled={busy} onClick={burn}>Spal środki (burn_if_unsettled)</button>
          </>
        )}
      </div>
    );
  }

  if (!items.length && !dispute) return null;
  return (
    <div className="panel">
      <h3 data-ov="Operacje">Akcje</h3>
      <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>{items}</fieldset>
      {dispute}
    </div>
  );
}
