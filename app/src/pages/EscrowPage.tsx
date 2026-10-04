import {
  Archive,
  ArrowLeft,
  ArrowSquareOut,
  ArrowsClockwise,
  Briefcase,
  Clock,
  Fingerprint,
  Fire,
  Handshake,
  ListChecks,
  UserCheck,
  Scales,
  SealCheck,
  Timer,
  UploadSimple,
  User,
  Vault,
  type Icon,
} from "@phosphor-icons/react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { EventParser } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Actions } from "../components/Actions";
import { Addr } from "../components/Addr";
import { Delivery } from "../components/Delivery";
import { Card, CopyIcon, Hero, ShareLinkCard } from "../components/ui";
import { txUrl } from "../config";
import { countdown, fmtDate, fromBase, toHex } from "../format";
import { stateOf, useChainNow, useProgram, vaultOf, type EscrowAccount, type StateName } from "../program";

type HistItem = { sig: string; ok: boolean; time: number | null; ix: string; closes: boolean; conceded: boolean };

// Friendlier names for instructions whose log name alone is unclear.
const IX_LABELS: Record<string, string> = {
  CancelByFreelancer: "Rezygnacja zleceniobiorcy (CancelByFreelancer)",
  AcceptJob: "Akceptacja zlecenia (AcceptJob)",
  Withdraw: "Wycofanie środków (Withdraw)",
  Release: "Wypłata (Release)",
};

export type EscrowView = {
  pda: PublicKey;
  esc: EscrowAccount;
  now: number;
  role: "client" | "freelancer" | null;
  reload: () => Promise<void>;
  vaultBal: string | null;
};

const STATES: StateName[] = ["funded", "accepted", "delivered", "released", "refunded", "frozen", "settled", "burned"];
export const STATE_PL: Record<StateName, string> = {
  funded: "Czeka na zleceniobiorcę",
  accepted: "Zaakceptowana",
  delivered: "Dostarczona",
  released: "Wypłacona",
  refunded: "Zwrócona",
  frozen: "Zamrożona",
  settled: "Ugoda",
  burned: "Spalona",
};
export const STATE_ICON: Record<StateName, Icon> = {
  funded: Vault,
  accepted: UserCheck,
  delivered: UploadSimple,
  released: SealCheck,
  refunded: ArrowsClockwise,
  frozen: Scales,
  settled: Handshake,
  burned: Fire,
};
// States that were passed on the way to the given state (delivered only if a delivery happened).
const BEFORE: Record<StateName, StateName[]> = {
  funded: [],
  accepted: ["funded"],
  delivered: ["funded", "accepted"],
  released: ["funded", "accepted", "delivered"],
  refunded: ["funded"],
  frozen: ["funded", "accepted", "delivered"],
  settled: ["funded", "accepted", "delivered", "frozen"],
  burned: ["funded", "accepted", "delivered", "frozen"],
};

function History({ items, onRefresh }: { items: HistItem[]; onRefresh: () => void }) {
  return (
    <Card icon={ListChecks} title="Historia transakcji">
      <ul className="history">
        {items.map((h) => (
          <li key={h.sig}>
            <span className="muted">{h.time ? fmtDate(h.time) : "?"}</span>
            <b>{h.conceded ? "Ustąpienie zleceniodawcy (Release)" : IX_LABELS[h.ix] ?? h.ix}{h.ok ? "" : " (błąd)"}</b>
            <a href={txUrl(h.sig)} target="_blank" rel="noreferrer">
              <span className="mono">{h.sig.slice(0, 12)}…</span>
              <ArrowSquareOut size={18} weight="duotone" />
            </a>
          </li>
        ))}
      </ul>
      <button onClick={onRefresh}><ArrowsClockwise size={18} weight="duotone" />Odśwież</button>
    </Card>
  );
}

