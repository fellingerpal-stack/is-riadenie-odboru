# IS Riadenie odboru v0.36.0 – Management Action Center

## Hlavná zmena
Release pridáva spoločnú riadiacu vrstvu **Management Action Center**. Cieľom je odpovedať na otázku „čo teraz potrebuje rozhodnutie alebo zásah“ bez vytvárania ďalšieho paralelného registra.

## Zdroje signálov
Action Center agreguje otvorené položky z existujúcich modulov:
- Riadiace opatrenia / Financial Actions,
- Riziká,
- Rozhodnutia,
- Projekty a úlohy,
- Helpdesk / ServiceDesk,
- Change management,
- Problem management,
- IAM / Prístupy,
- Asset management / CMDB,
- dodávateľské väzby,
- zmluvy a SLA.

## Riadiaci pohľad
Každá položka zobrazuje:
- prioritu,
- zdroj a ID,
- signál / problém,
- ownera alebo riešiteľa,
- termín,
- aktuálny stav,
- dôvod, prečo je položka v Action Center,
- preklik do pôvodného registra.

Horné KPI poskytujú okamžitý filter:
- Kritické,
- Po termíne,
- Do 14 dní,
- Bez ownera,
- Otvorené.

Dostupné je aj fulltextové vyhľadávanie, filter zdroja a pohľad „Moje“.

## Metodika
Action Center je odvodený read-only manažérsky pohľad. Nevytvára duplicitu stavu a nemení vlastníctvo zdrojových dát. Úprava sa robí v pôvodnom module, takže ostáva zachovaná existujúca synchronizácia, oprávnenia aj auditná stopa.

Priorita sa odvodzuje konzervatívne z existujúcej priority/rizika/kritickosti a z termínu. Položka po termíne je vždy zvýraznená ako kritická.

## Databáza
- žiadna nová Supabase tabuľka,
- žiadna SQL migrácia,
- snapshot sync sa nemení,
- Log Management v0.34 zostáva bez zmeny,
- Network Discovery sa nemení,
- finančné datasety v0.35 zostávajú bez zmeny.

## Verzia
`0.36.0`
