# IS Riadenie odboru 0.9.0

## CMDB a evidencia aktív

- register aplikácií, serverov, databáz, sieťových prvkov, zariadení, licencií a zmlúv,
- vlastníci, správca, kritickosť, služba, prostredie a umiestnenie,
- technické identifikátory, verzia, dodávateľ a klasifikácia údajov,
- monitoring, zálohovanie a dokumentácia,
- koniec záruky, licencie, zmluvy a podpory,
- životný cyklus a plán obnovy,
- evidencia väzieb a závislostí medzi konfiguračnými položkami,
- manažérske KPI pre kritické položky, medzery vo vlastníctve, dokumentáciu a obnovu,
- predvyplnené vzorové položky pre CRZP, EvuPP, intranet, WebJet, NTI, licencie a pracovné zariadenia.

## Oprava RACI

- odstránený prázdny blok medzi vysvetlením RACI rolí a filtrami,
- vysvetľovací panel je samostatný kompaktný riadok,
- panel sa responzívne skladá na dva alebo jeden stĺpec,
- tabuľka a uložené RACI priradenia sa nemenia.

## Migrácia

Existujúce údaje sa zachovajú. Pri prvom načítaní sa doplnia nové polia `cmdbItems` a `cmdbRelationships` zo vzorových dát a verzia sa zvýši na 0.9.0.
