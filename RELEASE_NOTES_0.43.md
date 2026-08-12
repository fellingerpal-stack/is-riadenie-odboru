# Release 0.43.0 – CVTI 360 Governance + KOMIS Quarterly SLA + CR Development Register

## Cieľ

Release rozširuje CVTI 360 v troch oblastiach:

1. priama editácia vlastníctva a zodpovedností v 360° karte,
2. zobrazenie KOMIS SLA primárne ako reálna kvartálna platba,
3. evidencia a čerpanie CR / rozvojových požiadaviek voči zmluvnému rámcu 7 000 človekohodín.

## 1. CVTI 360 – editácia vlastníctva

V záložke **Riadenie** môžu používatelia s oprávnením admin/manager + shared write priamo upraviť:

- primárneho vlastníka,
- business ownera,
- technického vlastníka,
- zástupcu,
- jedného alebo viacerých OIT vlastníkov.

Mená je možné vybrať z existujúceho personálneho registra alebo dopísať ručne.

Údaje sa ukladajú do `enterpriseGovernance` ako governance override vrstva. Zdrojové RACI/CMDB údaje sa neprepisujú. Override sa okamžite používa v Prehľade, Riadení a Vzťahoch CVTI 360.

Pri karte sa zobrazuje aj governance completeness a posledný editor/dátum zmeny.

## 2. KOMIS SLA – kvartál je hlavná hodnota

Zmluva definuje technickú podporu kvartálne. Preto sa v CVTI 360 a v module Zmluvy a SLA mení hierarchia:

- **hlavná hodnota = SLA / kvartál**,
- mesačný údaj zostáva iba ako orientačný ekvivalent `kvartál / 3`,
- podpora za 84 mesiacov a statická cena rozvoja ostávajú zachované.

Súhrn KOMIS:

- kvartál bez DPH: 45 950,00 EUR,
- kvartál s DPH: 55 140,00 EUR,
- mesačný ekvivalent s DPH: 18 380,00 EUR.

## 3. KOMIS – Rozvoj / CR

V 360° karte KOMIS pribudla samostatná záložka **Rozvoj / CR**.

Zmluvný rámec:

- 7 000 človekohodín,
- 55,00 EUR / hod. bez DPH,
- 385 000,00 EUR bez DPH,
- 462 000,00 EUR s DPH.

KPI register zobrazuje:

- zmluvný limit,
- požadované hodiny,
- schválené hodiny,
- vyčerpané hodiny,
- zostávajúce hodiny,
- schválené, ale ešte nevyčerpané hodiny,
- finančný ekvivalent vyčerpaných hodín.

### CR záznam

Každá rozvojová požiadavka môže evidovať:

- CR / referenciu,
- názov,
- modul / systém,
- stav,
- dátum požiadavky,
- termín,
- vlastníka / gestora,
- požadované hodiny,
- schválené hodiny,
- čerpané hodiny,
- poznámku,
- zdroj importu,
- poslednú zmenu a autora.

### Excel import

Import podporuje `.xlsx` a `.xls`. Prvý hárok sa načíta automaticky.

Importer akceptuje bežné varianty názvov stĺpcov, napríklad:

- `CR`, `CR ID`, `ID`, `Číslo CR`,
- `Názov`, `Popis`, `Požiadavka`,
- `Modul`, `Systém`,
- `Stav`,
- `Požadované hodiny`, `Odhad hodín`,
- `Schválené hodiny`,
- `Čerpané hodiny`, `Spotrebované hodiny`,
- `Dátum`, `Termín`,
- `Vlastník`, `Gestor`, `Zodpovedný`,
- `Poznámka`.

Opakovaný import CR s rovnakou referenciou aktualizuje existujúci záznam namiesto vytvorenia duplicity.

## Budúce zmluvy

Dátový model `contractDevelopmentRequests` je generický a obsahuje `contractKey` a `contractNumber`. CVTI 360 vie zobraziť záložku Rozvoj / CR aj pri inej entite, ak má prepojenú zmluvu alebo už existujúce CR záznamy. Zmluvný limit 7 000 hodín je špecifický iba pre KOMIS; iné zmluvy si môžu neskôr definovať vlastný rámec.

## Persistencia

Nové dáta sú súčasťou existujúceho aplikačného snapshotu:

- `enterpriseGovernance`,
- `contractDevelopmentRequests`.

Nie je potrebná nová Supabase tabuľka ani SQL migrácia.

## Zmenené súbory

- `package.json`
- `src/App.tsx`
- `src/types.ts`
- `src/data/seed.json`
- `src/lib/storage.ts`
- `src/lib/enterprise360.ts`
- `src/views/Enterprise360.tsx`
- `src/views/Enterprise360.css`
- `src/views/Contracts.tsx`

Verzia aplikácie: **0.43.0**.
