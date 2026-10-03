# log.md — 1 linia po każdym zadaniu kodowym

Format: `data | co | pliki | commit`

2026-10-03 | Zadanie 1: szkielet Anchor, konto Escrow, instrukcja create, testy localnet, README | programs/escrow/src/lib.rs, tests/escrow.ts, README.md, Anchor.toml, Cargo.toml, package.json | 7e804e8
2026-10-03 | Zadanie 2: mark_delivered, release, claim_if_silent, refund_if_late, reject, stan Frozen, podział na moduły, testy wszystkich ścieżek | programs/escrow/src/{lib,state,errors}.rs, programs/escrow/src/instructions/*, tests/escrow.ts, README.md, AIcontext/* | e498f60
2026-10-03 | Zadanie 3: spór bez arbitra: propose_settlement, accept_settlement, burn_if_unsettled, stany Settled i Burned, dispute_window_secs w create, frozen_at w reject, testy (26) | programs/escrow/src/{lib,state,errors}.rs, programs/escrow/src/instructions/{create,delivery,dispute,payout}.rs, tests/escrow.ts, README.md, AIcontext/* | 164e850
2026-10-03 | Deploy na devnet (ID 6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8), skrypty demo-setup i demo-flow, flow create->mark_delivered->release przeszedł (3 tx finalized), upgrade authority zostaje | scripts/*, package.json, .gitignore, README.md, AIcontext/{context,decisions}.md | 13a46e8
2026-10-03 | Zadanie 4 (kod): frontend app/ — lista, nowa umowa, szczegóły, wszystkie akcje, hash SHA-256 + weryfikacja, toasty z Explorerem, błędy PL, export-keys; devnet do przeklikania | app/**, scripts/export-keys.ts, package.json, README.md, AIcontext/* | 5e7a988..685f1b6
2026-10-03 | Zadanie 5 (lokalnie, bez upgrade na devnet): decay w accept_settlement, close_escrow, VaultNotEmpty, testy 33, front.md: zmiany IDL | programs/escrow/src/{lib,errors}.rs, instructions/{dispute,close,mod}.rs, tests/escrow.ts, README.md, AIcontext/{main,context,decisions,front}.md | d8a5207
2026-10-03 | Zadanie 5b: program na devnecie = main (cmp z dump), front na nowym IDL, podgląd decay, przycisk close_escrow, VaultNotEmpty PL, demo:flow OK na devnecie, czystki w research-dispute.md | app/src/{components/Actions,pages/EscrowPage,errors}.ts*, app/src/idl/*, AIcontext/*, README.md | cf98649
2026-10-03 | Upgrade programu na devnecie do d8a5207 (extend +20024 B, ten sam ID, authority bez zmian), demo-dispute.ts, demo:flow i demo:dispute przeszły (3 + 6 tx finalized), linki w README | scripts/*, package.json, README.md, AIcontext/{context,decisions,front}.md | f2edade
