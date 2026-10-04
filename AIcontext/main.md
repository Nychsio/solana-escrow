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
Maszyna stanów v2.1: `Funded` (klient wpłacił, czeka na wykonawcę) → `Accepted` (wykonawca przyjął zlecenie i wpłacił kaucję) → `Delivered` → `Released` | `Frozen` → `Released` (klient ustępuje) | `Refunded` (wykonawca ustępuje) | `Settled` | `Burned`; do `Refunded` prowadzą też `withdraw` i `refund_if_late`. `Accepted` jest dopisany na końcu enuma (indeksy Borsh starych stanów bez zmian). Poprawki (`request_revision`) usunięte po audycie: klient z oknem poprawki 1 s mógł cofnąć zlecenie do `Accepted`, po chwili wywołać `refund_if_late` i zabrać pracę oraz kaucję wykonawcy za darmo.

1. Klient tworzy umowę (`create`) i wpłaca kwotę do skarbca → `Funded`. W `create` ustala też kaucję (`bond_bps`, część kwoty, którą wpłaci każda strona). Walidacje: klient i wykonawca to różne portfele, termin i okna (review, dispute) nie dłuższe niż 90 dni, okno review > 0, mint z białej listy (rozszerzenia Token-2022).
2. Wykonawca przyjmuje zlecenie (`accept_job`, przed terminem) i wpłaca kaucję `amount * bond_bps / 10000` → `Accepted`. Podpisuje warunki, które widział (kwota, kaucja, termin, okno review, okno sporu); jeśli konto ma inne (np. umowa została wycofana, zamknięta i utworzona na nowo pod tym samym id), `TermsMismatch`. Dopóki nie przyjął, klient może wycofać środki (`withdraw` → `Refunded`).
3. Wykonawca zgłasza dostawę przed terminem i zapisuje hash dostawy (`deliverable_hash`) → `Delivered` (startuje okno akceptacji).
4. Klient w oknie akceptacji może: zatwierdzić (`release`, z `Funded`, `Accepted` lub `Delivered`: całe saldo, czyli kwota plus kaucja wykonawcy, idzie do wykonawcy → `Released`) albo odrzucić (`reject`).
5. Klient milczy po upływie okna akceptacji → każdy może wywołać `claim_if_silent` → całe saldo do wykonawcy → `Released`.
6. Wykonawca nie dostarczył przed terminem → każdy może wywołać `refund_if_late` (z `Funded` lub `Accepted`) → całe saldo do klienta → `Refunded`. Z `Accepted` klient dostaje też kaucję wykonawcy jako karę za ghosting.
7. `reject`: klient wpłaca własną kaucję (kaucje obu stron są symetryczne) → `Frozen` (zapis `frozen_at`), zaczyna się okno sporu (`dispute_window_secs`).
8. W `Frozen` każda strona ma trzy wyjścia: (a) ustąpić (klient: `release`, wykonawca: `cancel_by_freelancer`; ustępujący traci swoją kaucję, druga strona dostaje całe saldo, czyli kwotę plus obie kaucje; propozycja ugody jest zerowana), (b) dogadać się: `propose_settlement` (udział wykonawcy w bps) i `accept_settlement` drugiej strony, z decay (`saldo * elapsed / dispute_window_secs` jest najpierw spalane: 0% zaraz po `reject`, 100% w chwili końca okna) i dopiero reszta jest dzielona wg bps → `Settled`, (c) nie robić nic: po oknie sporu każdy wywołuje `burn_if_unsettled` → całe saldo spalone, `Burned`. Kaucje mają sens właśnie dlatego, że ustąpienie kosztuje ustępującego: bez niego wykonawca po złej dostawie robiłby `cancel` i odzyskiwał kaucję, a klient nie mógłby ustąpić bez decay.
9. Wykonawca może też wycofać się poza sporem (`cancel_by_freelancer`, bez spalania): z `Funded` klient dostaje wszystko; z `Accepted` przed terminem oraz z `Delivered` wykonawca odzyskuje własną kaucję, a klient resztę; z `Accepted` po terminie to porzucenie i kaucja przepada na rzecz klienta (jak w `refund_if_late`), bo inaczej rezygnacja w ostatniej chwili byłaby darmowa.
10. `close_escrow` (klient, stany końcowe): spala ewentualne resztki w skarbcu (dust, bo każdy może wysłać tokeny na ATA) i zamyka skarbiec oraz konto `Escrow`, rent wraca do klienta.

Dual deposit (kaucje obu stron) wzorowany na Asgaonkar i Krishnamachari 2018, https://arxiv.org/abs/1806.08379.

