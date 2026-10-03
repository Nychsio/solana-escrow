import { Plus } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { Addr } from "../components/Addr";
import { countdown, fromBase } from "../format";
import { stateOf, useChainNow, useProgram, type EscrowAccount } from "../program";

type Row = { pda: PublicKey; esc: EscrowAccount };

// Next deadline that matters in the current state.
function nextDeadline(e: EscrowAccount): number | null {
  switch (stateOf(e)) {
    case "funded":
      return e.deadlineTs.toNumber();
    case "delivered":
      return e.deliveredAt ? e.deliveredAt.toNumber() + e.reviewWindowSecs.toNumber() : null;
    case "frozen":
      return e.frozenAt.toNumber() + e.disputeWindowSecs.toNumber();
    default:
      return null;
  }
}

export function Home() {
  const program = useProgram();
  const { publicKey } = useWallet();
  const now = useChainNow();
  const [tab, setTab] = useState<"client" | "freelancer">("client");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [addr, setAddr] = useState("");

  // getProgramAccounts with a memcmp filter: client pubkey at offset 8 (after the
  // discriminator), freelancer at offset 40. No indexer, no backend.
  const load = useCallback(async () => {
    if (!publicKey) return;
    setRows(null);
    const list = await program.account.escrow.all([
      { memcmp: { offset: tab === "client" ? 8 : 40, bytes: publicKey.toBase58() } },
    ]);
    setRows(
      list
        .map((a) => ({ pda: a.publicKey, esc: a.account }))
        .sort((a, b) => b.esc.id.cmp(a.esc.id))
    );
  }, [program, publicKey, tab]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  return (
    <div className="page">
      {publicKey ? (
        <>
          <h2 data-ov="Panel">Moje umowy</h2>
          <button disabled={tab === "client"} onClick={() => setTab("client")}>Jako klient</button>
          <button disabled={tab === "freelancer"} onClick={() => setTab("freelancer")}>Jako wykonawca</button>
          <button onClick={() => load()}>Odśwież</button>{" "}
          <a href="#/new"><button className="primary"><Plus size={16} strokeWidth={2} />Nowa umowa</button></a>
          {rows === null ? (
            <p>Ładowanie…</p>
          ) : rows.length === 0 ? (
            <p>Brak umów.</p>
          ) : (
            <table>
              <thead>
                <tr><th>{tab === "client" ? "Wykonawca" : "Klient"}</th><th>Kwota</th><th>Stan</th><th>Najbliższy termin</th><th /></tr>
              </thead>
              <tbody>
                {rows.map(({ pda, esc }) => {
                  const d = nextDeadline(esc);
                  return (
                    <tr key={pda.toBase58()}>
                      <td><Addr value={(tab === "client" ? esc.freelancer : esc.client).toBase58()} /></td>
                      <td className="mono">{fromBase(esc.amount)}</td>
                      <td><span className={`state s-${stateOf(esc)}`}>{stateOf(esc)}</span></td>
                      <td>{d ? countdown(d - now) : "—"}</td>
                      <td><a href={`#/escrow/${pda.toBase58()}`}>szczegóły</a></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <p>Połącz portfel (Phantom/Solflare ustawiony na devnet), żeby zobaczyć swoje umowy.</p>
      )}
      <h3 data-ov="Szybki dostęp">Otwórz umowę po adresie</h3>
      <input placeholder="Adres umowy (PDA)" value={addr} onChange={(e) => setAddr(e.target.value)} size={50} />
      <button onClick={() => (location.hash = `#/escrow/${addr.trim()}`)} disabled={!addr.trim()}>Otwórz</button>
    </div>
  );
}
