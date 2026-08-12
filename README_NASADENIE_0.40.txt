IS Riadenie odboru v0.40.0 – Landing Variant B
================================================

Východisková verzia: v0.39.0
Cieľová verzia:      v0.40.0

1. DATABÁZA
-----------
V Supabase SQL Editore NIČ nespúšťaj.
Release nemení databázovú schému, RLS ani synchronizáciu.

2. ODPORÚČANÉ NASADENIE CEZ GITHUB WEB
---------------------------------------
Ak máš aktuálne v repozitári v0.39.0, použi balík:

IS_Riadenie_odboru_v0.40.0_LEN_ZMENENE_SUBORY.zip

Po rozbalení nahraj do GitHubu so zachovaním ciest a prepíš:
- package.json
- src/data/seed.json
- src/lib/storage.ts
- src/styles.css
- src/views/DepartmentPortal.tsx

Voliteľne môžeš do repozitára pridať aj:
- RELEASE_NOTES_0.40.md
- README_NASADENIE_0.40.txt
- QA_RESULTS_0.40.txt

Potvrď Commit changes. Ak je GitHub repozitár prepojený s Vercelom,
Vercel automaticky spustí nový deployment.

3. FULL BALÍK
-------------
IS_Riadenie_odboru_v0.40.0_FULL.zip obsahuje kompletný projekt postavený
na v0.39.0 vrátane Contract Payment Drill-down a všetkých existujúcich modulov.

4. KONTROLA PO DEPLOYI
----------------------
- Vercel deployment = Ready.
- V aplikácii sprav Ctrl+F5.
- V ľavom dolnom rohu musí byť v0.40.0.
- Hlavný panel má poradie:
  1. ORIS + OIT ako dve veľké dominantné dlaždice,
  2. Technologický katalóg + Service 360 ako dve menšie spoločné dlaždice,
  3. IT náklady + Asset Management ako kompaktný rýchly prístup.
- Over kliknutie všetkých šiestich CTA.
- Over používateľa bez ORIS/OIT scope: príslušná hlavná karta zostane uzamknutá.
- Over tablet/mobil: jedna kolóna, bez horizontálneho scrollu.

5. ROLLBACK
-----------
Vráť päť zmenených zdrojových súborov z v0.39.0.
DB rollback nie je potrebný.
