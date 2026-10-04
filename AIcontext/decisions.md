# decisions.md — tylko dopisywanie

Format: `data | decyzja | dlaczego | kto`

2026-10-03 | Wyzwanie Finance Without Intermediaries, solo | osobny task od zespołu Defence | Piotr
2026-10-03 | Use case: escrow freelancerski bez arbitra | prosty do domknięcia w 24 h, czytelny moment zniknięcia pośrednika | Piotr
2026-10-03 | Spory zastąpione terminami (claim_if_silent, refund_if_late) | arbitraż wymagałby zaufanej strony = pośrednik wraca | Piotr
2026-10-03 | Brak klucza admina, upgrade authority odebrany po deployu | odpowiedź na "czy autor może coś zmienić" | Piotr
2026-10-03 | Solana devnet | wymóg wyzwania, devnet wystarcza | Piotr
2026-10-03 | Anchor (Rust) + anchor-spl token_interface | najprostsza ścieżka, obsługa SPL Token i Token-2022 | Piotr
2026-10-03 | Nowe publiczne repo solana-escrow | wymóg publicznego repo w ocenie | Piotr
2026-10-03 | Anchor CLI 1.1.2 budowany ze źródeł (avm --from-source), crate'y i @anchor-lang/core przypięte do 1.1.2 | gotowa binarka wymaga glibc 2.39, system ma 2.35; przypięcie = zgodność CLI z bibliotekami | Claude Code
2026-10-03 | Testy: @solana/spl-token 0.4.x + @solana/web3.js 1.x, mocha/chai | tworzenie minta i odczyt kont tokenowych w testach | Claude Code
2026-10-03 | Spór = zamrożenie środków, bez arbitra | arbiter = zaufana strona = pośrednik; rozstrzyganie do dodania później | Piotr
2026-10-03 | Wypłata przelewa całe saldo skarbca, nie pole `amount` | działa też dla mintów Token-2022 z opłatą transferową i nie zostawia resztek w skarbcu | Claude Code
2026-10-03 | Konto docelowe wypłaty musi już istnieć (dowolne konto tokenowe odbiorcy dla tego minta) | bez `init_if_needed`; frontend dołoży utworzenie ATA w tej samej transakcji | Claude Code
2026-10-03 | Testy czasowe na domyślnym walidatorze Anchor 1.x (Surfpool): czekanie = sleep + pusta transakcja | Surfpool produkuje blok i przesuwa zegar tylko przy transakcji | Claude Code
2026-10-03 | Spór: ugoda dwustronna albo spalenie po oknie | brak arbitra, nikt (także autor) nie zyskuje na sporze | Piotr
2026-10-03 | Nowe pola konta (dispute_window_secs, frozen_at, settle_proposer, settle_bps) wzięte z _reserved (64 -> 45 B) | rozmiar konta bez zmian, asercja w state.rs | Piotr
2026-10-03 | Ugoda dzieli aktualne saldo skarbca (saldo*bps/10000 dla wykonawcy, reszta dla klienta), zaokrąglenie na korzyść klienta | suma wypłat zawsze równa saldu, brak resztek; działa z mintami z opłatą transferową | Claude Code
2026-10-03 | accept_settlement wymaga podania bps zgodnego z zapisanym | ochrona przed podmianą propozycji tuż przed akceptacją | Piotr
2026-10-03 | Seedy podpisu PDA w jednym miejscu (Escrow::with_signer_seeds), używane przez wypłaty i spalenie | jedna ścieżka podpisu skarbca | Claude Code
2026-10-03 | Research mechanizmu sporu (zamiast Frozen) przez Gemini + analiza Claude; kierunek: ugoda dwustronna + publiczny burn po oknie, bez arbitra (Kleros/UMA odrzucone: pośrednik rozproszony) | Frozen blokuje środki na zawsze i pozwala grieferować; wybór wariantu decay: OTWARTE | Piotr / Claude
2026-10-03 | Deploy na devnet z upgrade authority zostającym przy portfelu deweloperskim | odebranie dopiero przy code freeze po frontendzie, żeby dało się jeszcze poprawiać program | Piotr
2026-10-03 | Skrypty demo w scripts/ uruchamiane przez ts-node z osobnym scripts/tsconfig.json (ES2020) | BigInt i nowsze API; główny tsconfig (ES6) obsługuje testy | Claude Code
2026-10-03 | Portfele demo i mint w .demo-keys/ (poza gitem), setup idempotentny | powtarzalne demo bez kluczy w repo | Piotr

