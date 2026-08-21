# ServiceDesk Workflow & Handover 0.48.1

## Odporúčaný životný cyklus
`Nová → Pridelená → V riešení → Čaká na používateľa / Blokované → Vyriešená → Uzatvorená`

`Zrušená` je koncový stav pre neplatnú alebo stiahnutú požiadavku.

## Vyriešená vs. Uzatvorená
- **Vyriešená**: riešiteľ vykonal riešenie a výsledok je zaznamenaný.
- **Uzatvorená**: ticket je definitívne administratívne ukončený.

Pri oboch stavoch musí byť vyplnené pole `Riešenie / výsledok`.

## Handover
Pri presune sa odporúča meniť v jednom kroku:
1. riešiteľskú skupinu,
2. konkrétneho riešiteľa (alebo ponechať bez riešiteľa),
3. dôvod odovzdania.

Aplikácia zapíše zmeny do histórie a databázový trigger upozorní novú skupinu.

## Resolver directory
Zoznam kandidátov spája ORIS ľudí a OIT 3.1 osoby zo zdrojovej RACI. Členstvo skupiny je uložené menom/e-mailom. Server pri resolver oprávnení porovná členstvo s aktívnym používateľským profilom.
