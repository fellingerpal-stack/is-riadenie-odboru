# Asset Management 0.27 – metodika

## Cieľ

Asset register je spoločná evidencia fyzických, virtuálnych a softvérových aktív CVTI SR. Nenahrádza účtovnú evidenciu majetku. Slúži na prevádzkové, vlastnícke, lifecycle, servisné a riadiace väzby.

## Asset vs. CI

- **Asset**: vec, ku ktorej má význam vlastníctvo, umiestnenie, inventár, obstaranie alebo lifecycle – napr. notebook, tlačiareň, fyzický server.
- **CI**: konfiguračná položka dôležitá pre službu – napr. VM, databáza, aplikácia, SaaS.
- Jeden register podporuje obe skupiny, pričom `Typ` a `Trieda` zachovávajú rozdiel.

## Minimálne odporúčané údaje fyzického aktíva

Názov, typ, scope, inventárne číslo alebo S/N, lokalita, pridelená osoba/owner, lifecycle, dodávateľ alebo zdroj, dátum nákupu a koniec záruky.

## Periférie

Samostatne sú podporované minimálne: monitor, dokovacia stanica, tlačiareň, MFP, skener, UPS, mobilný telefón, tablet a externý disk.

## Asset Health

Skóre kontroluje evidenciu:
- vlastníctvo,
- lokalitu,
- jedinečný identifikátor,
- lifecycle,
- dokumentáciu,
- väzbu na službu/účel,
- dodávateľa/pôvod,
- finančnú stopu,
- záruku/podporu pri fyzických aktívach.

Nie je to technický monitoring dostupnosti ani automatické hodnotenie osoby.

## Duplicity

Import aj register používajú tieto preferované kľúče:
1. inventárne číslo,
2. sériové číslo,
3. hostname,
4. interné ID.

Pri importe možno duplicitu preskočiť, aktualizovať alebo vytvoriť ako nový záznam.

## Inventarizácia

Stavy: Neoverené, Nájdené, Presunuté, Nezhoda, Nenájdené. Každá zmena sa zapisuje do histórie s používateľom a časom.

## Vyradenie

Bežný workflow je najprv `Na vyradenie`. Hard delete je iba administrátorská operácia a má sa používať len na chybný/testovací záznam, nie na štandardné vyradenie majetku.
