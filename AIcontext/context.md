# context.md — stan pracy

## Zrobione
- Wybór use case'u i architektury (patrz main.md)
- Zadanie 1: szkielet repo (Anchor 1.1.2) + konto `Escrow` + instrukcja `create` + testy
- Zadanie 2: `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject`, stan `Frozen`
- Zadanie 3: spór bez arbitra: `propose_settlement`, `accept_settlement`, `burn_if_unsettled`, stany `Settled` i `Burned`, nowy argument `dispute_window_secs` w `create`, `frozen_at` w `reject`
- Zadanie 5: decay w `accept_settlement` (burn `saldo*elapsed/dispute_window_secs` przed podziałem, `mint` jest `mut`) i nowa instrukcja `close_escrow` (zamyka skarbiec i konto, rent do klienta); `anchor build` i `anchor test` zielone (33 testy); program na devnecie = main (potwierdzone `cmp` zrzutu `solana program dump` z `target/deploy/escrow.so`, 2026-10-03)
- Zadanie 5b: front na nowym IDL (`app/src/idl/`), podgląd spalenia decay w panelu sporu, przycisk `close_escrow` dla klienta (stany końcowe, skarbiec 0), tłumaczenie `VaultNotEmpty`; `yarn demo:flow` na devnecie przeszedł na nowej wersji programu
- Repo publiczne: https://github.com/Nychsio/solana-escrow
- Deploy na devnet (2026-10-03): program `6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8`, https://explorer.solana.com/address/6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8?cluster=devnet; skrypty demo (`yarn demo:setup`, `yarn demo:flow`) przeszły, 3 transakcje finalized (linki w README)

- Zadanie 4 (kod): frontend `app/` (Vite + React + TS + Wallet Adapter + @anchor-lang/core 1.1.2): lista umów (memcmp 8/40), nowa umowa, szczegóły `#/escrow/<PDA>`, wszystkie akcje wg macierzy z front.md (release, claim_if_silent, refund_if_late, reject, propose/accept_settlement, burn_if_unsettled), hash SHA-256 pliku + weryfikacja, toasty z Explorerem, błędy programu po polsku. `scripts/export-keys.ts` (`yarn demo:keys`).
- Weryfikacja bez devnetu (sandbox nie ma dostępu do RPC devnetu): `tsc` + `vite build` czyste; test w headless Chromium z atrapą RPC i portfela: dekodowanie konta, macierz przycisków dla 9 przypadków, transakcje create/refund/accept podpisane i wysłane (kolejność kont i dyskryminatory zgodne z IDL, ATA idempotent przed wypłatą), tłumaczenie błędu `InvalidState`.

## W toku
- Zadanie 4: przeklikanie 3 ścieżek na devnecie dwoma Phantomami (kryterium ukończenia) — robi Piotr lokalnie

## Następne
- Frontend, potem code freeze i odebranie upgrade authority
- Decyzja o wariancie decay w sporze (patrz sekcja Research)

## Blokery
- Brak.

## Zadanie 13: dwie poprawki logiki, ostatnia zmiana programu przed --final (2026-10-04)
- Program (commit `145124a`): (1) `cancel_by_freelancer` z `Approved` oddaje klientowi całe saldo razem z kaucją wykonawcy; (2) `claim_with_key` nigdy nie płaci skonta, `release` zapieczętowanej tylko zatwierdza (`Approved.early = false`). `anchor test`: 94 zielone (zaktualizowane testy: cancel z `Approved`, skonto dla zapieczętowanej = 0; usunięty test spóźnionego klucza, który stracił sens).
- **IDL bez zmian:** sha256 `target/idl/escrow.json` przed i po `30c8ae116faece9825dd981fc4251000ff4a386eac9db35c3017fcb6e881c2a8` (identyczny z `app/src/idl/escrow.json`), `target/types/escrow.ts` `f380379d221ad864de462c8fde0316f0e5c5ee11b43d2cd0e9eb7f61b7b0f04c` przed i po. Komentarze `///` przy polach i kontach celowo nie zmienione (trafiają do IDL), więc opisy `Approved.early` i `ClaimWithKey.client_token` w IDL są lekko nieaktualne.
- Devnet = kod z `145124a`: slot upgrade'u 507208468, authority bez zmian (NIE odebrane), **bez `extend`** (`.so` 393 920 B < konto 396 792 B), pierwsze 393 920 B zrzutu = `target/deploy/escrow.so`, reszta zera, brak osieroconych buforów.
- Saldo portfela dev: **przed 2,383046 SOL**, po upgrade'ie 2,380961 (koszt tylko opłaty, bufor zwrócony), po demo 2.380950982 SOL.
- `demo:sealed` i `demo:early` przeszły na devnecie (11 transakcji `finalized`, linki w README, wiersze e i f); ścieżek a–d ta łatka nie dotyka, ich linki z wcześniejszego wydania v2.3 zostały.
- main.md: ostrzeżenie, że nieudana `claim_with_key` też publikuje klucz (preflight, nie na granicy terminu); skonto tylko dla dostawy jawnej z powodem; sekcja „Co dalej” (kaucja klienta w `create`).
- **Front może zostać na IDL v2.3** (interfejs bez zmian); zmieniło się tylko zachowanie: cancel z `Approved` zabiera wykonawcy kaucję (UI powinno to ostrzegać), a skonto dla zapieczętowanej nie występuje (UI nie powinno go obiecywać).

