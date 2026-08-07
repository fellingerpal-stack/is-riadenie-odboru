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
