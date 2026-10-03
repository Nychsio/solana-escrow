import idl from "./idl/escrow.json";

// Program error codes -> Polish messages.
const PL: Record<string, string> = {
  InvalidAmount: "Kwota musi być większa od zera.",
  DeadlineInPast: "Termin jest w przeszłości.",
  InvalidState: "Umowa nie jest w stanie, który na to pozwala.",
  Unauthorized: "Ten portfel nie jest stroną uprawnioną.",
  DeadlinePassed: "Termin dostawy minął.",
  DeadlineNotReached: "Termin jeszcze nie minął (zegar on-chain).",
  ReviewWindowOpen: "Okno akceptacji jeszcze trwa (zegar on-chain).",
  ReviewWindowClosed: "Okno akceptacji minęło.",
  NotDelivered: "Brak dostawy.",
  InvalidDisputeWindow: "Okno sporu musi być większe od zera.",
  InvalidBps: "Udział maksymalnie 100%.",
  DisputeWindowOpen: "Okno sporu jeszcze trwa (zegar on-chain).",
  DisputeWindowClosed: "Okno sporu minęło.",
  NoProposal: "Brak propozycji ugody.",
  ProposerCannotAccept: "Nie możesz przyjąć własnej propozycji.",
  SettlementMismatch: "Propozycja się zmieniła, odśwież.",
  VaultNotEmpty: "Skarbiec nie jest pusty.",
};

type AnyErr = {
  message?: string;
  logs?: string[];
  transactionLogs?: string[];
  error?: { errorCode?: { code?: string } };
};

export function translateError(e: unknown): string {
  const err = (e ?? {}) as AnyErr;
  const code = err.error?.errorCode?.code;
  if (code && PL[code]) return PL[code];
  const text = [err.message ?? String(e), ...(err.logs ?? err.transactionLogs ?? [])].join("\n");
  for (const { name } of idl.errors) if (text.includes(`Error Code: ${name}`)) return PL[name];
  const hex = text.match(/custom program error: 0x([0-9a-f]+)/i);
  if (hex) {
    const found = idl.errors.find((x) => x.code === parseInt(hex[1], 16));
    if (found) return PL[found.name];
  }
  if (/reject/i.test(text) && /user|request/i.test(text)) return "Odrzucono w portfelu.";
  if (/insufficient (funds|lamports)|0x1\b/i.test(text)) return "Za mało środków (SOL na opłatę lub tokenów).";
  if (/blockhash not found|block height exceeded|expired/i.test(text)) return "Transakcja wygasła, spróbuj ponownie.";
  return text.slice(0, 300);
}
