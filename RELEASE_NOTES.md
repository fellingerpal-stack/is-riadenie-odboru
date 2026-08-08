# Release 0.29.0 – Supplier Relationships & Vendor Dependency

- Supplier 360 spravuje samostatné väzby dodávateľ → systém/modul/služba.
- Zdrojové, odvodené a manuálne väzby sú oddelené podľa dôvery a stavu.
- InterWay má pripravené kandidáty ISS, SKCRIS, SCIDAP, SVD, CRZP a APS/Antiplag na administrátorské potvrdenie.
- Admin môže väzbu potvrdiť, upraviť, zamietnuť alebo hromadne importovať z CSV/XLSX.
- Ctrl+K a Data Quality Center pracujú aj s dodávateľskými väzbami.
- Bez nového SQL a bez zmeny RLS.

# Release 0.28.0 – Smart Workspace & UX Simplification

- Moje centrum, globálne hľadanie Ctrl+K a Data Quality Center.
- Uložené pohľady a hromadné operácie v Asset Managemente.
- Zjednodušená pracovná navigácia.
- Bez nového SQL a bez zmeny RLS.

# Release 0.26.0 – Scoped IAM + finančné obdobie

- IAM matica 3.1 / 3.2 / spoločné s úrovňami none/read/write.
- Serverové scope kontroly v Supabase a bezpečný čiastočný zápis snapshotu.
- Prepínač IT nákladov Jan–Jún / Jan–Dec; celý rok 2023–2025.
- Nový reprodukovateľný full-year IT dataset.
- Vyžaduje SQL `IS_Riadenie_odboru_v0.26.0_IAM_SCOPE.sql`.

# Release 0.25.0 – Financial Actions & Optimization

## Hlavný cieľ

Release mení sekciu „Čo by som z týchto dát riadil ďalej“ z textových odporúčaní na pracovnú vrstvu, v ktorej sa dá analyzovať finančný problém a vytvoriť riadiace opatrenie.

## 1. Riadiace opatrenia

V module **IT náklady** pribudla karta **Financial Actions & Optimization**.

Obsahuje pripravené typy opatrení:

- schválenie RUN baseline,
- určenie cost-ownerov pre TOP nákladové oblasti,
- zavedenie jednotkových KPI DC VaV,
- zníženie finančnej expozície single-R služieb,
- doplnenie samostatného CAPEX / 7xx zdroja.

Admin alebo manažér môže z odporúčania vytvoriť reálne opatrenie. Opatrenie sa zapisuje do existujúceho poľa `state.actions` a obsahuje:

- názov a očakávaný výstup,
- navrhovaného a potvrdeného vlastníka,
- termín,
- stav,
- KPI,
- závislosti,
- rozhodnutie vedenia,
- auditnú poznámku s označením FIN25.

Stav, potvrdený vlastník a termín sa dajú upravovať priamo vo finančnom module. Čitatelia vidia stav read-only.

## 2. RUN baseline

Samostatný pohľad ukazuje porovnateľný RUN trend pre dostupné roky a pracovný index voči prvému nenulovému roku.

RUN a CHANGE ostávajú oddelené. Baseline je explicitne označený ako manažérsky analytický ukazovateľ, nie schválený rozpočet.

## 3. Cost-owner pohľad

TOP nákladové entity sú zoradené podľa finančného dopadu a pri každej sa zobrazuje:

- náklad,
- podiel na aktuálnom výbere,
- počet RACI väzieb,
- počet single-R väzieb,
- preklik na súvisiaci register,
- stav finančného opatrenia.

Admin/manager môže vytvoriť samostatné opatrenie na potvrdenie cost-ownera, SLA/KPI a optimalizačného plánu pre konkrétnu entitu.

## 4. DC VaV unit economics

Pre DC VaV sa z existujúcich finančných a technologických dát počítajú orientačné jednotkové ukazovatele:

- náklad / rack,
- náklad / evidované zariadenie,
- náklad / TB využitého primárneho úložiska,
- využitie primárneho storage,
- využitie CPU a RAM.

Ukazovatele sú zámerne označené ako orientačné. Finančný a kapacitný snapshot nemusia mať rovnaký referenčný dátum a nejde o plný TCO.

## 5. COST × single-R

Samostatný pohľad zoradí nákladové entity, ktoré majú aspoň jednu RACI väzbu s jediným vykonávateľom R.

Zobrazuje:

