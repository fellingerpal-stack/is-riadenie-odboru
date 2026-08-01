IS RIADENIE ODBORU – RELEASE 0.12.0
===================================

A. STACKBLITZ / ZDROJOVÝ PROJEKT
1. Nahraj install-v012-work-db.mjs vedľa package.json.
2. Spusti:
   node install-v012-work-db.mjs
   npm run build
3. Odošli zmeny do GitHubu:
   git add .
   git commit -m "Release 0.12 projects and tasks database"
   git push
4. Počkaj na stav Ready vo Verceli.

B. SUPABASE
1. Otvor SQL Editor.
2. Vlož celý obsah súboru supabase/migration_work_v012.sql.
3. Klikni Run.
4. Kontrolný výsledok musí obsahovať nenulové project_rpc a task_rpc.

C. KONTROLA
1. Obnov Vercel aplikáciu cez Ctrl + F5.
2. Otvor Projekty a úlohy.
3. Panel musí zobrazovať Samostatné Supabase tabuľky / Synchronizované.
4. Uprav jednu úlohu a over zmenu v Table Editor > work_tasks.
5. Otvor aplikáciu v druhom prehliadači a over automatické načítanie zmeny.

Poznámka: SQL migrácia automaticky prenesie existujúce projekty a úlohy z aktuálneho app_snapshots záznamu. Opakované spustenie neprepíše novšie údaje.
