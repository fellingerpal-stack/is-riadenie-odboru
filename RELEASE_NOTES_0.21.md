# IS Riadenie odboru v0.21.0 – IT náklady a finančná inteligencia

Release 0.21.0 pridáva spoločný finančný pohľad pre odbory 3.1 a 3.2. Cieľom nie je nahradiť účtovníctvo, ale prepojiť platby s tým, čo už aplikácia pozná: dátové centrum, systémy, služby, technológie a RACI.

## Zdrojové dáta

Release bol pripravený z dvoch dodaných exportovaných dashboardov za roky 2022–2026:

- **Dashboard ekonomickej klasifikácie 632–642** – detailný zdroj vecných položiek, KPD/PPD, dokladov a súm,
- **Dashboard vývoja nákladov 2022–2026** – použitý ako kontrolný zdroj porovnateľného obdobia a celkových ročných súm.

Oba zdroje pracujú s rovnakým porovnateľným obdobím **január až jún**. Kontrolné ročné súčty 2022–2026 sa medzi oboma dashboardmi zhodujú. Druhý dashboard sa nepripočítava, aby nedošlo k dvojitému započítaniu.

## Nový spoločný modul IT náklady

V menu **Spoločné** pribudla položka **IT náklady** a rovnaký modul je dostupný aj z hlavného portálu odborov.

Pohľad obsahuje:

- päťročný porovnateľný trend IT nákladov,
- manažérske členenie **RUN / CHANGE** (Prevádzka / Rozvoj a obnova),
- nákladové domény a entity,
- filtre podľa roka, RUN/CHANGE, kategórie, dôvery klasifikácie a fulltextu,
- export aktuálneho výberu do CSV,
- dôkaznú tabuľku s KPD, PPD, vecnou poznámkou, dokladom a sumou,
- transparentné označenie dôvery klasifikácie,
- metodiku a explicitný zoznam toho, čo sa do IT výrezu nezaradilo.

## COST × SERVICE × RACI

Finančný pohľad nie je izolovaný report. Pre najväčšie nákladové entity sa aplikácia snaží nájsť existujúce procesné väzby v RACI 3.1 a 3.2 a zobrazuje:

- počet nájdených RACI väzieb,
- počet väzieb s jediným vykonávateľom R,
- preklik na najbližší register aplikácie – dátové centrá, systémy, informačné systémy, technologický katalóg, sieť alebo CMDB,
- finančnú expozíciu oblastí so single-R rizikom,
- percento nákladov, ktoré sú už mapovateľné na SERVICE/RACI.

## Finančná inteligencia

Nové vysvetliteľné riadiace signály vyhodnocujú:

- podiel RUN na celkovom IT výreze,
- koncentráciu nákladov v dvoch najväčších oblastiach,
- dominantnú nákladovú doménu,
- dôveru klasifikácie,
- pokrytie COST × RACI,
- nákladovú expozíciu single-R riziku.

Aplikácia z nich generuje odporúčania, napríklad oddelenie RUN baseline od CHANGE rozpočtu, cost-owner/SLA pre dominantné služby, prepojenie DC VaV nákladov s kapacitou a dostupnosťou alebo doplnenie chýbajúcich COST → SERVICE/RACI väzieb.

Výpočty sú lokálne a deterministické. Release neposiela ekonomické ani RACI údaje do externého AI API.

## Klasifikačná metodika

Klasifikácia je konzervatívna a vysvetliteľná. Používa kombináciu:

- jednoznačných KPD/PPD IT položiek (výpočtová technika, telekomunikačná technika, softvér/licencie, údržba výpočtovej a telekomunikačnej techniky, internet/hosting/domény),
- explicitných názvov systémov a služieb (napr. KOMIS, CRZP/APS, CREPČ/CREUČ, DMS/Fabasoft, VEMA, MUVV),
- explicitných názvov licencií/SaaS a bezpečnostných technológií,
- explicitnej väzby na **DC VaV**, vrátane súvisiacej technickej prevádzky dátového centra.

Zámerne sa nezaraďujú vedecké/publikačné databázové predplatné a všeobecné služby bez jasnej IT väzby. Položky so silným explicitným signálom majú vysokú dôveru, položky vybrané podľa jednoznačnej ekonomickej podpoložky majú strednú dôveru.

## Kontrolný baseline – január až jún 2026

Manažérsky IT výrez v dodaných dátach predstavuje:

- **375 168,25 €** klasifikovaných IT/DC VaV nákladov,
- **345 759,52 € RUN / Prevádzka** (92,2 %),
- **29 408,73 € CHANGE / Rozvoj a obnova** (7,8 %),
- približne **84,2 %** objemu má vysokú klasifikačnú dôveru,
- výrez predstavuje približne **10,0 %** z celkového objemu zdrojového rozsahu KPD 632–642 za rovnaké obdobie.

Najväčšie nákladové domény v tomto klasifikovanom výreze sú:

1. **Dátové centrum DC VaV – 179 553,46 €**,
2. **Prevádzka a rozvoj IS – 156 036,82 €**,
3. **Licencie, softvér a cloud – 13 307,78 €**.

Najväčšie dve entity, **DC VaV a KOMIS**, spolu tvoria približne **78,1 %** klasifikovaného IT objemu za H1 2026. Ide o manažérsku klasifikáciu vytvorenú nad dodanými účtovnými poznámkami, nie o novú účtovnú kategorizáciu.

## Dôležitá hranica dát

Dodaný ekonomický dashboard pokrýva bežné výdavky v rozsahu 632–642. **Kapitálové výdavky 7xx nie sú v tomto zdroji**, preto sa nízky podiel CHANGE nesmie interpretovať ako úplný obraz investičného rozvoja IT. Do budúcnosti je vhodné doplniť kapitálový zdroj a vytvoriť úplný TCO pohľad.

## Technické zmeny

Nové súbory:

- `src/views/ItCosts.tsx`
- `src/views/ItCosts.css`
- `src/data/itCosts.json`
- `scripts/extract_it_costs.py`

Upravené súbory:

- `src/App.tsx`
- `src/views/DepartmentPortal.tsx`
- `src/lib/storage.ts`
- `src/data/seed.json`
- `package.json`

## Databáza

Release 0.21.0 **nevyžaduje nový Supabase SQL skript ani zmenu databázovej schémy**. Finančný dataset je v tejto iterácii zabalený ako lokálny read-only analytický dataset aplikácie.
