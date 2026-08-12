# Release 0.41.0 – CVTI 360 · Enterprise Intelligence Foundation

## Cieľ

Release pridáva nový samostatný supermodul **CVTI 360**, ktorý spája údaje z existujúcich častí IS Riadenie odboru do jednej entity-orientovanej 360° karty. Používateľ už nemusí vedieť, v ktorom module sa konkrétny údaj nachádza – vyhľadá systém alebo službu a dostane spoločný pohľad na financie, prácu, technológie, ľudí, riziká a vzťahy.

CVTI 360 je v tomto release **read-only integračná vrstva**. Nevytvára druhú kópiu prevádzkových ani finančných údajov.

## Nový supermodul

Nová route a navigácia:

- `#/enterprise360`
- položka **CVTI 360** v spoločnej navigácii,
- dominantná dlaždica CVTI 360 na hlavnom portáli,
- CVTI 360 je dostupné pre role admin / manager / resolver / viewer so `shared` read scope.

## 360° karta entity

Každá entita obsahuje podľa dostupných väzieb:

- executive snapshot a orientačné 360 skóre,
- business / technical / primary owner a OIT vlastníkov,
- RACI procesy,
- projekty a úlohy,
- Helpdesk / incidenty,
- Problem management,
- Change management,
- riziká,
- technický profil a závislosti,
- CMDB / Asset 360 položky,
- dodávateľské väzby,
- zmluvy a SLA,
- webové / registračné väzby,
- financie a kontraktové čerpanie, ak existuje presné mapovanie.

## Pilotná „golden entity“ – CRZP / ANTIPLAG

CRZP / APS je prvá referenčná entita s presným finančným mapovaním:

- služba `S01 – CRZP/APS`,
- kontraktová úloha `22`,
- rozpočet: **93 552,00 €**,
- čerpanie 01–07/2026: **49 508,47 €**,
- zostatok: **44 043,53 €**,
- 64 auditných riadkov v payment ledgeri,
- mesačný drill-down január až júl,
- 3 CMDB aktíva v seed datasete,
- priame väzby na RACI, ticket, problem a change z existujúcich registrov,
- dodávateľská kandidátska väzba je označená ako zdrojová / na preverenie podľa existujúcich dát; modul ju nevydáva za potvrdenú zmluvnú skutočnosť.

## Finance Intelligence priamo v 360 karte

Ak entita má presné mapovanie na kontraktovú úlohu, karta zobrazuje:

- rozpočet,
- čerpanie YTD,
- zostatok,
- percento čerpania,
- mesačný graf,
- klikateľný mesiac,
- konkrétne doklady a auditné riadky,
- KPD / PPD,
- PRACM,
- sumu,
- automatickú reconciliáciu sumy otvorených riadkov s grafom.

Ak presné finančné mapovanie neexistuje, CVTI 360 zobrazí **„bez priameho mapovania“**. Finančné údaje sa nevymýšľajú ani nepriraďujú heuristicky.

## Portfólio a vyhľadávanie

- register 14 známych enterprise entít z existujúceho architektonického katalógu,
- fulltext podľa názvu, aliasov, služby, vlastníka, technológie, assetu, dodávateľa a súvisiacich údajov,
- Global Search (Ctrl+K) po novom vyhľadáva aj CVTI 360 entity,
- výsledok z globálneho hľadania otvorí priamo konkrétnu 360 kartu pomocou `?entity=`.

## Relationship Map

Nový pohľad **Vzťahy** prepája jednu entitu s:

- službou,
- ľuďmi / RACI,
- technológiami,
- financiami,
- dodávateľmi,
- zmluvami,
- pracovnými položkami,
- rizikami.

Kliknutie otvorí pôvodný zdrojový modul.

## Dátová hranica

Release zámerne rozlišuje medzi:

1. **presne prepojenými údajmi** – identifikátor služby, projekt, task code, serviceId alebo explicitná aliasová väzba,
2. **odvodenými / kandidátskymi väzbami** – tie ostávajú označené podľa existujúceho zdrojového statusu,
3. **chýbajúcou väzbou** – zobrazí sa ako dátová medzera, nie ako vymyslená hodnota.

## Databáza

Release **nevyžaduje novú SQL migráciu**. Používa existujúci AppState, snapshoty, registre a zabalené auditné datasety.

## Zmenené súbory

- `package.json`
- `src/App.tsx`
- `src/components/GlobalSearch.tsx`
- `src/data/seed.json`
- `src/lib/storage.ts`
- `src/views/DepartmentPortal.tsx`

Nové súbory:

- `src/lib/enterprise360.ts`
- `src/views/Enterprise360.tsx`
- `src/views/Enterprise360.css`
- `CVTI_360_0.41.md`
- `RELEASE_NOTES_0.41.md`
- `README_NASADENIE_0.41.txt`
- `QA_RESULTS_0.41.txt`

Verzia aplikácie: **0.41.0**.
