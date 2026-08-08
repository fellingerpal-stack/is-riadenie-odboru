# IS Riadenie odboru CVTI SR

**Aktuálny release: v0.31.0 – Network Discovery & Asset Inventory.**

React + TypeScript + Vite aplikácia pre spoločné riadenie odborov 3.1 a 3.2. Prepája RACI, služby, technológie, ServiceDesk, Change/Problem/IAM, aktíva/CMDB, riziká, projekty, dodávateľov a IT náklady.

## Verzia 0.31.0

Asset Management dostáva Network Discovery staging, Print Fleet, lokálne CVTI Asset Collectory, first/last seen, históriu skenov a bezpečné párovanie objavených zariadení na Asset 360. Discovery observations sa ukladajú do samostatných Supabase tabuliek, nie do snapshotu.

Podrobnosti: `RELEASE_NOTES_0.31.md`, `NETWORK_DISCOVERY_0.31.md`, `README_NASADENIE_0.31.txt`.

## Verzia 0.30.0

Nový spoločný modul **Zmluvy a SLA** spája zmluvné referencie, dodávateľov/IČO, systémy a moduly, SLA, čerpanie a renewal lead-time. Release zároveň zavádza **Snapshot Sync v2** s konkrétnou diagnostikou chýb, optimistic version kontrolou a item-level serverovým scope merge pre Asset Management.

Podrobnosti: `RELEASE_NOTES_0.30.md`, `CONTRACT_RENEWAL_0.30.md`, `README_NASADENIE_0.30.txt`.

## Verzia 0.29.0

Supplier 360 teraz spravuje samostatné väzby dodávateľ -> systém/modul/služba vrátane roly, zmluvy, zdroja, dôvery a stavu. Zdrojové väzby sú oddelené od kandidátov na preverenie; admin ich môže potvrdiť, upraviť alebo zamietnuť. Podporovaný je hromadný import CSV/XLSX a export väzieb.

Podrobnosti: `RELEASE_NOTES_0.29.md`, `SUPPLIER_RELATIONSHIPS_0.29.md`, `README_NASADENIE_0.29.txt`.

## Verzia 0.27.0

Spoločný modul **Asset management** rozširuje pôvodné CMDB položky na centrálny ITAM/CMDB register. Podporuje fyzické a virtuálne aktíva, servery, sieť, notebooky, PC a periférie vrátane tlačiarní, MFP, monitorov, dokovacích staníc a UPS.

Obsahuje Asset 360, Asset Health, lifecycle radar, inventarizáciu, QR štítky, auditnú históriu a hromadný import CSV/XLSX/XLS s mapovaním stĺpcov a kontrolou duplicít. IAM zápis sa riadi scope aktíva 3.1 / 3.2 / Spoločné.

Podrobnosti: `RELEASE_NOTES_0.27.md`, `ASSET_MANAGEMENT_0.27.md`, `README_NASADENIE_0.27.txt`.

## Verzia 0.26.0

Scoped IAM oddeľuje globálnu aplikačnú rolu od prístupu do Odboru 3.1, Odboru 3.2 a spoločných modulov. IT náklady podporujú H1 a celoročný pohľad pre roky, kde sú celoročné zdrojové dáta.

## Spustenie

```bash
npm install
npm run dev
```

Produkčný build:

```bash
npm run check
npm run build
```

## Nasadenie v0.30 z v0.29

1. V Supabase SQL Editore spustite `IS_Riadenie_odboru_v0.30.0_SYNC_CONTRACTS.sql`.
2. Nasaďte frontend / spustite installer.
3. Spustite `npm run build`.

Podrobný postup je v `README_NASADENIE_0.30.txt`.
