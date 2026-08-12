# DATA AUDIT v0.37 – SIT 2026 Jan–Júl

## Zdroj

- Súbor: `jul_audit-uloha-vsetky-vsetky-kategorie-vsetky-pracm-vsetky-fzd-vsetky-pgd.xlsx`
- Hárok: `Filtrovaný audit`
- SHA-256: `2865c69660197e9bfd1a02ae33a668bb1a334f687b6626ce93a9637ec81714af`
- Celkový počet dátových riadkov v zdroji: 5 126
- Riadky použité pre úlohy 10 / 22 / 25: 357

## Agregácia

| Úloha | Jan | Feb | Mar | Apr | Máj | Jún | Júl | Spolu |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 21 478,07 | 124 760,73 | 64 504,75 | 58 064,15 | 116 784,39 | 63 313,18 | 60 654,34 | **509 559,61** |
| 22 | 0,00 | 5 586,88 | 1 832,34 | 4 050,07 | 19 304,69 | 3 559,52 | 15 174,97 | **49 508,47** |
| 25 | 2 776,60 | 4 386,26 | 4 345,58 | 6 175,18 | 19 362,37 | 6 950,49 | 4 544,70 | **48 541,18** |
| **Spolu** | **24 254,67** | **134 733,87** | **70 682,67** | **68 289,40** | **155 451,45** | **73 823,19** | **80 374,01** | **607 609,26** |

## Počet zdrojových riadkov

- Úloha 10: 171
- Úloha 22: 64
- Úloha 25: 122

## Strediská z auditu

- Úloha 10: 130, 328
- Úloha 22: 341
- Úloha 25: 11, 52, 53, 54, 55, 312, 313, 316, 329, 342, 345

## Korekcia proti starému snapshotu

Úloha 25 mala v pôvodnom Jan–Máj snapshot-e 37 482,38 €. Nový audit dáva 37 045,99 €. Rozdiel je -436,39 €.

Kontrolované pohyby:

- `B12600710022`, 61,24 € – nový audit: úloha 6,
- `B12600590026`, 375,15 € (Profilaktická údržba) – nový audit: úloha 23.

Preto sa v0.37 regeneruje celé obdobie január–júl, nie iba dopĺňa jún a júl.

## Forecast – informačná kontrola

Pri jednoduchom priemere 7 mesiacov je spoločný annualizovaný run-rate približne 1 041 615,87 €, teda pod súhrnným rozpočtom 1 068 683 €. Konzervatívny forecast v Riadiacom centre používa pre každú úlohu vyšší z priemeru všetkých mesiacov a posledných troch mesiacov; po aktualizácii dáva približne 1 123 690,34 €.

Forecast je analytický signál, nie schválený finančný plán.
