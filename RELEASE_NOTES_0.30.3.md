# Release 0.30.3 – Snapshot RPC v3 hotfix

Release 0.30.3 opravuje produkčnú chybu synchronizácie:

`42702: column reference "version" is ambiguous`

## Príčina

Frontend v0.30.0 zapisoval cez legacy RPC `save_app_snapshot(jsonb)`. Staršie PL/pgSQL implementácie RPC vracali `TABLE(... version integer ...)` a zároveň pracovali so stĺpcom `app_snapshots.version`. V produkčnej kombinácii schémy/funkcie PostgreSQL vyhodnotil názov `version` ako nejednoznačný.

## Riešenie

- nové RPC `save_app_snapshot_v3(jsonb, integer)` vracia jeden JSONB objekt,
- RPC nemá OUT parameter s názvom `version`, takže konflikt názvov je odstránený konštrukčne,
- frontend volá výhradne `save_app_snapshot_v3`,
- frontend posiela očakávanú verziu aktuálneho snapshotu,
- pri súbežnom zápise sa vráti `SNAPSHOT_CONFLICT` namiesto tichého prepísania,
- zachovaný je scoped IAM merge pre 3.1 / 3.2 / spoločné dáta,
- Asset/CMDB položky sa serverovo mergeujú podľa scope,
- supplier/relationship/contract master ostáva admin-only.

## Nasadenie

1. Najprv spusti `IS_Riadenie_odboru_v0.30.3_SNAPSHOT_RPC_V3.sql` v správnom Supabase projekte.
2. Potom nasaď frontend v0.30.3.
3. Po deployi načítaj DB a vykonaj testovací zápis.

SQL nemení tabuľky ani nemaže dáta.
