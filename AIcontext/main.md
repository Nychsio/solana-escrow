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
Maszyna stanów v2: `Funded` (klient wpłacił, czeka na wykonawcę) → `Accepted` (wykonawca przyjął zlecenie i wpłacił kaucję) → `Delivered` → `Released` | `Frozen` → `Settled` | `Burned`; do `Refunded` prowadzą `withdraw`, `refund_if_late` i `cancel_by_freelancer`. `Accepted` jest dopisany na końcu enuma (indeksy Borsh starych stanów bez zmian).

1. Klient tworzy umowę (`create`) i wpłaca kwotę do skarbca → `Funded`. W `create` ustala też kaucję (`bond_bps`, część kwoty, którą wpłaci każda strona), liczbę poprawek (`max_revisions`, do 10) i okno poprawki. Mint musi przejść walidację (biała lista rozszerzeń Token-2022).
2. Wykonawca przyjmuje zlecenie (`accept_job`, przed terminem) i wpłaca kaucję `amount * bond_bps / 10000` → `Accepted`. Dopóki nie przyjął, klient może wycofać środki (`withdraw` → `Refunded`).
3. Wykonawca zgłasza dostawę przed terminem i zapisuje hash dostawy (`deliverable_hash`) → `Delivered` (startuje okno akceptacji).
4. Klient w oknie akceptacji może: zatwierdzić (`release`, z `Funded`, `Accepted` lub `Delivered`: całe saldo, czyli kwota plus kaucja wykonawcy, idzie do wykonawcy → `Released`), poprosić o poprawkę (`request_revision`, jeśli zostały poprawki: wraca `Accepted`, termin przesuwa się o okno poprawki) albo odrzucić (`reject`).
5. Klient milczy po upływie okna akceptacji → każdy może wywołać `claim_if_silent` → całe saldo do wykonawcy → `Released`.
6. Wykonawca nie dostarczył przed terminem → każdy może wywołać `refund_if_late` (z `Funded` lub `Accepted`) → całe saldo do klienta → `Refunded`. Z `Accepted` klient dostaje też kaucję wykonawcy jako karę za ghosting.
7. `reject`: klient wpłaca własną kaucję (kaucje obu stron są symetryczne, więc złośliwe odrzucenie kosztuje) → `Frozen` (zapis `frozen_at`), zaczyna się okno sporu (`dispute_window_secs`).
8. W oknie sporu którakolwiek strona proponuje podział (`propose_settlement`, udział wykonawcy w bps); druga strona może go zaakceptować (`accept_settlement`) → skarbiec (kwota plus dwie kaucje) dzielony, `Settled`. Nowa propozycja nadpisuje starą. Akceptacja ma decay: część skarbca, proporcjonalna do czasu od zamrożenia (`saldo * elapsed / dispute_window_secs`), jest najpierw spalana (0% zaraz po `reject`, 100% w chwili końca okna, ciągle z `burn_if_unsettled`), a resztę dzieli się wg bps.
9. Okno sporu minęło bez ugody → każdy może wywołać `burn_if_unsettled` → całe saldo skarbca spalone, `Burned`. Nikt (także autor) nie zyskuje na sporze.
10. Wykonawca może w dowolnej chwili (`Funded`, `Accepted`, `Delivered`, `Frozen`) jednostronnie rozwiązać umowę (`cancel_by_freelancer`): odzyskuje własną kaucję (jeśli wpłacona), klient dostaje resztę, bez spalania → `Refunded`. Bezpieczne dla bodźców: traci tylko ten, kto podpisuje.
11. `close_escrow` (klient, stany końcowe): spala ewentualne resztki w skarbcu (dust, bo każdy może wysłać tokeny na ATA) i zamyka skarbiec oraz konto `Escrow`, rent wraca do klienta.

Dual deposit (kaucje obu stron) wzorowany na Asgaonkar i Krishnamachari 2018, https://arxiv.org/abs/1806.08379: strona, która łamie umowę, traci kaucję, więc nie potrzeba zaufanego pośrednika.

Jawne ograniczenia:
- `freeze_authority` samego minta NIE blokuje `create` (nie jest rozszerzeniem Token-2022, a ma je np. USDC). Emitent takiego tokena może więc zamrozić konto skarbca; to ryzyko emitenta, nie programu.
- Mint Token-2022 z rozszerzeniem spoza białej listy (m.in. PermanentDelegate, TransferHook, TransferFeeConfig, NonTransferable, DefaultAccountState, ConfidentialTransferMint, Pausable, MintCloseAuthority, InterestBearingConfig, ScaledUiAmount) jest odrzucany (`UnsupportedMint`). Dozwolone: MetadataPointer, TokenMetadata, GroupPointer, GroupMemberPointer, TokenGroup, TokenGroupMember.
- Konta tokenowe odbiorców muszą istnieć przed wypłatą (frontend tworzy je idempotentnie w tej samej transakcji).

