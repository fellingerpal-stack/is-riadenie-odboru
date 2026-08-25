IS Riadenie odboru v0.54.1 - BUILD HOTFIX

1. V Supabase nic nespustajte ani nemenite.
2. Nahrajte obsah FULL ZIP do rootu GitHub repozitara a potvrďte prepis existujucich suborov.
3. Vercel spusti novy deployment.
4. V logu ocakavajte:
   [v0.54.1 prebuild] legacy cleanup complete
   [v0.54.1 verify] OK
5. Ak by package.json v GitHube zostalo docasne na starsej verzii, verify vypise WARNING, ale build sa kvoli tomu uz nezastavi.
6. Strukturálne/import chyby sa stale zastavia ako FAILED - tie sa nesmu ignorovat.

Poznamka: tento release nema databazovu migraciu.