## Zadanie 12: skonto, v2.3 (2026-10-04)
- Program (commit `559271e`): `early_discount_bps`/`early_window_secs` w koncie (z `_reserved`, rozmiar 307 B bez zmian), nowe argumenty `create` (na końcu) i `accept_job` (`expected_early_*`), skonto liczone tylko od `amount`, wypłacane klientowi w `release` (dostawa jawna w oknie) lub w `claim_with_key` (zapieczętowana, z `approved_at` vs `delivered_at`); nowe konto `client_token` w obu; nowy błąd `InvalidDiscount`; zdarzenia: `Released.discount`, `KeyRevealed.discount`, `Approved.early`. `anchor test`: 95 zielonych (86 + 9 nowych).
- Devnet = v2.3 (kod z `559271e`): slot upgrade'u 507203791, authority bez zmian (NIE odebrane), konto programu 396 792 B (jawny `extend` o 14 512 B przed deployem), pierwsze 394 744 B zrzutu = `target/deploy/escrow.so`, reszta zera, brak osieroconych buforów. Upgrade przeszedł za pierwszym podejściem.
- Saldo portfela dev: **przed 2,461092 SOL**, po `extend` 2,387367, po upgrade'ie 2,383071 (koszt netto ok. 0,078 SOL: rent rozszerzenia 0,074 plus opłaty, bufor zwrócony), po demo 2.383046376 SOL.
- Demo v2.3 na devnecie, 30 transakcji `finalized` (linki w README): nowe `demo:early` (skonto 2% = 2 tokeny ze 100, wykonawca netto 98) i `demo:sealed` w formacie `.sealed` z aplikacji webowej (hash całego pliku zgodny z `deliverable_hash`), oraz `demo:flow`, `demo:dispute`, `demo:cancel`, `demo:ghost`. Pierwsze uruchomienie czterech ostatnich padło na `insufficient funds` w `create`: klient demo wyczerpał testowe tokeny (nie błąd programu); `yarn demo:setup` dobija je do 1000.
- **FRONT NADAL NA STAREJ WERSJI** IDL (v2.2): nowe argumenty `create` i `accept_job`, nowe konto `client_token` w `release` i `claim_with_key`, nowe pola konta i eventów. Pełna lista różnic w wiadomości "IDL gotowy".

