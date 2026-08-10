IS Riadenie odboru - nasadenie v0.35.0
=======================================

Vychodiskova verzia: v0.34.0

1. DATABAZA
-----------
NIC NESPÚŠŤAJ.
Tento release nema novy SQL krok.
Existujuci Log Management SQL z v0.34 zostava zachovany.

2. FRONTEND
-----------
Rozbal:
IS_Riadenie_odboru_v0.35.0_INTERACTIVE_DRILLDOWN.zip

do korena aktualneho projektu a povol prepisanie suborov.

Menia sa iba:
- package.json
- src/data/seed.json
- src/lib/storage.ts
- src/views/ItCosts.tsx
- src/views/ItCosts.css
- src/views/DataQuality.tsx
- src/views/DataQuality.css
- src/views/Suppliers.tsx
- src/views/Suppliers.css

3. DEPLOY
---------
Commit + push do GitHubu.
Vercel spravi bezny deployment.
Po nasadeni Ctrl+F5.

V lavom dolnom rohu musi byt:
v0.35.0

4. KONTROLA IT NAKLADOV
-----------------------
Finance -> IT naklady

A) Obdobie: Jan-Jun
   Rok: Vsetko
   Ocakavany rozsah: 2022-2026

B) Klikni na:
   - IT naklady
   - RUN
   - CHANGE
   - Najvacsi nakladovy blok
   - Koncentracia nakladov
   - COST x RACI

Musi sa otvorit drill-down s podkladovymi datami.

C) Klikni na konkretnu polozku v drill-down.
Musi sa zobrazit rozpad po rokoch, dodavatel, TOP doklad a suvisiaci register.

D) Obdobie: Jan-Dec
   Rok: Vsetko
   Ocakavany rozsah: 2022-2025.
   Rok 2026 sa do celeho roka nepridava, kym zdroj nema jul-december.

5. KONTROLA DODAVATELOV
-------------------------
Dodavatelia -> klikni na KPI Financny tok / Zmluvy / SLA / Na preverenie.
Filter registra sa musi zmenit podla zvolenej KPI karty.

6. KONTROLA KVALITY DAT
-----------------------
Kvalita dat -> klikni na KPI Kriticke medzery / Na doplnenie / Informacne.
Zoznam kontrol sa musi prefiltrovat.
Opakovany klik na aktivnu kartu vrati vsetky kontroly.

7. ROLLBACK
-----------
Ak by bolo potrebne vratit release, obnov povodne subory z v0.34.0.
DB sa tymto releasom nemeni, preto rollback nevyzaduje SQL.