2026-10-03 | Frontend: Vite 8 + React 19 + TypeScript 5.7 w app/ (osobny package.json/yarn.lock), build statyczny | zero backendu, hosting dowolny | Piotr
2026-10-03 | Portfele przez @solana/wallet-adapter-react (+ -react-ui, -base) z pustą listą adapterów; Phantom i Solflare wykrywane przez Wallet Standard | bez pakietu -wallets (dziesiątki zależności) | Claude Code
2026-10-03 | Klient programu: @anchor-lang/core 1.1.2 z IDL target/idl (kopia w app/src/idl), accountsPartial z jawnymi kontami | ta sama wersja co program i testy | Claude Code
2026-10-03 | Polyfill Buffer z pakietu `buffer` (już zależność web3.js), `global` = globalThis w vite.config | Anchor i spl-token oczekują API Node | Claude Code
2026-10-03 | Routing na hashu (#/escrow/<PDA>) bez biblioteki routera | działa na każdym statycznym hostingu, mniej zależności | Claude Code
2026-10-03 | Przyciski wg zegara on-chain szacowanego (getBlockTime - czas przeglądarki), rozstrzyga program | zegar devnetu odbiega od lokalnego | Claude Code
2026-10-03 | Każda wypłata/ugoda ma w tej samej tx createAssociatedTokenAccountIdempotent dla odbiorcy (przy ugodzie obu stron) | program wymaga istniejącego konta tokenowego | Claude Code
2026-10-03 | SHA-256 dostawy liczone w przeglądarce (Web Crypto), plik nie wychodzi z komputera | dowód „co dostarczono” bez pośrednika i bez przechowywania pliku | Piotr
2026-10-03 | Historia umowy z getSignaturesForAddress + nazwa instrukcji z logów (getTransactions) | bez indeksera | Claude Code
2026-10-03 | Klucze demo do Phantoma: scripts/export-keys.ts (yarn demo:keys), wynik tylko w terminalu | brak kluczy w repo i we froncie | Piotr
2026-10-03 | Decay w accept_settlement: burn = saldo * elapsed / dispute_window_secs (liniowo, w dół), potem podział reszty wg bps | rozwiązuje first-mover z researchu: griefing przez reject przestaje się opłacać, a 100% w końcu okna daje ciągłość z burn_if_unsettled | Piotr
2026-10-03 | close_escrow (tylko klient, stany końcowe, skarbiec pusty): zamyka skarbiec (CPI close_account, podpis PDA) i konto Escrow (close = client) | zwrot rentu; po zamknięciu id można użyć ponownie | Piotr
2026-10-03 | burn_if_unsettled bez zmian, a CPI burn w accept_settlement napisany osobno (bez refaktoru wspólnego helpera) | zakaz ruszania burn_if_unsettled w zadaniu 5; do ewentualnego scalenia później | Claude Code
2026-10-03 | Upgrade programu na devnecie do wersji z main (decay + close_escrow) zatwierdzony; stwierdzono, że devnet jest już bajt w bajt równy lokalnemu escrow.so, więc dodatkowy `anchor upgrade` pominięty | koszt bufora ~1,5 SOL bez zysku; front przełączony na nowy IDL | Piotr (decyzja), Claude Code (weryfikacja)
2026-10-03 | Upgrade devnet: najpierw `solana program extend` o 20 024 B, potem `anchor deploy`; upgrade authority zostaje | nowy program jest większy od starego; odebranie authority przy code freeze | Piotr
2026-10-03 | scripts/demo-dispute.ts i weryfikacja statusów transakcji przez RPC (verifySignatures) w skryptach demo | dowód na żywo dla decay i close_escrow, bez polegania na samym wydruku | Piotr

2026-10-03 | RPC devnet: Helius (free tier) przez VITE_RPC_URL, klucz tylko w app/.env (poza gitem); domyślnie publiczny api.devnet.solana.com | publiczny RPC devnetu zwracał 429 przy demo dwoma portfelami; RPC tylko przekazuje transakcje, o niczym nie decyduje i można go podmienić jedną zmienną | Piotr
2026-10-04 | Zależność frontu: lucide-react (ikony SVG zamiast emoji) | spójne ikony, brak emoji w UI | Piotr
2026-10-04 | Zależność frontu: @fontsource/league-spartan (600, 700) | nagłówki; fonty hostowane lokalnie, bez Google Fonts | Piotr
2026-10-04 | Zależność frontu: @fontsource/inter (400, 500, 600) | tekst UI; lokalnie | Piotr
2026-10-04 | Zależność frontu: @fontsource/jetbrains-mono (400, 700) | hashe, adresy, kwoty; lokalnie | Piotr
2026-10-04 | cancel_by_freelancer: wykonawca jednostronnie oddaje klientowi całe saldo skarbca bez spalania, w stanach Funded/Delivered/Frozen, bez warunków czasowych, kończy w Refunded (bez nowego stanu i pól) | bezpieczne dla bodźców, bo traci tylko ten, kto podpisuje; zamyka dwie dziury: (a) przed terminem klient musiał czekać do deadline'u, (b) ugoda "0% dla wykonawcy" i tak traciła część na decay | Piotr
2026-10-04 | Upgrade devnet przez Helius RPC (klucz z app/.env, tylko przez zmienną środowiskową, bez zapisu do configu i bez wypisywania) | publiczny RPC devnetu zwracał 429 na każde zapytanie | Claude Code
2026-10-04 | Potwierdzenie rezygnacji w UI jako dwukrokowy panel w Actions.tsx (bez window.confirm i bez nowych bibliotek) | zadanie zabraniało window.confirm, a istniejące potwierdzenia (reject, burn) go używają | Claude Code
2026-10-04 | lucide-react usunięty, zastąpiony @phosphor-icons/react (duotone) | spójny zestaw ikon w drugiej iteracji wyglądu | Piotr
2026-10-04 | Zależność frontu: simple-icons (tylko logotypy Solana i GitHub, SVG path inline) | logo marek bez własnych grafik; Phantoma nie ma w paczce, w przycisku portfela użyta ikona Phosphor Wallet | Piotr
2026-10-04 | Escrow v2: dual deposit (bond_bps obu stron), accept_job (zgoda wykonawcy), withdraw przed akceptacją, kara za ghosting w refund_if_late | zamyka dziury: wykonawca mógł nie zareagować bez kosztu, a klient złośliwie odrzucać bez kosztu; źródło: Asgaonkar i Krishnamachari 2018, https://arxiv.org/abs/1806.08379 | Piotr
2026-10-04 | Nowy stan `Accepted` dopisany NA KOŃCU enuma EscrowState | indeksy Borsh starych wariantów bez zmian, rozmiar konta bez zmian (nowe pola z _reserved: 45 -> 27 B, asercja 235 B) | Piotr
2026-10-04 | create waliduje mint: klasyczny SPL OK, Token-2022 tylko z białą listą rozszerzeń (MetadataPointer, TokenMetadata, GroupPointer, GroupMemberPointer, TokenGroup, TokenGroupMember), reszta -> UnsupportedMint (deny by default) | PermanentDelegate, TransferHook, TransferFeeConfig, Pausable, DefaultAccountState i inne łamią założenie, że skarbiec kontroluje tylko program | Piotr
2026-10-04 | freeze_authority minta NIE blokuje create (jawne ograniczenie, opisane w main.md i README) | USDC ją ma; ryzyko emitenta, nie programu | Piotr
2026-10-04 | Parsowanie rozszerzeń minta przez anchor_spl::token_2022::spl_token_2022 (StateWithExtensions, get_extension_types), bez nowej zależności | anchor-spl 1.1.2 re-eksportuje spl-token-2022-interface, więc Cargo.toml bez zmian | Claude Code
2026-10-04 | close_escrow spala resztki w skarbcu (burn podpisem PDA, mint mut) i zamyka konto; błąd VaultNotEmpty zostaje w enumie, ale nieużywany | każdy może wysłać tokeny na ATA skarbca, więc dust blokowałby zamknięcie; usunięcie błędu przesunęłoby kody kolejnych | Piotr
2026-10-04 | claim_if_silent i refund_if_late podpisuje dowolny portfel (`caller`), konto docelowe pinowane do escrow.freelancer / escrow.client | permissionless crank: nikt nie musi czekać na drugą stronę, a obcy może tylko wysłać pieniądze do właściciela | Piotr
2026-10-04 | request_revision: do max_revisions poprawek (<= 10), termin = max(termin, now + revision_window_secs), wraca Accepted | klient ma wyjście pośrednie między release a reject, a limit zapobiega pętli | Piotr
2026-10-04 | 13 zdarzeń (emit!) na każdym przejściu stanu | historię można odtworzyć z logów transakcji bez indeksera stanu | Piotr
2026-10-04 | Zmiana sygnatury create (nowe argumenty na końcu: bond_bps, max_revisions, revision_window_secs) i nowych kont (reject: mint, vault, client_token, token_program; cancel_by_freelancer: freelancer_token) | wymóg dual deposit; frontend musi użyć nowego IDL | Piotr
2026-10-04 | Upgrade devnet do v2: extend o 47 944 B (konto 324 096 -> 372 040 B), authority bez zmian, upgrade przez Helius RPC z app/.env (przez zmienną środowiskową, bez zapisu i wypisywania klucza) | .so urósł do 369 992 B; publiczny RPC bywa dławiony (429) | Piotr / Claude Code
2026-10-04 | Skrypty demo v2 przez wspólny scripts/demo-lib.ts; nowy portfel `cranker` w .demo-keys/ (3. strona dla demo-ghost); demo-setup mintuje też wykonawcy (kaucje) | demo kaucji i crank wymaga tokenów wykonawcy i niezależnego wywołującego | Claude Code
2026-10-04 | v2.1: usunięcie rewizji (request_revision, max_revisions, revision_window_secs, błędy NoRevisionsLeft i InvalidRevisionConfig, event RevisionRequested) | atak: klient z oknem poprawki 1 s cofa zlecenie do Accepted, po chwili refund_if_late = praca i kaucja wykonawcy za darmo; pola wracają do _reserved (37 B, INIT_SPACE 235) | Piotr
2026-10-04 | v2.1: accept_job niesie expected_amount, expected_bond_amount, expected_deadline_ts, expected_review_window_secs, expected_dispute_window_secs; niezgodność = TermsMismatch | PDA zależy tylko od (client, id): withdraw + close + create z tym samym id daje ten sam adres i link, a inne warunki | Piotr
2026-10-04 | v2.1: cancel_by_freelancer z Accepted po deadline_ts = porzucenie, kaucja wykonawcy idzie do klienta (jak w refund_if_late) | inaczej rezygnacja w ostatniej chwili byłaby darmowa | Piotr
2026-10-04 | v2.1: ustępowanie z Frozen: release (klient) i cancel_by_freelancer (wykonawca) oddają całe saldo (kwota + 2 kaucje) drugiej stronie, zerują propozycję ugody; Released.conceded = true | bez tego kaucje nikogo nie karzą: wykonawca po złej dostawie robił cancel i odzyskiwał kaucję, a klient nie mógł ustąpić bez decay | Piotr
2026-10-04 | v2.1: limity w create: freelancer != client (SameParty), review_window_secs > 0 (InvalidReviewWindow), termin i okna <= 90 dni (WindowTooLong) | absurdalne wartości (okna u64::MAX, termin za dekady) w umowie, którą ktoś ma zaakceptować; InvalidReviewWindow dodany przeze mnie, bo zadanie nie wskazało kodu błędu dla review_window_secs = 0 | Piotr / Claude Code
2026-10-04 | v2.1: odpowiedź dla jury o sporze bez obietnicy, że "nikt nie zyskuje": program nie wie, kto ma rację, ogranicza zysk kłamcy, każe płacić za zwłokę i daje wyjścia (ustąpić, dogadać się, spalić) | uczciwsze i obronne przed pytaniem o złośliwego klienta | Piotr
2026-10-04 | v2.1: upgrade devnet bez extend (364 816 B < 372 040 B konta), przez Helius RPC z app/.env (zmienna środowiskowa, bez zapisu i wypisywania klucza) | publiczny RPC bywa dławiony (429) | Piotr / Claude Code

## Użyte komponenty zewnętrzne (disclosure)
- Solana (devnet), Solana CLI
- Anchor (anchor-lang, anchor-spl)
- SPL Token
- Claude Code / Claude (wsparcie przy kodowaniu i planowaniu)
- @anchor-lang/core, @solana/web3.js, @solana/spl-token, mocha, ts-mocha, chai (testy)
- Rust 1.89.0 (rust-toolchain.toml), Solana CLI (Agave) 3.1.10, Anchor CLI 1.1.2
- Surfpool 1.6.0 (lokalny walidator uruchamiany przez `anchor test`)
- Gemini (research mechanizmów sporu, bez generowania kodu)
- ts-node (uruchamianie skryptów demo), Solana Explorer (linki do transakcji)
- Frontend: @phosphor-icons/react, simple-icons, @fontsource/{league-spartan,inter,jetbrains-mono}, Vite, React, TypeScript, @vitejs/plugin-react, @solana/wallet-adapter-base / -react / -react-ui, buffer, Web Crypto API (SHA-256), Phantom (portfel do demo)
- Playwright + Chromium (lokalny test UI z atrapą RPC, poza repo)
- Helius (RPC devnet, free tier; wymienny przez VITE_RPC_URL)
