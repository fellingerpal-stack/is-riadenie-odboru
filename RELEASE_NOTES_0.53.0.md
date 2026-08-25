# IS Riadenie odboru v0.53.0 – Project Membership & Capacity Governance

## Hlavné zmeny

- Projektové členstvo je od v0.53.0 primárne viazané na interné `user_id` / Supabase `auth.uid()`, nie iba na textové meno alebo e-mail.
- Existujúce projektové členstvá sa pri migrácii automaticky dopárujú na aktívny používateľský profil, ak je zhoda v organizácii jednoznačná.
- Nové a upravené členstvo má databázový trigger, ktorý udržiava väzbu na používateľský profil a synchronizuje meno/e-mail.
- Rola **Člen projektu** vidí všetky projekty, v ktorých má aktívne členstvo – bez ohľadu na projektovú funkciu (Tester, Analytik, Gestor, Architekt atď.).
- **Projektový manažér** môže po novom čítať aj projekt, kde je členom v inej projektovej funkcii. Riadiť a meniť však môže iba projekt, kde je skutočne projektovým manažérom. Tým sa oddeľuje "vidím projekt" od "môžem projekt riadiť".
- Frontend používa rovnaké pravidlo: PM, ktorý je v projekte iba Tester/Analytik, vidí kartu projektu read-only; editačné ovládacie prvky sa nezobrazia.
- Admin dostal novú portfóliovú záložku **Zaradenia**, kde vidí všetky väzby používateľ → projekt → projektová rola → kapacita → platnosť a stav UUID prepojenia.
- Admin môže zo záložky Zaradenia vytvárať, upravovať a odstraňovať členstvá naprieč projektmi. Projektový manažér naďalej spravuje tím priamo v karte svojho projektu.
- V dialógu člena projektu je výber existujúceho používateľa preferovaný a ukladá jeho pevné interné user ID.

## Synchronizácia

- Opravené mätúce zobrazenie `DB bez dát` pri module Riadenie projektov.
- Keď je otvorené **Riadenie projektov**, horný aj spodný stavový indikátor teraz zobrazujú stav projektovej databázy (`Načítavam projekty`, `Projekty synchronizované`, `Ukladám projekty`, `Chyba projektov`).
- Stav globálneho snapshotu ostatných modulov už neprepisuje stav projektového modulu.
- Projektové roly už neprepnú stav aplikácie späť na `DB bez dát` len preto, že nemajú prístup ku globálnemu snapshotu.

## Databáza

Po v0.51.0 a v0.52.0 treba spustiť:

`supabase/migration_project_membership_v053.sql`

Na konci migrácie sa zobrazia readiness hodnoty a počet aktívnych členstiev, ktoré ešte nemajú `user_id`.
