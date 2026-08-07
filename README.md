# IS Riadenie odboru CVTI SR

**Aktuálny release: v0.27.0 – Asset Management & Asset 360.**

React + TypeScript + Vite aplikácia pre spoločné riadenie odborov 3.1 a 3.2. Prepája RACI, služby, technológie, ServiceDesk, Change/Problem/IAM, aktíva/CMDB, riziká, projekty, dodávateľov a IT náklady.

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

## Nasadenie v0.27 z v0.26

```bash
node install-v0270-asset-management.mjs
npm install
npm run build
```

Pre v0.27 sa nespúšťa nový Supabase SQL skript. Musí však zostať aplikovaná IAM migrácia z v0.26.
