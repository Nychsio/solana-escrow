# decisions.md — tylko dopisywanie

Format: `data | decyzja | dlaczego | kto`

2026-10-03 | Wyzwanie Finance Without Intermediaries, solo | osobny task od zespołu Defence | Piotr
2026-10-03 | Use case: escrow freelancerski bez arbitra | prosty do domknięcia w 24 h, czytelny moment zniknięcia pośrednika | Piotr
2026-10-03 | Spory zastąpione terminami (claim_if_silent, refund_if_late) | arbitraż wymagałby zaufanej strony = pośrednik wraca | Piotr
2026-10-03 | Brak klucza admina, upgrade authority odebrany po deployu | odpowiedź na "czy autor może coś zmienić" | Piotr
2026-10-03 | Solana devnet | wymóg wyzwania, devnet wystarcza | Piotr
2026-10-03 | Anchor (Rust) + anchor-spl token_interface | najprostsza ścieżka, obsługa SPL Token i Token-2022 | Piotr
2026-10-03 | Nowe publiczne repo solana-escrow | wymóg publicznego repo w ocenie | Piotr
2026-10-03 | Anchor CLI 1.1.2 budowany ze źródeł (avm --from-source), crate'y i @anchor-lang/core przypięte do 1.1.2 | gotowa binarka wymaga glibc 2.39, system ma 2.35; przypięcie = zgodność CLI z bibliotekami | Claude Code
2026-10-03 | Testy: @solana/spl-token 0.4.x + @solana/web3.js 1.x, mocha/chai | tworzenie minta i odczyt kont tokenowych w testach | Claude Code
2026-10-03 | Spór = zamrożenie środków, bez arbitra | arbiter = zaufana strona = pośrednik; rozstrzyganie do dodania później | Piotr
2026-10-03 | Wypłata przelewa całe saldo skarbca, nie pole `amount` | działa też dla mintów Token-2022 z opłatą transferową i nie zostawia resztek w skarbcu | Claude Code
2026-10-03 | Konto docelowe wypłaty musi już istnieć (dowolne konto tokenowe odbiorcy dla tego minta) | bez `init_if_needed`; frontend dołoży utworzenie ATA w tej samej transakcji | Claude Code
2026-10-03 | Testy czasowe na domyślnym walidatorze Anchor 1.x (Surfpool): czekanie = sleep + pusta transakcja | Surfpool produkuje blok i przesuwa zegar tylko przy transakcji | Claude Code

## Użyte komponenty zewnętrzne (disclosure)
- Solana (devnet), Solana CLI
- Anchor (anchor-lang, anchor-spl)
- SPL Token
- Claude Code / Claude (wsparcie przy kodowaniu i planowaniu)
- @anchor-lang/core, @solana/web3.js, @solana/spl-token, mocha, ts-mocha, chai (testy)
- Rust 1.89.0 (rust-toolchain.toml), Solana CLI (Agave) 3.1.10, Anchor CLI 1.1.2
- Surfpool 1.6.0 (lokalny walidator uruchamiany przez `anchor test`)
