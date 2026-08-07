IS RIADENIE ODBORU v0.27.2 – UI ALIGNMENT ASSET MANAGEMENT
==========================================================

Ak máte v repozitári v0.27.1, stačí prepísať súbory z balíka LEN_ZMENENE_SUBORY:
- src/views/Cmdb.css
- src/lib/storage.ts
- src/data/seed.json
- package.json

Potom commit/push a nový Vercel deploy.

Nie je potrebný nový Supabase SQL ani zmena RLS.
Tento release je vizuálny refresh modulu Asset Management, aby tlačidlá,
filtre, záložky, karty a ovládacie prvky ladili so zvyškom aplikácie.
