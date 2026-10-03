# research-costs.md — ile kosztuje pośrednik (do README i PDF)
Data: 2026-10-03 | Źródła: strony cenników (linki niżej), sprawdzone przez Claude

## Platformy freelancerskie i escrow
| Pośrednik | Opłata wykonawcy | Opłata klienta | Inne |
|---|---|---|---|
| Fiverr | 20% od każdego zlecenia | 5,5% (+2,50 USD przy zamówieniach < 50 USD) | środki czekają 14 dni (7 dla Top Rated) |
| Upwork (oficjalna strona pomocy) | 20% do 500 USD z danym klientem, 10% do 10 000 USD, 5% powyżej | 2,75% opłaty za płatność | — |
| Upwork (wg źródeł z 2026, nieoficjalne) | zmienna 0–15% | 3–5% (Basic) | 0,99–14,99 USD za nowy kontrakt |
| Escrow.com (Standard) | 2,6%, min. 50 USD (do 5000 USD); dzielone między strony | | Concierge = stawka x2 |

Uwaga: model opłat Upwork się zmienia. Strona pomocy pokazuje stawki 20/10/5%, a źródła z 2026 piszą o modelu zmiennym 0–15%. W materiałach podawać zakres i źródło.

## Przykład: zlecenie 1000 USD
| | Opłaty łącznie | % |
|---|---|---|
| Fiverr | 200 (wykonawca) + 55 (klient) = 255 USD | 25,5% |
| Upwork (stawki 20/10/5) | 150 + 27,50 = 177,50 USD | ~17,8% |
| Escrow.com | 50 USD (minimum) | 5% |
| Nasz escrow | 5000 lamportów za podpis × ~4 transakcje + rent 2 kont (~0,0046 SOL) | ułamek procenta |

Rent na naszych kontach: Escrow 243 B ≈ 0,00258 SOL, skarbiec (ATA 165 B) ≈ 0,00204 SOL. Konta nie są dziś zamykane, więc rent nie wraca do klienta.

Argument dla jury: pośrednik bierze 5–25% i trzyma pieniądze 7–14 dni. U nas program wypłaca od razu, a koszt jest stały i nie zależy od kwoty.

## Źródła
- Escrow.com fee calculator: https://www.escrow.com/fee-calculator
- Upwork, Freelancer Service Fees: https://support.upwork.com/hc/en-us/articles/211062538-Freelancer-Service-Fees
- Upwork 2026 (nieoficjalne): https://golance.com/blogs/upwork-fees-explained-2026
- Fiverr 2026: https://vaultleap.com/blog/fiverr-fees-explained-2026
- Solana fees: https://solana.com/docs/core/fees
