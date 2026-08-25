# IS Riadenie odboru v0.54.1

Build hotfix pre v0.54.0 Project Capacity Intelligence.

## Oprava
- zosuladene release metadata na 0.54.1,
- kontrola `verify-release.mjs` uz nezastavi Vercel iba kvoli staremu cislu verzie v `package.json`,
- strukturálne chyby, chybajuce subory a nevyriesene relativne importy ostavaju fatalne,
- prebuild cleanup nadalej odstranuje historicke duplicitne `src/*.ts` subory z repozitara.

## Databaza
Bez zmeny. Supabase migracie ani Edge Functions sa pri tomto hotfixe nenasadzuju.
