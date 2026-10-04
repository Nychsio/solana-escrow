import { CheckCircle, DownloadSimple, Fingerprint, LockKey, LockKeyOpen, UploadSimple, Warning, XCircle } from "@phosphor-icons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { toHex } from "../format";
import { stateOf, useProgram } from "../program";
import type { EscrowView } from "../pages/EscrowPage";
import {
  ZERO32,
  bytesEqual,
  cacheSealed,
  download,
  isZero,
  saveKey,
  sealBytes,
  sha256,
  unsealBytes,
  useCachedSealed,
} from "../seal";
import { useTx } from "../tx";
import { Act, Card, CopyIcon } from "./ui";

// File/text -> bytes -> SHA-256, all in the browser (Web Crypto). The file never leaves the machine;
// only a 32-byte fingerprint goes on-chain.
function HashInput({ onHash }: { onHash: (h: Uint8Array | null, label: string, bytes?: Uint8Array) => void }) {
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
            if (f) {
              const bytes = new Uint8Array(await f.arrayBuffer());
              onHash(await sha256(bytes), f.name, bytes);
            }
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
              const bytes = new TextEncoder().encode(text);
              onHash(await sha256(bytes), "tekst", bytes);
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

type Sealed = Awaited<ReturnType<typeof sealBytes>> & { name: string };

export function Delivery({ pda, esc, now, role, reload }: EscrowView) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const { busy, run, notify } = useTx();
  const pdaStr = pda.toBase58();
  const cached = useCachedSealed(pdaStr);
  const [mode, setMode] = useState<"sealed" | "open">("sealed");
  const [hash, setHash] = useState<{ h: Uint8Array; label: string } | null>(null);
  const [seal, setSeal] = useState<Sealed | null>(null);
  const [sealErr, setSealErr] = useState<string | null>(null);
  const [check, setCheck] = useState<{ ok: boolean; hex: string; label: string } | null>(null);
  const [decErr, setDecErr] = useState<string | null>(null);

  const state = stateOf(esc);
  const onChain = toHex(esc.deliverableHash);
  const hasHash = /[1-9a-f]/.test(onChain);
  const sealedOnChain = !isZero(esc.keyHash);
  const revealed = !isZero(esc.revealedKey);
  const canDeliver = role === "freelancer" && state === "accepted" && now <= esc.deadlineTs.toNumber();

  const markDelivered = (h: Uint8Array, keyHash: Uint8Array, label: string) =>
    run(`Zgłoszenie dostawy (mark_delivered): ${label}`, () =>
      program.methods
        .markDelivered(Array.from(h), Array.from(keyHash))
        .accountsPartial({ freelancer: publicKey!, escrow: pda })
        .rpc()
    );

  const deliverOpen = async () => {
    if (!hash || !publicKey) return;
    if (await markDelivered(hash.h, ZERO32, hash.label)) await reload();
  };

  const pickToSeal = async (f: File | undefined) => {
    setSealErr(null);
    setSeal(null);
    if (!f) return;
    try {
      const s = await sealBytes(new Uint8Array(await f.arrayBuffer()), f.name);
      setSeal({ ...s, name: f.name });
    } catch (ex) {
      console.error("seal", ex);
      setSealErr(`Nie udało się zaszyfrować pliku: ${(ex as Error).message ?? ex}`);
    }
  };

  // Downloads first (the .key file is the freelancer's only backup), then the transaction.
  const deliverSealed = async () => {
    if (!seal || !publicKey) return;
    download(seal.sealed, `${seal.name}.sealed`);
    download(seal.key, `${seal.name}.key`);
    saveKey(pdaStr, seal.key);
    if (await markDelivered(seal.hash, seal.keyHash, `${seal.name} (zapieczętowana)`)) await reload();
  };

  const decrypt = async (sealedBytes: Uint8Array) => {
    setDecErr(null);
    try {
      if (!bytesEqual(await sha256(sealedBytes), esc.deliverableHash)) {
        setDecErr("Ten plik nie pasuje do hasha dostawy zapisanego w umowie.");
        return;
      }
      const { name, data } = await unsealBytes(sealedBytes, Uint8Array.from(esc.revealedKey));
      download(data, name);
      notify({ ok: true, label: `Odszyfrowano: ${name}` });
    } catch (ex) {
      console.error("decrypt", ex);
      setDecErr((ex as Error).message);
    }
  };

  const showDeliver = canDeliver;
  const showVerify = hasHash;
  const showDecrypt = state === "released" && sealedOnChain && revealed && role === "client";
  if (!showDeliver && !showVerify && !showDecrypt) return null;
  return (
    <>
      {showDeliver && (
        <Card icon={mode === "sealed" ? LockKey : UploadSimple} title="Dostawa">
          <div className="tabs">
            <button className={mode === "sealed" ? "on" : ""} onClick={() => setMode("sealed")}>Zapieczętowana</button>
            <button className={mode === "open" ? "on" : ""} onClick={() => setMode("open")}>Jawna</button>
          </div>
          {mode === "sealed" ? (
            <>
              <p>Wybierz plik. Zaszyfrujemy go w przeglądarce (AES-256-GCM); na chain trafią tylko hashe. Zapłatę odbierzesz, ujawniając klucz.</p>
              <input type="file" onChange={(e) => { const input = e.target; pickToSeal(input.files?.[0]); input.value = ""; }} />
              {sealErr && <div className="error">{sealErr}</div>}
              {seal && (
                <div className="hash-result">
                  <p>
                    {seal.name}: <code className="hash" title={toHex(seal.hash)}>{toHex(seal.hash)}</code>
                  </p>
                  <p className="muted">Wyślij zleceniodawcy plik .sealed (i ewentualnie podgląd). Otworzy go dopiero po zapłacie.</p>
                  <p className="error"><Warning size={18} weight="duotone" /> Zapisz plik <b>.key</b>. Bez tego pliku nie odbierzesz zapłaty.</p>
                  <div className="row">
                    <button onClick={() => download(seal.sealed, `${seal.name}.sealed`)}><DownloadSimple size={18} weight="duotone" />.sealed</button>
                    <button onClick={() => download(seal.key, `${seal.name}.key`)}><DownloadSimple size={18} weight="duotone" />.key</button>
                  </div>
                  <Act kind="primary" icon={LockKey} label="Pobierz pliki i zgłoś dostawę" caption="mark_delivered · podpisuje zleceniobiorca" disabled={busy} onClick={deliverSealed} />
                </div>
              )}
            </>
          ) : (
            <>
              <p>Wybierz plik (albo wklej tekst/link). Na chain trafia tylko jego SHA-256, klient widzi pracę od razu.</p>
              <HashInput onHash={(h) => setHash(h ? { h, label: "jawna" } : null)} />
              {hash && (
                <div className="hash-result">
                  <p>
                    <code className="hash" title={toHex(hash.h)}>{toHex(hash.h)}</code>
                  </p>
                  <Act kind="primary" icon={UploadSimple} label="Zgłoś dostawę" caption="mark_delivered · podpisuje zleceniobiorca" disabled={busy} onClick={deliverOpen} />
                </div>
              )}
            </>
          )}
        </Card>
      )}
      {showVerify && (
        <Card icon={Fingerprint} title={sealedOnChain ? "Sprawdź plik .sealed" : "Weryfikacja dostawy"}>
          <p>
            {sealedOnChain
              ? "Wgraj otrzymany plik .sealed — porównamy jego hash z zapisanym on-chain. Zawartość odblokuje się, gdy zleceniobiorca ujawni klucz."
              : "Wrzuć plik otrzymany od zleceniobiorcy — porównamy jego hash z zapisanym on-chain."}
          </p>
          <HashInput
            onHash={(h, label, bytes) => {
              if (!h) return;
              const ok = toHex(h) === onChain;
              setCheck({ ok, hex: toHex(h), label });
              if (ok && bytes && sealedOnChain) cacheSealed(pdaStr, bytes);
            }}
          />
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
      {showDecrypt && (
        <Card icon={LockKeyOpen} title="Odszyfruj pracę">
          <p>Klucz został ujawniony w transakcji wypłaty. Odszyfrujemy plik w przeglądarce i pobierzesz go pod oryginalną nazwą.</p>
          {cached ? (
            <Act kind="primary" icon={DownloadSimple} label="Odszyfruj i pobierz" caption="lokalnie w przeglądarce, bez transakcji" onClick={() => decrypt(cached)} />
          ) : (
            <input
              type="file"
              onChange={async (e) => {
                const input = e.target;
                const f = input.files?.[0];
                try {
                  if (f) await decrypt(new Uint8Array(await f.arrayBuffer()));
                } finally {
                  input.value = "";
                }
              }}
            />
          )}
          {decErr && <div className="error">{decErr}</div>}
        </Card>
      )}
    </>
  );
}
