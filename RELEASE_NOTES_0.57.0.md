# Release 0.57.0 – Project UX & Executive Card

## Cieľ
Vizuálne a informačné prepracovanie modulu Riadenie projektov nad stabilnou funkčnou vrstvou v0.56.2. Release nemení projektové dáta, RLS ani finančné mapovanie; zlepšuje orientáciu používateľa, kontrast a dostupnosť kľúčových manažérskych údajov.

## Portfólio projektov
- výraznejší executive dizajn projektových kariet s tmavou hlavičkou a health akcentom,
- auto health a projektový stav sú viditeľné naraz,
- fáza a projektový manažér zostávajú v hornej časti karty,
- vlastný delivery progress s percentom,
- nové KPI priamo na karte: rozpočet, percento čerpania, počet ľudí a súčet alokácií, počet úloh a hotových úloh, governance signály,
- najbližší otvorený míľnik a jeho termín,
- časové rozpätie projektu v päte,
- vyšší kontrast celého portfólia, KPI pásu, záložiek a vyhľadávania.

## Detail projektu – Executive Card
Nová horná executive karta zobrazuje ešte pred záložkami:
- názov, typ a účel projektu,
- automatický health, stav a fázu,
- delivery percento,
- projektového manažéra,
- termín projektu,
- rozpočet + čerpanie a percento využitia,
- veľkosť tímu + súčet projektových alokácií,
- otvorené RAID položky + čakajúce rozhodnutia,
- najbližší míľnik a termín.

## Karta projektu
Pôvodný prehľad zostáva zachovaný, ale sekundárne informačné bloky boli upravené tak, aby neduplikovali executive header. Zvýraznené sú fáza/delivery model, gestor, priorita, stav reportingu, tím, úlohy, rozpočet, míľnik, cieľ a očakávaný výsledok.

## Bez zmeny
- Project Capacity Intelligence,
- Governance / RAID / Status reports / Decision log,
- financovanie a väzby na úlohy 10/22/25,
- Entity Financial Allocation z v0.56.2,
- projektové roly a oprávnenia,
- Supabase tabuľky, RLS a RPC,
- Edge Function invite-user.

## Databáza
v0.57.0 nepridáva novú SQL migráciu. Ak databáza už obsahuje migráciu v0.56.2, nič ďalšie v Supabase nespúšťaj.
