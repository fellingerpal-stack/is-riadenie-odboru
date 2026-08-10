# DATA AUDIT 0.33 · Raw Financial Ledger & Supplier History

## Zdrojové XLSX

| Rok | Riadky | Čistý zdrojový tok | Pole firma | Pohyby s IČO | Čistý tok s IČO | Max. mesiac |
|---:|---:|---:|:---:|---:|---:|---:|
| 2022 | 6 579 | 17 760 034.81 € | nie | 0 | 0.00 € | 12 |
| 2023 | 6 766 | 27 311 790.00 € | nie | 0 | 0.00 € | 12 |
| 2024 | 5 961 | 22 716 464.20 € | áno | 2 160 | 9 313 085.82 € | 12 |
| 2025 | 8 264 | 20 842 259.33 € | áno | 2 517 | 12 635 132.13 € | 12 |
| 2026 | 4 254 | 5 860 587.71 € | áno | 1 373 | 1 541 530.56 € | 6 |

## Dodávateľská finančná história

- Riadkové pohyby s IČO: **6 050**
- Unikátne IČO: **708**
- Záporné pohyby / korekcie: **200**
- Kladné toky: **23 825 459.06 €**
- Záporné toky: **-335 710.55 €**
- Čistý dodávateľský tok 2024–2026: **23 489 748.51 €**

Roky 2022–2023 nemajú v zdrojových exportoch stĺpec `firma`; release preto dodávateľskú identitu spätne nevymýšľa.

## IT klasifikácia z priamych XLSX

| Rok | H1 IT | Celý rok IT |
|---:|---:|---:|
| 2022 | 164 786.66 € | 412 714.51 € |
| 2023 | 274 972.49 € | 504 812.16 € |
| 2024 | 253 148.50 € | 1 105 767.10 € |
| 2025 | 531 526.92 € | 1 490 135.09 € |
| 2026 | 375 157.65 € | — |

## Kontroly

- všetky zdrojové počty riadkov a čisté sumy sa zhodujú s vygenerovaným `sourceCoverage`,
- všetky IČO v pohyboch sú normalizované na 8 číslic,
- podpísané sumy sa zachovávajú; korekcie/storná nie sú prepočítané na absolútne hodnoty,
- 2026 je v dodanom XLSX dostupný po jún, preto sa nepoužíva ako celoročný porovnávací rok,
- IT klasifikácia je konzervatívna a nevťahuje mzdové/transferové riadky iba kvôli náhodnému IT výrazu v poznámke.
