IS RIADENIE ODBORU v0.27.1 – BUILD HOTFIX
==========================================

Ak máte v repozitári v0.27.0, stačí prepísať súbory z balíka LEN_ZMENENE_SUBORY:
- src/lib/storage.ts
- src/data/seed.json
- package.json

Potom commit/push a nový Vercel deploy.

Nie je potrebný nový Supabase SQL ani zmena RLS.
Asset Management funkcionalita zostáva rovnaká ako vo v0.27.0.
