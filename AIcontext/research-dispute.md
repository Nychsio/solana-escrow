# research-dispute.md — spór bez arbitra (zamiast Frozen)

Data: 2026-10-03 | Źródła: Gemini (2 rundy) + weryfikacja i analiza Claude | Deadline: 2026-10-04 23:00

## Problem
`reject` -> `Frozen` blokuje środki na zawsze, klient może grieferować. Potrzebny mechanizm fair bez arbitra/oracle/admina.

## Potwierdzone (do README / prezentacji)
- Kleros, UMA, Aragon, Reality.eth = pośrednik rozproszony na posiadaczy tokenów, odpadają. Odpowiedź na "czemu nie Kleros".
- Asgaonkar & Krishnamachari 2018, dual-deposit escrow bez zaufanego pośrednika: https://arxiv.org/abs/1806.08379 (zweryfikowane).
- Buterin, "A Griefing Factor Analysis Model": https://ethresear.ch/t/a-griefing-factor-analysis-model/2338 (zweryfikowane).
- Rubinstein (1982), alternating offers: granica Δ→0 udziału = (r_c+d)/(r_c+r_f+2d), przy d→∞ = 1/2. Rachunek poprawny; model nie jest identyczny z kontraktem (propozycje w dowolnym momencie, decay liniowy do 0 w T), więc "uzasadnia kierunek", nie "dowodzi".
- Myerson–Satterthwaite (1983): tylko jako uczciwe ograniczenie. Bez arbitra płacimy zniszczoną wartością przy przedłużonym sporze.
- Bisq: time-locked payout + spalenie (wiedza ogólna, bez linku).

## Dziura first-movera w modelu "ugoda albo burn"
Po burn obie strony = 0, więc klient po `reject` proponuje ~1 bps dla wykonawcy i wykonawca musi przyjąć. Decay (spalenie `vault_balance * elapsed / dispute_window` przy accept) zmniejsza tę przewagę.

## NIE używać z outputu Gemini
- Wzór d* = (p(vc−P)+(1−p)cf)/(P·T): niewyprowadzony, porównuje spaloną kwotę z niewłaściwą wielkością. Tabela z d=0.1 bez związku z kodem (kod ma d·T = 1).
- W kodzie zamiast nominału `P` użyć `vault.amount` (Token-2022 fee).
- "Burn wymusza prawdomówność (Myerson–Satterthwaite)": błąd.
- arXiv 2411.19431 = "Money Burning Improves Mediated Communication" (informacja, mediator), nie escrow.
- arXiv 2303.00533 = "Towards a Privacy-Preserving Dispute Resolution Protocol on Ethereum" (ZK), nie krytykuje dual-deposit.
- Haggle Protocol, Synmerco, Octasol, Agent Arena: bez linków, niezweryfikowane.

## Opcje
1. CEL bez zmian (prosto, dziura first-movera).
2. CEL + decay w `accept_settlement` (jedno pole + CPI burn, rozmiar konta bez zmian; testy: suma wypłat = saldo − burn, t=0, t≥T, zaokrąglenia, spadek supply). Realnie 1,5–2 h.
3. Dual-deposit: zmienia `create` i flow demo, odradzone przy braku czasu.

## Status
DECYZJA OTWARTA (1 vs 2, rekomendacja: 2). Po decyzji dopisać wiersz do decisions.md.