## Zadanie 11: zapieczętowana dostawa, v2.2 (2026-10-04)
- Program (commit `7745c0d`): `mark_delivered(deliverable_hash, key_hash)`, `release` na zapieczętowanej tylko zatwierdza (stan `Approved`), nowe `claim_with_key(key)` i `refund_unrevealed`, `claim_if_silent` odrzuca zapieczętowaną (`SealedDeliveryUseKey`), `cancel_by_freelancer` przyjmuje `Approved`. Nowe błędy `InvalidKey`, `SealedDeliveryUseKey`, `NotSealed`; nowe zdarzenia `Approved`, `KeyRevealed` (i `key_hash` w `Delivered`). Konto 307 B (było 235 B). `anchor test`: 86 zielonych.
- Przed upgrade'em zamknięto 5 otwartych kont `Escrow` na devnecie (wszystkie na portfelach demo `djfY…`/`62Rw…`; 4 końcowe i jedno `Frozen` z 10 testowymi tokenami, zamknięte przez `cancel_by_freelancer`, tokeny wróciły do klienta demo), skrypt `scripts/close-open-escrows.ts`. Na devnecie 0 kont `Escrow` przed upgrade'em.
- Devnet = v2.2 (kod z `7745c0d`): slot upgrade'u 507197869, authority bez zmian (NIE odebrane), konto programu 382 280 B (extend o 10 240 B), pierwsze 376 400 B zrzutu = `target/deploy/escrow.so`, reszta zera, brak osieroconych buforów, IDL w metadanych zaktualizowane.
- **Incydent przy upgrade'ie:** mój `extend` o 6 408 B został odrzucony (loader wymaga co najmniej 10 240 B), a `anchor deploy` zdążył zapisać bufor `H5Mpkj…` (1,913 SOL) i padł na auto-extend; program na devnecie pozostał nietknięty. Zawartość bufora zweryfikowałem `cmp` z `.so`, zrobiłem `extend` o 10 240 B i upgrade z bufora (`solana program upgrade`), co zwróciło 1,9 SOL.
- Saldo portfela dev: **przed 2,518892 SOL**, po nieudanym deployu (bufor) 0,603991, po `extend` 0,551967, po upgrade'ie z bufora 2,464912, po `anchor idl upgrade` 2,461092, po demo 2.461092469 SOL (koszt netto upgrade'u ok. 0,058 SOL: rent rozszerzenia 0,052 plus opłaty).
- Demo v2.2 na devnecie, 28 transakcji `finalized` (linki w README): `demo:sealed` (nowe: AES-256-GCM, klucz czytany z konta, odszyfrowanie identyczne z oryginałem), `demo:flow`, `demo:dispute`, `demo:cancel`, `demo:ghost`.
- **FRONT NADAL NA STAREJ WERSJI** IDL: nowe argumenty `mark_delivered`, nowe instrukcje `claim_with_key` i `refund_unrevealed`, nowy stan `Approved`, nowe pola konta, więc transakcje frontu na devnecie są odrzucane. Pełna lista różnic w wiadomości "IDL gotowy".

## Zadanie 10: escrow v2.1, łatki po audycie (2026-10-04)
- Commity (każdy z zielonym `anchor test`): 1 `7bcafcf` (usunięte rewizje), 2 `b4af9c1` (`accept_job` wiąże warunki, `TermsMismatch`), 3 `af91d94` (porzucenie po terminie traci kaucję), 4 `99c8a07` (`release` z `Frozen` = ustąpienie klienta, `cancel_by_freelancer` z `Frozen` = ustąpienie wykonawcy, `Released.conceded`), 5 `0bcffd8` (limity w `create`: `SameParty`, `WindowTooLong`, `InvalidReviewWindow`), 6 `b0bd804` (komentarze, main.md, README). `anchor test`: 75 zielonych.
- Devnet = v2.1 (kod z `b0bd804`): upgrade w slocie 507185326, **bez `extend`** (nowy `.so` 364 816 B mieści się w koncie 372 040 B), authority bez zmian (NIE odebrane), brak osieroconych buforów. Pierwsze 364 816 B zrzutu = `target/deploy/escrow.so`, reszta zera.
- Saldo portfela dev: **przed 2,522249 SOL**, po upgrade'ie 2,518892 (koszt ok. 0,0034 SOL: tylko opłaty, bufor zwrócony), po demo 2.518891636 SOL.
- Demo v2.1 na devnecie, 21 transakcji `finalized` (linki w README): `demo:flow` (teraz z `close_escrow`), `demo:ghost`, `demo:dispute` (spalone 43,3%), `demo:cancel`. `demo:revision` usunięte razem z rewizjami. Pierwsze uruchomienie `demo:flow` (umowa G1XEpomt…) przeszło na łańcuchu, ale skrypt padł na odczycie zamkniętego konta (błąd kolejności w skrypcie, poprawiony); umowa jest zamknięta.
- **FRONT NADAL NA STAREJ WERSJI**: `app/src/idl/` ma IDL v1+cancel (sprzed P5), więc jego transakcje na devnecie są odrzucane (inne argumenty `create`, inne konta, nowe instrukcje). Pełna lista różnic w wiadomości "IDL gotowy".
- Jawne ograniczenia v2.1: `freeze_authority` minta (np. USDC, Circle) nie blokuje `create`; program nie rozstrzyga, kto ma rację (patrz main.md, odpowiedzi dla jury).

