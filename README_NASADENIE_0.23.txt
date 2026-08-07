IS Riadenie odboru – nasadenie v0.23.0
======================================

Odporúčaný upgrade z v0.22.0:

1. Urob zálohu aktuálneho projektu.
2. Rozbaľ balík IS_Riadenie_odboru_v0.23.0_LEN_ZMENENE_SUBORY.zip do koreňa projektu a povoľ prepísanie súborov.
   Alternatíva: spusti v koreňovom priečinku:
     node install-v0230-service360.mjs
3. Skontroluj, že package.json obsahuje verziu 0.23.0.
4. Spusti npm run build alebo bežný Vercel deployment.
5. Po nasadení skontroluj:
   - Portál odborov -> Riadiace centrum IT,
   - Control Tower,
   - Service 360,
   - Lifecycle radar,
   - Dodávatelia / zmluvy,
   - Forecast 10 / 22 / 25,
   - Technologický katalóg -> Riadiace centrum,
   - IT náklady -> Riadiace centrum.

Databáza:
- v0.23.0 NEVYŽADUJE nový Supabase SQL skript,
- existujúca schéma a synchronizácia v0.22 zostávajú nezmenené.

Finančné dáta:
- snapshot SIT obsahuje január až máj 2026,
- jún až december nie sú považované za nulové mesiace,
- forecast je analytická extrapolácia, nie schválený rozpočet,
- mapovanie úlohy 25 mimo strediska 345 je v UI označené ako metodické reconciliačné pravidlo.
