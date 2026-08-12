# Release 0.42.0 – KOMIS Contract & SLA Intelligence

## Cieľ

Release rozširuje CVTI 360 a modul Zmluvy a SLA o zmluvnú finančnú vrstvu KOMIS podľa verejnej zmluvy v CRZ:

https://crz.gov.sk/data/att/4838476_dokument1.pdf

Zdrojom cien je posledná strana prílohy „Príloha č. 1 SP – Štruktúrovaný rozpočet ceny“.

## Dôležitá metodika

Zmluva uvádza technickú podporu jednotlivých modulov ako **kvartálnu cenu** na 84 mesiacov / 28 kvartálov.

Aplikácia preto zobrazuje:

- zmluvnú kvartálnu cenu,
- **mesačný SLA ekvivalent = kvartálna cena / 3**,
- cenu podpory za 84 mesiacov,
- jednorazovú statickú cenu vybudovania / rozvoja bez podpory.

Mesačný údaj nie je označený ako skutočná mesačná faktúra. Ide o manažérsky prepočet z autoritatívnej zmluvnej ceny.

## Moduly KOMIS

| Modul | SLA / mes. bez DPH | SLA / mes. s DPH | SLA / kvartál bez DPH | Podpora 84 mes. s DPH | Rozvoj / vybudovanie s DPH |
|---|---:|---:|---:|---:|---:|
| PRIMO | 916,67 € | 1 100,00 € | 2 750,00 € | 92 400,00 € | 825 216,00 € |
| CREPČ | 950,00 € | 1 140,00 € | 2 850,00 € | 95 760,00 € | 184 080,00 € |
| CREUČ | 950,00 € | 1 140,00 € | 2 850,00 € | 95 760,00 € | 131 424,00 € |
| SK CRIS / CIP VVI | 2 250,00 € | 2 700,00 € | 6 750,00 € | 226 800,00 € | 873 984,00 € |
| CRZP / ANTIPLAG | 1 533,33 € | 1 840,00 € | 4 600,00 € | 154 560,00 € | 261 648,00 € |
| SCIDAP | 1 500,00 € | 1 800,00 € | 4 500,00 € | 151 200,00 € | 898 512,00 € |
| SVD | 800,00 € | 960,00 € | 2 400,00 € | 80 640,00 € | 586 992,00 € |
| Open Access | 1 500,00 € | 1 800,00 € | 4 500,00 € | 151 200,00 € | 752 448,00 € |
| Analytický modul | 700,00 € | 840,00 € | 2 100,00 € | 70 560,00 € | 415 248,00 € |
| Prezentačná platforma | 500,00 € | 600,00 € | 1 500,00 € | 50 400,00 € | 149 136,00 € |
| ISS CVTI SR | 1 800,00 € | 2 160,00 € | 5 400,00 € | 181 440,00 € | 393 936,00 € |
| Centrálne funkčné komponenty | 1 916,67 € | 2 300,00 € | 5 750,00 € | 193 200,00 € | 751 344,00 € |

### Súhrn zmluvy

- mesačný SLA ekvivalent všetkých 12 modulov: **15 316,67 € bez DPH / 18 380,00 € s DPH**,
- podpora za 84 mesiacov: **1 286 600,00 € bez DPH / 1 543 920,00 € s DPH**,
- vybudovanie a rozvoj modulov bez SLA: **5 186 640,00 € bez DPH / 6 223 968,00 € s DPH**,
- rámec „Úprava diela vyplývajúca z prevádzky a konzultácie“: 7 000 hod. × 55 € = **385 000,00 € bez DPH / 462 000,00 € s DPH**,
- celá zmluva: **6 858 240,00 € bez DPH / 8 229 888,00 € s DPH**.

Kontrolný súčet: rozvoj + 84-mesačná podpora + rámec prevádzkových úprav = celková cena zmluvy.

## CVTI 360

V detaile entity pribudla zmluvná finančná vrstva KOMIS.

Mapovanie:

- CRZP / ANTIPLAG → CVTI 360 `crzp-aps`,
- SK CRIS / CIP VVI → `rvvi`,
- SCIDAP + SVD → spoločná existujúca 360° entita `scidap`, pričom obe zmluvné položky zostávajú zobrazené samostatne,
- ISS CVTI SR → `iss`,
- KOMIS → zobrazuje celé portfólio všetkých 12 modulov.

Pri CRZP tak zostáva vedľa existujúceho reálneho čerpania úlohy 22 aj samostatný zmluvný SLA kontext. Tieto dve hodnoty sa nemiešajú.

## Zmluvy a SLA

V module Zmluvy a SLA pribudol:

- prehľad KOMIS na hlavnom prehľade,
- kompletný rozpad 12 modulov v záložke SLA kontrola,
- mesačný, kvartálny a 84-mesačný SLA údaj,
- statická cena vybudovania / rozvoja,
- priamy odkaz na zdrojovú zmluvu v CRZ.

## Globálne hľadanie

Ctrl+K a vyhľadávanie CVTI 360 teraz zahŕňa aj názvy zmluvných modulov a aliasy, napr.:

- CREPČ / CREPC,
- CREUČ / CREUC,
- SK CRIS / SKCRIS / CIP VVI,
- CRZP / ANTIPLAG,
- SCIDAP,
- SVD,
- PRIMO,
- Open Access.

Ak modul zatiaľ nemá samostatnú 360° entitu, vyhľadávanie ho privedie do portfólia KOMIS, kde je jeho zmluvná karta dostupná.

## Bez zmeny

- žiadna Supabase migrácia,
- žiadna zmena RLS,
- žiadna zmena zdrojového účtovného ledgeru,
- žiadna zmena výpočtu čerpania úloh 10 / 22 / 25,
- žiadne odvodenie skutočných faktúr zo SLA cien.
