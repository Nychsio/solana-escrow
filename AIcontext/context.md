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
- Ścieżka b ⏳ (umowa BywEq9ifgNrCGfnaEJ6wqUceoB1pzH58x4hxn8nofvkE, termin minął 21:03): [create](https://explorer.solana.com/tx/4gEw72aZMBgd7bXAEoXPqFjHNXQdBXPw9edu5pa2fEfYt4mP8W3sJPontsjbtyBsgHM44wD1pF32K1Dg14QpHBvD?cluster=devnet) → refund_if_late DO ZROBIENIA
- Ścieżka c1 (ugoda z decay) i c2 (burn) — DO ZROBIENIA

### Błędy frontu znalezione przy klikaniu (do zadania dla Claude Code)
1. Hash z pliku nie działa (input file), działa tylko tekst/link — do zdiagnozowania w prawdziwej przeglądarce.
2. Po `close_escrow` ekran umowy pokazuje błąd „Nie znaleziono umowy… Account does not exist” (konto zamknięte poprawnie, polling dalej je czyta). Ma pokazać „Umowa zamknięta, rent zwrócony” + link do tx i do listy.
3. Odporność: przy wygasłym blockhashu automatycznie pobrać nowy i ponowić prośbę o podpis.
4. Potem: CSS (zadanie 6), README „Dowód na devnecie”, odebranie upgrade authority (--final), PDF, wideo.
