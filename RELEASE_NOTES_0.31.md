# Release 0.31.0 – Network Discovery & Asset Inventory

Release 0.31 rozširuje existujúci Asset Management o riadené objavovanie zariadení v internej sieti. Cieľom nie je vulnerability scanning, ale **Total Asset Inventory**: zistiť, čo je v sieti, odlíšiť nové/zmenené/nevidené zariadenia a bezpečne ich spárovať s Asset 360.

## 1. Network Discovery staging

V `Asset management` pribudla záložka **Network Discovery** s pohľadmi:

- Objavené zariadenia,
- Print Fleet,
- Collectory,
- História skenov.

Discovery zariadenie sa automaticky nestane oficiálnym assetom. Workflow je:

`Objavené → Kandidát zhody → Potvrdené → Asset 360`

Používateľ môže zariadenie aj ignorovať alebo vytvoriť nové aktívum.

## 2. Automatické párovanie

Aplikácia navrhuje kandidáta podľa:

1. sériového čísla,
2. MAC adresy,
3. hostname,
4. IP adresy,
5. výrobcu + modelu.

Jednoznačné zhody možno potvrdiť hromadne. Rozhodnutie ostáva na používateľovi; discovery záznam sám neprepisuje register.

## 3. Asset 360 – sieťová identita

`CmdbItem` dostáva:

- MAC adresu,
- discovery device ID,
- first seen / last seen,
- posledný collector.

Pri potvrdení discovery väzby sa zapíše auditná udalosť do histórie aktíva.

## 4. Print Fleet

Collector vie pri zariadeniach s print službami a voliteľným read-only SNMP načítať podľa možností zariadenia:

- názov/model,
- sériové číslo,
- page counter,
- supplies/tonery,
- základný SNMP popis.

SNMP je v collectore voliteľné a predvolene vypnuté.

## 5. CVTI Asset Collector

Release obsahuje `collector/cvti_asset_collector.py`.

Collector:

- beží lokálne vo vnútornej sieti,
- povoľuje iba RFC1918 IPv4 rozsahy,
- má limit 4096 hostov na jeden CIDR a 10 000 hostov na run,
- používa iba TCP connect discovery a voliteľné read-only SNMP,
- nerobí vulnerability testy, exploity ani credential guessing,
- posiela výsledok iba outbound HTTPS cez Supabase RPC,
- používa samostatný 256-bit token pre každý collector.

## 6. Samostatný databázový model

Discovery observations sa **neukladajú do veľkého aplikačného snapshotu**.

Nové tabuľky:

- `discovery_collectors`,
- `discovery_runs`,
- `discovery_devices`,
- `discovery_observations`.

Tým sa pravidelné sieťové observations nepletú do snapshot synchronizácie v0.30.4.

## 7. IAM / bezpečnosť

- discovery dáta môžu čítať prihlásení členovia organizácie,
- collector môže vytvoriť iba admin,
- token sa v UI zobrazí iba pri vytvorení/rotácii,
- priame INSERT/UPDATE discovery tabuliek cez Data API sú odobraté,
- ingest je možný iba cez RPC s platným collector tokenom,
- párovanie zariadenia s Asset 360 rešpektuje WRITE scope `oit/oris/shared`.

## 8. Povinný SQL krok

Pred použitím discovery spustite v správnom Supabase projekte:

`IS_Riadenie_odboru_v0.31.0_NETWORK_DISCOVERY.sql`

Kontrolný výstup má vrátiť 6× `true`.

## 9. Technické zmeny

Nové súbory:

- `src/lib/discoveryCloud.ts`,
- `src/views/AssetDiscovery.tsx`,
- `src/views/AssetDiscovery.css`,
- `supabase/migration_network_discovery_v031.sql`,
- `collector/*`.

Upravené:

- `src/types.ts`,
- `src/lib/storage.ts`,
- `src/lib/assetImport.ts`,
- `src/views/Cmdb.tsx`,
- `src/data/seed.json`,
- `package.json`.

Frontend nepridáva novú npm dependency.
