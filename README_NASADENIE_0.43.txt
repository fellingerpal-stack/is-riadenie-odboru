IS Riadenie odboru v0.43.0
===========================

Východisková verzia: v0.42.0
Cieľová verzia:      v0.43.0

1. DATABÁZA
-----------
V Supabase SQL Editore NIČ nespúšťaj.
Release nepridáva tabuľku ani RLS politiku. Governance a CR register sa ukladajú do existujúceho synchronizovaného aplikačného snapshotu.

2. NASADENIE
------------
Ak máš v repozitári v0.42.0, použi:

IS_Riadenie_odboru_v0.43.0_LEN_ZMENENE_SUBORY.zip

Nahraj súbory so zachovaním ciest a prepíš existujúce súbory.
Vercel po commite automaticky spustí build.

3. KONTROLA PO DEPLOYI
----------------------
- Vercel deployment = Ready.
- Ctrl+F5.
- V ľavom dolnom rohu musí byť v0.43.0.

CVTI 360 / KOMIS:
- horný údaj KOMIS SLA je kvartál, nie mesiac,
- celková kvartálna platba s DPH = 55 140,00 EUR,
- mesačný ekvivalent = 18 380,00 EUR,
- otvor Rozvoj / CR,
- limit = 7 000 h,
- sadzba = 55 EUR / h bez DPH,
- vytvor testovacie CR a over uloženie,
- obnov stránku a over, že CR zostalo uložené,
- importuj testovací XLSX a over súčet čerpaných hodín.

CVTI 360 / Riadenie:
- ako admin alebo manager klikni Upraviť,
- nastav primárneho/business/technického vlastníka a zástupcu,
- ulož,
- obnov stránku,
- over, že hodnoty zostali zachované.

Zmluvy a SLA:
- KOMIS musí zobrazovať SLA / kvartál ako hlavný údaj,
- mesačný ekvivalent je sekundárny údaj.

4. EXCEL PRE CR
---------------
Odporúčaný prvý riadok:
CR | Názov | Modul | Stav | Požadované hodiny | Schválené hodiny | Čerpané hodiny | Dátum | Termín | Vlastník | Poznámka

5. ROLLBACK
-----------
Vráť zmenené zdrojové súbory z v0.42.0.
Nové polia v snapshot JSON môžu zostať uložené; v0.42.0 ich ignoruje.
SQL rollback nie je potrebný.
