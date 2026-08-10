# Interactive Drilldown v0.35

## Princíp
Manažérsky ukazovateľ nemá byť slepé číslo. Ak má aplikácia podkladové dáta, karta má používateľa dostať k tomu, z čoho číslo vzniklo.

V0.35 zavádza tento princíp najmä v IT nákladoch:

`KPI -> podkladové položky -> detail položky -> ročný rozpad -> súvisiaci register`

Príklady:
- `IT náklady 2026` -> položky tvoriace sumu,
- `Najväčší nákladový blok` -> položky konkrétnej kategórie,
- `Koncentrácia nákladov` -> top finančné entity,
- `COST x RACI` -> entity s nájdenou RACI väzbou,
- `Single-R expozícia` -> entity s finančnou expozíciou na jediného R.

## Viacročný pohľad
Voľba `Rok = Všetko` vždy rešpektuje zvolené obdobie.

- Jan-Jun používa všetky dostupné porovnateľné roky 2022-2026.
- Jan-Dec používa iba roky s celoročným zdrojom 2022-2025.

Suma `Všetko` je súčet ročných klasifikovaných položiek. Detail položky zachováva jednotlivé roky, aby agregácia zostala auditovateľná.

## Bezpečnostná a metodická hranica
Drill-down nevytvára nové finančné dáta a nemení účtovnú klasifikáciu. Zobrazuje iba dáta, ktoré sú už v lokálnych finančných datasetoch aplikácie. Financial Actions ostávajú viazané na jeden konkrétny rok.

## Ďalšie moduly
Supplier KPI karty filtrujú register dodávateľov podľa finančnej aktivity, zmlúv, SLA a kandidátov. Data Quality KPI karty filtrujú kontroly podľa závažnosti. Existujúce prekliky v Dashboarde, Riadiacom centre IT, Asset 360 a ďalších moduloch zostávajú zachované.
