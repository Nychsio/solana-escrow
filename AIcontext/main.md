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
Maszyna stanów v2.3 (stany bez zmian względem v2.2; skonto to dodatkowe warunki, nie nowy stan): `Funded` (klient wpłacił, czeka na wykonawcę) → `Accepted` (wykonawca przyjął zlecenie i wpłacił kaucję) → `Delivered` → `Released` | `Approved` (tylko dostawa zapieczętowana: klient zatwierdził, wypłata czeka na klucz) → `Released` (klucz ujawniony) | `Refunded` (klucza nie ujawniono) | `Frozen` → `Released` (klient ustępuje) | `Approved` (klient ustępuje przy dostawie zapieczętowanej) | `Refunded` (wykonawca ustępuje) | `Settled` | `Burned`; do `Refunded` prowadzą też `withdraw`, `refund_if_late` i `refund_unrevealed`. `Accepted` jest dopisany na końcu enuma (indeksy Borsh starych stanów bez zmian). Poprawki (`request_revision`) usunięte po audycie: klient z oknem poprawki 1 s mógł cofnąć zlecenie do `Accepted`, po chwili wywołać `refund_if_late` i zabrać pracę oraz kaucję wykonawcy za darmo.

1. Klient tworzy umowę (`create`) i wpłaca kwotę do skarbca → `Funded`. W `create` ustala też kaucję (`bond_bps`, część kwoty, którą wpłaci każda strona) oraz skonto (`early_discount_bps` do 1000, `early_window_secs` nie dłuższe niż okno akceptacji; patrz sekcja „Skonto”). Walidacje: klient i wykonawca to różne portfele, termin i okna (review, dispute) nie dłuższe niż 90 dni, okno review > 0, mint z białej listy (rozszerzenia Token-2022).
2. Wykonawca przyjmuje zlecenie (`accept_job`, przed terminem) i wpłaca kaucję `amount * bond_bps / 10000` → `Accepted`. Podpisuje warunki, które widział (kwota, kaucja, termin, okno review, okno sporu, skonto i jego okno); jeśli konto ma inne (np. umowa została wycofana, zamknięta i utworzona na nowo pod tym samym id), `TermsMismatch`. Dopóki nie przyjął, klient może wycofać środki (`withdraw` → `Refunded`).
3. Wykonawca zgłasza dostawę przed terminem i zapisuje hash dostawy (`deliverable_hash`) oraz `key_hash` → `Delivered` (startuje okno akceptacji). `key_hash` równy zeru = dostawa jawna (klient widzi pracę, wypłata jak dotąd). Niezerowy = dostawa zapieczętowana (patrz sekcja „Zapieczętowana dostawa”).
4. Klient w oknie akceptacji może: zatwierdzić (`release`; dostawa jawna: całe saldo, czyli kwota plus kaucja wykonawcy, idzie do wykonawcy → `Released`; dostawa zapieczętowana: bez wypłaty → `Approved`) albo odrzucić (`reject`).
5. Klient milczy po upływie okna akceptacji → każdy może wywołać `claim_if_silent` (tylko dostawa jawna) → całe saldo do wykonawcy → `Released`. Dostawa zapieczętowana nie jest płacona samą ciszą: `claim_if_silent` zwraca `SealedDeliveryUseKey`, a wykonawca używa `claim_with_key`.
6. Wykonawca nie dostarczył przed terminem → każdy może wywołać `refund_if_late` (z `Funded` lub `Accepted`) → całe saldo do klienta → `Refunded`. Z `Accepted` klient dostaje też kaucję wykonawcy jako karę za ghosting.
7. `reject`: klient wpłaca własną kaucję (kaucje obu stron są symetryczne) → `Frozen` (zapis `frozen_at`), zaczyna się okno sporu (`dispute_window_secs`).
8. W `Frozen` każda strona ma trzy wyjścia: (a) ustąpić (klient: `release`, wykonawca: `cancel_by_freelancer`; ustępujący traci swoją kaucję, druga strona dostaje całe saldo, czyli kwotę plus obie kaucje; propozycja ugody jest zerowana; przy dostawie zapieczętowanej ustąpienie klienta tylko zatwierdza (`Approved`), a wypłata nadal wymaga klucza), (b) dogadać się: `propose_settlement` (udział wykonawcy w bps) i `accept_settlement` drugiej strony, z decay (`saldo * elapsed / dispute_window_secs` jest najpierw spalane: 0% zaraz po `reject`, 100% w chwili końca okna) i dopiero reszta jest dzielona wg bps → `Settled`, (c) nie robić nic: po oknie sporu każdy wywołuje `burn_if_unsettled` → całe saldo spalone, `Burned`. Kaucje mają sens właśnie dlatego, że ustąpienie kosztuje ustępującego: bez niego wykonawca po złej dostawie robiłby `cancel` i odzyskiwał kaucję, a klient nie mógłby ustąpić bez decay.
9. Wykonawca może też wycofać się poza sporem (`cancel_by_freelancer`, bez spalania): z `Funded` klient dostaje wszystko; z `Accepted` przed terminem oraz z `Delivered` wykonawca odzyskuje własną kaucję, a klient resztę; z `Accepted` po terminie to porzucenie i kaucja przepada na rzecz klienta (jak w `refund_if_late`), bo inaczej rezygnacja w ostatniej chwili byłaby darmowa.
10. `close_escrow` (klient, stany końcowe): spala ewentualne resztki w skarbcu (dust, bo każdy może wysłać tokeny na ATA) i zamyka skarbiec oraz konto `Escrow`, rent wraca do klienta.

