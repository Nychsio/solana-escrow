# front.md — wszystko, czego potrzebuje zadanie frontendowe

Czytaj razem z `main.md` (architektura) i `plan.md` (ekrany). Ten plik jest źródłem prawdy dla frontendu.

## Cel
Pełny flow escrow z przeglądarki na devnecie, dwoma portfelami (klient i wykonawca). Każda transakcja kończy się linkiem do Solana Explorera.
Za to jest 25% oceny („Kompletność i działanie”). Design NIE jest oceniany: minimalny CSS, zero dopieszczania.

## Twarde zasady
- **Zero backendu i bazy danych.** Frontend czyta konta z chaina i buduje transakcje. O niczym nie decyduje.
- Program jest **zamrożony**: zero zmian w `programs/escrow`, bo upgrade kosztuje ~1,5 SOL, a portfel ma ~0,9.
- Brak klucza mint authority i jakichkolwiek kluczy prywatnych we froncie.
- Każda nowa biblioteka trafia do `AIcontext/decisions.md` (disclosure).
- Po zadaniu zaktualizuj `context.md` i `log.md`, potem commit i push.

## Stack (do potwierdzenia na starcie)
Propozycja: Vite + React + TypeScript + `@solana/wallet-adapter-react` (+ `-react-ui`, `-wallets`) + `@coral-xyz/anchor` lub klient zgodny z Anchor 1.1.2 (`@anchor-lang/core`, którego używają testy).
Folder `app/` (istnieje, pusty). Build statyczny, bez serwera.

## Dane devnet
| Co | Wartość |
|---|---|
| RPC | `https://api.devnet.solana.com` (ustawiane w env, np. `VITE_RPC_URL`) |
| Program ID | `6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8` |
| Testowy mint (SPL Token, 6 decimals) | `DeCDjMQm8CJY87Xga9upzC9WmJZsuipHCVqzz9ptTpH9` |
| Token program | klasyczny SPL Token (`TOKEN_PROGRAM_ID`) |
| Portfel demo: klient | `djfYNvotMgJY84yhnyNytx8gL5Xdt5CaKvRpZUs1abz` (`.demo-keys/client.json`, ma tokeny) |
| Portfel demo: wykonawca | `62Rw5b3iqsKLVWR4V48Q193PeTA1UkJ4954Rw32wg6EW` (`.demo-keys/freelancer.json`) |
| IDL | `target/idl/escrow.json`, typy: `target/types/escrow.ts` (skopiować do `app/src/idl/`) |

Do demo trzeba zaimportować oba klucze z `.demo-keys/` do Phantoma (import klucza prywatnego w base58). Potrzebny jest mały skrypt `scripts/export-keys.ts`, który wypisze base58. **Nie commitować wyniku.**
Mint authority ma portfel demo klienta, więc dolewanie tokenów robi `yarn demo:setup`, nie UI.

## Konto Escrow
PDA: `["escrow", client.pubkey, id.to_le_bytes() (u64, 8 B)]`.
Skarbiec (vault): **ATA** konta PDA escrow dla minta (`getAssociatedTokenAddressSync(mint, escrowPda, true)`).

Pola (dekodować przez IDL, nie ręcznie): `client, freelancer, mint, id, amount, deadline_ts, review_window_secs, delivered_at: Option<i64>, state, bump, deliverable_hash[32], dispute_window_secs, frozen_at, settle_proposer (0 brak / 1 klient / 2 wykonawca), settle_bps (u16), _reserved`.

Stany: `Funded, Delivered, Released, Refunded, Frozen, Settled, Burned`.

Lista umów, przez `getProgramAccounts` z filtrem memcmp:
- jako klient: offset **8** (po dyskryminatorze) = pubkey portfela,
- jako wykonawca: offset **40**.
- Offsetów za `delivered_at` NIE używać do filtrów, bo `Option` w Borsh ma zmienną długość.

## Instrukcje i konta
| Instrukcja | Argumenty | Podpisuje | Konta |
|---|---|---|---|
| `create` | `id: u64, amount: u64, deadline_ts: i64, review_window_secs: u64, dispute_window_secs: u64` | klient | client, freelancer, mint, client_token, escrow (init), vault (init ATA), token_program, associated_token_program, system_program |
| `mark_delivered` | `deliverable_hash: [u8;32]` | wykonawca | freelancer, escrow |
| `release` | — | klient | client, escrow, mint, vault, freelancer_token, token_program |
| `claim_if_silent` | — | wykonawca | freelancer, escrow, mint, vault, freelancer_token, token_program |
| `refund_if_late` | — | klient | client, escrow, mint, vault, client_token, token_program |
| `reject` | — | klient | client, escrow |
| `propose_settlement` | `freelancer_bps: u16` (0–10000) | klient LUB wykonawca (`signer`) | signer, escrow |
| `accept_settlement` | `freelancer_bps: u16` (= zapisany) | strona inna niż proponujący (`signer`) | signer, escrow, mint, vault, freelancer_token, client_token, token_program |
| `burn_if_unsettled` | — | ktokolwiek (`payer`) | payer, escrow, mint (mut), vault, token_program |

Przy Anchor 1.x z `resolution = true` część kont (PDA, programy) rozwiązuje się sama. Podać jawnie to, czego klient nie wyliczy.

**Konto tokenowe odbiorcy MUSI istnieć.** Przed `release`, `claim_if_silent`, `refund_if_late` i `accept_settlement` dodaj do tej samej transakcji `createAssociatedTokenAccountIdempotentInstruction` dla odbiorcy (przy ugodzie dla obu stron).