Czego program NIE robi: nie wie, kto ma rację. Bez arbitra nikt tego nie rozstrzygnie; kaucje, decay i ustępowanie tylko ograniczają, ile można ugrać na kłamstwie.

Jawne ograniczenia:
- `freeze_authority` samego minta NIE blokuje `create` (nie jest rozszerzeniem Token-2022). Ma je m.in. USDC: Circle może zamrozić dowolne konto tokenowe, także skarbiec umowy. To ryzyko emitenta tokena, którego program nie usuwa.
- Mint Token-2022 z rozszerzeniem spoza białej listy (m.in. PermanentDelegate, TransferHook, TransferFeeConfig, NonTransferable, DefaultAccountState, ConfidentialTransferMint, Pausable, MintCloseAuthority, InterestBearingConfig, ScaledUiAmount) jest odrzucany (`UnsupportedMint`). Dozwolone: MetadataPointer, TokenMetadata, GroupPointer, GroupMemberPointer, TokenGroup, TokenGroupMember.
- Konta tokenowe odbiorców muszą istnieć przed wypłatą (frontend tworzy je idempotentnie w tej samej transakcji).

## Architektura programu
**Konto `Escrow`** (PDA, seeds: `["escrow", client, id_u64]`):
`client, freelancer, mint, id, amount, deadline_ts, review_window_secs, delivered_at: Option<i64>, state, bump, deliverable_hash: [u8; 32], dispute_window_secs: u64, frozen_at: i64, settle_proposer: u8 (0 brak / 1 klient / 2 wykonawca), settle_bps: u16, bond_amount: u64, _reserved: [u8; 37]`

Rozmiar konta jest stały (235 bajtów danych, pilnuje tego asercja w `state.rs`): nowe pola biorą się z `_reserved`.

**Stany:** `Funded, Delivered, Released, Refunded, Frozen, Settled, Burned, Accepted` (kolejność = indeksy Borsh). `Released`, `Refunded`, `Settled` i `Burned` są końcowe: jedyna instrukcja, która je przyjmuje, to `close_escrow`.

**Skarbiec:** konto tokenowe (ATA) z authority = PDA `Escrow`. Wypłacać i spalać może tylko program, podpisem PDA (seedy w jednym miejscu: `Escrow::with_signer_seeds`); wypłaty przez `pay_from_vault`.

**Zdarzenia (emit! na każdym przejściu):** `EscrowCreated, JobAccepted, Withdrawn, Delivered, Released (z polem conceded), Refunded, Rejected, SettlementProposed, Settled, Burned, Cancelled, Closed`.

**Instrukcje:**
| Instrukcja | Kto podpisuje | Warunek | Skutek |
|---|---|---|---|
| `create(id, amount, deadline_ts, review_window_secs, dispute_window_secs, bond_bps)` | klient | amount > 0, freelancer != client, review_window > 0, dispute_window > 0, deadline > now, termin i okna <= 90 dni, bond_bps <= 10000, mint z białej listy | wpłata kwoty, `Funded` |
| `accept_job(expected_amount, expected_bond_amount, expected_deadline_ts, expected_review_window_secs, expected_dispute_window_secs)` | wykonawca | Funded, now <= deadline, warunki = te z konta (`TermsMismatch`) | wpłata kaucji, `Accepted` |
| `withdraw` | klient | Funded | całe saldo → klient, `Refunded` |
| `mark_delivered(deliverable_hash)` | wykonawca | Accepted, now <= deadline | zapis `delivered_at` i hasha, `Delivered` |
| `release` | klient | Funded, Accepted, Delivered lub Frozen | całe saldo → wykonawca, zerowanie propozycji, `Released`; z Frozen = ustąpienie klienta (`conceded = true`) |
| `claim_if_silent` | ktokolwiek (`caller`) | Delivered, now > delivered_at + review_window | całe saldo → wykonawca, `Released` |
| `refund_if_late` | ktokolwiek (`caller`) | Funded lub Accepted, now > deadline | całe saldo → klient, `Refunded` |
| `cancel_by_freelancer` | wykonawca | Funded, Accepted, Delivered lub Frozen | bez burn, `Refunded`: własna kaucja wraca do wykonawcy tylko z Accepted przed terminem i z Delivered; z Accepted po terminie i z Frozen całe saldo → klient |
| `reject` | klient | Delivered, now <= delivered_at + review_window | wpłata kaucji klienta, `Frozen`, zapis `frozen_at` |
| `propose_settlement(freelancer_bps)` | klient lub wykonawca | Frozen, now <= frozen_at + dispute_window, bps <= 10000 | zapis proponującego i bps (nadpisuje poprzednią) |
| `accept_settlement(freelancer_bps)` | strona inna niż proponujący | Frozen, jest propozycja, bps = zapisany, w oknie sporu | najpierw burn `saldo*elapsed/window`, potem wykonawca: reszta*bps/10000, klient: reszta - wykonawca, `Settled` |
| `burn_if_unsettled` | ktokolwiek (tylko opłata za tx) | Frozen, now > frozen_at + dispute_window | spalenie całego salda skarbca, `Burned` |
| `close_escrow` | klient | Released, Refunded, Settled lub Burned | spalenie resztek, zamknięcie skarbca i konta, rent → klient |