### Skonto
Klasyczne „2/10 net 30”: rabat dla klienta za szybkie rozliczenie. **Skonto dotyczy wyłącznie dostawy jawnej**: nagradza szybkie zatwierdzenie pracy, którą klient zobaczył. Przy dostawie zapieczętowanej klient zatwierdza pracę, której nie widział, więc rabat za pośpiech przeczyłby zasadzie tego trybu (zatwierdzenie na ślepo nie jest tym, co chcemy nagradzać). Wykonawca ustala w warunkach `early_discount_bps` (max 10% kwoty) i `early_window_secs` (nie dłuższe niż okno akceptacji) i akceptuje je świadomie w `accept_job` (każda różnica to `TermsMismatch`). Klient, który zatwierdzi dostawę w oknie (`approval_ts <= delivered_at + early_window_secs`), dostaje `amount * early_discount_bps / 10000` z powrotem, a reszta skarbca idzie do wykonawcy.

- **Tylko od kwoty, nigdy od kaucji.** Zaokrąglenie w dół, więc ułamek zostaje u wykonawcy; suma wypłat zawsze równa saldu skarbca (zero zgubionych jednostek).
- **Dostawa jawna:** `release` w `Delivered` w oknie wypłaca skonto klientowi i resztę wykonawcy w jednej transakcji (stąd nowe konto `client_token` w `release`).
- **Dostawa zapieczętowana: bez skonta.** `release` tylko zatwierdza (`Approved`, zdarzenie z `early = false`), a `claim_with_key` wypłaca całe saldo wykonawcy (`discount = 0`). Pola `discount` w zdarzeniach i konto `client_token` w `claim_with_key` zostały w interfejsie dla zgodności z IDL (wartość zero, konto nieużywane).
- **Bez skonta:** zatwierdzenie bez dostawy (`Funded`/`Accepted`), ustąpienie klienta z `Frozen` (także gdy mieści się w oknie: program rozpoznaje to po `frozen_at != 0`), `claim_if_silent`, klucz ujawniony po ciszy klienta, ugoda, zwroty i rezygnacja.
- **Przykład:** „2/10 net 30” dla 1000 USDC: 2% to 20 USDC. Dla porównania odsetki 8% rocznie przez 14 dni to ok. 3 USDC (1000 × 0,08 × 14/365). Zapłata 20 dni przed terminem za 2% rabatu odpowiada ok. 37% rocznie, więc skonto jest dla wykonawcy drogim, ale świadomie wybranym kredytem i realną nagrodą dla klienta. Zamiennik faktoringu bez pośrednika i bez zewnętrznych protokołów („yield”).
- Skonto zmienia tylko to, ile kto dostaje przy wypłacie; kaucje i logika klucza działają jak w v2.2.

### Zapieczętowana dostawa
Atomowa wymiana pieniędzy na klucz do pracy. Inspiracja: ERC-7573 (Conditional-upon-Transfer-Decryption), https://eips.ethereum.org/EIPS/eip-7573.

