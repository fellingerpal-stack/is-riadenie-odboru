# Release 0.27.0 – Asset Management & Asset 360

Release 0.27.0 mení pôvodný pohľad `CMDB / Aktíva` na spoločný modul **Asset management** pre odbory 3.1, 3.2 a spoločné IT aktíva.

## 1. Centrálny register aktív

Register používa existujúce `cmdbItems`, takže doterajšie CMDB položky sa nestratia. Migrácia doplní nové polia automaticky.

Podporované typy zahŕňajú:
- aplikácie a informačné systémy,
- fyzické a virtuálne servery,
- databázy a storage,
- firewall, switch, router, Wi-Fi AP a ostatné sieťové prvky,
- pracovné stanice a notebooky,
- **monitory, dokovacie stanice, tlačiarne, MFP, skenery, UPS**,
- mobilné telefóny, tablety a externé disky,
- licencie, SaaS a cloudové zdroje,
- zmluvy a iné aktíva.

Každé aktívum môže niesť scope `3.1 OIT / 3.2 ORIS / Spoločné`, inventárne a sériové číslo, výrobcu/model, pridelenú osobu, lokalitu/miestnosť, ownerov, dodávateľa/IČO, zmluvu, úlohu 10/22/25, obstarávaciu cenu, RUN/licenčný náklad, lifecycle a inventúrny stav.

## 2. Asset 360

Detail aktíva spája:
- identitu a vlastníctvo,
- lokalitu a technické údaje,
- službu,
- dodávateľa a zmluvu,
- finančnú stopu,
- warranty/support/lifecycle,
- Asset Health,
- auditnú históriu zmien.

Z detailu sa dá vytlačiť QR štítok. QR odkazuje priamo na `#/cmdb?asset=<ID>`.

## 3. Inventarizácia

Pribudol samostatný inventúrny režim:
- Neoverené,
- Nájdené,
- Presunuté,
- Nezhoda,
- Nenájdené.

Zmena inventúrneho stavu zapisuje dátum kontroly a auditnú históriu.

## 4. Hromadný import CSV / XLSX / XLS

Import obsahuje:
- načítanie CSV/TXT/XLSX/XLS,
- automatické rozpoznanie bežných názvov stĺpcov,
- ručné mapovanie stĺpcov pred importom,
- predvolený scope,
- kontrolu duplicít podľa inventárneho čísla, sériového čísla a hostname,
- režimy `Preskočiť / Aktualizovať existujúce / Vytvoriť ako nové`,
- kontrolu scope oprávnenia pred zápisom,
- preview prvých 25 položiek,
- stiahnuteľnú CSV šablónu.

## 5. Asset Intelligence

Prehľad vyhodnocuje:
- priemerný Asset Health,
- chýbajúce vlastníctvo,
- lifecycle riziká,
- záruky/podporu a plán obnovy,
- inventúrne nezhody,
- možné duplicity,
- prioritu aktív vyžadujúcich pozornosť.

Asset Health je vysvetliteľné skóre kvality evidencie a pripravenosti, nie meranie reálnej dostupnosti zariadenia.

## 6. IAM

Asset management je spoločný modul na čítanie. Zápis konkrétneho aktíva sa riadi jeho scope:
- aktívum `oit` vyžaduje W pre 3.1,
- aktívum `oris` vyžaduje W pre 3.2,
- aktívum `shared` vyžaduje W pre Spoločné.

Hard delete je vyhradený administrátorovi. Manager/resolver s príslušným W môže aktívum upraviť, inventarizovať a označiť na vyradenie.

Poznámka: aktíva sú stále súčasťou synchronizovaného snapshotu aplikácie. Serverová RLS v0.26 chráni prístup k snapshotu podľa scope, ale per-asset kontrola v0.27 je v aplikačnej vrstve. Ak bude neskôr požadovaná databázovo vynútená per-record segmentácia, bude vhodné aktíva normalizovať do samostatnej Supabase tabuľky.

## 7. Technické zmeny

Nové dependency:
- `xlsx` – lokálne spracovanie XLS/XLSX importu v prehliadači,
- `qrcode` – lokálne generovanie QR štítkov.

Žiadny nový Supabase SQL skript sa pre v0.27 nespúšťa.
