# Release 0.16.1 – vizuálna a IAM oprava

## Opravy

- zjednotený vzhľad prepínačov pohľadov v architektúre, OIT a prevádzkových väzbách,
- doplnený responzívny vzhľad filtrov a ovládacích prvkov,
- architektonické záložky zobrazujú počty položiek, závislostí, lokalít a medzier,
- IAM banner rozlišuje chýbajúcu databázovú inicializáciu od bežnej synchronizačnej chyby,
- nový idempotentný SQL skript vytvorí IAM tabuľky, RPC funkcie, RLS politiky, importuje dáta zo snapshotu a obnoví PostgREST schému.

## Databáza

V Supabase SQL Editore spustite `IS_Riadenie_odboru_v0.16.1_IAM_DATABASE_FIX.sql`. Po úspechu sa zobrazia počty IAM žiadostí, katalógových položiek a recertifikačných kampaní spolu s názvami RPC funkcií.
