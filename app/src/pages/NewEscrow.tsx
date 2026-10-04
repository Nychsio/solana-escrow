import { ArrowRight, Plus } from "@phosphor-icons/react";
import { Card, Hero } from "../components/ui";
import { BN } from "@anchor-lang/core";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { DEMO_MINT } from "../config";
import { fromBase, toBase } from "../format";
import { escrowPda, useChainNow, useProgram, vaultOf } from "../program";
import { useTx } from "../tx";

const REVIEW_PRESETS = [
  [120, "2 min (demo)"],
  [300, "5 min"],
  [86400, "24 h"],
  [3 * 86400, "3 dni"],
  [7 * 86400, "7 dni"],
] as const;
const EARLY_PRESETS = [
  [300, "5 min"],
  [86400, "24 h"],
  [3 * 86400, "3 dni"],
] as const;
const DISPUTE_PRESETS = [
  [120, "2 min (demo)"],
  [300, "5 min"],
  [86400, "24 h"],
  [3 * 86400, "3 dni"],
  [7 * 86400, "7 dni"],
] as const;

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm".
const toLocalInput = (unix: number) => {
  const d = new Date(unix * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function NewEscrow() {
  const program = useProgram();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { busy, run } = useTx();
  const now = useChainNow();
  const [freelancer, setFreelancer] = useState("");
  const [mint, setMint] = useState(DEMO_MINT.toBase58());
  const [amount, setAmount] = useState("10");
  const [deadline, setDeadline] = useState(() => toLocalInput(Math.floor(Date.now() / 1000) + 600));
  const [review, setReview] = useState(120);
  const [dispute, setDispute] = useState(120);
  const [bondPct, setBondPct] = useState("20");
  const [freezeWarn, setFreezeWarn] = useState(false);
  const [discountPct, setDiscountPct] = useState("0");
  const [earlyWindow, setEarlyWindow] = useState(300);
  const [balance, setBalance] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    try {
      const ata = getAssociatedTokenAddressSync(new PublicKey(mint), publicKey);
      connection
        .getTokenAccountBalance(ata)
        .then((b) => setBalance(b.value.uiAmountString ?? "0"))
        .catch(() => setBalance("0 (brak konta tokenowego)"));
    } catch {
      setBalance(null);
    }
  }, [publicKey, mint, connection]);

  // Warn when the mint has a freeze authority: its holder can freeze the vault.
  useEffect(() => {
    let alive = true;
    setFreezeWarn(false);
    (async () => {
      try {
        const key = new PublicKey(mint.trim());
        const info = await connection.getAccountInfo(key);
        if (!info) return;
        const m = await getMint(connection, key, "confirmed", info.owner);
        if (alive) setFreezeWarn(m.freezeAuthority !== null);
      } catch {
        /* not a mint (yet): no warning */
      }
    })();
    return () => {
      alive = false;
    };
  }, [mint, connection]);

  if (!publicKey)
    return (
      <div className="page">
        <Hero overline="Umowa escrow" lead="Połącz portfel zleceniodawcy, żeby utworzyć umowę.">Nowa umowa</Hero>
      </div>
    );

  const submit = async () => {
    setFormError(null);
    let freelancerPk: PublicKey, mintPk: PublicKey, amountBase: BN;
    const dpct = Number(discountPct.replace(",", "."));
    if (!Number.isFinite(dpct) || dpct < 0 || dpct > 10) return setFormError("Skonto: rabat musi być w zakresie 0–10%.");
    const earlyBps = Math.round(dpct * 100);
    if (earlyBps > 0 && earlyWindow > review) return setFormError("Okno skonta nie może być dłuższe niż okno akceptacji.");
    const pct = Number(bondPct.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return setFormError("Kaucja musi być w zakresie 0–100%.");
    try {
      freelancerPk = new PublicKey(freelancer.trim());
      mintPk = new PublicKey(mint.trim());
      amountBase = toBase(amount);
    } catch (e) {
      return setFormError((e as Error).message || "Nieprawidłowy adres");
    }
    const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
    if (deadlineTs <= now) return setFormError("Termin musi być w przyszłości.");
    const MAX = 90 * 86400;
    if (deadlineTs - now > MAX || review > MAX || dispute > MAX) return setFormError("Termin i okna nie mogą być dłuższe niż 90 dni.");
    if (review <= 0) return setFormError("Okno akceptacji musi być większe od zera.");
    if (freelancerPk.equals(publicKey)) return setFormError("Zleceniobiorca musi być innym portfelem niż zleceniodawca.");

    // id = timestamp in ms: unique per client, becomes part of the PDA seeds.
    const id = new BN(Date.now());
    const escrow = escrowPda(publicKey, id);
    const sig = await run("Utworzenie umowy (create)", () =>
      program.methods
        .create(id, amountBase, new BN(deadlineTs), new BN(review), new BN(dispute), Math.round(pct * 100), earlyBps, new BN(earlyBps > 0 ? earlyWindow : 0))
        .accountsPartial({
          client: publicKey,
          freelancer: freelancerPk,
          mint: mintPk,
          clientToken: getAssociatedTokenAddressSync(mintPk, publicKey),
          escrow,
          vault: vaultOf(mintPk, escrow),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()
    );
    if (sig) location.hash = `#/escrow/${escrow.toBase58()}`;
  };

  // Preview of the early-approval discount: what the client gets back.
  let earlyPreview = "";
  try {
    const amt = toBase(amount);
    const bps = Math.round(Number(discountPct.replace(",", ".")) * 100);
    const win = EARLY_PRESETS.find(([v]) => v === earlyWindow)?.[1] ?? `${earlyWindow} s`;
    if (bps > 0) earlyPreview = `Zatwierdzisz w ${win} od dostawy → odzyskujesz ${fromBase(amt.muln(bps).divn(10000))} z ${fromBase(amt)}`;
  } catch {
    /* invalid amount: no preview */
  }
  const plus = (secs: number) => setDeadline(toLocalInput(now + secs));

  return (
    <div className="page">
      <Hero overline="Umowa escrow" lead="Wpłacasz kwotę do skarbca. Wypłaty pilnuje program, nie platforma.">Nowa umowa</Hero>
      <div className="wrap content">
      <Card icon={Plus} title="Warunki umowy">
        <div className="fields">
          <label className="field">Adres zleceniobiorcy
            <input value={freelancer} onChange={(e) => setFreelancer(e.target.value)} />
          </label>
          <label className="field">Token (mint)
            <input value={mint} onChange={(e) => setMint(e.target.value)} />
            <small>Twoje saldo: {balance ?? "?"}</small>
            {freezeWarn && <small className="error">Emitent tokena może zamrozić skarbiec (np. USDC/Circle).</small>}
          </label>
          <label className="field">Kwota (w tokenach)
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <div className="field">
            <label>Termin dostawy
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
            <div className="row">
              <button onClick={() => plus(180)}>za 3 min (demo)</button>
              <button onClick={() => plus(600)}>za 10 min</button>
              <button onClick={() => plus(86400)}>za 24 h</button>
            </div>
          </div>
          <label className="field">Kaucja obu stron (% kwoty)
            <input type="number" min={0} max={100} step={1} value={bondPct} onChange={(e) => setBondPct(e.target.value)} />
            <small>Zleceniobiorca wpłaca ją przy akceptacji, zleceniodawca przy odrzuceniu. Kto ustąpi w sporze, traci swoją.</small>
            <small>Zarezerwuj środki na kaucję na wypadek odrzucenia.</small>
            {Number(bondPct) === 0 && <small className="error">Bez kaucji odrzucenie i porzucenie są darmowe.</small>}
          </label>
          <div className="field">
            <label>Skonto za szybkie zatwierdzenie (opcjonalnie) — rabat % kwoty (0–10)
              <input type="number" min={0} max={10} step={0.5} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
            </label>
            {Number(discountPct) > 0 && (
              <>
                <label>Okno skonta (od dostawy)
                  <select value={earlyWindow} onChange={(e) => setEarlyWindow(Number(e.target.value))}>
                    {EARLY_PRESETS.map(([v, l]) => <option key={v} value={v} disabled={v > review}>{l}{v > review ? " (dłuższe niż okno akceptacji)" : ""}</option>)}
                  </select>
                </label>
                <small>{earlyPreview}</small>
                <small>Skonto dotyczy tylko dostawy jawnej, nie zapieczętowanej.</small>
              </>
            )}
            <small>Zleceniobiorca musi zaakceptować to skonto razem z resztą warunków.</small>
          </div>
          <div className="field-pair">
            <label className="field">Okno akceptacji
              <select value={review} onChange={(e) => setReview(Number(e.target.value))}>
                {REVIEW_PRESETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="field">Okno sporu
              <select value={dispute} onChange={(e) => setDispute(Number(e.target.value))}>
                {DISPUTE_PRESETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>
        {formError && <p className="error">{formError}</p>}
        <div className="act">
          <button className="primary" disabled={busy} onClick={submit}>
            <Plus size={18} weight="bold" />{busy ? "Wysyłanie…" : "Utwórz i wpłać do skarbca"}<ArrowRight size={18} weight="bold" />
          </button>
          <span className="cap">create · podpisuje zleceniodawca</span>
        </div>
      </Card>
      </div>
    </div>
  );
}
