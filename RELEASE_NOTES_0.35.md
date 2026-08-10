# IS Riadenie odboru v0.35.0 - Interactive Drilldown

## Hlavná zmena
Release pridáva konzistentný drill-down nad finančnými KPI a prvý všeobecný vzor klikateľných manažérskych kariet.

### IT náklady
- filter **Rok** má novú voľbu **Všetko**,
- `Všetko` agreguje všetky roky dostupné v zvolenom období:
  - Jan-Jun: 2022-2026,
  - Jan-Dec: 2022-2025,
- KPI IT náklady, RUN, CHANGE, medziročný trend a vysoká dôvera sú klikateľné,
- riadiace signály sú klikateľné a otvárajú podkladové položky/entity,
- klik na nákladovú doménu alebo COST x SERVICE x RACI kartu otvorí finančný detail,
- položky v dôkaznej vrstve sú klikateľné a zobrazia rozpad po rokoch, dodávateľa, TOP doklad, KPD/PPD, dôvod klasifikácie a súvisiaci register,
- trendový detail umožňuje prepnúť hlavný pohľad na konkrétny rok,
- export pri `Všetko` exportuje jednotlivé ročné riadky, nie iba neauditovateľný súčet.

### Financial Actions
Financial Actions zostávajú zámerne viazané na konkrétny rok. Pri výbere `Všetko` aplikácia zobrazí skratky na jednotlivé roky namiesto vytvorenia nejednoznačného viacročného opatrenia.

### Dodávatelia
- horné Supplier KPI karty sú klikateľné,
- klik na finančný tok alebo počet pohybov zapne filter dodávateľov s finančnou aktivitou,
- klik na zmluvy, SLA alebo kandidátov nastaví príslušný registerový filter.

### Kvalita dát
KPI karty Kritické / Na doplnenie / Informačné / Všetky sú klikateľné a filtrujú prioritizované kontroly. Samotné kontrolné riadky už naďalej vedú do registra, kde sa problém opravuje.

## Dáta a databáza
- žiadna nová Supabase tabuľka,
- žiadna SQL migrácia,
- Log management v0.34 zostáva bez zmeny,
- Financial Ledger v0.33 zostáva bez zmeny,
- Network Discovery / Print Fleet sa nemení.

## Verzia
`0.35.0`
