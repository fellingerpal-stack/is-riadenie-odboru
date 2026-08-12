# IS Riadenie odboru v0.37.0 – SIT 2026 Jan–Júl

## Cieľ release

Release 0.37.0 aktualizuje iba manažérsky finančný pohľad **IT náklady → Úlohy 10 / 22 / 25** z pôvodného obdobia január–máj 2026 na **január–júl 2026**.

Dodávateľský riadkový ledger, Supplier 360 a historické supplier platby sa v tomto release zámerne nemenia.

## Nový stav úloh

| Úloha | Rozpočet | Čerpanie 01–07 | Zostatok | Čerpanie % |
|---|---:|---:|---:|---:|
| 10 | 909 630,00 € | 509 559,61 € | 400 070,39 € | 56,0 % |
| 22 | 93 552,00 € | 49 508,47 € | 44 043,53 € | 52,9 % |
| 25 | 65 501,00 € | 48 541,18 € | 16 959,82 € | 74,1 % |
| **Spolu** | **1 068 683,00 €** | **607 609,26 €** | **461 073,74 €** | **56,9 %** |

## Mesačné doplnenie

- Úloha 10: jún 63 313,18 €, júl 60 654,34 €.
- Úloha 22: jún 3 559,52 €, júl 15 174,97 €.
- Úloha 25: jún 6 950,49 €, júl 4 544,70 €.

## Dôležitá korekcia úlohy 25

Nový audit sa neaplikuje ako jednoduché pripočítanie júna a júla. Celé obdobie január–júl sa prepočítalo nanovo podľa zdrojového poľa `Úloha`.

Pôvodný snapshot mal úlohu 25 za január–máj 37 482,38 €. Nový audit dáva za rovnaké obdobie 37 045,99 €, teda o 436,39 € menej. Rozdiel tvoria aprílové pohyby 61,24 € a 375,15 €, ktoré sú v novom audite vedené pod inými úlohami. Release preto používa nový audit ako autoritatívny task-level zdroj.

## UI zmeny

- IT náklady už zobrazujú obdobie dynamicky z `contractTasks.json`.
- KPI používa `Vyčerpané 01–07` namiesto pevného „do mája“.
- Mesačný graf obsahuje jún a júl.
- Kvartálny pohľad obsahuje Q1, Q2 a **Q3 priebežne**.
- CSV export automaticky exportuje všetky načítané mesiace.
- Run-rate používa 7 načítaných mesiacov.
- Forecast v Riadiacom centre používa nový Jan–Júl task snapshot a dynamické označenie obdobia.
- Vendor/Supplier časť explicitne upozorňuje, že jej riadkový dataset sa v0.37 nemení.

## Reprodukovateľná aktualizácia

Pribudol skript:

`scripts/extract_contract_tasks_from_audit.py`

Ten vie z filtrovaného auditného XLSX znovu vytvoriť `src/data/contractTasks.json`. Rozpočty a identita úloh sa zachovajú, mesačné čerpanie sa agreguje zo stĺpcov `Úloha`, `Suma`, `Mesiac/obdobie` a strediská zo `PRACM`.

## Databáza

- nový SQL skript sa **nespúšťa**,
- Supabase schéma sa nemení,
- snapshot synchronizácia sa nemení,
- Network Discovery sa nemení.

## Zmenené / nové súbory

- `package.json`
- `src/data/seed.json`
- `src/lib/storage.ts`
- `src/data/contractTasks.json`
- `src/views/ContractSpending.tsx`
- `src/views/ItCosts.tsx`
- `src/views/OperationsIntelligence.tsx`
- `scripts/extract_contract_tasks_from_audit.py`
