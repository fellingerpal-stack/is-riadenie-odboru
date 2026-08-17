# Release v0.47.0 – Service Catalog & Smart Request Forms

## Cieľ

Release mení zamestnanecký vstup do ServiceDesku z generického formulára na produkčný **katalóg služieb**. Používateľ vyberie to, čo potrebuje, doplní iba relevantné údaje a technické smerovanie zostáva na serveri.

## Self-service katalóg

Nová záložka **Katalóg služieb** je pre zamestnanca predvolený pohľad. Katalóg obsahuje dlaždice pre:

- nový prístup / oprávnenie,
- reset hesla / prihlásenie,
- notebook / PC,
- inštaláciu softvéru,
- tlačiareň / skener,
- sieť / Wi-Fi / VPN,
- server / storage / infraštruktúru,
- KOMIS: CRZP / ANTIPLAG, CREPČ, CREUČ, SK CRIS, SVD a SCIDAP,
- zmenovú / rozvojovú požiadavku,
- incident aplikácie / portálu,
- všeobecnú IT požiadavku.

Katalóg sa dá vyhľadávať a je pripravený na ďalšie položky bez zmeny zdrojového kódu.

## Smart formuláre

Každá položka môže mať vlastné doplňujúce polia typu:

- text,
- dlhý text,
- výber,
- dátum,
- číslo,
- potvrdenie / checkbox.

Polia môžu byť povinné, mať placeholder, pomocný text a možnosti výberu. Vyplnené hodnoty sa ukladajú štruktúrovane do `service_tickets.request_data` a ticket eviduje `catalog_item_code`.

## Serverová autorita

Pri zamestnaneckom tickete katalóg nie je iba UI. Server:

1. overí, že položka katalógu existuje a je aktívna,
2. overí povinné smart polia,
3. z katalógu určí typ, kategóriu, podkategóriu, službu a predvolenú prioritu,
4. následne aplikuje existujúcu routing maticu,
5. až potom použije predvolenú frontu katalógu alebo ServiceDesk L1 fallback,
6. SLA ďalej počíta business-calendar engine z v0.45.

Používateľ preto nevie podvrhnúť technickú frontu z browsera.

## Admin konfigurácia

V **ServiceDesk → Skupiny a routing → Katalóg služieb** môže admin/manager:

- pridať a odstrániť položku,
- zmeniť názov, skupinu, popis a ikonu,
- nastaviť typ, kategóriu, podkategóriu, službu, prioritu a fallback frontu,
- meniť poradie a aktivitu,
- zostaviť smart formulár z doplňujúcich polí.

Priamy INSERT/UPDATE/DELETE tabuľky katalógu nie je dostupný bežnému authenticated klientovi; zápis ide cez konfiguračné RPC pre admin/manager.

## Databáza

Release vyžaduje:

`supabase/migration_servicedesk_v047.sql`

Migrácia pridáva:

- `service_catalog_items`,
- `service_tickets.catalog_item_code`,
- `service_tickets.request_data`,
- reader/writer RPC katalógu,
- rozšírený bezpečný ticket reader,
- serverom overovaný katalogový write path,
- počiatočný seed katalógu.

## Kompatibilita

- existujúce tickety ostávajú bez zmeny,
- generický formulár zostáva dostupný,
- routing, fronty, SLA, notifikácie a inbound e-mail z v0.44–0.46 ostávajú zachované,
- inbound e-mailový ticket nemá katalogovú položku, pokiaľ ju neurčí neskorší workflow.
