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