- finančnú expozíciu,
- podiel na aktuálnom výbere,
- počet RACI väzieb,
- počet single-R väzieb,
- preklik na súvisiaci register,
- možnosť vytvoriť opatrenie na zastupiteľnosť / akceptáciu rizika.

## 6. Metodická hranica CHANGE / CAPEX

Release nemení existujúcu klasifikáciu IT nákladov. Výslovne zachováva upozornenie, že nízky podiel CHANGE nie je úplný obraz investícií. Zdrojový IT výrez pokrýva najmä bežné výdavky 632–637; kapitálové 7xx sa bez samostatného zdroja nepripočítavajú.

## Oprávnenia

- všetky roly, ktoré majú prístup k IT nákladom, vidia Financial Actions & Optimization,
- vytvárať a meniť riadiace opatrenia môže **admin alebo manager**,
- resolver/viewer majú read-only pohľad.

## Databáza

Nový SQL nie je potrebný. Release využíva existujúci synchronizovaný register `actions` v stave aplikácie.


---

# Release 0.24.1 – Dodávateľ v dôkaznej tabuľke IT nákladov

## Hlavná zmena

Dôkazná tabuľka v module **IT náklady** teraz obsahuje samostatný stĺpec **Dodávateľ**. Dodávateľ sa pripája konzervatívne cez existujúci riadkový snapshot SIT 2026:

1. prednostne podľa presnej zhody TOP dokladu,
2. ak doklad nie je k dispozícii, podľa presnej zhody názvu položky + KPD/PPD,
3. ak spoľahlivá zhoda neexistuje, tabuľka zobrazí „bez spoľahlivej zhody“ a nič neodhaduje.

Názov firmy sa pre známe IČO prekladá cez register dodávateľov v aplikácii; adminom doplnený názov má prednosť.

## UX tabuľky

- nový stĺpec **Dodávateľ** s názvom firmy a IČO,
- nový filter **Dodávateľ**,
- nové zoradenie **Podľa dodávateľa**,
- fulltext vyhľadáva aj názov dodávateľa a IČO,
- export CSV obsahuje Dodávateľa a IČO,
- optimalizované šírky všetkých stĺpcov,
- kompaktnejšie KPD/PPD, RUN/CHANGE, dôvera a TOP doklad,
- názov dodávateľa sa zalomí maximálne na dva riadky,
- suma zostáva sticky vpravo, hlavička sticky hore,
- horizontálny scroll ostáva iba vo vnútri tabuľky.

## Dátová hranica

Riadkový kontraktový snapshot použitý na väzbu dodávateľov pokrýva január až máj 2026. Preto sa pri niektorých júnových alebo historických IT položkách dodávateľ zámerne nezobrazí, kým nie je dostupná spoľahlivá väzba.

## Databáza

Release nemení Supabase schému. Nový SQL nie je potrebný.

---

# Release notes

## v0.24.0 – Register a správa dodávateľov

- spoločný read-only register dodávateľov pre všetky prihlásené roly,
- admin-only správa kontaktných a zmluvných metadát,
- automatické pomenovanie známych dodávateľov podľa IČO (vrátane InterWay),
- Supplier 360: platby, zmluvy, úlohy, strediská, IS, SLA, kontakty a odkazy,
- rovnaké názvy dodávateľov v Riadiacom centre IT a Service 360,
- bez novej Supabase databázovej schémy.

Podrobnosti: `RELEASE_NOTES_0.24.md`.

# Release 0.23.0 – Service 360 a Riadiace centrum IT

Pozri `RELEASE_NOTES_0.23.md`.

---

# Release 0.22.0 – Technology Intelligence + SIT finančné čerpanie

Release 0.22.0 spája tri oblasti, ktoré boli doteraz oddelené: technologický katalóg, RACI/prevádzkové väzby a finančné náklady. Súčasne zlepšuje prácu s detailnou tabuľkou IT nákladov a pridáva samostatný manažérsky pohľad na kontraktové úlohy 10, 22 a 25.

## 1. Technologický katalóg 2.0

