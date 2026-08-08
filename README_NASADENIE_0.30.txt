IS RIADENIE ODBORU v0.30.0 – NASADENIE
======================================

Východisková verzia: v0.29.0

DÔLEŽITÉ: v0.30 obsahuje povinnú Supabase SQL migráciu.

ODPORÚČANÉ PORADIE
------------------
1. V Supabase -> SQL Editor spustite celý súbor:
   IS_Riadenie_odboru_v0.30.0_SYNC_CONTRACTS.sql

2. Až potom nasaďte frontend v0.30 (FULL alebo LEN ZMENENÉ SÚBORY).

3. Vercel build:
   npm install
   npm run build

4. Po prihlásení skontrolujte horný stav synchronizácie.
   Ak bol predtým stav "Chyba synchronizácie", kliknite na "Skúsiť uložiť".

5. Otvorte Zmluvy a SLA a skontrolujte zdrojové zmluvné referencie.

ČO SQL MENÍ
-----------
- vytvorí save_app_snapshot_v2,
- zapne optimistic version kontrolu,
- zmenší transport snapshotu,
- opraví serverové scope pravidlá pre Asset Management/CMDB,
- backendovo chráni supplierRecords, supplierRelationships a contractRecords ako admin-only,
- zachová spätnú kompatibilitu cez pôvodný save_app_snapshot.

SQL nemení existujúce tabuľky s biznis dátami a nemaže snapshotovú históriu.

AK SA ZOBRAZÍ SNAPSHOT_CONFLICT
-------------------------------
Iný používateľ medzičasom uložil novšiu verziu. Najprv kliknite na "Načítať DB",
znova vykonajte svoju zmenu a nechajte ju uložiť. Tým sa zabráni tichému prepísaniu cudzej práce.

AK SA ZOBRAZÍ IAM/RLS CHYBA
---------------------------
Skontrolujte Používatelia a IAM -> scope 3.1 / 3.2 / Spoločné. Master dáta dodávateľov
a zmlúv môže meniť iba administrátor.