## Architektura programu
**Konto `Escrow`** (PDA, seeds: `["escrow", client, id_u64]`):
`client, freelancer, mint, id, amount, deadline_ts, review_window_secs, delivered_at: Option<i64>, state, bump, deliverable_hash: [u8; 32], dispute_window_secs: u64, frozen_at: i64, settle_proposer: u8 (0 brak / 1 klient / 2 wykonawca), settle_bps: u16, bond_amount: u64, max_revisions: u8, revisions_used: u8, revision_window_secs: u64, _reserved: [u8; 27]`

Rozmiar konta jest stały (235 bajtów danych, pilnuje tego asercja w `state.rs`): nowe pola biorą się z `_reserved`.

**Stany:** `Funded, Delivered, Released, Refunded, Frozen, Settled, Burned, Accepted` (kolejność = indeksy Borsh). `Released`, `Refunded`, `Settled` i `Burned` są końcowe: jedyna instrukcja, która je przyjmuje, to `close_escrow`.

**Skarbiec:** konto tokenowe (ATA) z authority = PDA `Escrow`. Wypłacać i spalać może tylko program, podpisem PDA (seedy w jednym miejscu: `Escrow::with_signer_seeds`); wypłaty przez `pay_from_vault`.

**Zdarzenia (emit! na każdym przejściu):** `EscrowCreated, JobAccepted, Withdrawn, Delivered, RevisionRequested, Released, Refunded, Rejected, SettlementProposed, Settled, Burned, Cancelled, Closed`.

**Instrukcje:**
| Instrukcja | Kto podpisuje | Warunek | Skutek |
|---|---|---|---|
| `create(id, amount, deadline_ts, review_window_secs, dispute_window_secs, bond_bps, max_revisions, revision_window_secs)` | klient | amount > 0, dispute_window > 0, deadline > now, bond_bps <= 10000, max_revisions <= 10 (okno > 0 gdy > 0), mint z białej listy | wpłata kwoty, `Funded` |
| `accept_job` | wykonawca | Funded, now <= deadline | wpłata kaucji, `Accepted` |
| `withdraw` | klient | Funded | całe saldo → klient, `Refunded` |
| `mark_delivered(deliverable_hash)` | wykonawca | Accepted, now <= deadline | zapis `delivered_at` i hasha, `Delivered` |
| `request_revision` | klient | Delivered, now <= delivered_at + review_window, revisions_used < max_revisions | `Accepted`, `delivered_at = None`, deadline = max(deadline, now + revision_window) |
| `release` | klient | Funded, Accepted lub Delivered | całe saldo → wykonawca, `Released` |
| `claim_if_silent` | ktokolwiek (`caller`) | Delivered, now > delivered_at + review_window | całe saldo → wykonawca, `Released` |
| `refund_if_late` | ktokolwiek (`caller`) | Funded lub Accepted, now > deadline | całe saldo → klient, `Refunded` |
| `cancel_by_freelancer` | wykonawca | Funded, Accepted, Delivered lub Frozen | własna kaucja → wykonawca, reszta → klient, bez burn, czyści propozycję, `Refunded` |
| `reject` | klient | Delivered, now <= delivered_at + review_window | wpłata kaucji klienta, `Frozen`, zapis `frozen_at` |
| `propose_settlement(freelancer_bps)` | klient lub wykonawca | Frozen, now <= frozen_at + dispute_window, bps <= 10000 | zapis proponującego i bps (nadpisuje poprzednią) |
| `accept_settlement(freelancer_bps)` | strona inna niż proponujący | Frozen, jest propozycja, bps = zapisany, w oknie sporu | najpierw burn `saldo*elapsed/window`, potem wykonawca: reszta*bps/10000, klient: reszta - wykonawca, `Settled` |
| `burn_if_unsettled` | ktokolwiek (tylko opłata za tx) | Frozen, now > frozen_at + dispute_window | spalenie całego salda skarbca, `Burned` |
| `close_escrow` | klient | Released, Refunded, Settled lub Burned | spalenie resztek, zamknięcie skarbca i konta, rent → klient |

Każda instrukcja sprawdza stan przez jedną funkcję `Escrow::require_state`. W `Frozen` działają tylko `propose_settlement`, `accept_settlement`, `burn_if_unsettled` i `cancel_by_freelancer`.

