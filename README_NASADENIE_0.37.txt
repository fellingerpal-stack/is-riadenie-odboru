IS Riadenie odboru v0.37.0 – SIT 2026 Jan–Júl
================================================

Východisková verzia: v0.36.0
Cieľová verzia:      v0.37.0

1. DATABÁZA
-----------
V Supabase SQL Editore NIČ nespúšťaj.
Release nemení databázovú schému, RLS ani Network Discovery.

2. ZÁLOHA
---------
Pred nasadením urob commit / zálohu aktuálneho projektu v0.36.0.

3. NASADENIE
------------
Rozbaľ obsah release ZIP do koreňa projektu a povoľ prepísanie súborov.

Menia sa:
- package.json
- src/data/seed.json
- src/lib/storage.ts
- src/data/contractTasks.json
- src/views/ContractSpending.tsx
- src/views/ItCosts.tsx
- src/views/OperationsIntelligence.tsx

Pribúda:
- scripts/extract_contract_tasks_from_audit.py
- RELEASE_NOTES_0.37.md
- DATA_AUDIT_0.37.md

Potom:
- commit + push do GitHubu,
- Vercel vykoná štandardný build,
- po deployi Ctrl+F5.

4. KONTROLA PO DEPLOYI
----------------------
V ľavom dolnom rohu musí byť v0.37.0.

IT náklady -> Úlohy 10 / 22 / 25:
- obdobie január až júl 2026,
- spolu vyčerpané 607 609,26 EUR,
- zostatok 461 073,74 EUR,
- Úloha 10: 509 559,61 EUR,
- Úloha 22: 49 508,47 EUR,
- Úloha 25: 48 541,18 EUR,
- mesačný graf obsahuje Jún a Júl,
- kvartálny pohľad obsahuje Q3 priebežne,
- CSV obsahuje Jan až Júl.

Riadiace centrum IT -> Forecast 10 / 22 / 25:
- SKUTOČNOSŤ má označenie 01–07,
- mesačný graf má 7 mesiacov,
- forecast sa prepočíta z nového task snapshotu.

5. DODÁVATELIA
--------------
Dodávateľský riadkový ledger a Supplier 360 sa v release 0.37.0 NEAKTUALIZUJÚ.
Ich dátové obdobie zostáva také, aké bolo vo v0.36.0. Aktualizácia dodávateľov bude samostatný krok/release.

6. BUDÚCA MESAČNÁ AKTUALIZÁCIA TASK SNAPSHOTU
----------------------------------------------
Keď bude nový audit XLSX, možno task dataset regenerovať príkazom:

python scripts/extract_contract_tasks_from_audit.py NOVY_AUDIT.xlsx --base src/data/contractTasks.json --output src/data/contractTasks.json --year 2026 --months N

N = počet načítaných mesiacov (napr. 8 pre január až august).

Zdrojový XLSX sa do GitHubu ani release ZIPu nepridáva.