// One definition-list entry: muted label above, value below.
function Def({ icon: I, label, children }: { icon?: Icon; label: string; children: React.ReactNode }) {
  return (
    <div className="def">
      <dt>{I && <I size={18} weight="duotone" />}{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// One row of the "Czas" card: active counter big, finished windows muted with "minęło".
function TimeRow({ label, active, left, note }: { label: string; active: boolean; left: number; note: string }) {
  return (
    <div className={`timerow${active ? " active" : ""}`}>
      <Timer size={20} weight="duotone" />
      <div>
        <div className="def-label">{label}</div>
        {active ? <div className="counter">{countdown(left)}</div> : <div className="muted">{note}</div>}
      </div>
    </div>
  );
}

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

  // Transaction history read straight from the chain: signatures of the escrow account,
  // instruction name taken from the program logs. `closes` = some log line says CloseEscrow.
  const fetchHistory = useCallback(async (): Promise<HistItem[]> => {
    if (!pda) return [];
    const sigs = await connection.getSignaturesForAddress(pda, { limit: 25 });
    const txs = await connection.getTransactions(
      sigs.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0, commitment: "confirmed" }
    );
    const parser = new EventParser(program.programId, program.coder);
    return sigs.map((s, i) => {
      const logs = txs[i]?.meta?.logMessages ?? [];
      // Released { conceded: true } = the client gave in from Frozen.
      let conceded = false;
      try {
        for (const ev of parser.parseLogs(logs)) {
          if (ev.name === "released" && (ev.data as { conceded?: boolean }).conceded) conceded = true;
        }
      } catch {
        /* events unreadable: plain label */
      }
      return {
        sig: s.signature,
        ok: !s.err,
        time: s.blockTime ?? null,
        ix: logs.map((l) => l.match(/^Program log: Instruction: (\w+)/)?.[1]).find(Boolean) ?? "?",
        closes: !s.err && logs.some((l) => l.includes("Instruction: CloseEscrow")),
        conceded,
      };
    });
  }, [pda, connection, program]);

  const loadHistory = useCallback(async () => {
    setHistory(await fetchHistory());
  }, [fetchHistory]);

  // Right after `create` the RPC may not see the account yet. "Closed" is claimed only when
  // the history contains a CloseEscrow; otherwise re-read (3 retries, 2 s apart).
  const loadAccount = useCallback(async () => {
    if (!pda) return;
    for (let attempt = 0; ; attempt++) {
      try {
        const e = await program.account.escrow.fetch(pda);
        setEsc(e);
        setError(null);
        const bal = await connection.getTokenAccountBalance(vaultOf(e.mint, pda)).catch(() => null);
        setVaultBal(bal ? bal.value.uiAmountString ?? "0" : null);
        return;
      } catch (e) {
        const info = await connection.getAccountInfo(pda).catch(() => undefined);
        if (info !== null) {
          setError(`Nie znaleziono umowy pod tym adresem (${(e as Error).message})`);
          return;
        }
        const hist = await fetchHistory().catch(() => [] as HistItem[]);
        if (hist.some((h) => h.closes)) {
          setHistory(hist);
          setClosed(true);
          setEsc(null);
          setError(null);
          return;
        }
        if (attempt >= 3) {
          setError(`Nie znaleziono umowy pod tym adresem (${(e as Error).message})`);
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }, [pda, program, connection, fetchHistory]);

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

  if (!pda) return <Hero overline="Umowa escrow">Nieprawidłowy adres umowy</Hero>;
  if (closed)
    return (
      <div className="page">
        <Hero overline="Umowa escrow" lead="Rent zwrócony zleceniodawcy." meta={<Addr value={pda.toBase58()} />}>
          Umowa zamknięta
        </Hero>
        <div className="wrap content">
          <p><a href="#/" className="back"><ArrowLeft size={18} weight="duotone" />Lista umów</a></p>
          <History items={history} onRefresh={() => loadHistory()} />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="page">
        <Hero overline="Umowa escrow" lead={<span className="error">{error}</span>}>Brak umowy</Hero>
      </div>
    );
  if (!esc)
    return (
      <div className="page">
        <Hero overline="Umowa escrow">Ładowanie…</Hero>
      </div>
    );

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

  const lead = {
    funded: now <= deadline ? "Środki są w skarbcu. Czekamy, aż zleceniobiorca przyjmie zlecenie i wpłaci kaucję." : "Termin minął, a zlecenie nie zostało przyjęte. Każdy może zwrócić środki zleceniodawcy.",
    accepted: now <= deadline ? "Zleceniobiorca przyjął zlecenie i wpłacił kaucję. Czekamy na dostawę." : "Termin dostawy minął. Każdy może zwrócić środki zleceniodawcy razem z kaucją zleceniobiorcy.",
    delivered: reviewEnd && now <= reviewEnd ? "Dostawa zgłoszona. Zleceniodawca ma czas na akceptację albo odrzucenie." : "Okno akceptacji minęło. Każdy może wypłacić środki zleceniobiorcy.",
    released: "Wypłacono zleceniobiorcy. Umowa zakończona.",
    refunded: "Środki wróciły do zleceniodawcy. Umowa zakończona.",
    frozen: disputeEnd && now > disputeEnd ? "Okno sporu minęło. Każdy może spalić środki." : "Dostawa odrzucona. Strony mogą się dogadać przed końcem okna sporu.",
    settled: "Strony dogadały się. Skarbiec został podzielony.",
    burned: "Brak ugody. Środki zostały spalone.",
  }[state];
  const roleLabel = role === "client" ? "zleceniodawca" : role === "freelancer" ? "zleceniobiorca" : "obserwator";
  const RoleIcon = role === "freelancer" ? Briefcase : User;

  const wasDelivered = !!esc.deliveredAt || state === "delivered";
  const done = (s: StateName) =>
    BEFORE[state].includes(s) && ((s !== "delivered" && s !== "accepted") || wasDelivered);
  // Who has already paid into the vault, derived from the state.
  const hasBond = !esc.bondAmount.isZero();
  const paid = {
    funded: "wpłacone: zleceniodawca (kwota)",
    accepted: `wpłacone: zleceniodawca (kwota)${hasBond ? " i zleceniobiorca (kaucja)" : ""}`,
    delivered: `wpłacone: zleceniodawca (kwota)${hasBond ? " i zleceniobiorca (kaucja)" : ""}`,
    frozen: `wpłacone: zleceniodawca (kwota${hasBond ? " + kaucja" : ""})${hasBond ? " i zleceniobiorca (kaucja)" : ""}`,
    released: "rozliczone",
    refunded: "rozliczone",
    settled: "rozliczone",
    burned: "rozliczone",
  }[state];
  const SI = STATE_ICON[state];

  return (
    <div className="page">
      <Hero
        overline="Umowa escrow"
        lead={lead}
        meta={
          <>
            <span className={`state big s-${state}`}><SI size={20} weight="duotone" />{STATE_PL[state]}</span>
            <span className="role"><RoleIcon size={18} weight="duotone" />{roleLabel}</span>
          </>
        }
        after={
          <ol className="path" aria-label="Stan umowy">
            {STATES.map((s) => (
              <li key={s} className={s === state ? "current" : done(s) ? "past" : "future"}>
                <span className="dot" />
                {STATE_PL[s]}
              </li>
            ))}
          </ol>
        }
        float={<ShareLinkCard title={role === "client" ? "Wyślij ten link zleceniobiorcy" : "Link do tej umowy"} />}
      >
        {fromBase(esc.amount)} tokenów
      </Hero>

      <div className="wrap content">
      <div className="grid">
        <div className="col-main">
          <Actions {...view} />
          <Delivery {...view} />
          <History items={history} onRefresh={() => loadHistory()} />
        </div>
        <aside className="col-side">
          <Card icon={Archive} title="Szczegóły">
            <dl className="defs">
              <Def icon={User} label="Zleceniodawca"><Addr value={esc.client.toBase58()} /></Def>
              <Def icon={Briefcase} label="Zleceniobiorca"><Addr value={esc.freelancer.toBase58()} /></Def>
              <Def label="Token"><Addr value={esc.mint.toBase58()} /></Def>
              <Def icon={Vault} label="Kaucja (każda strona)">
                <span className="mono">{fromBase(esc.bondAmount)}</span>{" "}
                <span className="muted">({esc.bondAmount.isZero() ? "brak" : paid})</span>
              </Def>
              <Def icon={Vault} label="Skarbiec">
                <span className="mono big-num">{vaultBal ?? "?"}</span>{" "}
                <Addr value={vaultOf(esc.mint, pda).toBase58()} />
              </Def>
              <Def icon={Fingerprint} label="Hash dostawy (SHA-256)">
                {hasHash ? (
                  <span className="hash-line">
                    <code className="hash" title={hash}>{hash}</code>
                    <CopyIcon value={hash} label="Kopiuj hash" />
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </Def>
              <Def label="Adres umowy"><Addr value={pda.toBase58()} /></Def>
            </dl>
          </Card>
          <Card icon={Clock} title="Czas">
            <TimeRow label={`Termin dostawy · ${fmtDate(deadline)}`} active={state === "funded" && now <= deadline} left={deadline - now} note="minął" />
            <TimeRow
              label={`Okno akceptacji · ${esc.reviewWindowSecs.toString()} s`}
              active={state === "delivered" && !!reviewEnd && now <= reviewEnd}
              left={(reviewEnd ?? 0) - now}
              note={reviewEnd ? "minęło" : "zacznie się po dostawie"}
            />
            <TimeRow
              label={`Okno sporu · ${esc.disputeWindowSecs.toString()} s`}
              active={state === "frozen" && !!disputeEnd && now <= disputeEnd}
              left={(disputeEnd ?? 0) - now}
              note={disputeEnd ? "minęło" : "zacznie się po odrzuceniu"}
            />
          </Card>
        </aside>
      </div>
      </div>
    </div>
  );
}
