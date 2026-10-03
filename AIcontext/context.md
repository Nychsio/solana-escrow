# context.md — stan pracy

## Zrobione
- Wybór use case'u i architektury (patrz main.md)
- Zadanie 1: szkielet repo (Anchor 1.1.2) + konto `Escrow` + instrukcja `create` + testy na localnecie (`anchor build` i `anchor test` przechodzą, 4 testy)

## W toku
- brak

## Następne
- Zadanie 2: pozostałe 4 instrukcje + testy

## Blokery
- Repo nie jest jeszcze na GitHubie: brak GitHub CLI (`gh`) na maszynie, commity są tylko lokalnie

## Uwagi do zadania 2
- Mint Token-2022 z opłatą transferową: do skarbca trafi mniej niż `amount`, więc wypłata `amount` by się nie udała. Do rozstrzygnięcia przy instrukcjach wypłat.
- Keypair programu jest tylko lokalnie w `target/deploy/escrow-keypair.json` (poza gitem). Bez niego nie da się wdrożyć pod obecnym ID programu.
