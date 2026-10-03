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
- Ścieżka b ✅ refund (umowa BywEq9ifgNrCGfnaEJ6wqUceoB1pzH58x4hxn8nofvkE, termin minął 21:03): [create](https://explorer.solana.com/tx/4gEw72aZMBgd7bXAEoXPqFjHNXQdBXPw9edu5pa2fEfYt4mP8W3sJPontsjbtyBsgHM44wD1pF32K1Dg14QpHBvD?cluster=devnet) → [refund_if_late](https://explorer.solana.com/tx/3qMAtV6tJ1WiUhjgcJR9iDRpPrANqdQ9D7v4C5T937onwXuLqGEhRBShyJoD8Vc2tbx52Tgvj4AUreoXSFV92cby?cluster=devnet) (21:20:59, stan REFUNDED) → [close_escrow](https://explorer.solana.com/tx/TWsVQHdEk1cFpV33jXFcBCNTfqMjKL6AUMQS7e8fhPuZUo7w3gv9qPntubAccQQzuGX6R4LBG8roiC6dDWfU1rp?cluster=devnet) (ekran po close: „Umowa zamknięta, rent zwrócony klientowi” — błąd nr 2 już nie występuje)
- Release bez dostawy z UI #2 (umowa D3hGhFwHWETZbCfwCt4WzrqfjGAkswavGRajdAjdWa1F, okna 300 s): [create](https://explorer.solana.com/tx/3HBTxYPmiBJ9epU7mvw5WtucYj2h6NKakNYPA6dgvmVTL7vu37CZ915SgcZyrDPpAyAAmnFXvyUFHKWQcqMD5rSN?cluster=devnet) → [release](https://explorer.solana.com/tx/4P8dSkduqK4tfeXbuymYHbpJjtDx5eD7khJ6UtEtgomTDPFd3jZWB5nsHM42L2T1SMW1iu1AqfLwwQMDmtXXBgex?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/64byYzZ5tMwW1HGqTNfLiDdigb66gxFqEcMkjvGhuJWPFHKqMYQreDtG2LpT45Qi2am56XwRxTTmaVA7Li87dEK4?cluster=devnet)
- Ścieżka c1 ✅ ugoda z decay (umowa 6nnk72r4zJCg5o2dXjVADs6LtJAFyGuMoYKQe3EyhCQn, 100 tokenów, okna 300 s): [create](https://explorer.solana.com/tx/4rETFDUS1b4NwDnHSPWWDC2JXpfaYCbtfDvvDtjM2NgARb6FM4kGCjQ3rBeGQqPyJJScFD7ZgHhU5xDyVRgrpjng?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/4hgbLQ49Gk6UxKZB8R9Q1jEhJ8hoKpyj859vp4MARg74rZTEprsX6qbTTcY4mgYd4gW98KtmWbmCGTY7bbsUMFGU?cluster=devnet) (hash tekstu) → [reject](https://explorer.solana.com/tx/9VVuSE9xNjp3BDEmQ1jHH2knbaCHgMuvkHm94TMHYmCZwzfsAX6KHtNqpC2AAcuL75ZKzmggUdSJTtQfaMkbGmu?cluster=devnet) 21:36:49 → [propose 70%](https://explorer.solana.com/tx/2oadUhJqVKgY8Fb5gxrSYSz4GrMLPWjgDTJaNjiPid4Wkm5EYZB7EGNTpBxv56yY3aoZxJy7jJVXDXjcpkMcHE4M?cluster=devnet) (wykonawca) → [accept](https://explorer.solana.com/tx/B4sx71fahmX5ja4CPN7Y7DhzWU1CiycG5h8vjgSRmQrMA9L2H1E5RLUphdr5ZhK5EkwLfcAAKMs9E8EMkb9bJuB?cluster=devnet) 21:38:20 (~91 s z 300 s → decay ~30%) → [close_escrow](https://explorer.solana.com/tx/5uUCunyo4AuQAiKncYJkZzdEQNv1GEocorFdB6WTotSGp9EG3DzjU3j811gTNjnvynuAHW9CZL2bmHKncnQj11Uh?cluster=devnet)
- Ścieżka c2 ✅ burn (umowa Bhdm8NUuiR8R5XMQoqfvx7Vprc7CRJRGwwHUHvZcjVN3, 10 tokenów, okna 120 s): [create](https://explorer.solana.com/tx/4Fz1Wy2Th3uBVu26eCphwLFA16W87wz8CMjESuAbhVDhkfarsRPZkd5oFG9Hr9Z3gvyz32DCJKae3XSfprUeMT2N?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2YB7dUaBoSgHyb1r3vKkCmP2btjCt14rp1hPvRnbup7orYehioTUmndm9V6BQVzxRfrtXxyJPS5XvqFdAniSymrG?cluster=devnet) → [reject](https://explorer.solana.com/tx/2Wr1CDvzzeVpVoY7VGwozmr3rwk3h8PmbiMeACuNbgm8RWCUPqcTfhk5YkmT3JE6bxWAgJHeUbpzremegehqiqYL?cluster=devnet) 21:46:27 → okno sporu do 21:48:26 bez propozycji → [burn_if_unsettled](https://explorer.solana.com/tx/65GdBWHJGtVYbg5kz4hoNQz6rQTDMhoziKZfgCt4u8yikRBsPssudmN1gJ859jR6DGKeH9vQHk87x1PQ5ge45d6g?cluster=devnet) 21:49:14 (skarbiec 0, stan BURNED) → close_escrow C2CLOSE_TBD
- Do posprzątania: umowa AqcFzYXWnqMtmEB88dJ3PGiap5RoYTxsaRMyaKDVVg28 (10 tokenów, FUNDED, termin minął) → refund_if_late + close.
- Okna 300 s ustawione przez dopisanie opcji w <select> (front ma tylko 120 s / 24 h) — do dodania presetu 5 min w zadaniu frontowym.

### Błędy frontu znalezione przy klikaniu (do zadania dla Claude Code)
1. Hash z pliku: naprawione w kodzie (try/catch z komunikatem + reset `value`); przyczyny u Piotra nie udało się odtwworzyć (patrz log.md), do potwierdzenia w przeklikaniu.
2. Po `close_escrow`: naprawione (ekran "Umowa zamknięta" + historia + link do listy, polling zatrzymany).
3. Wygasły blockhash: naprawione w kodzie (jedno ponowienie + toast "Ponawiam…"), do potwierdzenia w przeklikaniu (zwlekanie z podpisem >90 s).
4. CSS i README (Frontend, Phantom Testnet): zrobione. Zostaje: README „Dowód na devnecie”, odebranie upgrade authority (--final), PDF, wideo.
5. NOWY (21:31): zaraz po create karta wykonawcy pokazała „Umowa zamknięta, rent zwrócony” przy historii z samym Create (konto jeszcze niewidoczne w RPC); F5 pomogło. „Zamknięta” tylko gdy historia ma CloseEscrow, inaczej ponowić odczyt.
6. Brak presetu 5 min dla okien (jest 120 s / 24 h); w teście dopisany ręcznie w <select>.

- Restyle frontu wg `design-ref.md` (2026-10-04): tylko CSS, className i `data-ov`, logika bez zmian. Fonty: systemowe; Inter/JetBrains Mono z Google Fonts czekają na zgodę Piotra (wtedy `<link>` w `index.html` + wpis w decisions.md).
