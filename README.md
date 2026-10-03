# solana-escrow

Escrow dla zleceń freelancerskich **bez arbitra**, na Solanie (Anchor). Warunki wypłaty egzekwuje program on-chain, a nie backend. Projekt na HackYeah 2026, wyzwanie "Finance Without Intermediaries" (Superteam Poland).

## Stan

Zaimplementowana pełna logika escrow: `create`, `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject`.

Jeszcze nie zrobione: deploy na devnet, frontend, rozstrzyganie sporów.

## Co gdzie leży

| Ścieżka | Zawartość |
|---|---|
| `programs/escrow/src/lib.rs` | Punkt wejścia programu: lista instrukcji |
| `programs/escrow/src/state.rs` | Konto `Escrow`, enum `EscrowState`, `require_state`, koniec okna akceptacji |
| `programs/escrow/src/errors.rs` | Kody błędów |
| `programs/escrow/src/instructions/create.rs` | `create`: utworzenie umowy i wpłata do skarbca |
| `programs/escrow/src/instructions/delivery.rs` | `mark_delivered`, `reject` |
| `programs/escrow/src/instructions/payout.rs` | `release`, `claim_if_silent`, `refund_if_late` oraz `pay_from_vault` (jedyna funkcja wypłacająca ze skarbca) |
| `tests/escrow.ts` | Testy wszystkich ścieżek na localnecie |
| `Anchor.toml` | Konfiguracja workspace'u Anchor (klaster, portfel, skrypt testowy) |
| `migrations/deploy.ts` | Szablonowy skrypt deployu z `anchor init` (pusty) |
| `AIcontext/` | Stan projektu, decyzje i log zadań |

## Zasady umowy

| Instrukcja | Kto podpisuje | Warunek | Skutek |
|---|---|---|---|
| `create` | klient | `amount > 0`, `deadline_ts > now` | wpłata do skarbca, `Funded` |
| `mark_delivered(deliverable_hash)` | wykonawca | `Funded`, `now <= deadline_ts` | zapis czasu i hasha dostawy, `Delivered` |
| `release` | klient | `Funded` lub `Delivered` | skarbiec → wykonawca, `Released` |
| `claim_if_silent` | wykonawca | `Delivered`, `now > delivered_at + review_window_secs` | skarbiec → wykonawca, `Released` |
| `refund_if_late` | klient | `Funded`, `now > deadline_ts` | skarbiec → klient, `Refunded` |
| `reject` | klient | `Delivered`, `now <= delivered_at + review_window_secs` | `Frozen`, środki zostają w skarbcu |

- Konto `Escrow` to PDA z seedów `["escrow", client, id_u64]`. Skarbiec to konto tokenowe (ATA), którego authority jest to PDA.
- PDA nie ma klucza prywatnego, więc wypłatę może podpisać tylko ten program (signer seeds), i robi to w jednym miejscu: `pay_from_vault`.
- Spór to zamrożenie: żadna instrukcja nie akceptuje stanu `Frozen`, więc środków nie wyjmie ani klient, ani wykonawca. Nie ma arbitra ani ugody. Autor programu traci możliwość zmiany kodu dopiero po odebraniu upgrade authority (planowane przy deployu na devnet).
- W programie nie ma klucza admina, instrukcji `update` ani konta uprzywilejowanego.

Ograniczenia: konto tokenowe odbiorcy musi istnieć przed wypłatą; konta `Escrow` i skarbce nie są zamykane; środki w `Frozen` są dziś zablokowane na stałe.

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