## Warunki czasowe (zegar on-chain decyduje)
- `mark_delivered`: Funded, now ≤ deadline_ts
- `release`: Funded lub Delivered
- `claim_if_silent`: Delivered, now > delivered_at + review_window_secs
- `refund_if_late`: Funded, now > deadline_ts
- `reject`: Delivered, now ≤ delivered_at + review_window_secs → Frozen (zapisuje frozen_at)
- `propose_settlement` i `accept_settlement`: Frozen, now ≤ frozen_at + dispute_window_secs
- `burn_if_unsettled`: Frozen, now > frozen_at + dispute_window_secs → Burned

Przyciski pokazuj według zegara przeglądarki. Jeśli program odrzuci transakcję, pokaż przetłumaczony błąd.

## Ekrany (szczegóły w plan.md)
1. **Start:** połącz portfel, plakietka devnet, ID programu z linkiem do Explorera.
2. **Moje umowy:** zakładki „Jako klient” i „Jako wykonawca”, wiersz: druga strona, kwota, stan, licznik.
3. **Nowa umowa:** adres wykonawcy, kwota (domyślny mint demo), termin, okno akceptacji (preset **2 min** do demo), okno sporu (preset **2 min** do demo); `id` = `Date.now()`.
4. **Szczegóły** `/escrow/<PDA>`: oś stanu, liczniki (termin, okno akceptacji, okno sporu), saldo skarbca, przyciski według macierzy, historia transakcji (`getSignaturesForAddress`) z linkami.
5. **Dostawa:** wykonawca wrzuca plik albo wkleja tekst, przeglądarka liczy SHA-256 (`crypto.subtle`), wynik idzie do `mark_delivered`. **Weryfikacja:** klient wrzuca plik i widzi ✅/❌ zgodności z hashem on-chain.
6. **Spór (na ekranie 4, stan Frozen):** suwak % dla wykonawcy → `propose_settlement`. Druga strona widzi propozycję → `accept_settlement`. Po oknie przycisk „Spal środki” → `burn_if_unsettled` (widoczny dla każdego).

## Macierz akcji
| Stan / czas | Klient | Wykonawca | Ktokolwiek |
|---|---|---|---|
| Funded, przed terminem | Zatwierdź (`release`) | Zgłoś dostawę | — |
| Funded, po terminie | Odzyskaj środki (`refund_if_late`) | — | — |
| Delivered, w oknie | Zatwierdź, Odrzuć (`reject`, potwierdzenie w oknie dialogowym) | — | — |
| Delivered, po oknie | Zatwierdź | Odbierz (`claim_if_silent`) | — |
| Frozen, w oknie sporu | Zaproponuj / Przyjmij propozycję wykonawcy | Zaproponuj / Przyjmij propozycję klienta | — |
| Frozen, po oknie | — | — | Spal (`burn_if_unsettled`) |
| Released / Refunded / Settled / Burned | — | — | — |

## Błędy programu → komunikaty PL
`InvalidAmount` kwota musi być > 0 · `DeadlineInPast` termin w przeszłości · `InvalidState` umowa nie jest w stanie, który na to pozwala · `Unauthorized` ten portfel nie jest stroną uprawnioną · `DeadlinePassed` termin dostawy minął · `DeadlineNotReached` termin jeszcze nie minął · `ReviewWindowOpen` okno akceptacji jeszcze trwa · `ReviewWindowClosed` okno akceptacji minęło · `NotDelivered` brak dostawy · `InvalidDisputeWindow` okno sporu musi być > 0 · `InvalidBps` udział max 100% · `DisputeWindowOpen` okno sporu jeszcze trwa · `DisputeWindowClosed` okno sporu minęło · `NoProposal` brak propozycji ugody · `ProposerCannotAccept` nie możesz przyjąć własnej propozycji · `SettlementMismatch` propozycja zmieniła się, odśwież.

## Wspólne elementy
- Toast po każdej transakcji: status i link `https://explorer.solana.com/tx/<sig>?cluster=devnet`.
- Kwoty w UI w tokenach (6 decimals), w transakcji w jednostkach bazowych.
- Skracanie adresów i kopiowanie po kliknięciu.

## Poza zakresem
Czat, powiadomienia, profile, wiele mintów, mobile, hosting z backendem, indeksowanie, zmiany w programie.

## Kryterium ukończenia (definition of done)
Na devnecie, z UI i dwoma portfelami w Phantomie, przeklikane:
1. create → mark_delivered (z plikiem) → weryfikacja hasha → release,
2. create → (termin mija) → refund_if_late,
3. create → mark_delivered → reject → propose → accept (lub burn po oknie).
Każdy krok ma link do Explorera. `anchor build` dalej przechodzi. Commit i push.

## Kolejność pracy (proponowana)
1. Szkielet `app/` + wallet adapter + odczyt jednej umowy po PDA (z demo:flow).
2. Nowa umowa + lista umów.
3. Akcje ścieżki szczęśliwej + toasty + Explorer.
4. Refund + reject + spór.
5. Hash pliku + weryfikacja.
6. Tłumaczenie błędów, porządki.
Po każdym działającym kroku commit.

## Po frontendzie (nie w tym zadaniu)
Odebranie upgrade authority (`solana program set-upgrade-authority 6KsiG… --final`), README, PDF, wideo, zgłoszenie.
