import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Actions } from "../components/Actions";
import { Addr } from "../components/Addr";
import { Delivery } from "../components/Delivery";
import { txUrl } from "../config";
import { countdown, fmtDate, fromBase, toHex } from "../format";
import { stateOf, useChainNow, useProgram, vaultOf, type EscrowAccount, type StateName } from "../program";

type HistItem = { sig: string; ok: boolean; time: number | null; ix: string };

// Friendlier names for instructions whose log name alone is unclear.
const IX_LABELS: Record<string, string> = { CancelByFreelancer: "Rezygnacja wykonawcy (CancelByFreelancer)" };

export type EscrowView = {
  pda: PublicKey;
  esc: EscrowAccount;
  now: number;
  role: "client" | "freelancer" | null;
  reload: () => Promise<void>;
  vaultBal: string | null;
};

const STATES: StateName[] = ["funded", "delivered", "released", "refunded", "frozen", "settled", "burned"];

export function EscrowPage({ address }: { address: string }) {
  const program = useProgram();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const now = useChainNow();
  const pda = useMemo(() => {
    try {
      return new PublicKey(address);
    } catch {
      return null;
    }
  }, [address]);
  const [esc, setEsc] = useState<EscrowAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vaultBal, setVaultBal] = useState<string | null>(null);
  const [history, setHistory] = useState<HistItem[]>([]);
  const [closed, setClosed] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!pda) return;
    try {
      const e = await program.account.escrow.fetch(pda);
      setEsc(e);
      setError(null);
      const bal = await connection.getTokenAccountBalance(vaultOf(e.mint, pda)).catch(() => null);
      setVaultBal(bal ? bal.value.uiAmountString ?? "0" : null);
    } catch (e) {
      // A closed escrow (close_escrow) no longer exists on chain: decide by the account
      // lookup, not by the error text.
      const info = await connection.getAccountInfo(pda).catch(() => undefined);
      if (info === null) {
        setClosed(true);
        setEsc(null);
        setError(null);
      } else {
        setError(`Nie znaleziono umowy pod tym adresem (${(e as Error).message})`);
      }
    }
  }, [pda, program, connection]);

  // Transaction history read straight from the chain: signatures of the escrow account,
  // instruction name taken from the program logs.
  const loadHistory = useCallback(async () => {
    if (!pda) return;
    const sigs = await connection.getSignaturesForAddress(pda, { limit: 25 });
    const txs = await connection.getTransactions(
      sigs.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0, commitment: "confirmed" }
    );
    setHistory(
      sigs.map((s, i) => ({
        sig: s.signature,
        ok: !s.err,
        time: s.blockTime ?? null,
        ix:
          txs[i]?.meta?.logMessages
            ?.map((l) => l.match(/^Program log: Instruction: (\w+)/)?.[1])
            .find(Boolean) ?? "?",
      }))
    );
  }, [pda, connection]);

  const reload = useCallback(async () => {
    await loadAccount();
    await loadHistory().catch(() => {});
  }, [loadAccount, loadHistory]);

  useEffect(() => {
    reload();
  }, [reload]);

  // No polling once the account is closed: it cannot come back.
  useEffect(() => {
    if (closed) return;
    const t = setInterval(loadAccount, 10_000);
    return () => clearInterval(t);
  }, [loadAccount, closed]);

  if (!pda) return <p>Nieprawidłowy adres umowy.</p>;
  if (closed)
    return (
      <div className="page">
        <h2 data-ov="Escrow">Umowa <Addr value={pda.toBase58()} /></h2>
        <p><b>Umowa zamknięta, rent zwrócony klientowi.</b></p>
        <p><a href="#/">← Lista umów</a></p>
        <hr className="glass-separator" />
        <h3 data-ov="Chain">Historia transakcji</h3>
        <button onClick={() => loadHistory()}>Odśwież</button>
        <ul className="history">
          {history.map((h) => (
            <li key={h.sig}>
              {h.time ? fmtDate(h.time) : "?"} · <b>{IX_LABELS[h.ix] ?? h.ix}</b> {h.ok ? "" : "(błąd)"} ·{" "}
              <a href={txUrl(h.sig)} target="_blank" rel="noreferrer">{h.sig.slice(0, 12)}…</a>
            </li>
          ))}
        </ul>
      </div>
    );
  if (error) return <p className="error">{error}</p>;
  if (!esc) return <p>Ładowanie…</p>;

  const state = stateOf(esc);
  const me = publicKey?.toBase58();
  const role = me === esc.client.toBase58() ? "client" : me === esc.freelancer.toBase58() ? "freelancer" : null;
  const deadline = esc.deadlineTs.toNumber();
  const reviewEnd = esc.deliveredAt ? esc.deliveredAt.toNumber() + esc.reviewWindowSecs.toNumber() : null;
  const frozenAt = esc.frozenAt.toNumber();
  const disputeEnd = frozenAt > 0 ? frozenAt + esc.disputeWindowSecs.toNumber() : null;
  const hash = toHex(esc.deliverableHash);
  const hasHash = /[1-9a-f]/.test(hash);
  const view: EscrowView = { pda, esc, now, role, reload, vaultBal };

  return (
    <div className="page">
      <h2 data-ov="Escrow">Umowa <Addr value={pda.toBase58()} /></h2>
      <p>
        Link dla drugiej strony:{" "}
        <code className="hash mono" onClick={() => navigator.clipboard.writeText(location.href)}>{location.href}</code>
      </p>
      <p>
        Twoja rola: <b>{role === "client" ? "klient" : role === "freelancer" ? "wykonawca" : "obserwator"}</b>
      </p>

      <h3 data-ov="Status">Stan: <span className={`state s-${state}`}>{state.toUpperCase()}</span></h3>
      <div className="timeline">
        {STATES.map((s) => (
          <span key={s} className={`chip s-${s}${s === state ? " current" : ""}`}>{s}</span>
        ))}
      </div>

      <table>
        <tbody>
          <tr><td>Klient</td><td><Addr value={esc.client.toBase58()} /></td></tr>
          <tr><td>Wykonawca</td><td><Addr value={esc.freelancer.toBase58()} /></td></tr>
          <tr><td>Token</td><td><Addr value={esc.mint.toBase58()} /></td></tr>
          <tr><td>Kwota umowy</td><td className="mono">{fromBase(esc.amount)}</td></tr>
          <tr><td>Saldo skarbca (na żywo)</td><td className="mono">{vaultBal ?? "?"} <Addr value={vaultOf(esc.mint, pda).toBase58()} /></td></tr>
          <tr>
            <td>Termin dostawy</td>
            <td>{fmtDate(deadline)} {state === "funded" && <b>({countdown(deadline - now)})</b>}</td>
          </tr>
          <tr>
            <td>Okno akceptacji</td>
            <td>
              {esc.reviewWindowSecs.toString()} s
              {reviewEnd && <> · do {fmtDate(reviewEnd)} {state === "delivered" && <b>({countdown(reviewEnd - now)})</b>}</>}
            </td>
          </tr>
          <tr>
            <td>Okno sporu</td>
            <td>
              {esc.disputeWindowSecs.toString()} s
              {disputeEnd && <> · do {fmtDate(disputeEnd)} {state === "frozen" && <b>({countdown(disputeEnd - now)})</b>}</>}
            </td>
          </tr>
          <tr><td>Hash dostawy (SHA-256)</td><td><code className="hash">{hasHash ? hash : "—"}</code></td></tr>
        </tbody>
      </table>

      <Delivery {...view} />
      <Actions {...view} />

      <hr className="glass-separator" />
      <h3 data-ov="Chain">Historia transakcji</h3>
      <button onClick={() => loadHistory()}>Odśwież</button>
      <ul className="history">
        {history.map((h) => (
          <li key={h.sig}>
            {h.time ? fmtDate(h.time) : "?"} · <b>{IX_LABELS[h.ix] ?? h.ix}</b> {h.ok ? "" : "(błąd)"} ·{" "}
            <a href={txUrl(h.sig)} target="_blank" rel="noreferrer">{h.sig.slice(0, 12)}…</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