1. Wykonawca szyfruje pracę poza łańcuchem (np. AES-256-GCM) i w `mark_delivered(deliverable_hash, key_hash)` zapisuje `deliverable_hash = sha256(szyfrogram)` oraz `key_hash = sha256(klucz)`. Tryb wybiera wykonawca i jest on zapisany on-chain (`key_hash != 0`).
2. Klient widzi tylko hashe, więc zatwierdzenie (`release`) nie wypłaca nic: stan `Approved`, `approved_at = now`, zdarzenie `Approved`.
3. `claim_with_key(key)` (każdy może wysłać, pieniądze i tak idą do wykonawcy) działa dla dostawy zapieczętowanej w stanie `Approved` albo w `Delivered` po końcu okna akceptacji (cichy klient), **ale tylko do twardego terminu klucza** (`key_deadline`, patrz punkt 4). Program sprawdza `sha256(key) == key_hash` (inaczej `InvalidKey`), zapisuje `revealed_key`, wypłaca całe saldo wykonawcy (kwota plus kaucje) i emituje `KeyRevealed { escrow, key }`. Klucz i pieniądze zamieniają się w jednej transakcji: nie ma stanu, w którym wykonawca ma pieniądze, a klient nie ma klucza (klucz jest publiczny w tej samej transakcji).
4. Jeśli klucza nie ma: `refund_unrevealed` (każdy może wysłać) zwraca klientowi całe saldo, czyli także kaucję wykonawcy za niewydanie klucza. **Jeden termin dla obu instrukcji**, `Escrow::key_deadline()`: z `Approved` jest to `approved_at + review_window_secs`, z `Delivered` (cichy klient) `review_ends_at + review_window_secs`. `claim_with_key` działa, gdy `now <= key_deadline`, `refund_unrevealed`, gdy `now > key_deadline` (dwa dopełniające się predykaty `key_claimable` i `key_unclaimed`), więc w każdej sekundzie dostępna jest dokładnie jedna z nich: bez luki i bez nakładania. Wykonawca ma po ciszy klienta jedno pełne okno (równe oknu akceptacji) na ujawnienie klucza.
5. `claim_if_silent` na dostawie zapieczętowanej jest zabronione (`SealedDeliveryUseKey`), bo sama cisza klienta nie może wypłacić pieniędzy za pracę, której nikt nie widział.
6. `cancel_by_freelancer` z `Approved` **oraz z zapieczętowanego `Delivered` po końcu okna akceptacji** (cichy klient, gdy `claim_with_key` już działa) oddaje klientowi całe saldo, także kaucję wykonawcy (jak `refund_unrevealed`): wycofanie się zamiast wydania klucza jest niewydaniem klucza, a kara nie może być do obejścia przez rezygnację. Dostawa jawna w `Delivered` i zapieczętowana jeszcze w oknie akceptacji: bez zmian (wykonawca odzyskuje kaucję).
7. `reject`, ugoda i spalenie działają jak dotąd. **Jawna reguła: ugoda na dostawie zapieczętowanej NIE przekazuje klucza.** Ugoda = rozstanie bez pracy, chyba że wykonawca prześle klucz dobrowolnie (poza programem).
8. Ustąpienie klienta z `Frozen` (`release`) przy dostawie zapieczętowanej: klient godzi się zapłacić całą pulę, ale dostaje pracę dopiero za kluczem (`Approved`, potem `claim_with_key`).

**Uwaga operacyjna (bezpieczeństwo klucza):** po `key_deadline` klucz nic nie daje wykonawcy (`claim_with_key` jest odrzucane, a `refund_unrevealed` zwraca klientowi całe saldo), a nieudana transakcja `claim_with_key` i tak publikuje klucz w danych instrukcji, bo dane instrukcji trafiają do księgi także wtedy, gdy transakcja nie przejdzie. Dlatego `claim_with_key` wysyłaj wyłącznie z symulacją (preflight; transakcja, która nie przejdzie symulacji, w ogóle nie jest wysyłana) i z zapasem przed terminem: front blokuje wysyłkę 2 minuty przed `key_deadline`, żeby wykonawca nie opublikował klucza w transakcji, która zdąży już tylko przegrać z `refund_unrevealed`.

