# IS Riadenie odboru v0.20.0 – RACI Intelligence

Release 0.20.0 nadväzuje na spoločný RACI pohľad odborov 3.1 a 3.2 a pridáva vysvetliteľnú analytickú vrstvu nad existujúcimi väzbami. Nevyžaduje externé AI API a neposiela RACI dáta mimo aplikácie.

## Hlavné novinky

- nový pohľad **RACI Intelligence** dostupný z RACI odboru 3.1 aj 3.2,
- spoločný **RACI health score** a čiastkové skóre integrity, kontinuity, vyváženia výkonu R, oddelenia R/A a aktívneho zapojenia,
- **what-if simulácia neprítomnosti pracovníka** s výpočtom nových procesov bez R, bez A a nových procesov s jediným R,
- oddelenie **prevádzkového dopadu** a **governance dopadu**, aby sa formálne A nezamieňalo s reálnym pracovným zaťažením,
- automatický rebríček ľudí podľa simulovaného dopadu a bus-factor rizika,
- analýza **koncentrácie dvojíc** – spoločné procesy a priame väzby A↔R,
- návrhy zastupovania podľa už evidovaných zástupcov v odbore 3.2 alebo podľa prekryvu rolí v RACI,
- automaticky zoradené **manažérske odporúčania podľa očakávaného efektu**,
- vysvetlenie metodiky priamo v UI; nejde o personálne hodnotenie ani meranie výkonu.

## Dôležité metodické pravidlá

- RACI Intelligence je deterministický a vysvetliteľný analytický model nad aktuálnymi dátami aplikácie.
- Pri odbore 3.1 zdrojová RACI zatiaľ neobsahuje kritickosť každého procesu. Kritickosť preto vstupuje do simulácie len tam, kde ju zdrojové dáta poznajú.
- Formálne A riaditeľa OIT sa zobrazuje ako governance závislosť, nie ako tvrdenie o praktickom vykonávaní procesov.
- Návrh zástupcu podľa prekryvu rolí je analytický kandidát; musí byť potvrdený manažérom a prakticky overený.

## Technické zmeny

Nové súbory:
- `src/lib/raciIntelligence.ts`
- `src/views/RaciIntelligence.tsx`
- `src/views/RaciIntelligence.css`

Upravené súbory:
- `src/App.tsx`
- `src/views/Raci.tsx`
- `src/views/OitPortal.tsx`
- `src/lib/storage.ts`
- `src/data/seed.json`
- `package.json`

## Databáza

Release 0.20.0 nevyžaduje nový Supabase SQL skript ani zmenu databázovej schémy.

## Kontrolný výsledok na dátach dodaných v release

Pri bundled seed dátach dáva analytický engine nasledovný orientačný baseline:

- spoločný RACI health: **78/100**,
- odbor 3.1: **88/100**, 21 procesov s jediným R, bus factor 50 % = 1 osoba,
- odbor 3.2: **67/100**, 24 procesov s jediným R, bus factor 50 % = 4 osoby,
- najvyšší simulovaný prevádzkový dopad v odbore 3.2: **Peter Modrák**,
- najsilnejšia operatívna dvojica v OIT podľa spoločných R/C väzieb: **Štefan Knap ↔ Jaroslav Lečko**.

Tieto hodnoty sa po zmene RACI automaticky prepočítavajú a nemajú byť interpretované ako hodnotenie zamestnancov.
