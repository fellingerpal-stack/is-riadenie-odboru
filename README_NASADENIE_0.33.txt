IS Riadenie odboru v0.33.0 – nasadenie
======================================

Východisková verzia: v0.32.0
Názov: Raw Financial Ledger & Supplier History

1. DATABÁZA
-----------
NIČ nespúšťaj v Supabase SQL Editore.
RLS, snapshot sync a Network Discovery DB sa nemenia.

2. FRONTEND / GITHUB
--------------------
Rozbaľ ZIP do koreňa existujúceho projektu v0.32.0 a povoľ prepísanie súborov.

Release mení/pridáva:
- package.json
- src/data/seed.json
- src/data/supplierPaymentsHistory.json
- src/data/itCosts.json
- src/data/itCostsFullYear.json
- src/lib/storage.ts
- src/lib/supplierDirectory.ts
- src/views/Suppliers.tsx
- src/views/Suppliers.css
- src/views/ItCosts.tsx
- scripts/extract_finance_from_excel.py
- RELEASE_NOTES_0.33.md
- DATA_AUDIT_0.33.md

3. DEPLOY
---------
Commit + push do GitHubu.
Vercel vykoná štandardný build/deploy.
Po deployi sprav Ctrl+F5.

4. KONTROLA
-----------
Dole v aplikácii musí byť v0.33.0.

Dodávatelia:
- Financie = Všetky účtovné toky
- Rok 2024 / 2025 / 2026 zobrazí účtovné pohyby podľa IČO
- Interval 2024–2026 zobrazí kumulovanú históriu
- Supplier 360 obsahuje Finančnú históriu, Mesačný finančný tok a Audit pohybov
- CSV pohyby exportuje riadkové účtovné dáta z aktuálneho obdobia

IT náklady:
- Jan–Jún obsahuje 2022–2026
- Jan–Dec obsahuje 2022–2025
- dodávateľ a TOP doklad sa viažu na zvolený rok, ak je v XLSX dostupné IČO

5. DÔLEŽITÁ HRANICA
-------------------
Roky 2022 a 2023 v dodaných XLSX nemajú pole firma.
Preto sa v Supplier 360 spätne nevymýšľa IČO ani dodávateľ.
Tieto roky však zostávajú v celkových finančných a IT trendoch.

6. ZDROJOVÉ XLSX
----------------
Zdrojové Excel súbory sa do repozitára ani release ZIPu nepridávajú.
Reprodukčný skript je scripts/extract_finance_from_excel.py.