### Granica: sprawiedliwa wymiana
Pagnia i Gärtner (1999) pokazali, że sprawiedliwa wymiana bez zaufanej strony trzeciej jest niemożliwa w ogólności. Program tego nie obchodzi, tylko przesuwa i ogranicza ryzyko, a tryb wybiera wykonawca (zapisany on-chain):
- **Dostawa jawna:** ryzykiem jest złośliwe odrzucenie (klient obejrzał pracę i odrzuca, żeby nie płacić). Ograniczają je kaucje, ugoda z decay i możliwość ustąpienia.
- **Dostawa zapieczętowana:** ryzykiem jest zła treść po stronie klienta (klient płaci za klucz, a pod nim jest coś bezwartościowego; program nie sprawdza, co jest w szyfrogramie). Ogranicza je podgląd (wykonawca może pokazać klientowi próbkę lub fragment poza łańcuchem przed zatwierdzeniem) oraz kaucja wykonawcy, a klient może `reject` w oknie akceptacji, zanim zatwierdzi.
- Program nie wie, czy praca jest dobra, i nie rozstrzygnie tego bez arbitra. Gwarantuje tylko, że płatność i klucz zamieniają się atomowo.

Dual deposit (kaucje obu stron) wzorowany na Asgaonkar i Krishnamachari 2018, https://arxiv.org/abs/1806.08379.

Czego program NIE robi: nie wie, kto ma rację. Bez arbitra nikt tego nie rozstrzygnie; kaucje, decay i ustępowanie tylko ograniczają, ile można ugrać na kłamstwie.

Jawne ograniczenia:
- `freeze_authority` samego minta NIE blokuje `create` (nie jest rozszerzeniem Token-2022). Ma je m.in. USDC: Circle może zamrozić dowolne konto tokenowe, także skarbiec umowy. To ryzyko emitenta tokena, którego program nie usuwa.
- Mint Token-2022 z rozszerzeniem spoza białej listy (m.in. PermanentDelegate, TransferHook, TransferFeeConfig, NonTransferable, DefaultAccountState, ConfidentialTransferMint, Pausable, MintCloseAuthority, InterestBearingConfig, ScaledUiAmount) jest odrzucany (`UnsupportedMint`). Dozwolone: MetadataPointer, TokenMetadata, GroupPointer, GroupMemberPointer, TokenGroup, TokenGroupMember.
- Konta tokenowe odbiorców muszą istnieć przed wypłatą (frontend tworzy je idempotentnie w tej samej transakcji).
- Dostawa zapieczętowana: program nie sprawdza, że szyfrogram zawiera obiecaną pracę ani że klucz otwiera cokolwiek sensownego poza zgodnością hasha. Klucz ujawniony w `claim_with_key` jest publiczny dla wszystkich (każdy może odszyfrować szyfrogram, jeśli zdobędzie jego treść).

## Architektura programu
**Konto `Escrow`** (PDA, seeds: `["escrow", client, id_u64]`):
`client, freelancer, mint, id, amount, deadline_ts, review_window_secs, delivered_at: Option<i64>, state, bump, deliverable_hash: [u8; 32], dispute_window_secs: u64, frozen_at: i64, settle_proposer: u8 (0 brak / 1 klient / 2 wykonawca), settle_bps: u16, bond_amount: u64, key_hash: [u8; 32], revealed_key: [u8; 32], approved_at: i64, early_discount_bps: u16, early_window_secs: u64, _reserved: [u8; 27]`

Rozmiar konta to 307 bajtów danych (pilnuje tego asercja w `state.rs`); pola skonta (10 B) wzięły się z `_reserved`, więc rozmiar się nie zmienił, a stare konta v2.2 czytają się poprawnie (skonto zero). Zmiana rozmiaru oznacza, że konta ze starego układu są nieczytelne dla nowego programu, więc przed upgrade'em wszystkie otwarte konta demo zostały zamknięte (`scripts/close-open-escrows.ts`).

**Stany:** `Funded, Delivered, Released, Refunded, Frozen, Settled, Burned, Accepted, Approved` (kolejność = indeksy Borsh). `Released`, `Refunded`, `Settled` i `Burned` są końcowe: jedyna instrukcja, która je przyjmuje, to `close_escrow`.

**Skarbiec:** konto tokenowe (ATA) z authority = PDA `Escrow`. Wypłacać i spalać może tylko program, podpisem PDA (seedy w jednym miejscu: `Escrow::with_signer_seeds`); wypłaty przez `pay_from_vault`.

**Zdarzenia (emit! na każdym przejściu):** `EscrowCreated, JobAccepted, Withdrawn, Delivered (z key_hash), Approved (z flagą early), KeyRevealed (z discount), Released (z conceded i discount), Refunded, Rejected, SettlementProposed, Settled, Burned, Cancelled, Closed`.

