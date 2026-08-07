# Release 0.26.0 – Scoped IAM + prepínanie finančného obdobia

## 1. IAM podľa pracovného priestoru

Release oddeľuje globálnu aplikačnú rolu od pracovného rozsahu používateľa.

Každý profil má teraz tri samostatné prístupy:

- **Odbor 3.1 (OIT)** – Bez prístupu / Iba čítanie / Čítanie + zápis,
- **Odbor 3.2 (ORIS)** – Bez prístupu / Iba čítanie / Čítanie + zápis,
- **Spoločné moduly** – Bez prístupu / Iba čítanie / Čítanie + zápis.

Aplikačná rola (`admin`, `manager`, `resolver`, `employee`, `viewer`) zostáva horným limitom oprávnenia. Scope matica neurčuje vyššie oprávnenie než rola, iba určuje, **kde** sa môže daná rola uplatniť.

Príklad riaditeľa odboru 3.2:

- rola: **Riaditeľ / manažér**,
- Odbor 3.1: **R – iba čítanie**,
- Odbor 3.2: **W – čítanie + zápis**,
- Spoločné: **W – čítanie + zápis**.

V takomto nastavení používateľ vidí údaje 3.1, ale editačné akcie v 3.1 sú vypnuté. V 3.2 môže vykonávať manažérske zápisy.

### Admin UI

V **Používatelia** pribudli:

- stĺpec s efektívnymi rozsahmi `3.1 W/R/—`, `3.2 W/R/—`, `Spol. W/R/—`,
- matica rozsahu pri pozvaní používateľa,
- matica rozsahu pri úprave používateľa,
- detail prístupov v karte účtu,
- audit zmeny rozsahu.

Administrátor má vždy `W/W/W`.

### Serverová ochrana

Nová Supabase migrácia nepridáva iba UI obmedzenie. Zavádza `access_scopes` do profilov, scope helper funkcie a aktualizuje RLS / editor funkcie pre pracovné moduly 3.2 a čítanie OIT dokumentov.

`save_app_snapshot()` navyše pri zápise zachová serverovú verziu častí, ku ktorým používateľ nemá WRITE. Read-only používateľ teda nemá vedieť prepísať cudziu časť snapshotu ani obídením tlačidiel vo fronte.

## 2. IT náklady – prepínač Jan–Jún / Jan–Dec

V **IT náklady** pribudol filter **Obdobie**:

- `Jan–Jún · porovnateľné H1`,
- `Jan–Dec · celý rok`.

Po zmene obdobia sa prepočítajú:

- hlavné KPI,
- RUN / CHANGE,
- trend,
- nákladové oblasti a entity,
- COST × SERVICE × RACI,
- finančná inteligencia,
- Financial Actions & Optimization.

### Dostupnosť celého roka

Celoročný IT výrez je v tomto release dostupný pre **2023, 2024 a 2025**. Rok 2026 zostáva v režime H1, pretože zdroj má aktuálne iba január až jún. Aplikácia preto nevytvára falošné nuly za júl–december.

Celoročný režim je konzervatívny manažérsky výrez. Detailná dokladová dôkazná tabuľka zostáva v H1 režime, kde je k dispozícii položkový auditovateľný detail.

## 3. Dátový a metodický model full-year

Nový `src/data/itCostsFullYear.json` sa generuje reprodukovateľne skriptom `scripts/extract_it_costs_full_year.py`.

Zahrnuté sú:

- explicitné IT / DC VaV normalizované položky,
- priame IT KPD/PPD položky,
- rezíduá priamych IT kódov do presného ročného súčtu danej KPD/PPD kombinácie.

Generické účtovné položky bez bezpečnej IT väzby sa do full-year IT výrezu nedopočítavajú.

Kontrolný konzervatívny IT výrez:

- 2023: **275 025,18 €**,
- 2024: **835 596,88 €**,
- 2025: **937 858,89 €**.

Tieto sumy sú manažérsky IT výrez, nie náhrada kompletného účtovného výkazu IT.

## 4. Nasadenie

Tento release **vyžaduje nový Supabase SQL krok**:

`IS_Riadenie_odboru_v0.26.0_IAM_SCOPE.sql`

Rovnaká migrácia je aj v:

`supabase/migration_iam_scope_v026.sql`

Pri používaní pozývania používateľov cez Edge Function treba následne znovu nasadiť aj:

`supabase/functions/invite-user/index.ts`

aby sa vlastná scope matica ukladala už pri vytvorení pozvánky.

