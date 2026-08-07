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