**Instrukcje:**
| Instrukcja | Kto podpisuje | Warunek | Skutek |
|---|---|---|---|
| `create(id, amount, deadline_ts, review_window_secs, dispute_window_secs, bond_bps, early_discount_bps, early_window_secs)` | klient | amount > 0, freelancer != client, review_window > 0, dispute_window > 0, deadline > now, termin i okna <= 90 dni, bond_bps <= 10000, early_discount_bps <= 1000 i early_window <= review_window (bps > 0 => okno > 0), mint z białej listy | wpłata kwoty, `Funded` |
| `accept_job(expected_amount, expected_bond_amount, expected_deadline_ts, expected_review_window_secs, expected_dispute_window_secs, expected_early_discount_bps, expected_early_window_secs)` | wykonawca | Funded, now <= deadline, warunki = te z konta (`TermsMismatch`) | wpłata kaucji, `Accepted` |
| `withdraw` | klient | Funded | całe saldo → klient, `Refunded` |
| `mark_delivered(deliverable_hash, key_hash)` | wykonawca | Accepted, now <= deadline | zapis `delivered_at`, hasha i `key_hash` (0 = jawna), `Delivered` |
| `release` | klient | Funded, Accepted, Delivered lub Frozen | dostawa jawna: całe saldo → wykonawca (w `Delivered` w oknie skonta: skonto → klient, reszta → wykonawca), zerowanie propozycji, `Released`; z Frozen = ustąpienie klienta (`conceded = true`, bez skonta). Dostawa zapieczętowana (Delivered/Frozen): bez wypłaty i bez skonta, `approved_at = now`, `Approved` |
| `claim_if_silent` | ktokolwiek (`caller`) | Delivered (dostawa jawna), now > delivered_at + review_window | całe saldo → wykonawca, `Released`; na zapieczętowanej `SealedDeliveryUseKey` |
| `claim_with_key(key)` | ktokolwiek (`caller`) | dostawa zapieczętowana; Approved, albo Delivered po końcu okna akceptacji; `now <= key_deadline` (inaczej `ReviewWindowClosed`); `sha256(key) == key_hash` | zapis `revealed_key`, całe saldo → wykonawca (bez skonta), `Released`, zdarzenie `KeyRevealed` |
| `refund_unrevealed` | ktokolwiek (`caller`) | dostawa zapieczętowana; Approved lub Delivered i `now > key_deadline` (ten sam termin co `claim_with_key`) | całe saldo → klient (wykonawca traci kaucję), `Refunded` |
| `refund_if_late` | ktokolwiek (`caller`) | Funded lub Accepted, now > deadline | całe saldo → klient, `Refunded` |
| `cancel_by_freelancer` | wykonawca | Funded, Accepted, Delivered, Approved lub Frozen | bez burn, `Refunded`: własna kaucja wraca do wykonawcy tylko z Accepted przed terminem i z Delivered (jawna, albo zapieczętowana jeszcze w oknie akceptacji); z Accepted po terminie, z Approved, z zapieczętowanego Delivered po końcu okna akceptacji i z Frozen całe saldo → klient |
| `reject` | klient | Delivered, now <= delivered_at + review_window | wpłata kaucji klienta, `Frozen`, zapis `frozen_at` |
| `propose_settlement(freelancer_bps)` | klient lub wykonawca | Frozen, now <= frozen_at + dispute_window, bps <= 10000 | zapis proponującego i bps (nadpisuje poprzednią) |
| `accept_settlement(freelancer_bps)` | strona inna niż proponujący | Frozen, jest propozycja, bps = zapisany, w oknie sporu | najpierw burn `saldo*elapsed/window`, potem wykonawca: reszta*bps/10000, klient: reszta - wykonawca, `Settled` |
| `burn_if_unsettled` | ktokolwiek (tylko opłata za tx) | Frozen, now > frozen_at + dispute_window | spalenie całego salda skarbca, `Burned` |
| `close_escrow` | klient | Released, Refunded, Settled lub Burned | spalenie resztek, zamknięcie skarbca i konta, rent → klient |

Każda instrukcja sprawdza stan przez jedną funkcję `Escrow::require_state`. W `Frozen` działa pięć instrukcji (przy dostawie zapieczętowanej `release` tylko zatwierdza): `propose_settlement`, `accept_settlement`, `burn_if_unsettled` oraz dwa ustąpienia, `release` i `cancel_by_freelancer`.

**Uprawnienia:** brak admina. Po deployu na devnet — odebrać upgrade authority (`solana program set-upgrade-authority --final`).

