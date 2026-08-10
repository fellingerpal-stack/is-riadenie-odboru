# IS Riadenie odboru v0.32.0 – Supplier Temporal Views

## Cieľ release

Dodávateľský register dostáva rovnaké časové a analytické uvažovanie ako IT náklady: používateľ vie oddeliť obdobie, finančnú aktivitu, zmluvy, SLA a servisné väzby.

## Nové filtre v Dodávateľoch

- **Obdobie**: konkrétny rok / všetky dostupné obdobia.
- **Rok**: 2023–2028; rok 2026 je označený ako rok s riadkovými supplier platbami.
- **Aktivita**: aktivita v období, všetci dodávatelia, s platbou, so zmluvou, s väzbou na IS/službu, na preverenie, bez aktivity v období, IČO bez názvu.
- **SLA**: všetko, SLA áno, SLA nie, SLA preveriť, bez SLA evidencie.
- **Úloha**: 10 / 22 / 25 zostáva finančným filtrom.
- **Hľadanie** zahŕňa názov, IČO, zmluvy, systémy, SLA a roly.

## Časové KPI

Horné karty sa prepočítavajú podľa aktuálneho výberu:

- dodávateľské identity,
- platby,
- zmluvy v období,
- väzby na IS/služby,
- SLA evidované,
- kandidáti na preverenie.

## Supplier 360

Detail dodávateľa zobrazuje zvolené obdobie a prepočítava:

- platby,
- zmluvné referencie,
- aktívne servisné väzby,
- SLA stav,
- kandidátske väzby.

Vzťahy s vyplnenou platnosťou `Platnosť od / Platnosť do` sa filtrujú podľa zvoleného roka. Nedatované zdrojové väzby sa ponechávajú ako nedatované – aplikácia ich umelo nedatuje.

## Metodická hranica finančných dát

Riadkový supplier payment dataset je v aktuálnej aplikácii dostupný iba pre **Jan–Máj 2026** (úlohy 10 / 22 / 25). Pri roku 2023, 2024, 2025, 2027 alebo 2028 sa preto finančná suma nezobrazuje ako nula, ale ako **— / bez finančného datasetu**. Tieto roky slúžia pre zmluvy, SLA a servisné väzby.

Release nevymýšľa historické supplier platby z IT nákladov, pretože klasifikačný dataset 2023–2025 neposkytuje spoľahlivú riadkovú identitu dodávateľa.

## Databáza

- nový SQL skript sa nespúšťa,
- RLS sa nemení,
- snapshot sync v0.30.4 sa nemení,
- Network Discovery DB sa nemení.

## Zmenené súbory

- `src/views/Suppliers.tsx`
- `src/views/Suppliers.css`
- `src/lib/storage.ts`
- `src/data/seed.json`
- `package.json`

Verzia aplikácie: `0.32.0`.
