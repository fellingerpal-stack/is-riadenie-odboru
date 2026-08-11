IS Riadenie odboru - nasadenie v0.36.0
=======================================

Vychodiskova verzia: v0.35.0
Nazov: Management Action Center

1. DATABAZA
-----------
NIC NESPÚŠŤAJ.
Release nema novu SQL migraciu ani novu tabulku.
Log Management v0.34 a existujuci snapshot sync zostavaju bez zmeny.

2. FRONTEND
-----------
Rozbal:
IS_Riadenie_odboru_v0.36.0_MANAGEMENT_ACTION_CENTER.zip

do korena existujuceho projektu v0.35.0 a povol prepisanie suborov.

Menia sa:
- package.json
- src/App.tsx
- src/data/seed.json
- src/lib/storage.ts

Pribudaju:
- src/lib/actionCenter.ts
- src/views/ManagementActionCenter.tsx
- src/views/ManagementActionCenter.css

3. DEPLOY
---------
Commit + push do GitHubu.
Vercel spravi standardny build/deploy.
Po deployi sprav Ctrl+F5.
Dole v aplikacii musi byt v0.36.0.

4. KONTROLA
-----------
A) V lavom menu otvor Management Action Center.
B) Musia byt KPI: Kriticke / Po termine / Do 14 dni / Bez ownera / Otvorene.
C) Klik na KPI musi filtrovat zoznam.
D) Filter zdroja a fulltext musia fungovat spolu.
E) Klik na Otvorit zdroj musi prejst do prislusneho modulu.
F) Riadiace opatrenia/Financial Actions, Rizika, Rozhodnutia, Helpdesk, Change, Problem, IAM a CMDB musia byt reprezentovane podla aktualnych dat.

5. CO SA NEMENI
---------------
- ziadna zmena Supabase schema,
- ziadna zmena RLS,
- ziadna zmena Network Discovery / collectora,
- ziadna zmena financnych datasetov,
- ziadna zmena auditnej DB vrstvy.

6. ROLLBACK
-----------
Obnov povodne subory z v0.35.0. DB rollback nie je potrebny.
