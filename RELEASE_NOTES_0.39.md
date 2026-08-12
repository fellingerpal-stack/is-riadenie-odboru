# Release 0.39.0 – Contract Payment Drill-down

## Cieľ

Release rozširuje **IT náklady → Úlohy 10 / 22 / 25** o auditovateľný preklik zo súhrnného čerpania na konkrétne podkladové položky.

## Nové možnosti

- klik na kartu **Úloha 10 / 22 / 25** otvorí podklad vyčerpanej sumy danej úlohy,
- klik na KPI **Vyčerpané** otvorí podklad aktuálne zvoleného rozsahu,
- klik na stĺpec mesačného grafu otvorí platby/položky konkrétneho mesiaca,
- pri kvartálnom grafe klik otvorí mesiace príslušného kvartálu,
- pri kumulatívnom grafe klik otvorí podklad od januára po zvolený mesiac,
- klik na **Najsilnejší mesiac** otvorí jeho podklad,
- v tabuľke úloh pribudlo tlačidlo **Platby**.

## Drill-down okno

Detail má dve úrovne:

1. **Doklady** – predvolený manažérsky pohľad zoskupený podľa úlohy, dátumu a čísla dokladu.
2. **Riadky** – úplný riadkový pohľad filtrovaného auditu.

Zobrazuje:

- dátum,
- číslo dokladu,
- popis/poznámku,
- sumu,
- úlohu,
- KPD / PPD,
- FZD,
- PGD,
- PRACM,
- ZAK a kategóriu v riadkovom detaile.

K dispozícii je vyhľadávanie, zoradenie podľa sumy alebo dátumu a CSV export aktuálneho detailu.

## Reconciliácia

Nový dataset `src/data/contractTaskLedger.json` je vytvorený z rovnakého súboru **Filtrovaný audit PHU/SIT**, z ktorého vzniká `contractTasks.json`.

Pri generovaní sa povinne kontroluje, že súčet riadkov sedí na súhrn:

- Úloha 10: **509 559,61 EUR** / 171 riadkov,
- Úloha 22: **49 508,47 EUR** / 64 riadkov,
- Úloha 25: **48 541,18 EUR** / 122 riadkov,
- spolu: **607 609,26 EUR** / 357 riadkov.

Drill-down preto pri otvorení zobrazuje aj kontrolu **Súčet sedí** a rozdiel voči hodnote grafu.

## Mesačná aktualizácia

Pri ďalšom auditnom XLSX regeneruj oba datasety:

```bash
python scripts/extract_contract_tasks_from_audit.py NOVY_AUDIT.xlsx --base src/data/contractTasks.json --output src/data/contractTasks.json --year 2026 --months N
python scripts/extract_contract_task_ledger_from_audit.py NOVY_AUDIT.xlsx --tasks src/data/contractTasks.json --output src/data/contractTaskLedger.json --year 2026
```

## Databáza

Release **nevyžaduje Supabase SQL migráciu**. Zdrojový drill-down je zabalený auditný snapshot, rovnako ako existujúci kontraktový súhrn.
