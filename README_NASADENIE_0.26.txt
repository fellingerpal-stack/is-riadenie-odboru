IS Riadenie odboru – nasadenie release 0.26.0
================================================

Odporúčaný upgrade: v0.25.0 -> v0.26.0

DÔLEŽITÉ: v0.26 obsahuje DB zmenu pre scoped IAM.

1. ZÁLOHA
---------
Pred nasadením odporúčame zálohu projektu a aktuálneho Supabase snapshotu.

2. SUPABASE SQL – POVINNÉ
-------------------------
V Supabase SQL Editore spustite celý súbor:

  IS_Riadenie_odboru_v0.26.0_IAM_SCOPE.sql

Skript:
- pridá profiles.access_scopes,
- doplní predvolené scope existujúcim profilom,
- vytvorí scope helper funkcie,
- doplní RLS podľa pracovného priestoru,
- chráni snapshot pred zápisom do read-only scope.

3. APLIKÁCIA
------------
Možnosť A – LEN ZMENENÉ SÚBORY:
rozbaľte IS_Riadenie_odboru_v0.26.0_LEN_ZMENENE_SUBORY.zip do koreňa projektu a povoľte prepísanie.

Možnosť B – FULL:
použite IS_Riadenie_odboru_v0.26.0_FULL.zip ako kompletný zdroj projektu.

Možnosť C – INSTALLER:
v koreňovom priečinku projektu v0.25.0 spustite:

  node install-v0260-scoped-iam-period.mjs

Installer upraví zdrojové súbory, ale SQL migráciu do Supabase nespúšťa.

4. EDGE FUNCTION invite-user – ODPORÚČANÉ / POTREBNÉ PRE NOVÉ POZVÁNKY
-----------------------------------------------------------------------
Ak používate administrátorské pozývanie používateľov, znovu nasaďte existujúcu Edge Function:

  supabase/functions/invite-user/index.ts

Bez redeployu aplikácia vie spravovať scope existujúcich profilov, ale vlastná scope matica zadaná už pri novej pozvánke sa nemusí uložiť v prvom kroku pozvania.

5. KONTROLA IAM
---------------
V aplikácii otvorte Používatelia.
Pri profile riaditeľa 3.2 odporúčaný príklad:

  Rola: Riaditeľ / manažér
  Odbor 3.1: R – iba čítanie
  Odbor 3.2: W – čítanie + zápis
  Spoločné: W – čítanie + zápis

Pri prepnutí do 3.1 musí byť profil read-only; v 3.2 musí mať manažérske zápisy.

6. KONTROLA OBDOBIA IT NÁKLADOV
-------------------------------
IT náklady -> Obdobie:
- Jan–Jún · porovnateľné H1
- Jan–Dec · celý rok

Celý rok je dostupný pre 2023, 2024 a 2025.
2026 zostáva H1 – zdroj nemá júl až december a aplikácia ich nevydáva za nulové skutočnosti.

7. BUILD
--------
Spustite štandardný build/deploy projektu:

  npm ci
  npm run build

