IS Riadenie odboru v0.34.0 – Log Management
============================================

Východisková verzia: v0.33.0

1. DATABÁZA – POVINNÝ KROK
--------------------------
V Supabase -> SQL Editor spusti celý súbor:

IS_Riadenie_odboru_v0.34.0_LOG_MANAGEMENT.sql

Na konci musí kontrolný SELECT vrátiť:
- audit_table_ready = true
- audit_rpc_ready = true
- snapshot_v4_ready = true

Skript je idempotentný a možno ho spustiť opakovane.

Čo SQL urobí:
- vytvorí append-only app_audit_log,
- vytvorí log_app_event RPC,
- vytvorí save_app_snapshot_v4 ako bezpečný wrapper nad funkčným v3,
- doplní historické app_snapshots do auditu,
- zapojí audit triggre na projekty, úlohy, Helpdesk, IAM a digitálne portfólio tam, kde tabuľky existujú.

2. FRONTEND
-----------
Rozbaľ release ZIP do koreňa projektu v0.33.0 a povoľ prepísanie súborov.

Menia sa:
- package.json
- src/App.tsx
- src/data/seed.json
- src/lib/storage.ts
- src/lib/cloud.ts

Pribúdajú:
- src/lib/auditCloud.ts
- src/views/LogManagement.tsx
- src/views/LogManagement.css

3. DEPLOY
---------
Commit + push do GitHubu a nechaj Vercel spraviť štandardný deployment.
Po deployi Ctrl+F5.

V ľavom menu otvor:
Správa -> Log management

Dole v aplikácii musí byť v0.34.0.

4. KONTROLA
-----------
A) Log management musí zobraziť historické snapshoty.
B) Urob malú admin zmenu, napr. uprav poznámku dodávateľa alebo zmluvy.
C) Po autosave otvor Log management -> Obnoviť.
D) Má pribudnúť nová udalosť s vaším menom, časom, modulom a snapshot verziou.
E) Detail udalosti musí ukázať zmenený modul a deltu.

5. ČO SA NEMENÍ
---------------
- collector ani Network Discovery config,
- existujúce discovery tabuľky,
- finančné datasety v0.33.0,
- stabilná logika save_app_snapshot_v3.

Frontend v0.34.0 volá v4. V4 najprv vykoná pôvodný v3 zápis a až potom audit, takže overená synchronizácia ostáva zachovaná.
