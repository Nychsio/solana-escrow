import { ArrowSquareOut, ArrowsClockwise, CheckCircle, X, XCircle } from "@phosphor-icons/react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { txUrl } from "./config";
import { translateError } from "./errors";

type Toast = { id: number; ok: boolean; info?: boolean; label: string; sig?: string; msg?: string };
type Ctx = { busy: boolean; run: (label: string, fn: () => Promise<string>) => Promise<string | null> };

const TxCtx = createContext<Ctx>(null as never);
export const useTx = () => useContext(TxCtx);

// Blockhash expired before the tx landed (e.g. slow wallet popup). A wallet rejection is NOT this.
const isExpired = (e: unknown) => {
  const x = e as { name?: string; message?: string };
  return (
    x?.name === "TransactionExpiredBlockheightExceededError" ||
    /block height exceeded|blockhash not found/i.test(x?.message ?? String(e))
  );
};

// Every transaction goes through `run`: one at a time, result shown as a toast with an Explorer link.
export function TxProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((l) => l.filter((x) => x.id !== id));
  // Success and "retrying" toasts vanish after 8 s; errors stay until closed. At most 3 are shown.
  const push = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [{ ...t, id }, ...l].slice(0, 3));
    if (t.ok) setTimeout(() => dismiss(id), 8000);
  };

  const run = useCallback(async (label: string, fn: () => Promise<string>) => {
    setBusy(true);
    try {
      let sig: string;
      try {
        sig = await fn();
      } catch (e) {
        if (!isExpired(e)) throw e;
        // One retry: .rpc() fetches a fresh blockhash and the wallet asks for a new signature.
        console.warn(label, "blockhash expired, retrying", e);
        push({ ok: true, info: true, label: `Ponawiam… (${label})`, msg: "Transakcja wygasła, podpisz ponownie w portfelu." });
        sig = await fn();
      }
      push({ ok: true, label, sig });
      return sig;
    } catch (e) {
      console.error(label, e);
      push({ ok: false, label, msg: translateError(e) });
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <TxCtx.Provider value={{ busy, run }}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.info ? "info" : t.ok ? "ok" : "err"}`}>
            <span className="toast-badge">
              {t.info ? (
                <ArrowsClockwise className="spin" size={18} weight="bold" />
              ) : t.ok ? (
                <CheckCircle size={18} weight="bold" />
              ) : (
                <XCircle size={18} weight="bold" />
              )}
            </span>
            <div className="toast-body">
              <b>{t.label}</b>
              {t.msg && <div>{t.msg}</div>}
              {t.sig && (
                <a href={txUrl(t.sig)} target="_blank" rel="noreferrer">
                  Zobacz w Explorerze
                  <ArrowSquareOut size={16} weight="duotone" />
                </a>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Zamknij"><X size={16} weight="bold" /></button>
          </div>
        ))}
      </div>
    </TxCtx.Provider>
  );
}
