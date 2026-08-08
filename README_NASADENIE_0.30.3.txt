IS RIADENIE ODBORU v0.30.3 – SYNCHRONIZÁCIA HOTFIX
===================================================

DÔLEŽITÉ PORADIE:

1. V správnom Supabase projekte spusti celý súbor:
   IS_Riadenie_odboru_v0.30.3_SNAPSHOT_RPC_V3.sql

2. Na konci SQL musia byť TRUE:
   profiles_ready
   snapshots_ready
   scope_ready
   snapshot_v3_ready

3. Až potom nasaď zmenené frontend súbory v0.30.3.

4. Po deployi:
   - obnov stránku,
   - klikni Načítať DB,
   - urob malú zmenu,
   - klikni Uložiť.

Oprava cielene obchádza legacy save_app_snapshot(), ktorý v produkcii vracia
PostgreSQL 42702 "column reference version is ambiguous".

Nové RPC vracia JSONB a preto nemá výstupný parameter version, ktorý by mohol
kolabovať s app_snapshots.version.