## Zadanie 8: escrow v2 (2026-10-04)
- Etapy (każdy: zielony `anchor test` + osobny commit): P1 `322a71c` (walidacja minta, burn dustu w close), P2 `36c9987` (accept_job, withdraw, kaucje, reject/cancel z kaucjami), P3 `291fe14` (permissionless claim_if_silent i refund_if_late), P4 `7d0e076` (request_revision), P5 `321084d` (13 zdarzeń). `anchor test`: 71 zielonych.
- Konto Escrow: rozmiar bez zmian (235 B), nowe pola z `_reserved` (45 -> 27): bond_amount, max_revisions, revisions_used, revision_window_secs. Nowy stan `Accepted` na końcu enuma.
- Devnet = escrow v2 (commit `321084d`): `extend` o 47 944 B (konto 324 096 -> 372 040 B), upgrade w slocie 507178209, authority bez zmian (NIE odebrane), brak osieroconych buforów. Pierwsze 369 992 B zrzutu = `target/deploy/escrow.so` (reszta zera).
- Saldo portfela dev: **przed 2,823958 SOL**, po `extend` 2,580397, po upgrade'ie 2,572254 (koszt netto ok. 0,25 SOL: rent rozszerzenia 0,243 plus opłaty; bufor zwrócony), po wszystkich demo i sprzątaniu 2.522249483 SOL.
- Demo v2 na devnecie, 28 transakcji `finalized` (linki w README): `demo:flow`, `demo:ghost` (refund_if_late wywołany przez trzeci portfel `cranker`), `demo:dispute` (spalone 38,3% przy ugodzie), `demo:cancel`, `demo:revision`. Umowy z demo:flow, demo:revision i pierwsza próba demo:ghost zamknięto jednorazowo (`close_escrow`), więc devnet nie trzyma rentu po demo.
- **FRONT MUSI PRZEJŚĆ NA NOWY IDL**: zmieniły się argumenty `create`, konta w `reject`, `cancel_by_freelancer`, `claim_if_silent`, `refund_if_late`, `close_escrow` oraz doszły instrukcje `accept_job`, `withdraw`, `request_revision` i stan `Accepted`. Dopóki `app/` używa starego IDL, jego transakcje na devnecie będą odrzucane (stary `create` ma 5 argumentów, nowy 8). Pełna lista zmian w wiadomości "IDL gotowy" na końcu zadania i w `front.md`.
- Jawne ograniczenia v2: `freeze_authority` minta nie blokuje `create`; mint Token-2022 z rozszerzeniem spoza białej listy jest odrzucany.

## Zadanie 6: cancel_by_freelancer (2026-10-04)
- Program: `cancel_by_freelancer` (wykonawca, Funded/Delivered/Frozen, cała zawartość skarbca → klient bez burn, czyści propozycję, stan Refunded); layout konta bez zmian. `anchor test`: 40 zielonych (33 + 7 nowych). Front: przycisk dla wykonawcy z potwierdzeniem w UI, etykieta „Rezygnacja wykonawcy” w historii, IDL i typy w `app/src/idl/` bajt w bajt z buildem; `tsc` i `vite build` czyste.
- Devnet = main (commit `c454642`): `solana program extend` o 12 120 B (konto 311 976 → 324 096 B, `.so` 322 048 B), upgrade w slocie 507167004, authority bez zmian (NIE odebrane). `solana program dump` vs `target/deploy/escrow.so`: pierwsze 322 048 B identyczne, reszta to zera. Brak osieroconych buforów.
- Saldo portfela dev: **przed 2,888178 SOL**, po `extend` 2,826603, po upgrade'ie 2,823958 (koszt netto ok. 0,064 SOL: rent rozszerzenia 0,0615 plus opłaty), po `demo:cancel` 2,823958 (płaci klient demo).
- `yarn demo:cancel` na devnecie: 4 transakcje `finalized` (linki w README): create → mark_delivered → cancel_by_freelancer → close_escrow. Klient 479,300002 → 479,300002 tokenów (odzyskał całe 100), supply bez zmian (zero burn), rent zwrócony 3 373 120 lamportów (netto 3 368 120).
- Upgrade poszedł przez Helius RPC z `app/.env` (publiczny RPC devnetu zwracał 429); klucz nie trafił do gita, configu CLI ani logów.

