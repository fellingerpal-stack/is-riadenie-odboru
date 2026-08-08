# Release 0.30.0 – Contract & Renewal Control + Snapshot Sync v2

Release 0.30.0 nadväzuje na Supplier Relationships z v0.29 a pridáva riadenie zmluvných referencií, SLA a obnovy. Súčasťou release je aj oprava a diagnostické spevnenie synchronizácie spoločného snapshotu do Supabase.

## 1. Zmluvy a SLA

Nový spoločný modul **Zmluvy a SLA** vytvára jeden pohľad nad:

- zmluvnými referenciami zo SIT platieb,
- dodávateľmi a IČO,
- Supplier Relationships,
- informačnými systémami a modulmi,
- SLA stavom,
- čerpaním 2026,
- platnosťou zmluvy,
- výpovednou lehotou,
- lead-time obstarávania,
- renewal rozhodnutím.

Zdrojové zmluvné referencie sa nemenia. Administrátor nad nimi môže vytvoriť spravovanú kartu zmluvy a doplniť údaje, ktoré zdroje neobsahujú.

## 2. Renewal radar

Pri spravovanej zmluve sa eviduje:

- platnosť od / do,
- výpovedná lehota,
- čas potrebný na obstarávanie,
- spôsob obnovy,
- owner / garant.

Aplikácia počíta odporúčaný štart obnovy spätne od konca platnosti podľa dlhšieho z intervalov `výpovedná lehota` a `lead-time obstarávania`.

Stavy:

- Po termíne,
- Začať teraz,
- Do 90 dní,
- Neskôr,
- Chýba termín.

## 3. SLA kontrola

Spravovaná karta môže obsahovať:

- príznak, že SLA je požadované,
- SLA cieľ,
- aktuálny SLA stav.

Data Quality Center upozorní na zmluvy, pri ktorých je SLA požadované, ale chýba jeho stav.

## 4. Čerpanie podľa zmluvnej referencie

Release používa existujúci riadkový SIT snapshot 01–05/2026 a zobrazuje čerpanie len tam, kde zdrojová platba obsahuje zmluvnú referenciu. Suma nie je interpretovaná ako celková hodnota zmluvy.

Na aktuálnom dátovom základe je identifikovaných 18 zmluvných referencií s priraditeľným čerpaním približne 367,9 tis. EUR. Väčšina zdrojových záznamov zatiaľ nemá spoľahlivý dátum konca platnosti; práve tieto medzery sa zobrazia na doplnenie.

## 5. Supplier 360 a Smart Workspace

- Supplier 360 má priamy vstup do `Zmluvy / SLA`.
- Ctrl+K vyhľadáva aj zdrojové a spravované zmluvné referencie.
- Moje centrum pridáva osobné renewal položky podľa ownera zmluvy.
- Manažérsky Action Center upozorní na zmluvy po termíne alebo v renewal lead-time.
- Data Quality Center kontroluje chýbajúcu platnosť, renewal rozhodnutia a SLA medzery.

## 6. Snapshot Sync v2 – oprava chyby ukladania do DB

Predchádzajúci frontend pri chybe RPC zobrazoval najmä všeobecný text `Dáta sa nepodarilo uložiť`. Release 0.30 pridáva konkrétnu diagnostiku pre:

- IAM / RLS odmietnutie,
- konflikt verzie pri súbežnom zápise,
- chýbajúcu SQL migráciu / RPC,
- sieťový problém,
- timeout,
- príliš veľký payload,
- ostatnú Postgres/PostgREST chybu vrátane kódu.

Chybový banner má tlačidlo **Skúsiť uložiť** a samostatné **Načítať DB**.

## 7. Menší a bezpečnejší snapshot

`save_app_snapshot_v2`:

- neposiela pri každom autosave agendy, ktoré už majú vlastné DB tabuľky (projekty/úlohy, Helpdesk a IAM),
- serverovo zachová ich poslednú snapshotovú fallback kópiu,
- používa optimistic version check, aby jeden používateľ potichu neprepísal novší snapshot druhého,
- zachováva novšie polia pri zápise zo staršej otvorenej karty aplikácie.

## 8. Oprava scope Asset Managementu

Pôvodná v0.26 serverová funkcia pracovala s `cmdbItems` ako s jedným ORIS blokom, hoci Asset Management už používa scope na každom aktíve (`oit`, `oris`, `shared`).

v0.30 preto vykonáva **item-level server merge**:

- používateľ môže zapísať iba aktíva vo svojom WRITE scope,
- aktíva mimo jeho WRITE scope sa zachovajú zo serverovej verzie,
- admin má plný zápis.

## 9. Admin-only master dáta

Na serveri sú po migrácii admin-only aj zápisy:

- `supplierRecords`,
- `supplierRelationships`,
- `contractRecords`.

Tým sa backend zhoduje s administrátorským workflow vo fronte.

## 10. Databázová migrácia – povinná

Pred nasadením alebo bezprostredne pred prvým zápisom v0.30 spustite v Supabase SQL Editore:

`IS_Riadenie_odboru_v0.30.0_SYNC_CONTRACTS.sql`

Migrácia vytvorí `save_app_snapshot_v2`, scoped CMDB merge a presmeruje aj pôvodný `save_app_snapshot` na rovnakú bezpečnú implementáciu.

## 11. Technické zmeny

Nové súbory:

- `src/lib/contractDirectory.ts`
- `src/views/Contracts.tsx`
- `src/views/Contracts.css`
- `supabase/migration_sync_contracts_v030.sql`

Upravené:

- `src/App.tsx`
- `src/types.ts`
- `src/lib/storage.ts`
- `src/lib/cloud.ts`
- `src/components/GlobalSearch.tsx`
- `src/views/Suppliers.tsx`
- `src/views/MyWorkspace.tsx`
- `src/views/DataQuality.tsx`
- `src/styles.css`
- `src/data/seed.json`
- `package.json`

Verzia aplikácie: `0.30.0`.
