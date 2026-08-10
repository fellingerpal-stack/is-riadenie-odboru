IS Riadenie odboru v0.32.0 – Supplier Temporal Views
=====================================================

Východisková verzia: v0.31.2

1. DATABASE
-----------
NEROB ŽIADNU DB ZMENU.
Žiadny SQL sa pre v0.32.0 nespúšťa.
Snapshot sync a Network Discovery ostávajú bez zmeny.

2. NASADENIE
------------
Rozbaľ ZIP IS_Riadenie_odboru_v0.32.0_SUPPLIER_TEMPORAL_VIEWS.zip
priamo do koreňa existujúceho projektu v0.31.2 a potvrď prepísanie súborov.

Mení sa iba:
- package.json
- src/data/seed.json
- src/lib/storage.ts
- src/views/Suppliers.tsx
- src/views/Suppliers.css

3. GITHUB / VERCEL
------------------
Commit + push.
Vercel spraví štandardný build.
Po nasadení urob Ctrl+F5.
Dole v aplikácii má byť v0.32.0.

4. KONTROLA
-----------
Dodávatelia:
- pribudne časový informačný pás,
- filter Obdobie,
- filter Rok,
- filter Aktivita,
- filter SLA,
- zostáva Úloha a Hľadanie,
- KPI a Supplier 360 reagujú na časový výber.

5. DÔLEŽITÁ METODICKÁ HRANICA
-----------------------------
Supplier platby sú zatiaľ riadkovo dostupné iba pre Jan–Máj 2026.
Pre ostatné roky aplikácia zobrazí pri platbách pomlčku a používa rok
iba na zmluvy, SLA a servisné väzby. Historické supplier sumy sa neodhadujú.

6. QA
-----
Suppliers.tsx prešiel TypeScript transpile syntax kontrolou bez diagnostík.
Plný npm build v pracovnom prostredí nebolo možné dokončiť, pretože interný
npm mirror nemá @supabase/supabase-js (HTTP 404). Release nepridáva žiadnu
novú npm dependency.