## Upgrade na devnecie (2026-10-03, na znak Piotra)
- Devnet = kod z `d8a5207` (decay w `accept_settlement`, `close_escrow`). Bajty programu na łańcuchu mają ten sam SHA-256 co `target/deploy/escrow.so` (`ce8b5d79…260c`); program ma 311 976 B (było 291 952 B, `solana program extend` o 20 024 B).
- Upgrade authority nadal przy portfelu dev `2uKvpTL9ErJLNaL1HYa3oMfFBECNZQVQDpqqdUySKx3a` (NIE odebrane). Slot upgrade'u 507079159.
- Saldo portfela dev: **przed 3,396482 SOL**, po `extend` 3,294755, po upgrade'ie 3,291586 (koszt netto ok. 0,105 SOL: rent rozszerzenia 0,1017 plus opłaty; bufor zwrócony), po `demo:flow` i `demo:dispute` 3,288188 SOL. Brak osieroconych buforów.
- `yarn demo:flow` i `yarn demo:dispute` przeszły na devnecie: 3 + 6 transakcji `finalized` (linki w README). W sporze accept po ok. 23 s z okna 60 s spalił 38,3% (38,333333 ze 100 tokenów), reszta podzielona 70/30 (43,166666 / 18,500001), `close_escrow` zwrócił 3 373 120 lamportów rentu (netto 3 368 120 po opłacie 5000).
- Frontend (`cf98649`) ma już nowy IDL i typy w `app/src/idl/` (zgodne bajt w bajt z buildem).

## Devnet: portfel i upgrade authority
- Portfel deweloperski `2uKvpTL9ErJLNaL1HYa3oMfFBECNZQVQDpqqdUySKx3a` = upgrade authority programu (NIE odebrane, do code freeze). Klucz w `~/.config/solana/id.json`, poza gitem.
- Saldo: 2,5 SOL przed deployem, 1,0006 SOL po deployu, 0,8965 SOL po `demo:setup` i `demo:flow`. Deploy kosztował ok. 1,5 SOL (rent konta programu 1,484 SOL).
- Portfele demo i mint w `.demo-keys/` (w .gitignore): client `djfYNvotMgJY84yhnyNytx8gL5Xdt5CaKvRpZUs1abz`, freelancer `62Rw5b3iqsKLVWR4V48Q193PeTA1UkJ4954Rw32wg6EW`, mint `DeCDjMQm8CJY87Xga9upzC9WmJZsuipHCVqzz9ptTpH9`. Utrata `.demo-keys/` = nowe portfele i mint przy kolejnym `demo:setup`.
- Faucet devnetu bywa wyczerpany (429); kolejny deploy/upgrade potrzebuje SOL na buffer.

## Uwagi
- Keypair programu jest tylko lokalnie w `target/deploy/escrow-keypair.json` (poza gitem). Bez niego nie da się wdrożyć pod obecnym ID programu.
- Konta tokenowe odbiorców (klienta i wykonawcy) muszą istnieć przed wypłatą/ugodą (frontend ma je utworzyć w tej samej transakcji).
- Spalenie jest nieodwracalne; dla mintów z uprawnieniem do spalania/zamrażania (np. Token-2022 z permanent delegate) strona trzecia mogłaby ingerować w skarbiec. Warto ograniczyć mint w UI/dokumentacji do zwykłych SPL.
- Konta zamyka `close_escrow` (po zakończeniu umowy i opróżnieniu skarbca).
- `create` zmienił sygnaturę (nowy ostatni argument); klienci muszą go przekazywać.

## Research: spór bez arbitra (2026-10-03)
- Problem: `reject` -> `Frozen` blokuje środki na zawsze, klient może grieferować. Trzeba wyjścia bez arbitra/oracle/admina.
- Kleros, UMA, Aragon, Reality.eth odpadają: pośrednik rozproszony na posiadaczy tokenów. Odpowiedź dla jury "czemu nie Kleros".
- Podstawa: Asgaonkar & Krishnamachari 2019 (dual-deposit escrow bez zaufanego pośrednika), Bisq (time-locked payout + spalenie), Rubinstein (alternating offers, koszt zwłoki).
- Kierunek: `propose_settlement` / `accept_settlement` w oknie sporu, po oknie publiczny `burn_if_unsettled`.
- Dziura (first-mover): po burn obie strony = 0, więc klient po `reject` proponuje ~1 bps dla wykonawcy i wykonawca musi przyjąć. Griefing się opłaca.
- Wariant decay (rekomendowany): w `accept_settlement` najpierw burn `saldo * elapsed / dispute_window * X%` (np. 20%), reszta wg bps. Jedno pole + CPI burn, rozmiar konta bez zmian.
- Dual-deposit odrzucony czasowo: zmienia `create` i flow demo.
- Decyzja Piotra: CEL + decay (wpis w decisions.md).
- Nie cytować w README/prezentacji produktów z Gemini bez linków (niezweryfikowane, usunięte z research-dispute.md).
- Pełny research i weryfikacja źródeł: `AIcontext/research-dispute.md`.

