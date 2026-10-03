import { CheckCircle, Fingerprint, UploadSimple, XCircle } from "@phosphor-icons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { toHex } from "../format";
import { stateOf, useProgram } from "../program";
import type { EscrowView } from "../pages/EscrowPage";
import { useTx } from "../tx";
import { Act, Card, CopyIcon } from "./ui";

// SHA-256 computed in the browser (Web Crypto). The file never leaves the machine;
// only its 32-byte fingerprint goes on-chain.
async function sha256(data: ArrayBuffer | string): Promise<Uint8Array> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

function HashInput({ onHash }: { onHash: (h: Uint8Array | null, label: string) => void }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="hashinput">
      <input
        type="file"
        onChange={async (e) => {
          const input = e.target;
          const f = input.files?.[0];
          setErr(null);
          try {
            if (f) onHash(await sha256(await f.arrayBuffer()), f.name);
          } catch (ex) {
            console.error("hash from file", ex);
            onHash(null, "");
            setErr(`Nie udało się odczytać pliku: ${(ex as Error).message ?? ex}`);
          } finally {
            // Without a reset, choosing the same file again does not fire onChange.
            input.value = "";
          }
        }}
      />
      {err && <div className="error">{err}</div>}
      <div className="textrow">
        albo tekst / link:{" "}
        <input value={text} size={40} onChange={(e) => setText(e.target.value)} />
        <button
          disabled={!text}
          onClick={async () => {
            setErr(null);
            try {
              onHash(await sha256(text), "tekst");
            } catch (ex) {
              setErr(`Nie udało się policzyć hasha: ${(ex as Error).message ?? ex}`);
            }
          }}
        >
          Policz hash
        </button>
      </div>
    </div>
  );
}

export function Delivery({ pda, esc, now, role, reload }: EscrowView) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const { busy, run } = useTx();
  const [hash, setHash] = useState<{ h: Uint8Array; label: string } | null>(null);
  const [check, setCheck] = useState<{ ok: boolean; hex: string; label: string } | null>(null);

  const state = stateOf(esc);
  const onChain = toHex(esc.deliverableHash);
  const hasHash = /[1-9a-f]/.test(onChain);
  const canDeliver = role === "freelancer" && state === "funded" && now <= esc.deadlineTs.toNumber();

  const deliver = async () => {
    if (!hash || !publicKey) return;
    const sig = await run(`Zgłoszenie dostawy (mark_delivered): ${hash.label}`, () =>
      program.methods
        .markDelivered(Array.from(hash.h))
        .accountsPartial({ freelancer: publicKey, escrow: pda })
        .rpc()
    );
    if (sig) await reload();
  };

  if (!canDeliver && !hasHash) return null;
  return (
    <>
      {canDeliver && (
        <Card icon={UploadSimple} title="Dostawa">
          <p>Wybierz plik (albo wklej tekst/link). Na chain trafia tylko jego SHA-256.</p>
          <HashInput onHash={(h, label) => setHash(h ? { h, label } : null)} />
          {hash && (
            <div className="hash-result">
              <p>
                {hash.label}: <code className="hash">{toHex(hash.h)}</code>
              </p>
              <Act kind="primary" icon={UploadSimple} label="Zgłoś dostawę" caption="mark_delivered · podpisuje wykonawca" disabled={busy} onClick={deliver} />
            </div>
          )}
        </Card>
      )}
      {hasHash && (
        <Card icon={Fingerprint} title="Weryfikacja dostawy">
          <p>Wrzuć plik otrzymany od wykonawcy — porównamy jego hash z zapisanym on-chain.</p>
          <HashInput onHash={(h, label) => h && setCheck({ ok: toHex(h) === onChain, hex: toHex(h), label })} />
          {check && (
            <div className="hash-result">
              {check.ok ? (
                <b className="verdict ok"><CheckCircle size={20} weight="duotone" />Zgodny z hashem on-chain</b>
              ) : (
                <b className="verdict bad"><XCircle size={20} weight="duotone" />NIEZGODNY z hashem on-chain</b>
              )}{" "}
              <span className="muted">({check.label})</span>
              <div className="hash-line">
                <code className="hash" title={check.hex}>{check.hex}</code>
                <CopyIcon value={check.hex} label="Kopiuj hash" />
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
