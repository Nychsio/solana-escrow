# solana-escrow

Escrow dla zleceń freelancerskich **bez arbitra**, na Solanie (Anchor). Warunki wypłaty egzekwuje program on-chain, a nie backend. Projekt na HackYeah 2026, wyzwanie "Finance Without Intermediaries" (Superteam Poland).

## Stan

Zaimplementowana pełna logika escrow v2.1 (instrukcje: `create`, `accept_job`, `withdraw`, `mark_delivered`, `release`, `claim_if_silent`, `refund_if_late`, `cancel_by_freelancer`, `reject`, `propose_settlement`, `accept_settlement`, `burn_if_unsettled`, `close_escrow`): zgoda wykonawcy wiążąca warunki, kaucje obu stron, ustępowanie z `Frozen` przez obie strony, sprawdzanie minta, ograniczone terminy, zdarzenia na każdym przejściu i spór bez arbitra z decay. Poprawki (rewizje) zostały usunięte po audycie.

Kod v2.1 jest gotowy i przetestowany lokalnie; stan wdrożenia na devnecie opisuje sekcja „Devnet”. Jeszcze nie zrobione: odebranie upgrade authority; frontend (`app/`) do dostosowania do nowego IDL.

## Devnet

- ID programu: `6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8`
- Explorer: https://explorer.solana.com/address/6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8?cluster=devnet
- Wdrożona wersja = escrow v2, kod z commita `321084d` ([transakcja upgrade'u](https://explorer.solana.com/tx/2iZLqrJjPrG5RxiSoCZQeD8P971MEQ6AthYXGmapqR8jwHmTbtoRnhJxCGLWtkH3erC5f5BZVC3KnRLQ9WFiXPjq?cluster=devnet)). Pierwsze 369 992 B programu na łańcuchu są identyczne z `target/deploy/escrow.so` (reszta to zera po `solana program extend`).
- Upgrade authority jest na razie przy portfelu deweloperskim; zostanie odebrane przy code freeze (`solana program set-upgrade-authority --final`).

Powtórzenie demo na devnecie: `yarn demo:setup` (portfele i mint w `.demo-keys/`, poza gitem), potem `yarn demo:flow`, `yarn demo:dispute`, `yarn demo:cancel`, `yarn demo:ghost` i `yarn demo:revision` (wypisują linki do Explorera i sprawdzają statusy przez RPC).

## Dowód na devnecie

Program v2: `6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8` ([Explorer](https://explorer.solana.com/address/6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8?cluster=devnet)). Każda ścieżka to prawdziwe, sfinalizowane transakcje na devnecie, uruchomione skryptami `scripts/demo-*.ts` (kaucja 20% z każdej strony).

| Ścieżka | Transakcje po kolei | Co pokazuje |
|---|---|---|
| a) release (`demo:flow`) | [create](https://explorer.solana.com/tx/5uggEfBrcwa3uPXuPFNt3is5y1k8ujSwpxPCaF7vceUFNR7QpdZ5gU9bWgukoMTLjncCQ5E1TKkE1ZRjH2joavvF?cluster=devnet) → [accept_job](https://explorer.solana.com/tx/385h2HaKuRoY2Sv5cVbRSQDvgjDhRdPgNoTX54FsBF4E9X7DmEgyDQpniq8jmdYg19d75cknHkzPEmt8fC2krG6E?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2gAmnVa69oiZN3PCuY3Jo4SPJQSa7eKUPjUL8jdCMQpZoxNz4aQQxWUYDQGspnzdrsH61i6GZnkBghVB8G84ibmD?cluster=devnet) → [release](https://explorer.solana.com/tx/5jb9m2AqcMswNpBhHk214JtpWnBCVtbBZ7SB5Ddyv76ujRYbv6mqEPz7LtkDuWq8hYABgbQGVSULwUiEw6uzcaRd?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5oApy5jAit6kjXhiyxwsWjUnPgcLyW7ZHryzYNv6TpdYjbmhhg1EFwQZE2bG9yhVWhrZq743pZSxdGBApv9zMoAW?cluster=devnet) | Wykonawca przyjmuje zlecenie i wpłaca kaucję (skarbiec: 120 zamiast 100), a po zatwierdzeniu klient wypłaca mu kwotę plus jego kaucję: wykonawca zarabia dokładnie 100. |
| b) ghosting (`demo:ghost`) | [create](https://explorer.solana.com/tx/3Ggx6CdWut59yf7cU8xHqNkC1d64JtshyJiUTSs2qHwjLkyjdbjYppC1dGk9uHsoNcisbXBp65wtShuEQYB8PNtX?cluster=devnet) → [accept_job](https://explorer.solana.com/tx/5D5m3g7TTGJvoaYbCmz7q9fYbCqAnyQjLkiWUaA3mv8m66Mxe688akrqutKnqxy5RTor4y8zJN93H4YxXMUpGHtB?cluster=devnet) → [refund_if_late](https://explorer.solana.com/tx/3qTfvtVBunikANUuMg4ZqsegiG7Y1v8yMqj4zpAqSxKoDLs4idBLmURTXmqekueAx4tipJaC9Graj4vP8kMHMMV8?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/4U8GLZ44CWGd8qACaF26p55kLrh2uuyec7yizfEqov4Xw2F8TbCWSUpJLPmqKkqxGfLw3dhaxe7vGzHoYeUGV2gY?cluster=devnet) | Wykonawca przyjął zlecenie i zniknął. Po terminie dowolny, trzeci portfel (nie klient ani wykonawca) wywołuje `refund_if_late`, a klient dostaje swoje środki plus kaucję wykonawcy (+20 tokenów kary). |
| c) spór z decay (`demo:dispute`) | [create](https://explorer.solana.com/tx/55CZ8ckfnJsFmvPwttnU9hzynzt9L8Ugjty4kpQiUZ5jZ5VF9YvfF7tkDFNfJ2EpB7NGj9CSCqsghHRfxDL7f4uc?cluster=devnet) → [accept_job](https://explorer.solana.com/tx/2tanD7RetkvRfJSDS2uUv1W1wpwZXvpm9p9D2aWk6uWzbyHnR6StdfK9C2irtotbB7gUfs7hepWpMDQC7xcEU49e?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/3bYj1LSMiWGkM7ehtf6MuYqXtwRtRsAgDVKtoLXWT6BatQe8TQuKcZhD1bPXDU2DJjjCZRFi34svF7y6txu1LYqU?cluster=devnet) → [reject](https://explorer.solana.com/tx/4BJAMd62ewR7oPjfKpAbbmkgUgF8rFiKo6x75HYMtnRaoPn5VCk8nEYPR1SmfNu1T1Ee1gGmtg2K7vKJhtcwKat3?cluster=devnet) → [propose_settlement](https://explorer.solana.com/tx/5sknVWihEfGwTGQHoT1uUD1ccTnGVAhU9yRtBJvtsDZLK4T98u4Q7aP4pbQsvxYEYvWptg3YXKQAPfA2rUZTE1hE?cluster=devnet) → [accept_settlement](https://explorer.solana.com/tx/4cu8rAvLSaDJKsWFRMbtyCx3CoYQeuweZMeV8iaN2AjSeqtakW1me66aT5Kn5rLiqrDo2Ymqo7ujbuYPRpMaY71B?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5corGwyBzKvKGbz18UUP25EyAmKHjKdFoxFP7a7AgDFtzcTJoAqpgsB6TK6dkYMDdEHEWFxrvBx5EJuAg9BVd6n2?cluster=devnet) | Klient odrzuca dostawę i wpłaca własną kaucję (skarbiec 140), strony ustalają podział 70/30, a ugoda po ok. 20 s z okna 60 s spala część skarbca (38,3%), więc zwlekanie kosztuje obie strony. |
| d) rezygnacja wykonawcy (`demo:cancel`) | [create](https://explorer.solana.com/tx/3eH5nuo36LmNjkAPs1it915MDmnDnfaFo4BUV1EnFYYM2x3uugjJzRxEZTLpwFNov5JveqJtqgjr5xWN1Ur6V5sK?cluster=devnet) → [accept_job](https://explorer.solana.com/tx/3QMzRKhppQ8jvWrePYF7pX54sziMG24dJzuCTutBvRSYHnbBSbpo7UiEaboDRpBjvK6yctWDgmTcYZw9BDLcKzmp?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2Gr6MF19svSaPpHcY14Zp6M3FgRGyuv7NStNv311QvfJtbAJWuXPKSW4oKeBc4xyeWNYz2rYD2Ji8fgsJeXpui43?cluster=devnet) → [cancel_by_freelancer](https://explorer.solana.com/tx/4Vki2nZ4b8r6Zv97j5MrsA3EvBPEYgKQLJ7jY6KeDhQHKACJgoJKsf5dBCSQhkr8zbmfJjgwMPY3A6HXYx4yhFvk?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/3Hk3JvjpzA5EEDN1avb48WXk3BgNw5cxRi3VQuV2BaGHNikdJ8EU9zvTyR1eYWd8w5io1Bk7RLkjibCabTYpGcXg?cluster=devnet) | Wykonawca jednostronnie rozwiązuje umowę: każda strona dostaje z powrotem dokładnie to, co wpłaciła, bez spalania. |
| e) poprawka (`demo:revision`) | [create](https://explorer.solana.com/tx/5CZpb4HB6Ys36AYwY83kodqGn61akkVMEr56GJFppaypkth92xMAopZaNa8exxY1GFJAsGzvfQL3AisWgzmCg7zx?cluster=devnet) → [accept_job](https://explorer.solana.com/tx/4pUUSu2uXG79w8KJoP3rPjtfBV5BJUaZ8LdSbcJe1mZcQUbjkDBGZL7YFURkhpLPj5fEKztDFXjGFdtTDBf5jDZ8?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/4RKX26zHUyHnoLPyFWTo2PRNFWUMW6twZ4tmYGzC2GrXoYhkL54BRHXi42tRVSRdYGqY23VqtfcSryaFj8N9he1o?cluster=devnet) → [request_revision](https://explorer.solana.com/tx/3LV2YdWZocYavvaki7eSd9DbZvfLkmzGL5FmrDKAbJrWBkhGw2PCGEQfJMo9vSiqEAnae5CJBcWQQKTRR31oVB4u?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/46SQ9EFv7B3H4aJAPdP91U5zbYrvxfgTctEaivAAboWbDSoHEW8KMmwo1m55fUJae4zVMPQ1bpaav6KWn2KJLjcq?cluster=devnet) → [release](https://explorer.solana.com/tx/qB1bCnhorFhFn6oAcQHGEKhuQk5zjDaDS5u8oBoyvPuEhsKkMfhHmxn5YfukS5xaA3wZSdgWC1iq2NASGeL84gc?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/aY1aqrwfnaFH2xbThLzeekTVx8VQULgs2tPaeRFgsQiRYbddktdDbKfFTBk9S1C54fC8vtu9o6VT1VCknAC4eUo?cluster=devnet) | Klient prosi o poprawkę zamiast odrzucać: zlecenie wraca do `Accepted` z późniejszym terminem, wykonawca dostarcza drugą wersję i dostaje wypłatę. |
| Upgrade authority | `<TBD po --final>` | Po odebraniu nikt, także autor, nie może zmienić programu. |

Linki z kroków `close_escrow` zwracają rent klientowi (skarbiec i konto umowy są zamykane).

## Dowód na devnecie: wersja v1 (historia)

Te transakcje wykonano na poprzedniej wersji programu (bez `accept_job`, kaucji i poprawek); pozostają na łańcuchu jako historia. Ścieżki a, b, c1 i c2 kliknięto z interfejsu przeglądarkowego, ścieżkę d skryptem.

Program (wersja v1): `6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8` ([Explorer](https://explorer.solana.com/address/6KsiGDi8o9E1qNWxpzdew2CkDyQFqfeoLs79fAJ457D8?cluster=devnet)). Każda ścieżka poniżej to prawdziwe, sfinalizowane transakcje na devnecie; kliknięcia a, b, c1 i c2 zrobione z interfejsu przeglądarkowego dwoma portfelami, ścieżka d skryptem `yarn demo:cancel`.

| Ścieżka | Transakcje po kolei | Co pokazuje |
|---|---|---|
| a) release | [create](https://explorer.solana.com/tx/25hkshn3qacDvEicWiwsQjDNpFUAcZsqEzVeyebhrPukG5VdFt29osZkFEVAzT9A3gsB1KMqGctbKQvP9QvWMcQF?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/5jr1YzfWPWNvQEBMKLe5YDF4f1toHjNAQvoTV7eG9gyP4zighjzhtFwrSZyxLxULg4rT3jmx94XZYefmuk9VUuXn?cluster=devnet) → [release](https://explorer.solana.com/tx/jwkvjqNyzUXRRWDqd6jMWWx3AqYJv2Uis75vqLrhVF5awdh29x4P2ahonFvH3BvKCJM7c78tgc6XVzcETJ8DheL?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5mkW2axGQJRk4HLUHJuBH52o3bWdFeg58DVs5LUJ84hkUo5jTgjLnhBAzK8aRPAjomD7WyY9PwGgyDJjuBcUed1e?cluster=devnet) | Klient zatwierdza dostawę, a program sam wypłaca skarbiec wykonawcy, bez pośrednika. |
| b) refund_if_late | [create](https://explorer.solana.com/tx/4gEw72aZMBgd7bXAEoXPqFjHNXQdBXPw9edu5pa2fEfYt4mP8W3sJPontsjbtyBsgHM44wD1pF32K1Dg14QpHBvD?cluster=devnet) → [refund_if_late](https://explorer.solana.com/tx/3qMAtV6tJ1WiUhjgcJR9iDRpPrANqdQ9D7v4C5T937onwXuLqGEhRBShyJoD8Vc2tbx52Tgvj4AUreoXSFV92cby?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/TWsVQHdEk1cFpV33jXFcBCNTfqMjKL6AUMQS7e8fhPuZUo7w3gv9qPntubAccQQzuGX6R4LBG8roiC6dDWfU1rp?cluster=devnet) | Wykonawca nie dostarczył do terminu, więc klient sam odzyskuje środki. |
| c1) ugoda z decay | [create](https://explorer.solana.com/tx/4rETFDUS1b4NwDnHSPWWDC2JXpfaYCbtfDvvDtjM2NgARb6FM4kGCjQ3rBeGQqPyJJScFD7ZgHhU5xDyVRgrpjng?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/4hgbLQ49Gk6UxKZB8R9Q1jEhJ8hoKpyj859vp4MARg74rZTEprsX6qbTTcY4mgYd4gW98KtmWbmCGTY7bbsUMFGU?cluster=devnet) → [reject](https://explorer.solana.com/tx/9VVuSE9xNjp3BDEmQ1jHH2knbaCHgMuvkHm94TMHYmCZwzfsAX6KHtNqpC2AAcuL75ZKzmggUdSJTtQfaMkbGmu?cluster=devnet) → [propose 70%](https://explorer.solana.com/tx/2oadUhJqVKgY8Fb5gxrSYSz4GrMLPWjgDTJaNjiPid4Wkm5EYZB7EGNTpBxv56yY3aoZxJy7jJVXDXjcpkMcHE4M?cluster=devnet) → [accept](https://explorer.solana.com/tx/B4sx71fahmX5ja4CPN7Y7DhzWU1CiycG5h8vjgSRmQrMA9L2H1E5RLUphdr5ZhK5EkwLfcAAKMs9E8EMkb9bJuB?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5uUCunyo4AuQAiKncYJkZzdEQNv1GEocorFdB6WTotSGp9EG3DzjU3j811gTNjnvynuAHW9CZL2bmHKncnQj11Uh?cluster=devnet) | Klient odrzuca dostawę, strony dogadują podział 70/30, a akceptacja po ok. 91 s z 300 s okna sporu spaliła część skarbca (decay), więc zwlekanie kosztuje obie strony. |
| c2) burn | [create](https://explorer.solana.com/tx/4Fz1Wy2Th3uBVu26eCphwLFA16W87wz8CMjESuAbhVDhkfarsRPZkd5oFG9Hr9Z3gvyz32DCJKae3XSfprUeMT2N?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2YB7dUaBoSgHyb1r3vKkCmP2btjCt14rp1hPvRnbup7orYehioTUmndm9V6BQVzxRfrtXxyJPS5XvqFdAniSymrG?cluster=devnet) → [reject](https://explorer.solana.com/tx/2Wr1CDvzzeVpVoY7VGwozmr3rwk3h8PmbiMeACuNbgm8RWCUPqcTfhk5YkmT3JE6bxWAgJHeUbpzremegehqiqYL?cluster=devnet) → [burn_if_unsettled](https://explorer.solana.com/tx/65GdBWHJGtVYbg5kz4hoNQz6rQTDMhoziKZfgCt4u8yikRBsPssudmN1gJ859jR6DGKeH9vQHk87x1PQ5ge45d6g?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5JEkgavuyG9gwaMzwcvSd7Zd7Bcg6j3Avkp3A616GKsAUjbVeajd6tMCNRDfocsJYCkZAVkeAwzedLCtRbuhitDx?cluster=devnet) | Bez ugody w oknie sporu środki zostają spalone przez dowolną osobę, więc nikt nie zyskuje na sporze. |
| d) cancel_by_freelancer | [create](https://explorer.solana.com/tx/57ZEQF1aEzQeoCf99FgZCEXyjNubrMtkFuVNsYcz77EbUHSmMsccsGd7UWeushcGK3VosCs5Sig9FM5NQozqovbB?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2cqMfWMtEuh1r3AdJYt2rb1UVdFtL8sD1BFZzxv8xFzvbx6nBqPeskwzhjJqvXJayrVcF5YXqeP6NmqYWsSgEEU2?cluster=devnet) → [cancel_by_freelancer](https://explorer.solana.com/tx/26HGeuxYjw8bVBLxPRt5YSCau7YFXzNKw11wqmUEYk574g9D1xQa5VkKv6CJMxs7YkYU4iExhjHkVGF9t4waYask?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5o2cr5Yp1AUg3mykEt8Pk2ZDPoAzuZtWmax5NpJUNNqE34GXtbPpr4qqdaTPTMYEv5hr2krkDPBsJegdef1LP73T?cluster=devnet) | Wykonawca jednostronnie oddaje klientowi całe saldo bez spalania, a klient odzyskuje rent po `close_escrow`. |
| Upgrade authority | `<TBD po --final>` | Po odebraniu nikt, także autor, nie może zmienić programu. |


Dodatkowe ścieżki ze skryptów v1:

- Ścieżka akceptacji (`yarn demo:flow`): [create](https://explorer.solana.com/tx/64342DqfyBnGaGXxXoFtr8Z7i5retakZ4jtKZHZo9uuVcB7odaf22getZWkMVfKUkzyfMzUkCDWb5kLkvsScg6sP?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/5qUfyvZUpm2mKnkSoN6wdENvChr1Piv4CNB24pwDn7WqcJBVmSN1x3o1CzBJrm6WVmqJkcZvMLhjkSyiuHVuxiuf?cluster=devnet) → [release](https://explorer.solana.com/tx/39niP11eh279x6AKH3mm2cZgZsV4d1Xc54CWEZ7bW6gdMjYcnGT2QVGncJHjST1Kn6JB6zp8BeT2WCte9HeGtZC7?cluster=devnet)
- Ścieżka sporu (`yarn demo:dispute`): create → mark_delivered → reject → propose → accept (z decay, w przykładzie spalone 38,3%) → close_escrow (zwrot rentu):
  1. [create](https://explorer.solana.com/tx/UNH8SnddpXu6QJQrmdkRnxgpRM4YMGf245nVMXHEAiG35CB6QHSp5YJU2GqXT9xxDS6aYqcjnHop2WS2EUN3pve?cluster=devnet)
  2. [mark_delivered](https://explorer.solana.com/tx/57fPePGf6Qi158QyQnER6iKxQ19wiuQ3KnU4CUdVHAH5GeB2ZaTEBNuVSTHBvHSX3jEvXaiu3UB49j9ncZtvK2LH?cluster=devnet)
  3. [reject](https://explorer.solana.com/tx/2vXZ6SGqTdKDSCKLgdhEQq8pKZQBWpTfhaUMkatEDC6zesYfMKGwk7cpJMKUtw3MBqxQN1CnZ1UiTZHYwJ8WoqH6?cluster=devnet)
  4. [propose_settlement](https://explorer.solana.com/tx/5Yumo4y39KkFRjeKG6voiqLX1ycqQmxHRm5CiLvMdkiCH6N46ordpGpb4RVKsCdQLjjvFrrqtztw65bmScTaqNgo?cluster=devnet)
  5. [accept_settlement](https://explorer.solana.com/tx/3LA8NQCbvHaGa4uPrhbAAE1BJgqJZJfBqmQ2mMzyfEPF2vD4s5K7NJcbsrhbB7rUQ1gZduR8kH8dCVV6RpQuv3cp?cluster=devnet)
  6. [close_escrow](https://explorer.solana.com/tx/D3dSe63QmgjpJXJWughKLeZv33ztXzzBK6cXPG5FRhBTDag81w7iktEsyQQ6pVQUHhcCrjapUidRHYB1TKpshNj?cluster=devnet)
- Ścieżka rezygnacji wykonawcy (`yarn demo:cancel`): [create](https://explorer.solana.com/tx/57ZEQF1aEzQeoCf99FgZCEXyjNubrMtkFuVNsYcz77EbUHSmMsccsGd7UWeushcGK3VosCs5Sig9FM5NQozqovbB?cluster=devnet) → [mark_delivered](https://explorer.solana.com/tx/2cqMfWMtEuh1r3AdJYt2rb1UVdFtL8sD1BFZzxv8xFzvbx6nBqPeskwzhjJqvXJayrVcF5YXqeP6NmqYWsSgEEU2?cluster=devnet) → [cancel_by_freelancer](https://explorer.solana.com/tx/26HGeuxYjw8bVBLxPRt5YSCau7YFXzNKw11wqmUEYk574g9D1xQa5VkKv6CJMxs7YkYU4iExhjHkVGF9t4waYask?cluster=devnet) → [close_escrow](https://explorer.solana.com/tx/5o2cr5Yp1AUg3mykEt8Pk2ZDPoAzuZtWmax5NpJUNNqE34GXtbPpr4qqdaTPTMYEv5hr2krkDPBsJegdef1LP73T?cluster=devnet). Klient odzyskał 100 tokenów, nic nie spalono.

## Co gdzie leży

| Ścieżka | Zawartość |
|---|---|
| `programs/escrow/src/lib.rs` | Punkt wejścia programu: lista instrukcji |
| `programs/escrow/src/state.rs` | Konto `Escrow`, enum `EscrowState`, `require_state`, koniec okna akceptacji |
| `programs/escrow/src/errors.rs` | Kody błędów |
| `programs/escrow/src/instructions/create.rs` | `create`: utworzenie umowy i wpłata do skarbca |
| `programs/escrow/src/instructions/delivery.rs` | `mark_delivered`, `reject` |
| `programs/escrow/src/instructions/close.rs` | `close_escrow`: zamknięcie skarbca i konta po zakończeniu umowy |
| `programs/escrow/src/events.rs` | Zdarzenia emitowane przy każdym przejściu stanu |
| `programs/escrow/src/instructions/dispute.rs` | `propose_settlement`, `accept_settlement`, `burn_if_unsettled` |
| `programs/escrow/src/instructions/payout.rs` | `release`, `claim_if_silent`, `refund_if_late`, `cancel_by_freelancer` oraz `pay_from_vault` (jedyna funkcja wypłacająca ze skarbca) |
| `scripts/` | Skrypty demo na devnecie: `demo-setup.ts` (portfele, mint, tokeny, portfel crank), `demo-lib.ts` (wspólne wywołania), `demo-flow.ts`, `demo-dispute.ts`, `demo-cancel.ts`, `demo-ghost.ts`, `export-keys.ts` (klucze demo w base58 do Phantoma, tylko lokalnie) |
| `app/` | Frontend (Vite + React + TS + Wallet Adapter): czyta konta z chaina i buduje transakcje, bez backendu |
| `tests/escrow.ts` | Testy wszystkich ścieżek na localnecie |
| `Anchor.toml` | Konfiguracja workspace'u Anchor (klaster, portfel, skrypt testowy) |
| `migrations/deploy.ts` | Szablonowy skrypt deployu z `anchor init` (pusty) |
| `AIcontext/` | Stan projektu, decyzje i log zadań |

## Zasady umowy

| Instrukcja | Kto podpisuje | Warunek | Skutek |
|---|---|---|---|
| `create` (+ `dispute_window_secs`, `bond_bps`) | klient | `amount > 0`, klient i wykonawca to różne portfele (`SameParty`), `review_window_secs > 0`, `dispute_window_secs > 0`, `deadline_ts > now`, termin i okna <= 90 dni (`WindowTooLong`), `bond_bps <= 10000`, mint z białej listy | wpłata kwoty do skarbca, `Funded` (czeka na akceptację) |
| `accept_job(expected_amount, expected_bond_amount, expected_deadline_ts, expected_review_window_secs, expected_dispute_window_secs)` | wykonawca | `Funded`, `now <= deadline_ts`, warunki na koncie równe tym, które wykonawca widział (`TermsMismatch`) | wpłata kaucji `amount * bond_bps / 10000` do skarbca, `Accepted` |
| `withdraw` | klient | `Funded` (przed akceptacją) | całe saldo → klient, `Refunded` |
| `mark_delivered(deliverable_hash)` | wykonawca | `Accepted`, `now <= deadline_ts` | zapis czasu i hasha dostawy, `Delivered` |
| `release` | klient | `Funded`, `Accepted`, `Delivered` lub `Frozen` | całe saldo → wykonawca, `Released`; z `Frozen` to ustąpienie klienta: wykonawca dostaje kwotę plus obie kaucje, propozycja ugody jest zerowana (zdarzenie z `conceded = true`) |
| `claim_if_silent` | ktokolwiek | `Delivered`, `now > delivered_at + review_window_secs` | całe saldo → wykonawca (konto pinowane), `Released` |
| `refund_if_late` | ktokolwiek | `Funded` lub `Accepted`, `now > deadline_ts` | całe saldo → klient (konto pinowane); z `Accepted` to kwota plus kaucja wykonawcy jako kara za ghosting, `Refunded` |
| `cancel_by_freelancer` | wykonawca | `Funded`, `Accepted`, `Delivered` lub `Frozen` | bez spalania, `Refunded`; z `Funded` klient dostaje wszystko; z `Accepted` przed terminem lub z `Delivered` wykonawca odzyskuje własną kaucję, a klient resztę; z `Accepted` po terminie (porzucenie) kaucja przepada na rzecz klienta; z `Frozen` to ustąpienie wykonawcy: całe saldo (kwota plus obie kaucje) → klient |
| `reject` | klient | `Delivered`, `now <= delivered_at + review_window_secs` | klient wpłaca własną kaucję, `Frozen`, zapis `frozen_at` |
| `propose_settlement(freelancer_bps)` | klient lub wykonawca | `Frozen`, `now <= frozen_at + dispute_window_secs`, `bps <= 10000` | zapis proponującego i podziału, nadpisuje poprzednią propozycję |
| `accept_settlement(freelancer_bps)` | strona inna niż proponujący | `Frozen`, jest propozycja, `bps` = zapisany, w oknie sporu | najpierw spalany jest `saldo * elapsed / dispute_window_secs` (decay), z reszty wykonawca dostaje `reszta * bps / 10000`, klient resztę, `Settled` |
| `burn_if_unsettled` | ktokolwiek (płaci tylko za transakcję) | `Frozen`, `now > frozen_at + dispute_window_secs` | spalenie całego salda skarbca, `Burned` |
| `close_escrow` | klient | `Released`, `Refunded`, `Settled` lub `Burned` | spala ewentualne resztki w skarbcu (dust), zamyka skarbiec i konto `Escrow`, rent wraca do klienta |

- Konto `Escrow` to PDA z seedów `["escrow", client, id_u64]`. Skarbiec to konto tokenowe (ATA), którego authority jest to PDA.
- PDA nie ma klucza prywatnego, więc wypłatę lub spalenie może podpisać tylko ten program (signer seeds, w jednym miejscu: `Escrow::with_signer_seeds`); wypłaty idą przez `pay_from_vault`.
- Dual deposit: obie strony wpłacają kaucję (wykonawca przy `accept_job`, klient przy `reject`). Kaucja ma sens tylko dlatego, że w `Frozen` każda strona może ustąpić: klient przez `release`, wykonawca przez `cancel_by_freelancer`, i ustępujący traci swoją kaucję (druga strona dostaje wszystko). Ghosting po akceptacji też kosztuje: po terminie kaucja wykonawcy trafia do klienta, a `cancel_by_freelancer` po terminie jej nie zwraca. Podstawa: Asgaonkar i Krishnamachari 2018, https://arxiv.org/abs/1806.08379.
- Spór nie ma arbitra. Po `reject` środki (kwota plus dwie kaucje) są zamrożone, a strony mają okno (`dispute_window_secs`) na ugodę: jedna proponuje podział, druga go akceptuje, podając ten sam `bps`. Decay: im dłużej trwa spór, tym większa część skarbca ginie przy ugodzie (liniowo od 0% do 100% w oknie sporu). Bez ugody każdy może spalić środki (`burn_if_unsettled`), więc nikt, także autor, nie zyskuje na sporze. Program nie wie, kto ma rację, i bez arbitra nikt tego nie rozstrzygnie; ogranicza tylko, ile można ugrać na kłamstwie, każe płacić za zwłokę i daje każdej stronie wyjście: ustąpić, dogadać się albo spalić wszystko.
- `claim_if_silent` i `refund_if_late` może wywołać każdy portfel (crank); konto docelowe jest przypięte do wykonawcy lub klienta, więc obcy może tylko wysłać pieniądze do prawowitego właściciela.
- `accept_job` niesie warunki, które wykonawca widział (kwota, kaucja, termin, okna). PDA zależy tylko od (klient, id), więc umowa wycofana, zamknięta i utworzona ponownie pod tym samym id miałaby ten sam adres i link, ale inne warunki; bez tej kontroli transakcja wykonawcy wylądowałaby na nowych warunkach (`TermsMismatch`).
- `create` sprawdza mint. Klasyczny SPL Token jest dozwolony, Token-2022 tylko z rozszerzeniami metadata i group (biała lista, reszta odrzucana jako `UnsupportedMint`): nic nie może przenieść, opodatkować, zamrozić ani wstrzymać skarbca poza programem. Jawne ograniczenie: uprawnienie `freeze_authority` samego minta nie jest rozszerzeniem i nie blokuje (ma je np. USDC, którego emitent, Circle, może zamrozić dowolne konto tokenowe, także skarbiec), więc to ryzyko emitenta tokena, którego program nie usuwa.
- Na każdym przejściu stanu program emituje zdarzenie (`EscrowCreated`, `JobAccepted`, `Withdrawn`, `Delivered`, `Released`, `Refunded`, `Rejected`, `SettlementProposed`, `Settled`, `Burned`, `Cancelled`, `Closed`), więc historię można odtworzyć z logów transakcji.
- `Released`, `Refunded`, `Settled` i `Burned` są stanami końcowymi: przyjmuje je już tylko `close_escrow`.
- Rozmiar konta `Escrow` jest stały (235 bajtów danych, pilnuje tego asercja w `state.rs`); nowe pola biorą się z `_reserved`, a nowy stan `Accepted` jest dopisany na końcu enuma, więc indeksy starszych stanów się nie zmieniły.
- W programie nie ma klucza admina, instrukcji `update` ani konta uprzywilejowanego.

Ograniczenia: konta tokenowe odbiorców muszą istnieć przed wypłatą; konta zamyka dopiero `close_escrow` (po jego użyciu `id` można utworzyć ponownie); spalenie jest nieodwracalne (to cena braku arbitra); `freeze_authority` minta nie jest sprawdzane (patrz wyżej).

## Uruchomienie

Wymagane: Rust, Solana CLI 3.1.x, Anchor CLI 1.1.2, Node.js, Yarn.

```
yarn install
anchor build
anchor test
```

## Frontend (app/)

Statyczna aplikacja w przeglądarce. Nie ma backendu ani bazy: stan umowy czyta z konta `Escrow` na devnecie, a każdą zmianę wykonuje transakcja podpisana w portfelu i sprawdzona przez program.

```
yarn app:install
yarn app:dev          # http://localhost:5173
yarn app:build        # statyczny build w app/dist
```

Uruchomienie: `yarn app:install`, potem plik `app/.env` z adresem RPC devnetu (`VITE_RPC_URL=...`, wzór w `app/.env.example`; bez niego aplikacja używa `https://api.devnet.solana.com`, który bywa ograniczany limitami), na końcu `yarn app:dev`.

Demo dwoma portfelami:
1. `yarn demo:setup` (SOL + tokeny testowe), potem `yarn demo:keys` wypisuje w terminalu klucze klienta i wykonawcy w base58. Wynik tylko do importu w Phantomie, nie zapisywać.
2. Phantom: Ustawienia → Developer settings → włącz Testnet mode → wybierz sieć **Solana Testnet** (nie Devnet). Phantom tylko podpisuje i pokazuje 0 SOL, to normalne: transakcje wysyła aplikacja przez RPC devnetu z `app/.env`. Dlaczego tak: na sieci Devnet okno Phantoma ładowało się ponad 90 s (jego własny RPC), blockhash wygasał i transakcja nie przechodziła. Zaimportuj oba klucze jako osobne konta (albo dwa profile przeglądarki).
3. Klient: „Nowa umowa” → adres wykonawcy, kwota, termin, okna (preset 2 min do demo). Link `#/escrow/<PDA>` wysyłasz wykonawcy.
4. Ekran umowy pokazuje tylko akcje dostępne dla roli, stanu i czasu; rozstrzyga zegar on-chain. Każda transakcja kończy się toastem z linkiem do Explorera, a historia umowy pochodzi z `getSignaturesForAddress`.

Hash dostawy: przeglądarka liczy SHA-256 pliku (Web Crypto), plik nie opuszcza komputera. Klient wrzuca otrzymany plik i widzi ✅/❌ zgodności z hashem zapisanym on-chain.

## Użyte komponenty zewnętrzne

Program (Rust):

- `anchor-lang` 1.1.2: framework programu
- `anchor-spl` 1.1.2: `token_interface` i `associated_token`
- SPL Token / Token-2022 oraz Associated Token Account: programy on-chain wywoływane przez CPI

Testy (TypeScript):

- `@anchor-lang/core` 1.1.2: klient Anchor
- `@solana/web3.js` 1.x
- `@solana/spl-token` 0.4.x
- `mocha`, `ts-mocha`, `chai`

Narzędzia: Solana CLI (Agave) 3.1.10, Anchor CLI 1.1.2, Surfpool 1.6.0 (lokalny walidator w `anchor test`), Claude Code (wsparcie przy kodowaniu).
