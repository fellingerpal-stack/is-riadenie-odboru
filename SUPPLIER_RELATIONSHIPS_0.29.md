# Supplier Relationships – metodika 0.29

## Základný princíp

Dodávateľská väzba nie je iba textové pole pri IS. Eviduje sa ako samostatný vzťah:

`Dodávateľ -> systém/modul/služba -> rola -> zmluva -> zdroj/dôkaz -> dôvera/stav`.

## Stav

- `Potvrdené` – vzťah je možné používať v manažérskom pohľade.
- `Na preverenie` – kandidát, ktorý nesmie byť interpretovaný ako potvrdený fakt.
- `Zamietnuté` – administrátor kandidáta odmietol; zostáva ako auditné rozhodnutie.

## Dôvera

- `Zdrojové` – explicitný údaj v zdrojovom registri IS.
- `Odvodené` – vecná väzba odvodená z podkladov (napr. príslušnosť modulu k IS KOMIS), ale bez explicitného potvrdenia dodávateľa pre daný modul.
- `Manuálne` – potvrdenie alebo doplnenie administrátorom.

## Odporúčaný import

Minimálne stĺpce:

- IČO alebo Dodávateľ,
- Systém alebo Modul.

Odporúčané doplňujúce stĺpce:

- Nadradený systém,
- Rola dodávateľa,
- Zmluva,
- Platnosť od/do,
- Stav,
- Dôvera,
- Zdroj,
- Poznámka.

## Auditná hranica

Aplikácia nesmie automaticky meniť zdrojové platby ani pôvodný register informačných systémov. Nová vrstva iba dopĺňa a klasifikuje vzťahy nad existujúcimi zdrojmi.
