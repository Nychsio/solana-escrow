import { ArrowRight, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { Addr } from "../components/Addr";
import { Card, Hero, IconBadge } from "../components/ui";
import { STATE_ICON, STATE_PL } from "./EscrowPage";
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
      <Hero
        overline="Escrow bez arbitra"
        lead={publicKey ? "Umowy, w których jesteś klientem albo wykonawcą." : "Połącz portfel (Phantom/Solflare ustawiony na devnet), żeby zobaczyć swoje umowy."}
        meta={
          publicKey && (
            <>
              <div className="tabs">
                <button className={tab === "client" ? "on" : ""} disabled={tab === "client"} onClick={() => setTab("client")}>Jako klient</button>
                <button className={tab === "freelancer" ? "on" : ""} disabled={tab === "freelancer"} onClick={() => setTab("freelancer")}>Jako wykonawca</button>
              </div>
              <button onClick={() => load()}>Odśwież</button>
              <a href="#/new"><button className="primary"><Plus size={18} weight="bold" />Nowa umowa<ArrowRight size={18} weight="bold" /></button></a>
            </>
          )
        }
      >
        Twoje umowy
      </Hero>
      {publicKey &&
        (rows === null ? (
          <p>Ładowanie…</p>
        ) : rows.length === 0 ? (
          <p>Brak umów.</p>
        ) : (
          <ul className="rows">
            {rows.map(({ pda, esc }) => {
              const d = nextDeadline(esc);
              const st = stateOf(esc);
              return (
                <li key={pda.toBase58()} className="row-card">
                  <IconBadge icon={STATE_ICON[st]} danger={st === "burned"} />
                  <div className="row-mid">
                    <span className={`state s-${st}`}>{STATE_PL[st]}</span>
                    <div className="muted">
                      {tab === "client" ? "Wykonawca" : "Klient"}{" "}
                      <Addr value={(tab === "client" ? esc.freelancer : esc.client).toBase58()} />
                    </div>
                    {d && <div className="muted">Najbliższy termin: <span className="mono">{countdown(d - now)}</span></div>}
                  </div>
                  <div className="row-end">
                    <div className="amount mono">{fromBase(esc.amount)}</div>
                    <a href={`#/escrow/${pda.toBase58()}`}>Szczegóły<ArrowRight size={18} weight="bold" /></a>
                  </div>
                </li>
              );
            })}
          </ul>
        ))}
      <Card icon={MagnifyingGlass} title="Otwórz umowę po adresie">
        <div className="row">
          <input placeholder="Adres umowy (PDA)" value={addr} onChange={(e) => setAddr(e.target.value)} size={50} />
          <button onClick={() => (location.hash = `#/escrow/${addr.trim()}`)} disabled={!addr.trim()}>Otwórz</button>
        </div>
      </Card>
    </div>
  );
}
