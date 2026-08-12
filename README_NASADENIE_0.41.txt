IS Riadenie odboru v0.41.0 – CVTI 360 · Enterprise Intelligence Foundation
==========================================================================

Východisková verzia: v0.40.0
Cieľová verzia:      v0.41.0

1. DATABÁZA
-----------
V Supabase SQL Editore NIČ nespúšťaj.
Release nemení schému, RLS, IAM ani synchronizačné RPC.

2. ODPORÚČANÉ NASADENIE
-----------------------
Ak je v GitHub repozitári aktuálna v0.40.0, použi:

IS_Riadenie_odboru_v0.41.0_LEN_ZMENENE_SUBORY.zip

Rozbaľ ZIP do koreňa projektu a povoľ prepísanie súborov.

Menia sa:
- package.json
- src/App.tsx
- src/components/GlobalSearch.tsx
- src/data/seed.json
- src/lib/storage.ts
- src/views/DepartmentPortal.tsx

Pribúdajú:
- src/lib/enterprise360.ts
- src/views/Enterprise360.tsx
- src/views/Enterprise360.css
- CVTI_360_0.41.md
- RELEASE_NOTES_0.41.md
- README_NASADENIE_0.41.txt
- QA_RESULTS_0.41.txt

Alternatívne môžeš nahrať celý:
IS_Riadenie_odboru_v0.41.0_FULL.zip

3. GITHUB / VERCEL
------------------
Commit + push.
Vercel vykoná štandardný install a build podľa projektu.

Poznámka: projekt v dodanom v0.40 FULL nemá package-lock.json, preto lokálny príkaz
`npm ci` nie je vhodný. Použi štandardný `npm install` / Vercel install a `npm run build`.

4. KONTROLA PO DEPLOYI
----------------------
- Vercel deployment = Ready.
- Ctrl+F5.
- v ľavom dolnom rohu musí byť v0.41.0.
- Hlavný panel obsahuje novú širokú dlaždicu CVTI 360.
- Ľavé menu obsahuje CVTI 360.
- Otvor CVTI 360.
- Predvolená pilotná karta = CRZP a antiplagiátorský systém.

5. CRZP SMOKE TEST
------------------
Na karte CRZP / APS over:
- Úloha 22.
- Rozpočet 93 552,00 EUR.
- Čerpanie 49 508,47 EUR.
- Zostatok 44 043,53 EUR.
- 64 auditných riadkov.
- klik na Feb -> 5 586,88 EUR a stav Sedí.
- klik na Máj -> 19 304,69 EUR a stav Sedí.
- klik na Júl -> 15 174,97 EUR a stav Sedí.
- Technológie -> 3 seed CMDB aktíva.
- Riadenie -> RACI a rizikové väzby.
- Vzťahy -> uzly Finance / Technology / Supplier / Contract / Work / Risk.

6. GLOBAL SEARCH
----------------
Ctrl+K -> napíš CRZP.
Výsledok typu „360° entita“ musí otvoriť:
#/enterprise360?entity=crzp-aps

7. OPRÁVNENIA
-------------
CVTI 360 je read-only shared modul.
Role: admin / manager / resolver / viewer.
Používateľ musí mať shared read scope.
Existujúce ORIS/OIT scope pravidlá sa nemenia.

8. ROLLBACK
-----------
Vráť 6 zmenených súborov z v0.40.0 a odstráň 3 nové zdrojové súbory CVTI 360.
DB rollback nie je potrebný.
