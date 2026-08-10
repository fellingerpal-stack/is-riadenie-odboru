# IS Riadenie odboru v0.33.0 – Raw Financial Ledger & Supplier History

## Cieľ release

Finančné pohľady už nie sú odkázané iba na predspracované reporty. Release načítava používateľom dodané ročné účtovné XLSX 2022–2026 priamo na úrovni riadkov a vytvára auditovateľnú finančnú vrstvu pre Dodávateľov aj IT náklady.

## Dodávateľské finančné toky

Nový dataset `supplierPaymentsHistory.json` obsahuje riadkové pohyby s dostupným IČO za roky 2024–2026. Zachováva podpísané sumy, takže storno a korekcie znižujú čistý tok namiesto toho, aby sa umelo menili na kladné hodnoty.

Supplier 360 teraz podporuje:

- čistý finančný tok za rok alebo interval,
- počet účtovných pohybov,
- kladné a záporné toky / korekcie,
- mesačný priebeh Jan–Dec,
- ročnú históriu dodávateľa,
- doklad, poznámku, KPD/PPD, stredisko, ZAK, účet, FZD/PGD,
- zmluvné referencie extrahované zo zdrojových poznámok,
- audit posledných 12 pohybov,
- CSV export pohybov aktuálneho dodávateľa a obdobia.

Finančný filter umožňuje prepínať medzi:

- **Všetky účtovné toky** – nový široký XLSX ledger,
- **SIT 10 / 22 / 25** – pôvodný auditovaný kontraktový pohľad 2026.

## Časový pohľad

Dodávatelia používajú spoločný filter:

- konkrétny rok,
- interval rokov,
- všetky dostupné obdobia.

KPI, zoznam dodávateľov, Supplier 360, zmluvy, SLA a servisné väzby rešpektujú rovnaký časový kontext.

## Metodická hranica 2022–2023

Zdrojové XLSX za roky 2022 a 2023 neobsahujú stĺpec `firma`. Tieto roky sú zahrnuté do celkových finančných a IT trendov, ale release **nevymýšľa spätnú dodávateľskú identitu**. Dodávateľská IČO história preto začína rokom 2024.

## IT náklady

`itCosts.json` a `itCostsFullYear.json` boli nanovo vytvorené priamo z ročných XLSX. IT nákladový detail teraz nesie `evidenceByYear`, takže pri roku 2024/2025/2026 vie použiť dodávateľa a TOP doklad daného roka namiesto novšieho dokladu z iného obdobia.

Klasifikácia je konzervatívna:

- priame IT KPD/PPD pravidlá zostávajú,
- textové pravidlá sa používajú iba na vecne relevantných KPD,
- mzdové, odvodové a transferové riadky sa neklasifikujú ako IT len pre náhodný IT výraz v poznámke,
- vedecké/publikačné databázové predplatné zostávajú mimo IT výrezu podľa existujúcej metodiky.

## Audit dát

Súčasťou release je `DATA_AUDIT_0.33.md`, ktorý kontroluje:

- počty riadkov a čisté sumy proti všetkým piatim XLSX,
- dostupnosť poľa `firma`,
- počty a čisté sumy dodávateľsky atribútovaných pohybov,
- normalizáciu IČO,
- zachovanie záporných korekcií,
- H1 a celoročné IT súčty.

## Databáza

- nový SQL skript sa nespúšťa,
- RLS sa nemení,
- snapshot sync v0.30.4 sa nemení,
- Network Discovery DB sa nemení,
- nové finančné datasety sú statické auditovateľné frontendové JSON podklady.

## Zmenené / nové súbory

- `src/data/supplierPaymentsHistory.json` – nový,
- `src/data/itCosts.json` – regenerovaný z XLSX,
- `src/data/itCostsFullYear.json` – regenerovaný z XLSX,
- `src/lib/supplierDirectory.ts`,
- `src/views/Suppliers.tsx`,
- `src/views/Suppliers.css`,
- `src/views/ItCosts.tsx`,
- `scripts/extract_finance_from_excel.py` – reprodukovateľný import,
- `src/lib/storage.ts`,
- `src/data/seed.json`,
- `package.json`,
- `DATA_AUDIT_0.33.md`.

Verzia aplikácie: `0.33.0`.