- kompaktnejšia hlavička a KPI – viac obsahu sa zmestí do prvého viewportu,
- globálne vyhľadávanie fungujúce naprieč Explorerom a tabuľkovým registrom,
- globálne filtre modelu a lokality,
- rýchle filtre: vysoký dopad, neúplné údaje, technológie s COST väzbou a blížiace sa licenčné/podporné termíny,
- nový manažérsky briefing nad technologickým modelom,
- nový kompaktný tabuľkový register technológií,
- 360° detail technológie rozšírený o Technology Health, blast radius, priamu finančnú väzbu a počet súvisiacich služieb/CMDB/architektonických záznamov,
- Technology Health je vysvetliteľné skóre pripravenosti údajov – dokumentácia, monitoring, zálohovanie, vlastníctvo a lifecycle. Nie je to meranie reálnej dostupnosti ani výkonu technológie,
- finančná väzba je zobrazovaná len pri jednoznačnom názvovom prepojení na existujúce nákladové entity z modulu IT náklady; nevykonáva sa plošné rozdeľovanie nákladov na každú infraštruktúrnu položku.

## 2. IT náklady – prerobená dôkazná tabuľka

- menšie písmo a kompaktnejšie riadky,
- samostatný scrollovací panel s lepšie viditeľným scrollbarom,
- sticky hlavička a sticky pravý stĺpec so sumou,
- vlastné vyhľadávanie len v dôkaznej vrstve,
- filter podľa nákladovej entity,
- zoradenie podľa sumy, názvu alebo KPD/PPD,
- voľba 50 / 100 / 250 / všetky riadky,
- prepínač kompaktnej a vzdušnej hustoty,
- na desktopoch sa tabuľka snaží využiť celú šírku; na menších obrazovkách sa horizontálne roluje iba v rámci svojho panelu.

## 3. SIT 2026 – kontraktové úlohy 10 / 22 / 25

Do modulu IT náklady pribudol druhý hlavný pohľad **Úlohy 10 / 22 / 25**.

Zdrojový snapshot čerpania obsahuje údaje do mája 2026:

- Úloha 10 – rozpočet 909 630,00 €, čerpanie 385 592,09 €, zostatok 524 037,91 €,
- Úloha 22 – rozpočet 93 552,00 €, čerpanie 30 773,98 €, zostatok 62 778,02 €,
- Úloha 25 – rozpočet 65 501,00 €, čerpanie 37 482,38 €, zostatok 28 018,62 €.

Spolu: rozpočet 1 068 683,00 €, čerpanie 453 848,45 €, zostatok 614 834,55 €.

### Nové analytické možnosti

- výber konkrétnej úlohy alebo spoločného pohľadu 10 + 22 + 25,
- mesačný, kvartálny a kumulatívny pohľad,
- metrika čerpanie €, podiel rozpočtu % alebo zostatok €,
- KPI rozpočet, vyčerpané, zostatok, priemer mesačne a jednoduchý run-rate,
- indikátor čerpanie vs. uplynutý čas roka,
- Q1 a priebežný Q2 detail,
- export aktuálne zvolenej úlohy do CSV.

### Dôležité metodické pravidlo

Snapshot je označený **dáta do mája 2026**. Jún až december sa nepovažujú za nulové čerpanie – v zdroji zatiaľ nie sú načítané.

Pri úlohe 25 sa detailné platby v tomto release automaticky nepreklasifikujú podľa pravidla „všetky ostatné strediská“. Kontrolný workbook toto pravidlo označuje ako metodické rozhodnutie, ktoré má byť potvrdené. Manažérsky pohľad preto používa súhrnné autoritatívne hodnoty úlohy 25 zo sheetu čerpanie SIT.

Jednoduchý run-rate je len analytická extrapolácia `vyčerpané / 5 × 12`; nejde o oficiálnu prognózu ani záväzný forecast.

## Technické zmeny

Nové súbory:
- `src/data/contractTasks.json`
- `src/views/ContractSpending.tsx`
- `src/views/ContractSpending.css`
- `src/views/TechnologyCatalog.css`

Upravené súbory:
- `src/views/TechnologyCatalog.tsx`
- `src/views/ItCosts.tsx`
- `src/views/ItCosts.css`
- `src/lib/storage.ts`
- `src/data/seed.json`
- `package.json`

Databázová schéma tejto aplikácie sa v release 0.22.0 nemení. Kontraktové čerpanie je zabalený, auditovateľný snapshot pripravený na neskoršie napojenie na mesačný Supabase view / import.


# 0.28.0 – Smart Workspace & UX Simplification
- Moje centrum a personalizovaná pracovná fronta.
- Globálne hľadanie Ctrl+K.
- Data Quality Center.
- Asset saved views a hromadné operácie.
- Zjednodušená navigácia spoločného portálu.
