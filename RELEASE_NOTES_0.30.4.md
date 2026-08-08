# Release 0.30.4 – Build hotfix pre v0.30.3

## Oprava

V0.30.3 priniesla nové snapshot RPC `save_app_snapshot_v3`, ale patch obsahoval `src/lib/storage.ts` s novšou pracovnou verziou zmluvného migračného modelu, zatiaľ čo produkčné `src/types.ts` a modul Zmluvy zostali na schéme v0.30.0.

Výsledkom boli TypeScript chyby pri Vercel builde na poliach `renewalStatus`, `category`, `contractValue`, `renewalLeadDays`, `serviceOwner`, `procurementOwner`, `slaSummary`, `autoRenewal` a `source`.

V0.30.4:

- vracia migráciu `ContractRecord` do kompatibilného tvaru produkčnej v0.30.0,
- zachováva snapshot RPC v3 a diagnostiku synchronizácie z v0.30.3,
- nemení databázovú schému,
- nemení zmluvné dáta,
- nemení IAM/RLS,
- zvyšuje verziu aplikácie na 0.30.4.

## Overenie

Cielená strict TypeScript kontrola súborov `src/types.ts` + `src/lib/storage.ts` prešla bez diagnostík.

Plný lokálny `npm install` nie je v pracovnom prostredí dostupný, pretože interný npm mirror neobsahuje `@supabase/supabase-js`. Vercel tento balík podľa produkčných logov inštaluje korektne.

## Databáza

Ak už kontrola RPC v3 v Supabase vrátila TRUE, nový SQL sa pre v0.30.4 nespúšťa.
