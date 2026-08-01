# Release 0.12.0 – Projekty a úlohy v samostatnej databáze

## Hlavná zmena

Modul **Projekty a úlohy** už v cloudovom režime nepoužíva spoločný JSON snapshot ako hlavný zdroj dát. Projekty a úlohy sú uložené po jednotlivých záznamoch v tabuľkách:

- `work_projects`
- `work_tasks`
- `work_activity`

## Funkcie

- samostatné vytváranie, úprava a mazanie projektov,
- samostatné vytváranie, úprava a mazanie úloh,
- automatický import existujúcich projektov a úloh z aktuálneho snapshotu,
- RLS ochrana podľa organizácie a aplikačnej roly,
- Realtime načítanie zmien ostatných používateľov,
- audit INSERT/UPDATE/DELETE operácií,
- stavový panel databázy priamo v module Projekty a úlohy,
- automatické ukladanie úloh vytvorených z Helpdesku, Change, Problem a IAM modulov,
- snapshot zostáva ako záloha ostatných modulov a export celého stavu.

## Oprávnenia

Dáta modulu môžu čítať a meniť aktívni používatelia s rolou:

- Administrátor,
- Riaditeľ / manažér,
- Riešiteľ.

## Nasadenie

1. Nainštalovať release cez `install-v012-work-db.mjs`.
2. Overiť `npm run build`.
3. Odoslať zmeny do GitHubu a počkať na úspešný Vercel deployment.
4. V Supabase SQL Editore spustiť `supabase/migration_work_v012.sql`.
5. Obnoviť aplikáciu a v module Projekty a úlohy overiť stav **Synchronizované**.
