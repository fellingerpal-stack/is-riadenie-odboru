# Release 0.29.0 – Supplier Relationships & Vendor Dependency

Release 0.29.0 rozširuje existujúci Supplier 360 o spravovaný register vzťahov medzi dodávateľmi, informačnými systémami, modulmi a službami.

## 1. Nová dátová vrstva `supplierRelationships`

Aplikácia oddeľuje tri druhy väzieb:

- **Zdrojové** – dodávateľ je explicitne uvedený pri informačnom systéme v zdrojovom registri.
- **Odvodené / Na preverenie** – kandidát vznikol z dôveryhodného vecného podkladu, ale priamy dodávateľ pri konkrétnom module nie je explicitne potvrdený.
- **Manuálne** – väzbu vytvoril alebo potvrdil administrátor.

Každá väzba môže obsahovať typ cieľa, nadradený systém, rolu dodávateľa, zmluvu, platnosť, zdroj, dôkaz, dôveru, stav a audit poslednej zmeny.

## 2. InterWay – predvyplnené kandidáty

Pre IČO `35728531` sú pripravené kandidátske väzby na potvrdenie administrátorom:

- ISS,
- SKCRIS,
- SCIDAP,
- SVD,
- CRZP,
- APS / Antiplag.

CREPČ / CREUČ a VedaTechnika zostávajú čítané ako zdrojové väzby z registra informačných systémov. Kandidáti nie sú automaticky označení ako potvrdený priamy dodávateľ – admin ich môže potvrdiť, upraviť alebo zamietnuť.

## 3. Supplier 360 – nový pracovný pohľad

Detail dodávateľa teraz obsahuje:

- Vendor Dependency súhrn,
- počet aktívnych a potvrdených väzieb,
- počet kandidátov na preverenie,
- počet väzieb na vysoké/kritické služby,
- zoskupenie podľa nadradeného systému, napr. `IS KOMIS` alebo `CRZP / APS`,
- rolu dodávateľa pri každom systéme/module,
- dôveru a stav väzby,
- zmluvnú referenciu a zdroj dôkazu.

Zdrojové väzby sú zamknuté. Spravované väzby môže meniť iba administrátor.

## 4. Admin workflow kandidátov

Administrátor môže pri kandidátskej väzbe:

- **Potvrdiť** – z kandidáta vznikne spravovaná potvrdená väzba,
- **Upraviť** – doplní rolu, zmluvu, platnosť, zdroj alebo poznámku,
- **Zamietnuť** – kandidát zostane v auditnej vrstve, ale nezapočítava sa do aktívnych väzieb.

Odstránenie spravovaného rozhodnutia nad kandidátom obnoví pôvodný kandidát.

## 5. Hromadný import CSV / XLSX

Admin môže importovať zoznam väzieb z CSV, XLSX alebo XLS. Podporované polia:

`IČO | Dodávateľ | Systém | Modul | Typ | Nadradený systém | Rola dodávateľa | Zmluva | Platnosť od | Platnosť do | Stav | Dôvera | Zdroj | Poznámka`

Import má náhľad pred zápisom a priamo v aplikácii je dostupný vzor CSV.

## 6. Export a vyhľadávanie

- Supplier 360 umožňuje export väzieb vybraného dodávateľa do CSV.
- Globálne hľadanie `Ctrl+K` vyhľadáva aj názvy systémov/modulov a roly z nových dodávateľských väzieb.
- Data Quality Center zobrazuje nový signál `Dodávateľské väzby na potvrdenie`.

## 7. IAM a databáza

- Čítanie Supplier 360 zostáva dostupné podľa existujúceho shared scope.
- Zápis vzťahov a import sú admin-only.
- Release nevyžaduje nový Supabase SQL skript ani zmenu RLS.
- `supplierRelationships` sa migruje ako ďalšie pole existujúceho synchronizovaného snapshotu; staršie snapshoty dostanú automaticky prázdne pole.

## 8. Technické zmeny

Nový súbor:

- `src/data/supplierRelationshipCandidates.ts`

Upravené súbory:

- `src/types.ts`
- `src/lib/storage.ts`
- `src/lib/supplierDirectory.ts`
- `src/views/Suppliers.tsx`
- `src/views/Suppliers.css`
- `src/components/GlobalSearch.tsx`
- `src/views/DataQuality.tsx`
- `src/App.tsx`
- `src/data/seed.json`
- `package.json`

Verzia aplikácie: `0.29.0`.
