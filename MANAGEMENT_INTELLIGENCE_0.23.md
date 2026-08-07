# Metodika – Management Intelligence v0.23

## Zásada

Modul nepoužíva externý AI model. Všetky skóre, väzby a signály sú vypočítané lokálne z údajov aplikácie a zo zabaleného finančného snapshotu.

## Service 360

Primárna väzba medzi záznamami je `serviceId`. Ak priamy identifikátor neexistuje, používa sa konzervatívne názvové porovnanie. Z porovnávania sú odstránené všeobecné slová typu služba, prevádzka, správa, podpora alebo rozvoj.

## Service Health

Skóre začína na 100 bodoch a znižuje sa pri chýbajúcich alebo rizikových prvkoch: vlastník, zástupca, runbook, monitoring, backup, SLA, RACI vykonávateľ, single-R, otvorené problémy a lifecycle termíny. Ide o skóre pripravenosti a kontinuity evidencie, nie o meranie skutočnej dostupnosti alebo kvality človeka.

## Attention Score

Prioritizačné skóre kombinuje kritickosť služby, zastupiteľnosť, RACI single-point-of-failure, otvorené problémy, prioritné tickety, lifecycle, budget forecast, health a finančnú expozíciu. Skóre sa používa len na poradie signálov.

## Finančné mapovanie SIT

Autoritatívny súhrn je hárok `čerpanie SIT` zo súboru `cerpanie_01_05_2026_import_ready.xlsx`.

Riadková vrstva používa:
- 130 / 328 -> úloha 10,
- 341 -> úloha 22,
- 345 -> priama časť úlohy 25,
- ostatné strediská -> reconciliačná časť úlohy 25 podľa kontrolného mapovania.

Každé metodické priradenie mimo 345 je v analytike označené, aby sa nedalo zameniť za priamu účtovnú väzbu.

## Forecast

Forecast nepracuje s júnom až decembrom ako s nulou. Zostávajúce mesiace dopočítava jedným z troch scenárov: priemer YTD, priemer posledných 3 mesiacov alebo konzervatívny vyšší priemer.
