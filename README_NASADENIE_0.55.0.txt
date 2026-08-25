IS RIADENIE ODBORU v0.55.0 - NASADENIE
========================================

Predpoklad:
- produkcia uz bezi na v0.54.1
- projektove migracie v0.51.0, v0.52.0 a v0.53.0 su nasadene

PORADIE NASADENIA
-----------------
1. Supabase SQL Editor:
   spustit `supabase/migration_project_governance_v055.sql`

2. Na konci migracie skontrolovat, ze vsetky readiness hodnoty su TRUE:
   - raid_table_ready
   - status_report_table_ready
   - decision_table_ready
   - governance_reader_ready
   - raid_writer_ready
   - status_writer_ready
   - decision_writer_ready

3. GitHub/Vercel:
   nahrat obsah `IS_Riadenie_odboru_v0.55.0_FULL.zip` do rootu repozitara a commitnut.

4. Vercel log:
   musi prejst `[v0.55.0 verify] OK` a nasledne TypeScript/Vite build.

5. Smoke test:
   - Admin -> Riadenie projektov -> Control Center
   - otvorit projekt -> Governance
   - pridat RAID polozku
   - vytvorit status report
   - vytvorit rozhodnutie
   - prihlasit Projektoveho manazera a overit zapis iba na jeho riadenom projekte
   - prihlasit Clena projektu a overit read-only governance iba na jeho projektoch

EDGE FUNCTION
-------------
`invite-user` sa vo v0.55.0 nemeni. Nere-deployovat kvoli tomuto releasu.

ROLLBACK
--------
Frontend je mozne vratit na v0.54.1. Nove governance tabulky mozu ostat v DB; starsi frontend ich nepouziva.
