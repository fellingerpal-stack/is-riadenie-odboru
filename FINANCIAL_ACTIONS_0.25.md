# Financial Actions & Optimization – metodika v0.25

## Účel

Vrstva spája finančné signály s praktickým riadením: signal → owner → KPI → termín → stav → výsledok.

## RUN baseline

RUN baseline je pracovná referenčná hodnota klasifikovaných prevádzkových nákladov v porovnateľnom rozsahu dát. Pri zmene rozsahu služieb, klasifikácie alebo zdrojových mesiacov sa musí metodicky prepočítať.

## Cost-owner

Cost-owner nie je automaticky účtovný vlastník ani RACI A. Je to manažérsky vlastník nákladového bloku, ktorý má vedieť vysvetliť náklad, SLA/KPI, odchýlku, dodávateľskú väzbu a optimalizačný plán.

## DC VaV unit economics

Menovatele vychádzajú z technologického snapshotu DC VaV: rack inventory a kapacitné údaje CPU, pamäte a primárneho storage. Finančný čitateľ je klasifikovaný náklad DC VaV za zvolený finančný rok/obdobie. Preto ide o orientačný analytický pohľad, nie účtovný TCO.

## COST × single-R

Finančná expozícia vzniká tam, kde nákladová entita má nájdenú RACI väzbu a aspoň jeden z týchto procesov má jediného vykonávateľa R. Výstup prioritizuje kontinuitu podľa finančného dopadu, ale nenahrádza business impact analysis.

## CAPEX

Kapitálové 7xx sa nevytvárajú odhadom. Kým nie je k dispozícii samostatný dôveryhodný zdroj, aplikácia iba eviduje dátovú medzeru a opatrenie na jej doplnenie.
