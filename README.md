# solana-escrow

Escrow dla zleceń freelancerskich **bez arbitra**, na Solanie (Anchor). Warunki wypłaty egzekwuje program on-chain, a nie backend. Projekt na HackYeah 2026, wyzwanie "Finance Without Intermediaries" (Superteam Poland).

## Stan

Zaimplementowane: stan konta `Escrow` i instrukcja `create`.

Planowane (jeszcze nie w kodzie): `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, deploy na devnet.

## Co gdzie leży

| Ścieżka | Zawartość |
|---|---|
| `programs/escrow/src/lib.rs` | Program: instrukcja `create`, konto `Escrow`, enum `EscrowState`, kody błędów |
| `tests/escrow.ts` | Testy na localnecie (mint, dwa portfele, `create`, saldo skarbca, stan konta, odrzucanie błędnych danych) |
| `Anchor.toml` | Konfiguracja workspace'u Anchor (klaster, portfel, skrypt testowy) |
| `migrations/deploy.ts` | Szablonowy skrypt deployu z `anchor init` (pusty) |
| `AIcontext/` | Stan projektu, decyzje i log zadań |

## Jak działa `create`

- Podpisuje klient. Argumenty: `id`, `amount`, `deadline_ts`, `review_window_secs`.
- Program tworzy konto `Escrow` jako PDA z seedów `["escrow", client, id_u64]` oraz skarbiec: konto tokenowe (ATA), którego authority jest to PDA.
- Waliduje `amount > 0` i `deadline_ts > now`, przelewa `amount` z konta tokenowego klienta do skarbca i ustawia `state = Funded`.

Skarbiec należy do PDA, które nie ma klucza prywatnego, więc podpisać wypłatę może tylko ten program. W programie nie ma klucza admina, instrukcji `update` ani konta uprzywilejowanego.

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

Narzędzia: Solana CLI (Agave) 3.1.10, Anchor CLI 1.1.2, Claude Code (wsparcie przy kodowaniu).
