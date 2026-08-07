IS RIADENIE ODBORU v0.21.0 – NASADENIE
=========================================

NOVÝ MODUL
- Spoločné -> IT náklady
- rovnaký modul je dostupný z pracovného priestoru 3.1, 3.2 aj z hlavného portálu
- RUN / CHANGE, 5-ročný trend, nákladové domény, dôkazné položky
- COST x SERVICE x RACI a finančné riadiace signály

ODPORÚČANÉ NASADENIE Z v0.20.0
1. Zálohujte aktuálny projekt.
2. Rozbaľte IS_Riadenie_odboru_v0.21.0_LEN_ZMENENE_SUBORY.zip do koreňa projektu a povoľte prepísanie existujúcich súborov.
   ALEBO spustite: node install-v0210-it-costs.mjs
3. Spustite npm install / npm ci podľa vášho pracovného prostredia.
4. Spustite npm run check a npm run build.
5. Otvorte aplikáciu a skontrolujte Spoločné -> IT náklady.

DATABÁZA
- Žiadny nový Supabase SQL skript.
- Žiadna zmena databázovej schémy.
- Finančný dataset je read-only JSON zabalený v klientovi.

DÁTA
- detailný zdroj: Dashboard ekonomickej klasifikácie 632–642, roky 2022–2026
- kontrolný zdroj: Dashboard vývoja nákladov 2022–2026
- porovnateľné obdobie: január až jún
- druhý dashboard sa používa len na validáciu celkových ročných súm, nepripočítava sa
- kapitálové výdavky 7xx nie sú v dodanom zdroji a modul ich zatiaľ neobsahuje

REGENEROVANIE DATASETU
python3 scripts/extract_it_costs.py "<ekonomicky-dashboard.html>" src/data/itCosts.json --validation "<dashboard-vyvoja-nakladov.html>"

DÔLEŽITÉ
RUN/CHANGE a kategórie sú manažérska klasifikácia nad účtovnými poznámkami a KPD/PPD. Nie sú náhradou účtovnej evidencie.
