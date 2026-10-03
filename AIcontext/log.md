# log.md — 1 linia po każdym zadaniu kodowym

Format: `data | co | pliki | commit`

2026-10-03 | Zadanie 1: szkielet Anchor, konto Escrow, instrukcja create, testy localnet, README | programs/escrow/src/lib.rs, tests/escrow.ts, README.md, Anchor.toml, Cargo.toml, package.json | 7e804e8
2026-10-03 | Zadanie 2: mark_delivered, release, claim_if_silent, refund_if_late, reject, stan Frozen, podział na moduły, testy wszystkich ścieżek | programs/escrow/src/{lib,state,errors}.rs, programs/escrow/src/instructions/*, tests/escrow.ts, README.md, AIcontext/* | e498f60
2026-10-03 | Zadanie 3: spór bez arbitra: propose_settlement, accept_settlement, burn_if_unsettled, stany Settled i Burned, dispute_window_secs w create, frozen_at w reject, testy (26) | programs/escrow/src/{lib,state,errors}.rs, programs/escrow/src/instructions/{create,delivery,dispute,payout}.rs, tests/escrow.ts, README.md, AIcontext/* | 164e850
2026-10-03 | Deploy na devnet (ID 6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8), skrypty demo-setup i demo-flow, flow create->mark_delivered->release przeszedł (3 tx finalized), upgrade authority zostaje | scripts/*, package.json, .gitignore, README.md, AIcontext/{context,decisions}.md | 13a46e8
