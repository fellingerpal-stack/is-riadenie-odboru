IS Riadenie odboru v0.42.0 – KOMIS Contract & SLA Intelligence
===============================================================

Východisková verzia: v0.41.0
Cieľová verzia:      v0.42.0

1. DATABÁZA
-----------
V Supabase SQL Editore NIČ nespúšťaj.
Release nemení databázovú schému, RLS ani synchronizáciu.

2. NASADENIE
------------
Odporúčanie A – FULL:
- nahraj celý projekt z IS_Riadenie_odboru_v0.42.0_FULL.zip.

Odporúčanie B – iba zmeny:
- rozbaľ IS_Riadenie_odboru_v0.42.0_LEN_ZMENENE_SUBORY.zip
  do koreňa aktuálneho projektu v0.41.0,
- povoľ prepísanie existujúcich súborov.

Menia sa / pribúdajú:
- package.json
- src/data/seed.json
- src/lib/storage.ts
- src/data/komisContract.ts
- src/lib/enterprise360.ts
- src/views/Enterprise360.tsx
- src/views/Enterprise360.css
- src/components/GlobalSearch.tsx
- src/views/Contracts.tsx
- src/views/Contracts.css
- RELEASE_NOTES_0.42.md
- README_NASADENIE_0.42.txt
- QA_RESULTS_0.42.txt
- CHANGED_FILES_0.42.txt

3. DEPLOY
---------
Commit + push do GitHubu.
Vercel vykoná štandardný build/deploy.
Po deployi urob Ctrl+F5.
V ľavom dolnom rohu musí byť v0.42.0.

4. SMOKE TEST
-------------
A) CVTI 360 -> CRZP / ANTIPLAG -> Financie
- existujúce čerpanie úlohy 22 ostáva 49 508,47 € podľa snapshotu,
- KOMIS SLA / mesiac musí byť 1 840,00 € s DPH,
- bez DPH 1 533,33 €,
- rozvoj / vybudovanie 261 648,00 € s DPH,
- podpora 84 mesiacov 154 560,00 € s DPH.

B) CVTI 360 -> KOMIS -> Financie
- zobrazí sa 12 modulov,
- celkový SLA mesačný ekvivalent = 18 380,00 € s DPH,
- každý modul má vlastnú kartu,
- CRZP / SK CRIS / SCIDAP-SVD / ISS majú preklik do existujúcej 360° entity.

C) Zmluvy a SLA -> Prehľad
- karta KOMIS ukáže 12 modulov a 18 380,00 € / mesiac s DPH.

D) Zmluvy a SLA -> SLA kontrola
- nad existujúcim SLA registrom je KOMIS tabuľka,
- obsahuje mesačný, kvartálny, 84-mesačný a rozvojový údaj pre všetkých 12 modulov,
- tlačidlo Otvoriť CRZ otvorí zdrojový PDF dokument.

E) Ctrl+K
- vyhľadaj CREPČ, CREUČ, CRZP, SKCRIS, SVD alebo SCIDAP.

5. METODIKA
-----------
Mesačné SLA sumy sú ekvivalent vypočítaný ako zmluvná kvartálna cena / 3.
Nejde o tvrdenie, že dodávateľ fakturuje mesačne.
Rozvoj / vybudovanie je statický zmluvný údaj bez 84-mesačnej podpory.

6. ROLLBACK
-----------
Vráť uvedené zdrojové súbory z v0.41.0.
DB rollback nie je potrebný.
