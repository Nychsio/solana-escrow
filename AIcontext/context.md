# context.md — stan pracy

## Zrobione
- Wybór use case'u i architektury (patrz main.md)
- Zadanie 1: szkielet repo (Anchor 1.1.2) + konto `Escrow` + instrukcja `create` + testy
- Zadanie 2: `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject`, stan `Frozen`
- Zadanie 3: spór bez arbitra: `propose_settlement`, `accept_settlement`, `burn_if_unsettled`, stany `Settled` i `Burned`, nowy argument `dispute_window_secs` w `create`, `frozen_at` w `reject`
- Zadanie 5 (lokalnie, BEZ upgrade na devnet): decay w `accept_settlement` (burn `saldo*elapsed/dispute_window_secs` przed podziałem, `mint` jest `mut`) i nowa instrukcja `close_escrow` (zamyka skarbiec i konto, rent do klienta); `anchor build` i `anchor test` zielone
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
- `anchor build` / `anchor test` po zadaniu 4 nieuruchomione przez Claude (brak toolchaina w sandboxie); `programs/` i `tests/` bez zmian.

## Devnet: portfel i upgrade authority
- Portfel deweloperski `2uKvpTL9ErJLNaL1HYa3oMfFBECNZQVQDpqqdUySKx3a` = upgrade authority programu (NIE odebrane, do code freeze). Klucz w `~/.config/solana/id.json`, poza gitem.
- Saldo: 2,5 SOL przed deployem, 1,0006 SOL po deployu, 0,8965 SOL po `demo:setup` i `demo:flow`. Deploy kosztował ok. 1,5 SOL (rent konta programu 1,484 SOL).
- Portfele demo i mint w `.demo-keys/` (w .gitignore): client `djfYNvotMgJY84yhnyNytx8gL5Xdt5CaKvRpZUs1abz`, freelancer `62Rw5b3iqsKLVWR4V48Q193PeTA1UkJ4954Rw32wg6EW`, mint `DeCDjMQm8CJY87Xga9upzC9WmJZsuipHCVqzz9ptTpH9`. Utrata `.demo-keys/` = nowe portfele i mint przy kolejnym `demo:setup`.
- Faucet devnetu bywa wyczerpany (429); kolejny deploy/upgrade potrzebuje SOL na buffer.

## UWAGA: program lokalny != program na devnecie
- Devnet ma wersję z zadania 3 (bez decay i `close_escrow`). Lokalny `target/idl/escrow.json` i `target/types/escrow.ts` są już nowe: `accept_settlement` wymaga `mint` jako mut, doszła instrukcja `close_escrow`. Frontend (`app/`) wskazuje na devnet, więc do upgrade'u nie kopiować nowego IDL do `app/src/idl/`.
- Upgrade na devnet: osobno, na znak Piotra. Potrzebuje ok. 1,5 SOL na buffer (portfel dev ma ok. 0,9 SOL).

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
- DECYZJA OTWARTA: CEL bez zmian vs CEL + decay. Po decyzji dopisać do decisions.md.
- Nie wstawiać do README/prezentacji: Haggle Protocol, Synmerco, Octasol, Agent Arena (podane przez Gemini bez linków, niezweryfikowane).
- Pełny research i weryfikacja źródeł: `AIcontext/research-dispute.md`.