## Przeklikanie z UI na devnecie (2026-10-03 wieczór)
Ustawienia, które działają: RPC Helius w `app/.env` (VITE_RPC_URL, poza gitem). Phantom w Testnet mode z siecią **Testnet** (okno otwiera się szybko, pokazuje 0 SOL, tylko podpisuje; front wysyła tx przez Heliusa na devnet). Na Devnecie okno Phantoma ładowało się >90 s (jego RPC), blockhash wygasał.
- Ścieżka a ✅ (umowa 3e6nSXNNUVYdHpHwR2Qrj59hqCNW4bbX8jX4ukEVxNwK): [create](https://explorer.solana.com/tx/25hkshn3qacDvEicWiwsQjDNpFUAcZsqEzVeyebhrPukG5VdFt29osZkFEVAzT9A3gsB1KMqGctbKQvP9QvWMcQF?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/5jr1YzfWPWNvQEBMKLe5YDF4f1toHjNAQvoTV7eG9gyP4zighjzhtFwrSZyxLxULg4rT3jmx94XZYefmuk9VUuXn?cluster=devnet) (hash linku do GitHuba; weryfikacja ✅ ten sam link, ❌ inny) → [release](https://explorer.solana.com/tx/jwkvjqNyzUXRRWDqd6jMWWx3AqYJv2Uis75vqLrhVF5awdh29x4P2ahonFvH3BvKCJM7c78tgc6XVzcETJ8DheL?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5mkW2axGQJRk4HLUHJuBH52o3bWdFeg58DVs5LUJ84hkUo5jTgjLnhBAzK8aRPAjomD7WyY9PwGgyDJjuBcUed1e?cluster=devnet)
- Dodatkowo (release bez dostawy): [create](https://explorer.solana.com/tx/2gJ4kY2DZHR8ZrCi9cxPD7qHXQmDrrjXudxCYYWDbDouNWvd9SRRdN1Nf8DyMNMU8edS5HgZxicRdc46b5KzjPt9?cluster=devnet) → [release](https://explorer.solana.com/tx/3Kc1yU5jLTS1TF1UFdbeiBrUkFiGacUT2Zpe5XhBNivtf6op4pRSYJv2A4tUU8WavyUVmfQWKJpGQqkNKxiWr167?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/GurrsaDiFYEzURut2QnNG1jg86Do2eT3TTwUZEHM9WVGLpsKGrJVXPNtu34FqZ88Ti1DjntqHr7SXJ23ruPf3y1?cluster=devnet)
- Ścieżka b ✅ refund (umowa BywEq9ifgNrCGfnaEJ6wqUceoB1pzH58x4hxn8nofvkE, termin minął 21:03): [create](https://explorer.solana.com/tx/4gEw72aZMBgd7bXAEoXPqFjHNXQdBXPw9edu5pa2fEfYt4mP8W3sJPontsjbtyBsgHM44wD1pF32K1Dg14QpHBvD?cluster=devnet) → [refund_if_late](https://explorer.solana.com/tx/3qMAtV6tJ1WiUhjgcJR9iDRpPrANqdQ9D7v4C5T937onwXuLqGEhRBShyJoD8Vc2tbx52Tgvj4AUreoXSFV92cby?cluster=devnet) (21:20:59, stan REFUNDED) → [close_escrow](https://explorer.solana.com/tx/TWsVQHdEk1cFpV33jXFcBCNTfqMjKL6AUMQS7e8fhPuZUo7w3gv9qPntubAccQQzuGX6R4LBG8roiC6dDWfU1rp?cluster=devnet) (ekran po close: „Umowa zamknięta, rent zwrócony klientowi” — błąd nr 2 już nie występuje)
- Release bez dostawy z UI #2 (umowa D3hGhFwHWETZbCfwCt4WzrqfjGAkswavGRajdAjdWa1F, okna 300 s): [create](https://explorer.solana.com/tx/3HBTxYPmiBJ9epU7mvw5WtucYj2h6NKakNYPA6dgvmVTL7vu37CZ915SgcZyrDPpAyAAmnFXvyUFHKWQcqMD5rSN?cluster=devnet) → [release](https://explorer.solana.com/tx/4P8dSkduqK4tfeXbuymYHbpJjtDx5eD7khJ6UtEtgomTDPFd3jZWB5nsHM42L2T1SMW1iu1AqfLwwQMDmtXXBgex?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/64byYzZ5tMwW1HGqTNfLiDdigb66gxFqEcMkjvGhuJWPFHKqMYQreDtG2LpT45Qi2am56XwRxTTmaVA7Li87dEK4?cluster=devnet)
- Ścieżka c1 ✅ ugoda z decay (umowa 6nnk72r4zJCg5o2dXjVADs6LtJAFyGuMoYKQe3EyhCQn, 100 tokenów, okna 300 s): [create](https://explorer.solana.com/tx/4rETFDUS1b4NwDnHSPWWDC2JXpfaYCbtfDvvDtjM2NgARb6FM4kGCjQ3rBeGQqPyJJScFD7ZgHhU5xDyVRgrpjng?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/4hgbLQ49Gk6UxKZB8R9Q1jEhJ8hoKpyj859vp4MARg74rZTEprsX6qbTTcY4mgYd4gW98KtmWbmCGTY7bbsUMFGU?cluster=devnet) (hash tekstu) → [reject](https://explorer.solana.com/tx/9VVuSE9xNjp3BDEmQ1jHH2knbaCHgMuvkHm94TMHYmCZwzfsAX6KHtNqpC2AAcuL75ZKzmggUdSJTtQfaMkbGmu?cluster=devnet) 21:36:49 → [propose 70%](https://explorer.solana.com/tx/2oadUhJqVKgY8Fb5gxrSYSz4GrMLPWjgDTJaNjiPid4Wkm5EYZB7EGNTpBxv56yY3aoZxJy7jJVXDXjcpkMcHE4M?cluster=devnet) (wykonawca) → [accept](https://explorer.solana.com/tx/B4sx71fahmX5ja4CPN7Y7DhzWU1CiycG5h8vjgSRmQrMA9L2H1E5RLUphdr5ZhK5EkwLfcAAKMs9E8EMkb9bJuB?cluster=devnet) 21:38:20 (~91 s z 300 s → decay ~30%) → [close_escrow](https://explorer.solana.com/tx/5uUCunyo4AuQAiKncYJkZzdEQNv1GEocorFdB6WTotSGp9EG3DzjU3j811gTNjnvynuAHW9CZL2bmHKncnQj11Uh?cluster=devnet)
- Ścieżka c2 ✅ burn (umowa Bhdm8NUuiR8R5XMQoqfvx7Vprc7CRJRGwwHUHvZcjVN3, 10 tokenów, okna 120 s): [create](https://explorer.solana.com/tx/4Fz1Wy2Th3uBVu26eCphwLFA16W87wz8CMjESuAbhVDhkfarsRPZkd5oFG9Hr9Z3gvyz32DCJKae3XSfprUeMT2N?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2YB7dUaBoSgHyb1r3vKkCmP2btjCt14rp1hPvRnbup7orYehioTUmndm9V6BQVzxRfrtXxyJPS5XvqFdAniSymrG?cluster=devnet) → [reject](https://explorer.solana.com/tx/2Wr1CDvzzeVpVoY7VGwozmr3rwk3h8PmbiMeACuNbgm8RWCUPqcTfhk5YkmT3JE6bxWAgJHeUbpzremegehqiqYL?cluster=devnet) 21:46:27 → okno sporu do 21:48:26 bez propozycji → [burn_if_unsettled](https://explorer.solana.com/tx/65GdBWHJGtVYbg5kz4hoNQz6rQTDMhoziKZfgCt4u8yikRBsPssudmN1gJ859jR6DGKeH9vQHk87x1PQ5ge45d6g?cluster=devnet) 21:49:14 (skarbiec 0, stan BURNED) → [close_escrow](https://explorer.solana.com/tx/5JEkgavuyG9gwaMzwcvSd7Zd7Bcg6j3Avkp3A616GKsAUjbVeajd6tMCNRDfocsJYCkZAVkeAwzedLCtRbuhitDx?cluster=devnet) (21:50:11, z UI, klient `djfY…`, finalized)
- Sprzątanie devnetu (2026-10-04, `scripts/cleanup-devnet.ts`): umowa AqcFzYXWnqMtmEB88dJ3PGiap5RoYTxsaRMyaKDVVg28 (klient `djfY…` z `.demo-keys/`) → [refund_if_late](https://explorer.solana.com/tx/51eYKx63XcRSroCAq3KjGa3AAQMvQXAjvmNkab5Cf8nuZ6MtzdWnc5kZBzv5KWMPUAXnuF6xmVSkmj9WHsRVzv7M?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5dLW2mZm1q3JtJiap6FCNUShsfaLUcvjNoRERVeeASQ4MUtxBE4jkBRURrfb8V8CxKYt3LXWUVxzmtm91R6ipVcV?cluster=devnet), obie finalized, konto nie istnieje. Umowa Bhdm8N… (BURNED) była już zamknięta z UI (link wyżej), więc drugiego close'a nie wysyłano.
- Okna 300 s ustawione przez dopisanie opcji w <select> (front ma tylko 120 s / 24 h) — do dodania presetu 5 min w zadaniu frontowym.

### Błędy frontu znalezione przy klikaniu (do zadania dla Claude Code)
1. Hash z pliku: naprawione w kodzie (try/catch z komunikatem + reset `value`); przyczyny u Piotra nie udało się odtwworzyć (patrz log.md), do potwierdzenia w przeklikaniu.
2. Po `close_escrow`: naprawione (ekran "Umowa zamknięta" + historia + link do listy, polling zatrzymany).
3. Wygasły blockhash: naprawione w kodzie (jedno ponowienie + toast "Ponawiam…"), do potwierdzenia w przeklikaniu (zwlekanie z podpisem >90 s).
4. CSS i README (Frontend, Phantom Testnet): zrobione. Zostaje: README „Dowód na devnecie”, odebranie upgrade authority (--final), PDF, wideo.
5. Naprawione: "zamknięta" tylko przy CloseEscrow w historii, inaczej 3 ponowienia odczytu co 2 s.
6. Naprawione: preset 5 min w oknach akceptacji i sporu.

- Restyle frontu wg `design-ref.md` (2026-10-04): tylko CSS, className i `data-ov`, logika bez zmian. Fonty: systemowe; Inter/JetBrains Mono z Google Fonts czekają na zgodę Piotra (wtedy `<link>` w `index.html` + wpis w decisions.md).

- Restyle v2 (2026-10-04): płaski ciemny teal + limonka (#c8f51a), pełne karty, ikony lucide-react, fonty @fontsource (lokalnie); glassmorphism usunięty. Logika .tsx bez zmian. Zastępuje restyle glass z design-ref.

- Restyle v3 (2026-10-04): hero + siatka 2 kolumn (Akcje/Dostawa/Historia | Szczegóły/Czas), icon badge, ścieżka stanów, karty listy, toasty (max 3, sukces 8 s), Phosphor duotone, simple-icons (Solana, GitHub). Logiki .tsx nie zmieniono (poza auto-zamykaniem toastów). Brak logo Phantoma w simple-icons: ikona Wallet.

- 8A (2026-10-04): UI w nazewnictwie zleceniodawca/zleceniobiorca, karta z linkiem do umowy (kopiowanie z fallbackiem), jasny hero dla kontrastu. 8B (UI escrow v2) czeka na bramkę: commit backendu v2 i potwierdzenie, że devnet to v2.

- Front pod v2.1 (2026-10-04, commit 0010e7c): IDL v2.1, Accepted, kaucja, accept_job (warunki z renderu), ustąpienie z Frozen, cranki dla każdego portfela. Do przeklikania na devnecie: patrz lista ścieżek w odpowiedzi do Piotra.

- Front pod v2.2 (2026-10-04, commit a1e4ab0): zapieczętowana dostawa po stronie przeglądarki (seal.ts), stan Approved, claim_with_key, refund_unrevealed, Odszyfruj pracę. Round-trip szyfrowania sprawdzony w Chrome i Node; transakcje v2.2 do przeklikania na devnecie.

- Front pod v2.3 (2026-10-04, commit e058d64): skonto za szybkie zatwierdzenie (UI + accept_job z warunkami skonta) oraz delikatne rozróżnienie ról (data-role, --role-accent, karta 'Twój następny krok'). Widok obu ról w Delivered obejrzany na syntetycznym koncie (przechwycony RPC); transakcje v2.3 do przeklikania na devnecie.
