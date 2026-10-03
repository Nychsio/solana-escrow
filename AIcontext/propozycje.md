# Propozycje poprawek, udoskonaleń i argumentów dla jury

Ten plik zawiera zebrane audyty i propozycje optymalizacji smart kontraktu `solana-escrow`, wygenerowane podczas rewizji kodu (3 października 2026). Zostały one sformułowane w taki sposób, aby ułatwić prezentację przed jury HackYeah (optymalizacja pod punktację).

## 1. Atuty do zaprezentowania (Silne strony projektu)
*   **Time-Decaying Dispute Resolution (Oryginalność - 10%)**: Mechanizm palenia środków (decay) podczas sporu znakomicie rozwiązuje problem ociągającego się klienta. Czas to w Waszym projekcie dosłownie pieniądz – w tradycyjnych serwisach to freelancer traci nerwy, u Was oboje tracą wartość. To zmusza do szybkiej ugody.
*   **Brak pośrednika i niszcząca asymetria**: Pokazanie konkretnych liczb (np. "Upwork pobiera 10-20% prowizji, nasz smart kontrakt – 0%, jedynie groszowe fee sieciowe"). Zastosowanie *Mutual Assured Destruction* do rozwiązywania sporów.
*   **Code is Law**: Pod koniec prac pamiętajcie o odebraniu uprawnień do edycji programu (komenda `solana program set-upgrade-authority --final`). Zrzut ekranu poświadczający `Upgrade Authority: None` załatwi Wam pełne punkty w kryterium Zgodność z wyzwaniem (30%).
*   **Prywatność i Weryfikacja (Frontend)**: Liczenie hashów plików po stronie przeglądarki (klienta). Nikt nie wysyła plików na serwer (którego i tak nie macie).

## 2. Luki techniczne zaklasyfikowane jako "Potencjał Wdrożenia / Złożone ataki na Solanie"
Na hackathonie nie musicie ichłatać, ale jeśli sędziowie zapytają o wektory ataków, zaimponujecie im tą wiedzą.
*   **Token Dust Griefing w `close_escrow`**: Obecny kod ma `require!(vault.amount == 0)`. Ponieważ po zakończeniu zlecenia kontrakt blokuje opcje wypłat, napastnik może po prostu przesłać bezpośrednio ułamek (dust) tokena na adres vault. Saldo przestaje wynosić `0`, więc `close_escrow` nie zadziała, więziąc rent klienta (~0.004 SOL) na zawsze z winy ataku kosztującego grosze. W przyszłości można w `close` zaimplementować transfer resztek dust'u do klienta zamiast rzucać błędem.
*   **Asymetria sporu pomimo rozpadu (Decay)**: Choć `decay` to super rozwiązanie, nie leczy w 100% faktu, że to klient wpłacił z góry (stracił z portfela przed wykonaniem pracy). Najwyższym poziomem rozwoju (co dopiszcie do sekcji "Co za tydzień") byłby tryb **Dual-Deposit**, w którym obie strony blokują dodatkowy depozyt gwarancyjny przed rozpoczęciem współpracy.

## 3. Ograniczenia dla UX (Frontend)
*   Złośliwy użytkownik może stworzyć umowę z okienkiem czasowym na spór trwającym 1 sekundę. W programie `clamp` uchroni przed błędami matematyki, ale to frontend powinien stanowczo blokować i alertować freelancera, gdy klient ustawia zbyt drastyczne, niebezpieczne ramy czasowe.