Każda instrukcja sprawdza stan przez jedną funkcję `Escrow::require_state`. W `Frozen` działa pięć instrukcji: `propose_settlement`, `accept_settlement`, `burn_if_unsettled` oraz dwa ustąpienia, `release` i `cancel_by_freelancer`.

**Uprawnienia:** brak admina. Po deployu na devnet — odebrać upgrade authority (`solana program set-upgrade-authority --final`).

## Plan zadań
1. Szkielet repo + `create` + test — **zrobione**
2. `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject` + testy — **zrobione**
2a. Escrow v2 (P1–P5): walidacja minta, zgoda wykonawcy i kaucje, crank, zdarzenia — **zrobione**
2b. Escrow v2.1 (łatki po audycie): bez rewizji, `accept_job` wiąże warunki, porzucenie kosztuje, ustępowanie z `Frozen`, limity w `create` — **zrobione**, wdrożone na devnecie
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
- Co jeśli klient odrzuca złośliwie? → Program nie odróżni złośliwego odrzucenia od uzasadnionego, ale odrzucenie kosztuje: klient wpłaca kaucję symetryczną do kaucji wykonawcy i zamraża całe saldo. Dalej każda strona ma wyjście: ustąpić (klient traci kaucję na rzecz wykonawcy), dogadać się (ugoda z decay: im dłużej zwleka, tym więcej ginie) albo spalić wszystko. Złośliwy klient ryzykuje więc własną kaucję i całą kwotę, a nie dostaje niczego za darmo.
- Co jeśli wykonawca znika? → Patrz wyżej (`refund_if_late` z `Accepted` oddaje klientowi kwotę plus kaucję wykonawcy). Jeśli zniknie przed akceptacją, klient po prostu wycofuje środki (`withdraw`) bez żadnej kary dla nikogo.
- Co gdy obie strony chcą się rozstać? → Klient może zwolnić wykonawcę przez `release` albo ugodę, a wykonawca sam oddaje swoją kaucję i resztę klientowi przez `cancel_by_freelancer` (stan `Refunded`, zero spalenia, w każdej chwili życia umowy). Traci tylko ten, kto podpisuje, więc nikt nie może tego wykorzystać przeciw drugiej stronie.
- Co gdy jest spór? → Program nie wie, kto ma rację — bez arbitra nikt tego nie rozstrzygnie. Ogranicza, ile kłamca może ugrać, każe płacić za zwłokę i daje każdej stronie wyjście: ustąpić (tracąc kaucję), dogadać się albo spalić wszystko.
- Czemu nie każdy token? → Skarbiec musi być w pełni pod kontrolą programu. Token-2022 pozwala na rozszerzenia, które łamią to założenie: PermanentDelegate (ktoś może wyjąć środki), TransferHook (cudzy kod w każdym transferze), TransferFeeConfig (do skarbca trafia mniej niż kwota), Pausable i DefaultAccountState (zamrożenie), MintCloseAuthority i inne. Dlatego `create` stosuje białą listę i odrzuca wszystko poza metadanymi i grupami (`UnsupportedMint`). Jawne ograniczenie: `freeze_authority` minta nie blokuje `create`. Ma ją m.in. USDC (Circle może zamrozić dowolne konto tokenowe, także skarbiec umowy), więc to ryzyko emitenta tokena, którego program nie usuwa.
- Czy autor może coś zmienić? → brak admina, upgrade authority odebrany.
- Dlaczego nie baza danych? → w bazie operator może cofnąć lub zablokować wypłatę; tu nikt.
- Co za tydzień? → do uzupełnienia.

## Zgłoszenie (deadline 2026-10-04 23:00)
Tytuł, nazwa zespołu, członkowie, opis z uzasadnieniem, PDF max 10 slajdów, wideo max 3 min (publiczny link), publiczne repo z README.
