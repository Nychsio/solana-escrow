# plan.md — harmonogram do deadline'u

Deadline zgłoszenia: **nd 2026-10-04 23:00**. Cel wewnętrzny: **zgłoszenie wysłane do 21:00** (2 h bufora).
Start planu: sob 2026-10-03 18:15. Do deadline'u ok. 29 h, w tym sen.

Zasada: jedno zadanie naraz. Zadanie zamknięte = kryterium ukończenia spełnione + commit + wpis w log.md.

## Kamienie milowe (twarde)
| # | Kiedy | Co musi być prawdą |
|---|---|---|
| M1 | sob 19:00 | Decyzja D1 (Frozen) podjęta i zapisana w decisions.md |
| M2 | sob 21:30 | Program na devnecie, ID w README, flow przeklikany skryptem |
| M3 | nd 12:00 | **Code freeze.** Pełny flow z frontendu na devnecie, upgrade authority odebrany |
| M4 | nd 19:00 | PDF + wideo + README gotowe |
| M5 | nd 21:00 | Zgłoszenie wysłane |

## Decyzje blokujące
**D1 — co z `Frozen` (przed zadaniem 3).** Do wyboru:
- A) Zamrożenie ostateczne. 0 h pracy. Ryzyko: jury zapyta "pieniądze giną na zawsze?" — słaby punkt w 20% (pomysł) i 15% (wdrożenie).
- B) Ugoda dwustronna: `propose_settlement(freelancer_bps)` przez jedną stronę + `accept_settlement` przez drugą → podział skarbca. Bez arbitra, obie strony podpisują. ~1,5 h + testy. Zamyka dziurę i może być cechą wyróżniającą (pkt 5 z main.md).
Rekomendacja: **B**, jeśli mieści się do 20:30. Jeśli nie — A i ugoda idzie do "co za tydzień".

**D2 — stack frontendu (przed zadaniem 4).** Propozycja: Vite + React + TS + `@solana/wallet-adapter` + klient Anchor z IDL. Zero backendu.

## Harmonogram
### Sobota 03.10
| Godz. | Zadanie | Kryterium ukończenia |
|---|---|---|
| 18:15–19:00 | D1 + D2 | wpisy w decisions.md |
| 19:00–20:30 | Zadanie 2b (tylko przy D1=B): ugoda + testy | `anchor test` zielony, commit |
| 20:30–21:30 | Zadanie 3: deploy devnet + skrypt demo (mint testowy, 2 portfele, create → deliver → release) | tx w Explorerze, ID programu w README |
| 21:30–01:00 | Zadanie 4a: frontend — portfel, `create`, lista umów, widok klienta | create z UI widoczny w Explorerze |
| 01:00–08:00 | Sen | — |

### Niedziela 04.10
| Godz. | Zadanie | Kryterium ukończenia |
|---|---|---|
| 08:00–11:00 | Zadanie 4b: widok wykonawcy, mark_delivered / release / claim / refund / reject (+ ugoda), link do Explorera po każdej tx | 3 ścieżki przeklikane na devnecie |
| 11:00–12:00 | Zadanie 3b: finalny redeploy + `set-upgrade-authority --final` | `solana program show` = brak authority |
| 12:00 | **CODE FREEZE** | od teraz tylko bugfixy blokujące demo |
| 12:00–14:00 | Zadanie 6a: README (problem, architektura, jak uruchomić, ID programu, ograniczenia, "co za tydzień") + odpowiedzi dla jury | README kompletne w repo |
| 14:00–16:00 | Zadanie 6b: PDF max 10 slajdów | PDF w repo / gotowy do uploadu |
| 16:00–18:30 | Zadanie 6c: wideo max 3 min + nagranie zapasowe flow | publiczny link działa w oknie incognito |
| 18:30–19:00 | Przegląd całości vs kryteria oceny | checklista niżej odhaczona |
| 19:00–21:00 | Zgłoszenie (tytuł, opis, linki) | potwierdzenie wysłania |
| 21:00–23:00 | Bufor | — |

## Dlaczego upgrade authority dopiero w niedzielę
Odebranie go w sobotę = każdy bug znaleziony przy frontendzie wymaga nowego programu pod nowym ID. Deploy w sobotę, finalizacja przy code freeze.

## Cięcia (jeśli jesteśmy w plecy)
Kolejność wyrzucania:
1. Ugoda (D1 → A), jeśli 2b nie skończone do 20:30.
2. Lista umów w UI → wpisanie adresu umowy ręcznie.
3. Ścieżka `reject` w UI → pokazana tylko w testach / skrypcie.
4. Nagranie zapasowe → wystarczy wideo.
Nie tniemy: deploy devnet, odebrany upgrade authority, 3 ścieżki na żywo, README, PDF, wideo.

## Checklista zgłoszenia
- [ ] Tytuł, nazwa zespołu, członkowie
- [ ] Opis z uzasadnieniem (gdzie znika pośrednik)
- [ ] PDF ≤ 10 slajdów
- [ ] Wideo ≤ 3 min, publiczny link
- [ ] Publiczne repo z README, ID programu na devnecie, linki do tx w Explorerze
- [ ] decisions.md z pełnym disclosure narzędzi

## Brakujące dane (do uzupełnienia przez Piotra)
- Koszt pośrednika w liczbach (prowizje Upwork / Escrow.com) — sprawdzić u źródła, nie zgadywać.
- Nazwa zespołu, tytuł projektu.
