IS RIADENIE ODBORU v0.30.4 – BUILD HOTFIX
=========================================

Vychodiskovy stav:
- v GitHub repozitari je aplikovany patch v0.30.3,
- Supabase RPC v3 uz bolo nasadene a kontrola vratila TRUE.

NASADENIE
1. Rozbal balik IS_Riadenie_odboru_v0.30.4_LEN_ZMENENE_SUBORY.zip do korena projektu.
2. Povolit prepis existujucich suborov.
3. Commit + push na GitHub.
4. Vercel ma v logu zobrazit:
   > is-riadenie-odboru@0.30.4 build
5. Po uspesnom deployi sprav Ctrl+F5.
6. Dole v aplikacii over verziu v0.30.4.
7. Klikni Nacitat DB a potom Skusit ulozit.

SQL
- Novy SQL sa pre v0.30.4 nespusta.
- RPC save_app_snapshot_v3 z v0.30.3 zostava zachovane.

MENENE SUBORY
- src/lib/storage.ts
- src/data/seed.json
- package.json
