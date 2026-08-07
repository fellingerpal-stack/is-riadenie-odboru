IS Riadenie odboru – nasadenie v0.25.0
=====================================

Východisková verzia: v0.24.1
Cieľová verzia:      v0.25.0

Odporúčané nasadenie:
1. Zálohujte aktuálny projekt / commit.
2. Ak používate balík LEN_ZMENENE_SUBORY, prekopírujte jeho obsah do koreňa projektu a potvrďte prepísanie súborov.
3. Alternatívne spustite: node install-v0250-financial-actions.mjs
4. Spustite npm install / npm ci podľa vášho workflow.
5. Spustite npm run build.
6. Deploynite na Vercel.
7. Po nasadení obnovte stránku Ctrl+F5.

Kontrola po nasadení:
- spodný ľavý stav aplikácie zobrazuje v0.25.0,
- IT náklady obsahujú sekciu Financial Actions & Optimization,
- sú dostupné záložky Riadiace opatrenia, RUN baseline, Cost-owneri, DC VaV a COST × single-R,
- admin/manager vidí tlačidlá na vytvorenie opatrenia,
- viewer/resolver vidí túto časť read-only,
- vytvorené opatrenie ostane v synchronizovanom stave po uložení do Supabase snapshotu.

Databáza:
- nový SQL sa NEVYKONÁVA,
- release nemení Supabase schému.

Dôležitá metodická hranica:
Unit economics DC VaV sú orientačné. Kapacitný a finančný snapshot nemusia mať rovnaký referenčný okamih. CHANGE nepovažujte za úplný CAPEX, kým nebude samostatne doplnený 7xx zdroj.
