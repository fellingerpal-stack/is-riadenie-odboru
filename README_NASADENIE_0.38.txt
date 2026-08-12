IS Riadenie odboru v0.38.0 – Landing Dashboard Refresh
=======================================================

Východisková verzia: v0.37.0
Cieľová verzia:      v0.38.0

1. DATABÁZA
-----------
NIC NESPÚŠŤAJ v Supabase SQL Editore.
Release nemení databázovú schému, RLS ani synchronizáciu.

2. NASADENIE
------------
Odporúčanie A – FULL:
- nahraj celý projekt z IS_Riadenie_odboru_v0.38.0_FULL.zip.

Odporúčanie B – iba zmeny:
- rozbaľ IS_Riadenie_odboru_v0.38.0_LEN_ZMENENE_SUBORY.zip
  do koreňa existujúceho projektu v0.37.0,
- povoľ prepísanie existujúcich súborov.

Menia sa:
- package.json
- src/data/seed.json
- src/lib/storage.ts
- src/styles.css
- src/views/DepartmentPortal.tsx

Pribúdajú:
- RELEASE_NOTES_0.38.md
- README_NASADENIE_0.38.txt
- QA_RESULTS_0.38.txt

3. DEPLOY
---------
Commit + push do GitHubu.
Vercel vykoná štandardný build/deploy.
Po deployi urob Ctrl+F5.
Dole v aplikácii musí byť v0.38.0.

4. SMOKE TEST
-------------
A) Hlavný panel:
- zobrazuje nový hero panel,
- ORIS a OIT sú dve hlavné dlaždice,
- spoločné moduly sú štyri samostatné dlaždice.

B) Navigácia:
- ORIS -> dashboard,
- OIT -> oit,
- Technologický katalóg -> technology,
- Service 360 -> intelligence,
- IT náklady -> itCosts,
- Asset Management -> cmdb.

C) Oprávnenia:
- používateľ bez ORIS/OIT scope vidí príslušnú dlaždicu ako uzamknutú,
- používateľ bez shared scope nevidí spoločné moduly.

D) Responsive:
- široká obrazovka: 2 stĺpce,
- tablet/mobil: 1 stĺpec bez horizontálneho overflow.

5. ROLLBACK
-----------
Vráť päť zmenených súborov z v0.37.0.
DB rollback nie je potrebný.
