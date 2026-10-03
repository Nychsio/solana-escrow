# plan.md — jak wygląda aplikacja

Frontend tylko czyta konta z chaina i buduje transakcje. Nie ma backendu ani bazy danych, a o każdej zmianie stanu decyduje program.

## Role
- **Klient**: tworzy umowę, wpłaca środki, zatwierdza lub odrzuca dostawę, odzyskuje środki po terminie.
- **Wykonawca**: zgłasza dostawę i odbiera wypłatę, gdy klient milczy.
Rolę wyznacza podłączony portfel: porównujemy go z `escrow.client` i `escrow.freelancer`. Brak logowania i kont.

## Ekrany

### 1. Start
- Przycisk „Połącz portfel” (Wallet Adapter: Phantom, Solflare).
- Plakietka **devnet** i ID programu z linkiem do Explorera (dowód dla jury, że logika jest on-chain).

### 2. Moje umowy
- Dwie zakładki: **Jako klient** / **Jako wykonawca**.
- Dane z `getProgramAccounts` z filtrem `memcmp` po polu `client` (offset 8) albo `freelancer` (offset 40).
- Wiersz: druga strona (skrócony adres), kwota, stan, najbliższy termin z odliczaniem.
- Przycisk „Nowa umowa”.

### 3. Nowa umowa (klient)
Pola:
- adres wykonawcy,
- token (domyślnie testowy mint z demo),
- kwota,
- termin dostawy (data i godzina),
- okno akceptacji (presety: 2 min do demo, 24 h, 3 dni, 7 dni).
`id` generuje frontend (np. timestamp). Wysyłka tworzy umowę przez `create`, po czym przechodzi do ekranu 4 z linkiem do transakcji.

### 4. Szczegóły umowy (główny ekran)
Adres URL: `/escrow/<adres PDA>`. Ten link klient wysyła wykonawcy.
- **Oś stanu:** Funded → Delivered → Released, z rozgałęzieniami Refunded i Frozen.
- **Liczniki:** do terminu dostawy (`deadline_ts`) i do końca okna akceptacji (`delivered_at + review_window_secs`).
- **Saldo skarbca** pobrane na żywo z konta tokenowego.
- **Hash dostawy**, gdy jest zapisany.
- **Przyciski akcji** według tabeli niżej. Pokazujemy tylko akcje dostępne dla roli i stanu.
- **Historia transakcji** umowy z linkami do Explorera.

### 5. Dostawa (wykonawca, na ekranie 4)
- Wykonawca wrzuca plik albo wkleja tekst lub link. SHA-256 liczy przeglądarka, plik nigdzie nie wychodzi.
- Akcja `mark_delivered(hash)`.
- **Weryfikacja (klient):** klient wrzuca plik otrzymany od wykonawcy, a aplikacja porównuje jego hash z zapisanym on-chain i pokazuje ✅/❌. To dowód, *co* zostało dostarczone, bez pośrednika.

## Akcje według roli i stanu
| Stan | Klient | Wykonawca |
|---|---|---|
| Funded, przed terminem | Zatwierdź i wypłać (`release`) | Zgłoś dostawę (`mark_delivered`) |
| Funded, po terminie | Odzyskaj środki (`refund_if_late`) | — (pokaż: „termin minął”) |
| Delivered, w oknie | Zatwierdź (`release`), Odrzuć (`reject`) | — (licznik okna) |
| Delivered, po oknie | Zatwierdź (`release`) | Odbierz wypłatę (`claim_if_silent`) |
| Released / Refunded | — | — |
| Frozen | zależy od D1 | zależy od D1 |

- `reject` wymaga potwierdzenia w oknie dialogowym z ostrzeżeniem, że środki zostaną zamrożone.
- Przyciski wyświetlamy według zegara przeglądarki, ale rozstrzyga zegar on-chain. Jeśli program odrzuci transakcję, pokazujemy czytelny komunikat zamiast surowego błędu.
- Każda wypłata dokłada w tej samej transakcji `createAssociatedTokenAccountIdempotent` dla odbiorcy, bo program wymaga istniejącego konta tokenowego.

## Wspólne elementy UI
- Toast po każdej transakcji: status i link do Explorera.
- Tłumaczenie kodów błędów programu (`InvalidState`, `Unauthorized`, …) na zdania po polsku.
- Adresy skracane, z kopiowaniem po kliknięciu.

## Poza aplikacją (skrypt demo, nie UI)
- Utworzenie testowego minta i rozdanie tokenów dwóm portfelom. Klucz mint authority nie może trafić do frontendu.
- Airdrop SOL na devnecie.

## Otwarte decyzje
- **D1 — Frozen:** A) zamrożenie jest ostateczne albo B) ugoda dwustronna. Przy B dochodzi panel ugody na ekranie 4: jedna strona proponuje podział (suwak %), druga akceptuje (`propose_settlement` / `accept_settlement`).
- **D2 — stack:** propozycja Vite + React + TS + `@solana/wallet-adapter` + klient Anchor z IDL. Hosting statyczny (np. Vercel lub GitHub Pages) albo tylko lokalnie do demo.
- **Wygląd:** design nie jest oceniany, więc minimalny CSS lub gotowa biblioteka komponentów.

## Poza zakresem
Czat, powiadomienia, profile, oceny, wiele tokenów naraz, mobile, backend do indeksowania.
