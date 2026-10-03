# context.md — stan pracy

## Zrobione
- Wybór use case'u i architektury (patrz main.md)
- Zadanie 1: szkielet repo (Anchor 1.1.2) + konto `Escrow` + instrukcja `create` + testy
- Zadanie 2: `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject`, stan `Frozen`, pola `deliverable_hash` i `_reserved`; `anchor build` i `anchor test` przechodzą (14 testów)
- Repo publiczne: https://github.com/Nychsio/solana-escrow

## W toku
- brak

## Następne
- Zadanie 3: deploy na devnet, odebranie upgrade authority

## Blokery
- brak

## Uwagi
- Keypair programu jest tylko lokalnie w `target/deploy/escrow-keypair.json` (poza gitem). Bez niego nie da się wdrożyć pod obecnym ID programu.
- Konto tokenowe odbiorcy wypłaty musi istnieć przed `release` / `claim_if_silent` / `refund_if_late` (frontend ma je utworzyć w tej samej transakcji).
- Środki w stanie `Frozen` są dziś zablokowane na stałe; po odebraniu upgrade authority nie da się już dodać rozstrzygania sporów do tego samego programu. Do decyzji przed zadaniem 3.
- Konta nie są zamykane (rent zostaje w kontach `Escrow` i skarbcach).
