# CLAUDE.md — solana-escrow (HackYeah 2026, Finance Without Intermediaries)

## Kontekst
Solo projekt Piotra na wyzwanie Superteam Poland "Finance Without Intermediaries".
Deadline zgłoszenia: **2026-10-04 23:00**. Stan projektu zawsze w `AIcontext/main.md` — czytaj ZAWSZE na start.

## Zasada nr 1 (najważniejsza — za to jest 30% punktów)
Cała logika pieniędzy i warunków umowy żyje w programie on-chain (`programs/escrow`).
- Żadnego backendu ani bazy danych egzekwującej warunki.
- Żadnego klucza admina, instrukcji `update`, konta uprzywilejowanego.
- Frontend tylko buduje i wysyła transakcje — nie decyduje o niczym.

## Zakres — trzymaj się go
Robisz tylko to, o co prosi zadanie. Nie dodajesz funkcji, ekranów, refaktorów "przy okazji".
Brak danych lub narzędzia = zatrzymaj się i zapytaj. Nie zgaduj.

## Po każdym zadaniu kodowym (bez wyjątków)
1. `AIcontext/context.md` — zaktualizuj: zrobione / w toku / blokery.
2. `AIcontext/log.md` — dopisz 1 linię: `data | co | pliki | commit`.
3. Nowa biblioteka / API / narzędzie → dopisz do `AIcontext/decisions.md` (wymagane do disclosure).
4. Podaj 2–3 zdania: jak działa kod i dlaczego tak (Piotr musi to obronić przed jury).

## Git
- Repo solo, publiczne. Praca na `main` dozwolona.
- Commit po każdym działającym kroku. `main` musi się zawsze budować (`anchor build`).
- Nie commituj kluczy prywatnych, `.env`, keypairów (sprawdź `.gitignore`).

## Stack
- Program: Anchor (Rust), anchor-spl `token_interface`.
- Sieć: localnet do testów, devnet do demo.
- Testy: `anchor test` (TypeScript).
- Frontend: (do ustalenia w zadaniu frontendowym) + Wallet Adapter.

## Format
Polski w komunikacji, angielski w kodzie i komentarzach. Nazwy plików bez polskich znaków i spacji.
Krótko, konkretnie.