**Uprawnienia:** brak admina. Po deployu na devnet — odebrać upgrade authority (`solana program set-upgrade-authority --final`).

## Plan zadań
1. Szkielet repo + `create` + test — **zrobione**
2. `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject` + testy — **zrobione**
2a. Escrow v2 (P1–P5): walidacja minta, zgoda wykonawcy i kaucje, crank, poprawki, zdarzenia — **zrobione**, wdrożone na devnecie
3. Deploy na devnet, odebranie upgrade authority
4. Frontend: połączenie portfela, widok klienta i wykonawcy
5. (opcjonalnie) cecha wyróżniająca — do decyzji po MVP
6. README, uzasadnienie, PDF (max 10 slajdów), wideo (max 3 min), nagranie zapasowe

## Demo
Dwa portfele z SOL i tokenem testowym na devnecie. Pokazać ścieżkę z zatwierdzeniem + jedną ścieżkę "strona zniknęła". Każda transakcja w Solana Explorerze.

## Odpowiedzi dla jury (przygotować)
- Gdzie znika pośrednik w kodzie? → instrukcje wypłat i PDA jako właściciel skarbca.
- Co gdy strona zniknie? → Wykonawca znika po przyjęciu zlecenia: każdy (crank) wywołuje `refund_if_late` i klient dostaje kwotę plus kaucję wykonawcy jako karę (`Accepted`). Klient milczy po dostawie: każdy wywołuje `claim_if_silent` i wykonawca dostaje wypłatę. Nie potrzeba nikogo zaufanego, a wywołać może obcy portfel, bo konto docelowe jest pinowane do właściwej strony.
- Co jeśli strona jest offline? → To samo co przy zniknięciu: terminy są zapisane w programie, a wykonanie wypłaty jest permissionless (`claim_if_silent`, `refund_if_late`, `burn_if_unsettled` może wywołać dowolny portfel), więc nikt nie musi czekać na drugą stronę ani na operatora.
- Co jeśli klient odrzuca złośliwie? → `reject` wymaga wpłaty kaucji klienta (symetrycznej do kaucji wykonawcy) i zamraża całe saldo. Dalej jest ugoda z decay (im dłużej zwleka, tym więcej ginie), a bez ugody wszystko, razem z jego kaucją, zostaje spalone. Złośliwy klient nic nie zyskuje i traci własne pieniądze. Wykonawca może też sam wycofać się przez `cancel_by_freelancer` i odzyskać swoją kaucję.
- Co jeśli wykonawca znika? → Patrz wyżej (`refund_if_late` z `Accepted` oddaje klientowi kwotę plus kaucję wykonawcy). Jeśli zniknie przed akceptacją, klient po prostu wycofuje środki (`withdraw`) bez żadnej kary dla nikogo.
- Co gdy obie strony chcą się rozstać? → Klient może zwolnić wykonawcę przez `release` albo ugodę, a wykonawca sam oddaje swoją kaucję i resztę klientowi przez `cancel_by_freelancer` (stan `Refunded`, zero spalenia, w każdej chwili życia umowy). Traci tylko ten, kto podpisuje, więc nikt nie może tego wykorzystać przeciw drugiej stronie.
- Co gdy jest spór? → `reject` zamraża środki; strony mają okno na ugodę (podział w bps), a bez ugody każdy może spalić środki. Nikt, także autor, nie zyskuje na sporze, więc nie ma arbitra.
- Czemu nie każdy token? → Skarbiec musi być w pełni pod kontrolą programu. Token-2022 pozwala na rozszerzenia, które łamią to założenie: PermanentDelegate (ktoś może wyjąć środki), TransferHook (cudzy kod w każdym transferze), TransferFeeConfig (do skarbca trafia mniej niż kwota), Pausable i DefaultAccountState (zamrożenie), MintCloseAuthority i inne. Dlatego `create` stosuje białą listę i odrzuca wszystko poza metadanymi i grupami (`UnsupportedMint`). Jawne ograniczenie: `freeze_authority` minta (np. USDC) nie blokuje, więc emitent takiego tokena może zamrozić skarbiec. To ryzyko emitenta, a nie programu.
- Czy autor może coś zmienić? → brak admina, upgrade authority odebrany.
- Dlaczego nie baza danych? → w bazie operator może cofnąć lub zablokować wypłatę; tu nikt.
- Co za tydzień? → do uzupełnienia.

## Zgłoszenie (deadline 2026-10-04 23:00)
Tytuł, nazwa zespołu, członkowie, opis z uzasadnieniem, PDF max 10 slajdów, wideo max 3 min (publiczny link), publiczne repo z README.
