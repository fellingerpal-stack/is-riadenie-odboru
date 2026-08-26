IS RIADENIE ODBORU v0.56.1
PROJECT FINANCIAL + IS/SERVICE INTEGRATION
==========================================

TOTO JE FINALNY BALIK - v0.56.0 SAMOSTATNE NENASADZUJTE.

VYCHODISKOVY STAV
- produkcia je funkcna na v0.55.0,
- migracie v0.51.0, v0.52.0, v0.53.0 a v0.55.0 su uz nasadene.

PORADIE NASADENIA
1. Odporucane: vytvorte standardny DB backup / restore point.

2. Supabase -> SQL Editor:
   spustite cely subor
   supabase/migration_project_finance_v056.sql

   POZNAMKA: v0.56.1 nema novu SQL migraciu. Pouziva financnu migraciu v0.56,
   pretoze project_links uz podporuje vazby na IS, sluzby, zmluvy a dodavatelov.

3. Posledny SELECT financnej migracie musi vratit TRUE vo vsetkych 5 stlpcoch:
   project_finance_columns_ready
   project_finance_items_ready
   project_finance_read_ready
   project_finance_write_ready
   project_finance_delete_ready

4. Volitelne spustite read-only diagnostiku:
   supabase/test_project_finance_v056.sql

5. Edge Function invite-user NEMENIT / NEREDEPLOYOVAT.

6. Nahrajte obsah IS_Riadenie_odboru_v0.56.1_FULL.zip priamo do rootu GitHub repozitara.

7. Vercel build musi obsahovat:
   [v0.56.1 prebuild] legacy cleanup complete
   [v0.56.1 verify] OK
   a package verziu 0.56.1.

SMOKE TEST A - FINANCOVANIE
- Riadenie projektov -> KOMIS -> Financovanie.
- Vidno akcie Pripojit IT ulohu / Novy zdroj.
- Pripojit IT ulohu -> Uloha 10, 22 alebo 25.
- Overte synchronizovany rozpocet, cerpanie, zostatok a drill-down.
- Overte, ze Novy zdroj stale funguje manualne.

SMOKE TEST B - IS -> PROJEKT
- ORIS -> Sluzby a systemy -> Informacne systemy.
- Otvorte existujuci IS, napr. KOMIS.
- V sekcii Projekty / rozvoj kliknite Vytvorit projekt rozvoja.
- Aplikacia sa prepne do Riadenia projektov a otvori predvyplneny Novy projekt.
- Pred ulozenim musi byt viditelny banner s vazbou na zdrojovy IS.
- Ulozte projekt.
- V projekte -> Vazby overte Informačný system; ak mal IS zmluvu/dodavatela, aj tieto vazby.
- Vratte sa do detailu IS a overte, ze projekt je uvedeny v sekcii Projekty / rozvoj.

SMOKE TEST C - SLUZBA -> PROJEKT
- ORIS -> Sluzby a systemy -> Sluzby.
- Otvorte existujucu sluzbu.
- Kliknite Projekt rozvoja.
- Ulozte predvyplneny projekt.
- V projekte -> Vazby overte vazbu typu Sluzba.
- Po navrate do detailu sluzby sa projekt zobrazi v Projekty / rozvoj.

SMOKE TEST OPRAVNENIA
- Admin: vytvaranie a upravy funguju.
- Projektovy manazer: moze vytvarat/riadit iba v ramci svojho projektoveho opravnenia; zdrojovy modul musi mat dostupny.
- Clen projektu: nemoze cez tieto akcie vytvarat projekt.

FINANCNE DATA
Snapshot uloh 10/22/25 v tomto release obsahuje januar az jul 2026.
August az december sa nepovazuju za nulove cerpanie.
