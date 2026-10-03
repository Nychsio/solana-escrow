# solana-escrow

Escrow dla zleceń freelancerskich **bez arbitra**, na Solanie (Anchor). Warunki wypłaty egzekwuje program on-chain, a nie backend. Projekt na HackYeah 2026, wyzwanie "Finance Without Intermediaries" (Superteam Poland).

## Stan

Zaimplementowana pełna logika escrow: `create`, `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject` oraz rozstrzyganie sporów bez arbitra: `propose_settlement`, `accept_settlement`, `burn_if_unsettled`, oraz `close_escrow` (odzyskanie rentu).

Program jest wdrożony na devnecie (wersja z decay i `close_escrow`). Frontend (`app/`) działa na devnecie. Jeszcze nie zrobione: odebranie upgrade authority.

## Devnet

- ID programu: `6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8`
- Explorer: https://explorer.solana.com/address/6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8?cluster=devnet
- Wdrożona wersja = kod z commita `d8a5207` (decay w ugodzie, `close_escrow`); [transakcja upgrade'u]( https://explorer.solana.com/tx/mCRuYedtKyH6Wv5BZb4EBSWTCVxGRvB3T5xYb8VrDSCyA97xzD1BbDT5WzhXyaLTCGjtCscZWcC4NbQvTDhU1kJ?cluster=devnet ). Bajty programu na łańcuchu są identyczne z `target/deploy/escrow.so` z tego commita.
- Ścieżka akceptacji (`yarn demo:flow`): [create](https://explorer.solana.com/tx/64342DqfyBnGaGXxXoFtr8Z7i5retakZ4jtKZHZo9uuVcB7odaf22getZWkMVfKUkzyfMzUkCDWb5kLkvsScg6sP?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/5qUfyvZUpm2mKnkSoN6wdENvChr1Piv4CNB24pwDn7WqcJBVmSN1x3o1CzBJrm6WVmqJkcZvMLhjkSyiuHVuxiuf?cluster=devnet) → [release](https://explorer.solana.com/tx/39niP11eh279x6AKH3mm2cZgZsV4d1Xc54CWEZ7bW6gdMjYcnGT2QVGncJHjST1Kn6JB6zp8BeT2WCte9HeGtZC7?cluster=devnet)
- Ścieżka sporu (`yarn demo:dispute`): create → mark_delivered → reject → propose → accept (z decay, w przykładzie spalone 38,3%) → close_escrow (zwrot rentu):
  1. [create](https://explorer.solana.com/tx/UNH8SnddpXu6QJQrmdkRnxgpRM4YMGf245nVMXHEAiG35CB6QHSp5YJU2GqXT9xxDS6aYqcjnHop2WS2EUN3pve?cluster=devnet)
  2. [mark_delivered](https://explorer.solana.com/tx/57fPePGf6Qi158QyQnER6iKxQ19wiuQ3KnU4CUdVHAH5GeB2ZaTEBNuVSTHBvHSX3jEvXaiu3UB49j9ncZtvK2LH?cluster=devnet)
  3. [reject](https://explorer.solana.com/tx/2vXZ6SGqTdKDSCKLgdhEQq8pKZQBWpTfhaUMkatEDC6zesYfMKGwk7cpJMKUtw3MBqxQN1CnZ1UiTZHYwJ8WoqH6?cluster=devnet)
  4. [propose_settlement](https://explorer.solana.com/tx/5Yumo4y39KkFRjeKG6voiqLX1ycqQmxHRm5CiLvMdkiCH6N46ordpGpb4RVKsCdQLjjvFrrqtztw65bmScTaqNgo?cluster=devnet)
  5. [accept_settlement](https://explorer.solana.com/tx/3LA8NQCbvHaGa4uPrhbAAE1BJgqJZJfBqmQ2mMzyfEPF2vD4s5K7NJcbsrhbB7rUQ1gZduR8kH8dCVV6RpQuv3cp?cluster=devnet)
  6. [close_escrow](https://explorer.solana.com/tx/D3dSe63QmgjpJXJWughKLeZv33ztXzzBK6cXPG5FRhBTDag81w7iktEsyQQ6pVQUHhcCrjapUidRHYB1TKpshNj?cluster=devnet)
- Upgrade authority jest na razie przy portfelu deweloperskim; zostanie odebrane przy code freeze (`solana program set-upgrade-authority --final`).

Powtórzenie demo na devnecie: `yarn demo:setup` (portfele i mint w `.demo-keys/`, poza gitem), potem `yarn demo:flow` i `yarn demo:dispute` (wypisują linki do Explorera i sprawdzają statusy przez RPC).

## Co gdzie leży

| Ścieżka | Zawartość |
|---|---|
| `programs/escrow/src/lib.rs` | Punkt wejścia programu: lista instrukcji |
| `programs/escrow/src/state.rs` | Konto `Escrow`, enum `EscrowState`, `require_state`, koniec okna akceptacji |
| `programs/escrow/src/errors.rs` | Kody błędów |
| `programs/escrow/src/instructions/create.rs` | `create`: utworzenie umowy i wpłata do skarbca |
| `programs/escrow/src/instructions/delivery.rs` | `mark_delivered`, `reject` |
| `programs/escrow/src/instructions/close.rs` | `close_escrow`: zamknięcie skarbca i konta po zakończeniu umowy |
| `programs/escrow/src/instructions/dispute.rs` | `propose_settlement`, `accept_settlement`, `burn_if_unsettled` |
| `programs/escrow/src/instructions/payout.rs` | `release`, `claim_if_silent`, `refund_if_late` oraz `pay_from_vault` (jedyna funkcja wypłacająca ze skarbca) |
| `scripts/` | Skrypty demo na devnecie: `demo-setup.ts` (portfele, mint, tokeny), `demo-flow.ts` (create → mark_delivered → release), `export-keys.ts` (klucze demo w base58 do Phantoma, tylko terminal) |
| `app/` | Frontend (Vite + React + TS + Wallet Adapter): czyta konta z chaina i buduje transakcje, bez backendu |
| `tests/escrow.ts` | Testy wszystkich ścieżek na localnecie |
| `Anchor.toml` | Konfiguracja workspace'u Anchor (klaster, portfel, skrypt testowy) |
| `migrations/deploy.ts` | Szablonowy skrypt deployu z `anchor init` (pusty) |
| `AIcontext/` | Stan projektu, decyzje i log zadań |

## Zasady umowy

| Instrukcja | Kto podpisuje | Warunek | Skutek |
|---|---|---|---|
| `create` (+ `dispute_window_secs`) | klient | `amount > 0`, `dispute_window_secs > 0`, `deadline_ts > now` | wpłata do skarbca, `Funded` |
| `mark_delivered(deliverable_hash)` | wykonawca | `Funded`, `now <= deadline_ts` | zapis czasu i hasha dostawy, `Delivered` |
| `release` | klient | `Funded` lub `Delivered` | skarbiec → wykonawca, `Released` |
| `claim_if_silent` | wykonawca | `Delivered`, `now > delivered_at + review_window_secs` | skarbiec → wykonawca, `Released` |
| `refund_if_late` | klient | `Funded`, `now > deadline_ts` | skarbiec → klient, `Refunded` |
| `reject` | klient | `Delivered`, `now <= delivered_at + review_window_secs` | `Frozen`, zapis `frozen_at`, środki zostają w skarbcu |
| `propose_settlement(freelancer_bps)` | klient lub wykonawca | `Frozen`, `now <= frozen_at + dispute_window_secs`, `bps <= 10000` | zapis proponującego i podziału, nadpisuje poprzednią propozycję |
| `accept_settlement(freelancer_bps)` | strona inna niż proponujący | `Frozen`, jest propozycja, `bps` = zapisany, w oknie sporu | najpierw spalany jest `saldo * elapsed / dispute_window_secs` (decay), z reszty wykonawca dostaje `reszta * bps / 10000`, klient resztę, `Settled` |
| `burn_if_unsettled` | ktokolwiek (płaci tylko za transakcję) | `Frozen`, `now > frozen_at + dispute_window_secs` | spalenie całego salda skarbca, `Burned` |
| `close_escrow` | klient | `Released`, `Refunded`, `Settled` lub `Burned`, saldo skarbca = 0 | zamyka skarbiec i konto `Escrow`, rent wraca do klienta |

- Konto `Escrow` to PDA z seedów `["escrow", client, id_u64]`. Skarbiec to konto tokenowe (ATA), którego authority jest to PDA.
- PDA nie ma klucza prywatnego, więc wypłatę może podpisać tylko ten program (signer seeds), i robi to w jednym miejscu: `pay_from_vault`.
- Spór nie ma arbitra. Po `reject` środki są zamrożone, a strony mają okno (`dispute_window_secs`) na ugodę: jedna proponuje podział, druga go akceptuje, podając ten sam `bps`. Gdy okno minie bez ugody, każdy może spalić środki (`burn_if_unsettled`), więc nikt, także autor programu, nie zyskuje na sporze.
- Decay: im dłużej trwa spór, tym większa część skarbca ginie przy ugodzie (liniowo od 0% do 100% w oknie sporu), więc obie strony mają powód, by dogadać się szybko, a brak ugody kończy się spaleniem.
- `Released`, `Refunded`, `Settled` i `Burned` są stanami końcowymi: przyjmuje je już tylko `close_escrow`.
- Rozmiar konta `Escrow` jest stały (235 bajtów danych, pilnuje tego asercja w `state.rs`); nowe pola biorą się z `_reserved`.
- W programie nie ma klucza admina, instrukcji `update` ani konta uprzywilejowanego.

Ograniczenia: konta tokenowe odbiorców muszą istnieć przed wypłatą; konta zamyka dopiero `close_escrow` (po jego użyciu `id` można utworzyć ponownie); spalenie jest nieodwracalne (to cena braku arbitra).

## Uruchomienie

Wymagane: Rust, Solana CLI 3.1.x, Anchor CLI 1.1.2, Node.js, Yarn.

```
yarn install
anchor build
anchor test
```

## Frontend (app/)

Statyczna aplikacja w przeglądarce. Nie ma backendu ani bazy: stan umowy czyta z konta `Escrow` na devnecie, a każdą zmianę wykonuje transakcja podpisana w portfelu i sprawdzona przez program.

```
yarn app:install
yarn app:dev          # http://localhost:5173
yarn app:build        # statyczny build w app/dist
```

Uruchomienie: `yarn app:install`, potem plik `app/.env` z adresem RPC devnetu (`VITE_RPC_URL=...`, wzór w `app/.env.example`; bez niego aplikacja używa `https://api.devnet.solana.com`, który bywa ograniczany limitami), na końcu `yarn app:dev`.

Demo dwoma portfelami:
1. `yarn demo:setup` (SOL + tokeny testowe), potem `yarn demo:keys` wypisuje w terminalu klucze klienta i wykonawcy w base58. Wynik tylko do importu w Phantomie, nie zapisywać.
2. Phantom: Ustawienia → Developer settings → włącz Testnet mode → wybierz sieć **Solana Testnet** (nie Devnet). Phantom tylko podpisuje i pokazuje 0 SOL, to normalne: transakcje wysyła aplikacja przez RPC devnetu z `app/.env`. Dlaczego tak: na sieci Devnet okno Phantoma ładowało się ponad 90 s (jego własny RPC), blockhash wygasał i transakcja nie przechodziła. Zaimportuj oba klucze jako osobne konta (albo dwa profile przeglądarki).
3. Klient: „Nowa umowa” → adres wykonawcy, kwota, termin, okna (preset 2 min do demo). Link `#/escrow/<PDA>` wysyłasz wykonawcy.
4. Ekran umowy pokazuje tylko akcje dostępne dla roli, stanu i czasu; rozstrzyga zegar on-chain. Każda transakcja kończy się toastem z linkiem do Explorera, a historia umowy pochodzi z `getSignaturesForAddress`.

Hash dostawy: przeglądarka liczy SHA-256 pliku (Web Crypto), plik nie opuszcza komputera. Klient wrzuca otrzymany plik i widzi ✅/❌ zgodności z hashem zapisanym on-chain.

## Użyte komponenty zewnętrzne

Program (Rust):

- `anchor-lang` 1.1.2: framework programu
- `anchor-spl` 1.1.2: `token_interface` i `associated_token`
- SPL Token / Token-2022 oraz Associated Token Account: programy on-chain wywoływane przez CPI

Testy (TypeScript):

- `@anchor-lang/core` 1.1.2: klient Anchor
- `@solana/web3.js` 1.x
- `@solana/spl-token` 0.4.x
- `mocha`, `ts-mocha`, `chai`

Narzędzia: Solana CLI (Agave) 3.1.10, Anchor CLI 1.1.2, Surfpool 1.6.0 (lokalny walidator w `anchor test`), Claude Code (wsparcie przy kodowaniu).
