IS Riadenie odboru v0.39.0 – Contract Payment Drill-down
=========================================================

Východisková verzia: v0.38.0
Cieľová verzia:      v0.39.0

1. DATABÁZA
-----------
V Supabase SQL Editore NIČ nespúšťaj.
Release nemení schému, RLS ani synchronizáciu.

2. NASADENIE
------------
FULL:
- nahraj celý projekt z IS_Riadenie_odboru_v0.39.0_FULL.zip.

IBA ZMENY:
- rozbaľ IS_Riadenie_odboru_v0.39.0_LEN_ZMENENE_SUBORY.zip
  do koreňa existujúceho projektu v0.38.0 a povoľ prepísanie.

Menia sa:
- package.json
- src/data/seed.json
- src/lib/storage.ts
- src/views/ContractSpending.tsx
- src/views/ContractSpending.css

Pribúdajú:
- src/data/contractTaskLedger.json
- scripts/extract_contract_task_ledger_from_audit.py
- RELEASE_NOTES_0.39.md
- README_NASADENIE_0.39.txt
- QA_RESULTS_0.39.txt

3. DEPLOY
---------
Commit + push do GitHubu.
Vercel musí úspešne vykonať `npm run build`.
Po deployi Ctrl+F5 a skontroluj v0.39.0.

4. SMOKE TEST
-------------
IT náklady -> Úlohy 10 / 22 / 25:

A) Klikni Úloha 10.
- otvorí sa drill-down,
- suma = 509 559,61 EUR,
- 171 auditných riadkov,
- status Súčet sedí.

B) Vyber Úlohu 10 a Mesačne, klikni Február.
- suma podkladu = 124 760,73 EUR,
- 24 auditných riadkov.

C) Klikni Máj.
- suma podkladu = 116 784,39 EUR.

D) Vyber Úlohu 22, klikni Júl.
- suma podkladu = 15 174,97 EUR.

E) Prepni Doklady / Riadky, v Riadkoch over KPD/PPD/FZD/PGD/PRACM.

F) Exportuj CSV detail.

5. ROLLBACK
-----------
Vráť uvedené zmenené súbory z v0.38.0 a odstráň nový contractTaskLedger.json + generátor.
DB rollback nie je potrebný.
