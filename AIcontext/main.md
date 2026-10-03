# main.md — solana-escrow

## Wyzwanie
Superteam Poland, HackYeah 2026: "Finance Without Intermediaries".
Zbuduj na Solanie rozwiązanie, które usuwa potrzebę zaufania z transakcji finansowej.
Logika zastępująca pośrednika MUSI być w programie on-chain. Devnet wystarczy.

## Kryteria oceny
| Kryterium | Waga | Jak to zdobywamy |
|---|---|---|
| Zgodność z wyzwaniem | 30% | Zasady wypłat tylko w programie, brak admina, odebrany upgrade authority |
| Kompletność i działanie | 25% | Pełny flow na żywo, 3 ścieżki, transakcje w Explorerze |
| Pomysł i problem | 20% | Nazwany użytkownik + koszt pośrednika w liczbach |
| Potencjał wdrożenia | 15% | Uczciwe ograniczenia + plan "co za tydzień" |
| Oryginalność | 10% | Jedna cecha wyróżniająca (do decyzji po MVP) |

## Pomysł
Escrow dla zleceń freelancerskich **bez arbitra**. Spory zastępują terminy zapisane w programie.

- **Użytkownik:** freelancerzy rozliczający się z nieznanymi (np. zagranicznymi) klientami.
- **Pośrednik dziś:** platformy typu Upwork / Escrow.com — trzymają pieniądze, rozstrzygają spory, biorą prowizję.
- **Co się zmienia:** pieniądze trzyma program. Nikt — klient, wykonawca, autor programu — nie może ich wyjąć poza zasadami.

## Zasady umowy (logika on-chain)
1. Klient tworzy umowę i wpłaca kwotę do skarbca → `Funded`.
2. Wykonawca zgłasza dostawę przed terminem i zapisuje hash dostawy (`deliverable_hash`) → `Delivered` (startuje okno akceptacji).
3. Klient zatwierdza (z `Funded` lub `Delivered`) → wypłata do wykonawcy → `Released`.
4. Klient milczy po upływie okna akceptacji → wykonawca odbiera sam → `Released`.
5. Wykonawca nie dostarczył przed terminem → klient odzyskuje środki → `Refunded`.
6. Klient odrzuca dostawę w oknie akceptacji → `Frozen`. Środki zostają w skarbcu i żadna instrukcja nie może ich wyjąć. Bez arbitra i bez ugody (rozstrzyganie sporów do dodania później).

## Architektura programu
**Konto `Escrow`** (PDA, seeds: `["escrow", client, id_u64]`):
`client, freelancer, mint, id, amount, deadline_ts, review_window_secs, delivered_at: Option<i64>, state, bump, deliverable_hash: [u8; 32], _reserved: [u8; 64]`

`_reserved` to miejsce na przyszłą logikę rozstrzygania sporów (bez migracji kont).

**Stany:** `Funded, Delivered, Released, Refunded, Frozen`.

**Skarbiec:** konto tokenowe (ATA) z authority = PDA `Escrow`. Wypłacać może tylko program, podpisem PDA, przez jedną funkcję `pay_from_vault`.

**Instrukcje:**
| Instrukcja | Kto podpisuje | Warunek | Skutek |
|---|---|---|---|
| `create` | klient | amount > 0, deadline > now | wpłata do skarbca, `Funded` |
| `mark_delivered(deliverable_hash)` | wykonawca | state = Funded, now <= deadline | zapis `delivered_at` i hasha, `Delivered` |
| `release` | klient | state = Funded lub Delivered | skarbiec → wykonawca, `Released` |
| `claim_if_silent` | wykonawca | state = Delivered, now > delivered_at + review_window | skarbiec → wykonawca, `Released` |
| `refund_if_late` | klient | state = Funded, now > deadline | skarbiec → klient, `Refunded` |
| `reject` | klient | state = Delivered, now <= delivered_at + review_window | `Frozen`, środki zostają |

Każda instrukcja sprawdza stan przez jedną funkcję `Escrow::require_state`. Stanu `Frozen` nie akceptuje żadna instrukcja.

**Uprawnienia:** brak admina. Po deployu na devnet — odebrać upgrade authority (`solana program set-upgrade-authority --final`).

## Plan zadań
1. Szkielet repo + `create` + test — **zrobione**
2. `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject` + testy — **zrobione**
3. Deploy na devnet, odebranie upgrade authority
4. Frontend: połączenie portfela, widok klienta i wykonawcy
5. (opcjonalnie) cecha wyróżniająca — do decyzji po MVP
6. README, uzasadnienie, PDF (max 10 slajdów), wideo (max 3 min), nagranie zapasowe

## Demo
Dwa portfele z SOL i tokenem testowym na devnecie. Pokazać ścieżkę z zatwierdzeniem + jedną ścieżkę "strona zniknęła". Każda transakcja w Solana Explorerze.

## Odpowiedzi dla jury (przygotować)
- Gdzie znika pośrednik w kodzie? → instrukcje wypłat i PDA jako właściciel skarbca.
- Co gdy strona zniknie? → `claim_if_silent` / `refund_if_late`.
- Co gdy jest spór? → `reject` zamraża środki; nikt ich nie wyjmie, więc żadna strona nie zyskuje na nieuczciwym sporze.
- Czy autor może coś zmienić? → brak admina, upgrade authority odebrany.
- Dlaczego nie baza danych? → w bazie operator może cofnąć lub zablokować wypłatę; tu nikt.
- Co za tydzień? → do uzupełnienia.

## Zgłoszenie (deadline 2026-10-04 23:00)
Tytuł, nazwa zespołu, członkowie, opis z uzasadnieniem, PDF max 10 slajdów, wideo max 3 min (publiczny link), publiczne repo z README.