## Plan zadań
1. Szkielet repo + `create` + test — **zrobione**
2. `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `reject` + testy — **zrobione**
2a. Escrow v2 (P1–P5): walidacja minta, zgoda wykonawcy i kaucje, crank, zdarzenia — **zrobione**
2b. Escrow v2.1 (łatki po audycie): bez rewizji, `accept_job` wiąże warunki, porzucenie kosztuje, ustępowanie z `Frozen`, limity w `create` — **zrobione**, wdrożone na devnecie
2c. Escrow v2.2: zapieczętowana dostawa (atomowa wymiana pieniędzy na klucz) — **zrobione**, wdrożone na devnecie
2d. Escrow v2.3: skonto za szybkie zatwierdzenie dostawy — **zrobione**, wdrożone na devnecie
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
- Jak zabezpieczyć klienta przed wykonawcą, który odbiera pieniądze i nie oddaje pracy (i odwrotnie)? → Wykonawca może zapieczętować dostawę: szyfruje pracę, a w programie zapisuje hash szyfrogramu i hash klucza. Pieniądze wypłaca wyłącznie transakcja, która ujawnia klucz (program sprawdza hash), więc klucz i pieniądze zamieniają się atomowo, a jeśli klucza nie ma, klient dostaje zwrot plus kaucję wykonawcy. Granica jest uczciwa: sprawiedliwa wymiana bez zaufanej trzeciej strony jest niemożliwa w ogólności (Pagnia i Gärtner 1999), więc przy dostawie zapieczętowanej klient ponosi ryzyko złej treści pod kluczem (ograniczone podglądem i kaucją wykonawcy), a przy jawnej wykonawca ryzyko złośliwego odrzucenia (ograniczone kaucjami).
- Jak nagrodzić klienta za szybką płatność bez zewnętrznych protokołów? → Skonto „2/10 net 30” zapisane w programie: wykonawca świadomie oferuje do 10% kwoty (nigdy od kaucji) klientowi, który zatwierdzi dostawę w oknie, a rabat wypłaca ta sama transakcja, która zwalnia pieniądze. Skonto dotyczy tylko dostawy jawnej: przy zapieczętowanej klient zatwierdza pracę, której nie widział, więc nagradzanie pośpiechu przeczyłoby zasadzie tego trybu. To zamiennik faktoringu bez pośrednika, bez yieldu i bez oracle: nagroda wynika z warunków, które obie strony widziały.
- Czemu nie każdy token? → Skarbiec musi być w pełni pod kontrolą programu. Token-2022 pozwala na rozszerzenia, które łamią to założenie: PermanentDelegate (ktoś może wyjąć środki), TransferHook (cudzy kod w każdym transferze), TransferFeeConfig (do skarbca trafia mniej niż kwota), Pausable i DefaultAccountState (zamrożenie), MintCloseAuthority i inne. Dlatego `create` stosuje białą listę i odrzuca wszystko poza metadanymi i grupami (`UnsupportedMint`). Jawne ograniczenie: `freeze_authority` minta nie blokuje `create`. Ma ją m.in. USDC (Circle może zamrozić dowolne konto tokenowe, także skarbiec umowy), więc to ryzyko emitenta tokena, którego program nie usuwa.
- Czy autor może coś zmienić? → brak admina, upgrade authority odebrany.
- Dlaczego nie baza danych? → w bazie operator może cofnąć lub zablokować wypłatę; tu nikt.
- Co za tydzień? → do uzupełnienia.

## Co dalej
- **Kaucja klienta pobierana już w `create`.** Dziś klient wpłaca swoją kaucję dopiero w `reject`, więc klient bez tokenów nie może odrzucić dostawy (transakcja pada na braku środków), a wykonawca nie wie z góry, czy odrzucenie jest w ogóle możliwe. Pobranie kaucji klienta przy `create` zamyka tę lukę, ale zmienia kwotę wpłaty w `create` i ścieżki zwrotów (`withdraw`, `refund_*`), więc to osobna zmiana programu, poza obecnym zamrożeniem interfejsu.
- Odebranie upgrade authority (`--final`) po tym wydaniu.

## Zgłoszenie (deadline 2026-10-04 23:00)
Tytuł, nazwa zespołu, członkowie, opis z uzasadnieniem, PDF max 10 slajdów, wideo max 3 min (publiczny link), publiczne repo z README.
