# solana-escrow

Escrow dla zleceń freelancerskich **bez arbitra**, na Solanie (Anchor). Warunki wypłaty egzekwuje program on-chain, a nie backend. Projekt na HackYeah 2026, wyzwanie "Finance Without Intermediaries" (Superteam Poland).

## Stan

Zaimplementowana pełna logika escrow: `create`, `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `cancel_by_freelancer`, `reject` oraz rozstrzyganie sporów bez arbitra: `propose_settlement`, `accept_settlement`, `burn_if_unsettled`, oraz `close_escrow` (odzyskanie rentu).

Program jest wdrożony na devnecie (wersja z decay i `close_escrow`). Frontend (`app/`) działa na devnecie. Jeszcze nie zrobione: odebranie upgrade authority.

## Devnet

- ID programu: `6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8`
- Explorer: https://explorer.solana.com/address/6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8?cluster=devnet
- Wdrożona wersja = kod z commita `c454642` (dodaje `cancel_by_freelancer` do wersji z decay i `close_escrow`); [transakcja upgrade'u](https://explorer.solana.com/tx/ez3KXxVuptG9V5v1UD5n2CR8Vzzg7jqALRXxsks4J1kZi8vGUojqR2FMqzP9swhJ1AetdSDh1DmaRnMJNNMAzC2?cluster=devnet). Pierwsze 322 048 B programu na łańcuchu są identyczne z `target/deploy/escrow.so`.
- Ścieżka akceptacji (`yarn demo:flow`): [create](https://explorer.solana.com/tx/64342DqfyBnGaGXxXoFtr8Z7i5retakZ4jtKZHZo9uuVcB7odaf22getZWkMVfKUkzyfMzUkCDWb5kLkvsScg6sP?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/5qUfyvZUpm2mKnkSoN6wdENvChr1Piv4CNB24pwDn7WqcJBVmSN1x3o1CzBJrm6WVmqJkcZvMLhjkSyiuHVuxiuf?cluster=devnet) → [release](https://explorer.solana.com/tx/39niP11eh279x6AKH3mm2cZgZsV4d1Xc54CWEZ7bW6gdMjYcnGT2QVGncJHjST1Kn6JB6zp8BeT2WCte9HeGtZC7?cluster=devnet)
- Ścieżka sporu (`yarn demo:dispute`): create → mark_delivered → reject → propose → accept (z decay, w przykładzie spalone 38,3%) → close_escrow (zwrot rentu):
  1. [create](https://explorer.solana.com/tx/UNH8SnddpXu6QJQrmdkRnxgpRM4YMGf245nVMXHEAiG35CB6QHSp5YJU2GqXT9xxDS6aYqcjnHop2WS2EUN3pve?cluster=devnet)
  2. [mark_delivered](https://explorer.solana.com/tx/57fPePGf6Qi158QyQnER6iKxQ19wiuQ3KnU4CUdVHAH5GeB2ZaTEBNuVSTHBvHSX3jEvXaiu3UB49j9ncZtvK2LH?cluster=devnet)
  3. [reject](https://explorer.solana.com/tx/2vXZ6SGqTdKDSCKLgdhEQq8pKZQBWpTfhaUMkatEDC6zesYfMKGwk7cpJMKUtw3MBqxQN1CnZ1UiTZHYwJ8WoqH6?cluster=devnet)
  4. [propose_settlement](https://explorer.solana.com/tx/5Yumo4y39KkFRjeKG6voiqLX1ycqQmxHRm5CiLvMdkiCH6N46ordpGpb4RVKsCdQLjjvFrrqtztw65bmScTaqNgo?cluster=devnet)
  5. [accept_settlement](https://explorer.solana.com/tx/3LA8NQCbvHaGa4uPrhbAAE1BJgqJZJfBqmQ2mMzyfEPF2vD4s5K7NJcbsrhbB7rUQ1gZduR8kH8dCVV6RpQuv3cp?cluster=devnet)
  6. [close_escrow](https://explorer.solana.com/tx/D3dSe63QmgjpJXJWughKLeZv33ztXzzBK6cXPG5FRhBTDag81w7iktEsyQQ6pVQUHhcCrjapUidRHYB1TKpshNj?cluster=devnet)
- Ścieżka rezygnacji wykonawcy (`yarn demo:cancel`): [create](https://explorer.solana.com/tx/57ZEQF1aEzQeoCf99FgZCEXyjNubrMtkFuVNsYcz77EbUHSmMsccsGd7UWeushcGK3VosCs5Sig9FM5NQozqovbB?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2cqMfWMtEuh1r3AdJYt2rb1UVdFtL8sD1BFZzxv8xFzvbx6nBqPeskwzhjJqvXJayrVcF5YXqeP6NmqYWsSgEEU2?cluster=devnet) → [cancel_by_freelancer](https://explorer.solana.com/tx/26HGeuxYjw8bVBLxPRt5YSCau7YFXzNKw11wqmUEYk574g9D1xQa5VkKv6CJMxs7YkYU4iExhjHkVGF9t4waYask?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5o2cr5Yp1AUg3mykEt8Pk2ZDPoAzuZtWmax5NpJUNNqE34GXtbPpr4qqdaTPTMYEv5hr2krkDPBsJegdef1LP73T?cluster=devnet). Klient odzyskał 100 tokenów, nic nie spalono.
- Upgrade authority jest na razie przy portfelu deweloperskim; zostanie odebrane przy code freeze (`solana program set-upgrade-authority --final`).

Powtórzenie demo na devnecie: `yarn demo:setup` (portfele i mint w `.demo-keys/`, poza gitem), potem `yarn demo:flow`, `yarn demo:dispute` i `yarn demo:cancel` (wypisują linki do Explorera i sprawdzają statusy przez RPC).

## Dowód na devnecie

Program: `6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8` ([Explorer](https://explorer.solana.com/address/6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8?cluster=devnet)). Każda ścieżka poniżej to prawdziwe, sfinalizowane transakcje na devnecie; kliknięcia a, b, c1 i c2 zrobione z interfejsu przeglądarkowego dwoma portfelami, ścieżka d skryptem `yarn demo:cancel`.

| Ścieżka | Transakcje po kolei | Co pokazuje |
|---|---|---|
| a) release | [create](https://explorer.solana.com/tx/25hkshn3qacDvEicWiwsQjDNpFUAcZsqEzVeyebhrPukG5VdFt29osZkFEVAzT9A3gsB1KMqGctbKQvP9QvWMcQF?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/5jr1YzfWPWNvQEBMKLe5YDF4f1toHjNAQvoTV7eG9gyP4zighjzhtFwrSZyxLxULg4rT3jmx94XZYefmuk9VUuXn?cluster=devnet) → [release](https://explorer.solana.com/tx/jwkvjqNyzUXRRWDqd6jMWWx3AqYJv2Uis75vqLrhVF5awdh29x4P2ahonFvH3BvKCJM7c78tgc6XVzcETJ8DheL?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5mkW2axGQJRk4HLUHJuBH52o3bWdFeg58DVs5LUJ84hkUo5jTgjLnhBAzK8aRPAjomD7WyY9PwGgyDJjuBcUed1e?cluster=devnet) | Klient zatwierdza dostawę, a program sam wypłaca skarbiec wykonawcy, bez pośrednika. |
| b) refund_if_late | [create](https://explorer.solana.com/tx/4gEw72aZMBgd7bXAEoXPqFjHNXQdBXPw9edu5pa2fEfYt4mP8W3sJPontsjbtyBsgHM44wD1pF32K1Dg14QpHBvD?cluster=devnet) → [refund_if_late](https://explorer.solana.com/tx/3qMAtV6tJ1WiUhjgcJR9iDRpPrANqdQ9D7v4C5T937onwXuLqGEhRBShyJoD8Vc2tbx52Tgvj4AUreoXSFV92cby?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/TWsVQHdEk1cFpV33jXFcBCNTfqMjKL6AUMQS7e8fhPuZUo7w3gv9qPntubAccQQzuGX6R4LBG8roiC6dDWfU1rp?cluster=devnet) | Wykonawca nie dostarczył do terminu, więc klient sam odzyskuje środki. |
| c1) ugoda z decay | [create](https://explorer.solana.com/tx/4rETFDUS1b4NwDnHSPWWDC2JXpfaYCbtfDvvDtjM2NgARb6FM4kGCjQ3rBeGQqPyJJScFD7ZgHhU5xDyVRgrpjng?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/4hgbLQ49Gk6UxKZB8R9Q1jEhJ8hoKpyj859vp4MARg74rZTEprsX6qbTTcY4mgYd4gW98KtmWbmCGTY7bbsUMFGU?cluster=devnet) → [reject](https://explorer.solana.com/tx/9VVuSE9xNjp3BDEmQ1jHH2knbaCHgMuvkHm94TMHYmCZwzfsAX6KHtNqpC2AAcuL75ZKzmggUdSJTtQfaMkbGmu?cluster=devnet) → [propose 70%](https://explorer.solana.com/tx/2oadUhJqVKgY8Fb5gxrSYSz4GrMLPWjgDTJaNjiPid4Wkm5EYZB7EGNTpBxv56yY3aoZxJy7jJVXDXjcpkMcHE4M?cluster=devnet) → [accept](https://explorer.solana.com/tx/B4sx71fahmX5ja4CPN7Y7DhzWU1CiycG5h8vjgSRmQrMA9L2H1E5RLUphdr5ZhK5EkwLfcAAKMs9E8EMkb9bJuB?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5uUCunyo4AuQAiKncYJkZzdEQNv1GEocorFdB6WTotSGp9EG3DzjU3j811gTNjnvynuAHW9CZL2bmHKncnQj11Uh?cluster=devnet) | Klient odrzuca dostawę, strony dogadują podział 70/30, a akceptacja po ok. 91 s z 300 s okna sporu spaliła część skarbca (decay), więc zwlekanie kosztuje obie strony. |
| c2) burn | [create](https://explorer.solana.com/tx/4Fz1Wy2Th3uBVu26eCphwLFA16W87wz8CMjESuAbhVDhkfarsRPZkd5oFG9Hr9Z3gvyz32DCJKae3XSfprUeMT2N?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2YB7dUaBoSgHyb1r3vKkCmP2btjCt14rp1hPvRnbup7orYehioTUmndm9V6BQVzxRfrtXxyJPS5XvqFdAniSymrG?cluster=devnet) → [reject](https://explorer.solana.com/tx/2Wr1CDvzzeVpVoY7VGwozmr3rwk3h8PmbiMeACuNbgm8RWCUPqcTfhk5YkmT3JE6bxWAgJHeUbpzremegehqiqYL?cluster=devnet) → [burn_if_unsettled](https://explorer.solana.com/tx/65GdBWHJGtVYbg5kz4hoNQz6rQTDMhoziKZfgCt4u8yikRBsPssudmN1gJ859jR6DGKeH9vQHk87x1PQ5ge45d6g?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5JEkgavuyG9gwaMzwcvSd7Zd7Bcg6j3Avkp3A616GKsAUjbVeajd6tMCNRDfocsJYCkZAVkeAwzedLCtRbuhitDx?cluster=devnet) | Bez ugody w oknie sporu środki zostają spalone przez dowolną osobę, więc nikt nie zyskuje na sporze. |
| d) cancel_by_freelancer | [create](https://explorer.solana.com/tx/57ZEQF1aEzQeoCf99FgZCEXyjNubrMtkFuVNsYcz77EbUHSmMsccsGd7UWeushcGK3VosCs5Sig9FM5NQozqovbB?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2cqMfWMtEuh1r3AdJYt2rb1UVdFtL8sD1BFZzxv8xFzvbx6nBqPeskwzhjJqvXJayrVcF5YXqeP6NmqYWsSgEEU2?cluster=devnet) → [cancel_by_freelancer](https://explorer.solana.com/tx/26HGeuxYjw8bVBLxPRt5YSCau7YFXzNKw11wqmUEYk574g9D1xQa5VkKv6CJMxs7YkYU4iExhjHkVGF9t4waYask?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5o2cr5Yp1AUg3mykEt8Pk2ZDPoAzuZtWmax5NpJUNNqE34GXtbPpr4qqdaTPTMYEv5hr2krkDPBsJegdef1LP73T?cluster=devnet) | Wykonawca jednostronnie oddaje klientowi całe saldo bez spalania, a klient odzyskuje rent po `close_escrow`. |
| Upgrade authority | `<TBD po --final>` | Po odebraniu nikt, także autor, nie może zmienić programu. |

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
| `programs/escrow/src/instructions/payout.rs` | `release`, `claim_if_silent`, `refund_if_late`, `cancel_by_freelancer` oraz `pay_from_vault` (jedyna funkcja wypłacająca ze skarbca) |
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
| `cancel_by_freelancer` | wykonawca | `Funded`, `Delivered` lub `Frozen` (bez warunków czasowych) | cała zawartość skarbca → klient bez spalania, czyści propozycję ugody, `Refunded` |
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
