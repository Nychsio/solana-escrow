# solana-escrow

Escrow dla zleceń freelancerskich **bez arbitra**, na Solanie (Anchor). Warunki wypłaty egzekwuje program on-chain, a nie backend. Projekt na HackYeah 2026, wyzwanie "Finance Without Intermediaries" (Superteam Poland).

## Stan

Zaimplementowana pełna logika escrow: `create`, `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject` oraz rozstrzyganie sporów bez arbitra: `propose_settlement`, `accept_settlement`, `burn_if_unsettled`.

Jeszcze nie zrobione: deploy na devnet, frontend.

## Co gdzie leży

| Ścieżka | Zawartość |
|---|---|
| `programs/escrow/src/lib.rs` | Punkt wejścia programu: lista instrukcji |
| `programs/escrow/src/state.rs` | Konto `Escrow`, enum `EscrowState`, `require_state`, koniec okna akceptacji |
| `programs/escrow/src/errors.rs` | Kody błędów |
| `programs/escrow/src/instructions/create.rs` | `create`: utworzenie umowy i wpłata do skarbca |
| `programs/escrow/src/instructions/delivery.rs` | `mark_delivered`, `reject` |
| `programs/escrow/src/instructions/dispute.rs` | `propose_settlement`, `accept_settlement`, `burn_if_unsettled` |
| `programs/escrow/src/instructions/payout.rs` | `release`, `claim_if_silent`, `refund_if_late` oraz `pay_from_vault` (jedyna funkcja wypłacająca ze skarbca) |
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
| `accept_settlement(freelancer_bps)` | strona inna niż proponujący | `Frozen`, jest propozycja, `bps` = zapisany, w oknie sporu | wykonawca dostaje `saldo * bps / 10000`, klient resztę, `Settled` |
| `burn_if_unsettled` | ktokolwiek (płaci tylko za transakcję) | `Frozen`, `now > frozen_at + dispute_window_secs` | spalenie całego salda skarbca, `Burned` |

- Konto `Escrow` to PDA z seedów `["escrow", client, id_u64]`. Skarbiec to konto tokenowe (ATA), którego authority jest to PDA.
- PDA nie ma klucza prywatnego, więc wypłatę może podpisać tylko ten program (signer seeds), i robi to w jednym miejscu: `pay_from_vault`.
- Spór nie ma arbitra. Po `reject` środki są zamrożone, a strony mają okno (`dispute_window_secs`) na ugodę: jedna proponuje podział, druga go akceptuje, podając ten sam `bps`. Gdy okno minie bez ugody, każdy może spalić środki (`burn_if_unsettled`), więc nikt, także autor programu, nie zyskuje na sporze.
- `Released`, `Refunded`, `Settled` i `Burned` są stanami końcowymi: żadna instrukcja ich nie akceptuje.
- Rozmiar konta `Escrow` jest stały (235 bajtów danych, pilnuje tego asercja w `state.rs`); nowe pola biorą się z `_reserved`.
- W programie nie ma klucza admina, instrukcji `update` ani konta uprzywilejowanego.

Ograniczenia: konta tokenowe odbiorców muszą istnieć przed wypłatą; konta `Escrow` i skarbce nie są zamykane; spalenie jest nieodwracalne (to cena braku arbitra).

## Uruchomienie

Wymagane: Rust, Solana CLI 3.1.x, Anchor CLI 1.1.2, Node.js, Yarn.

```
yarn install
anchor build
anchor test
```

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
