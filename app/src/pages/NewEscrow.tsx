import { ArrowRight, Plus } from "@phosphor-icons/react";
import { Card, Hero } from "../components/ui";
import { BN } from "@anchor-lang/core";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { DEMO_MINT } from "../config";
import { toBase } from "../format";
import { escrowPda, useChainNow, useProgram, vaultOf } from "../program";
import { useTx } from "../tx";

const REVIEW_PRESETS = [
  [120, "2 min (demo)"],
  [300, "5 min"],
  [86400, "24 h"],
  [3 * 86400, "3 dni"],
  [7 * 86400, "7 dni"],
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

  if (!publicKey)
    return (
      <div className="page">
        <Hero overline="Umowa escrow" lead="Połącz portfel klienta, żeby utworzyć umowę.">Nowa umowa</Hero>
      </div>
    );

  const submit = async () => {
    setFormError(null);
    let freelancerPk: PublicKey, mintPk: PublicKey, amountBase: BN;
    try {
      freelancerPk = new PublicKey(freelancer.trim());
      mintPk = new PublicKey(mint.trim());
      amountBase = toBase(amount);
    } catch (e) {
      return setFormError((e as Error).message || "Nieprawidłowy adres");
    }
    const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
    if (deadlineTs <= now) return setFormError("Termin musi być w przyszłości.");
    if (freelancerPk.equals(publicKey)) return setFormError("Wykonawca musi być innym portfelem niż klient.");

    // id = timestamp in ms: unique per client, becomes part of the PDA seeds.
    const id = new BN(Date.now());
    const escrow = escrowPda(publicKey, id);
    const sig = await run("Utworzenie umowy (create)", () =>
      program.methods
        .create(id, amountBase, new BN(deadlineTs), new BN(review), new BN(dispute))
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

  const plus = (secs: number) => setDeadline(toLocalInput(now + secs));

  return (
    <div className="page">
      <Hero overline="Umowa escrow" lead="Wpłacasz kwotę do skarbca. Wypłaty pilnuje program, nie platforma.">Nowa umowa</Hero>
      <Card icon={Plus} title="Warunki umowy">
        <div className="fields">
          <label className="field">Adres wykonawcy
            <input value={freelancer} onChange={(e) => setFreelancer(e.target.value)} />
          </label>
          <label className="field">Token (mint)
            <input value={mint} onChange={(e) => setMint(e.target.value)} />
            <small>Twoje saldo: {balance ?? "?"}</small>
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
          <span className="cap">create · podpisuje klient</span>
        </div>
      </Card>
    </div>
  );
}
