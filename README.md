# IS Riadenie odboru – release 0.22.0

Aktuálny release rozširuje spoločný portál o **Technology Intelligence / Explorer 2.0**, kompaktnejšiu dôkaznú tabuľku IT nákladov a nový pohľad na **SIT kontraktové úlohy 10 / 22 / 25** s mesačným, kvartálnym a kumulatívnym čerpaním.

Podrobnosti: `RELEASE_NOTES_0.22.md` a `README_NASADENIE_0.22.txt`.

---

# IS Riadenie odboru CVTI SR

React + TypeScript + Vite aplikácia pre spoločné riadenie:

- **3.1 Odbor správy a prevádzky IT infraštruktúry**,
- **3.2 Odbor prevádzky, rozvoja informačných systémov a projektové riadenie**.

Aplikácia prepája RACI, ľudí a výkon rolí, služby, projekty, úlohy, ServiceDesk, Change, Problem, IAM, CMDB, riziká, digitálne portfólio, dátové centrá, technologický katalóg a architektúru služieb.

## Verzia 0.21.0

Spoločný modul **IT náklady** prepája päťročný porovnateľný finančný výrez s technologickým katalógom, systémami a RACI. Obsahuje RUN/CHANGE, nákladové domény, dôkazné položky, COST × SERVICE × RACI, koncentráciu nákladov a finančnú expozíciu single-R riziku. Dáta sa klasifikujú lokálne a vysvetliteľne; nejde o účtovnú preklasifikáciu.

## Verzia 0.20.0

RACI Intelligence pridáva spoločný health score, simuláciu neprítomnosti osoby, bus-factor analýzu, koncentráciu dvojíc A↔R, návrhy zastupovania a zoradené manažérske odporúčania pre odbory 3.1 a 3.2. Model je vysvetliteľný, počíta sa lokálne z aktuálnej RACI a nevyžaduje externé AI API.

## Verzia 0.19.0

Release dopĺňa:

- spoločné porovnanie RACI odborov **3.1 a 3.2**,
- porovnanie procesov, oblastí, formálnej úplnosti, jediných R a spojených A/R,
- rovnaký osobný pohľad **Ľudia a výkon rolí** priamo v RACI odboru 3.2,
- distribúciu rolí R/A/C/I a rebríčky najvýraznejších rolí,
- prepínateľné karty pracovníkov oboch odborov v jednom manažérskom pohľade.

Podrobnosti sú v `RELEASE_NOTES_0.19.md`.

## Spustenie

```bash
npm install
npm run dev
```

Produkčný build:

```bash
npm run build
```

## Nasadenie aktualizácie

```bash
node install-v0210-it-costs.mjs
npm run build
```

Pre release 0.21.0 sa nespúšťa nový Supabase SQL skript.

Pre release 0.20.0 sa nespúšťa nový Supabase SQL skript.

Pre release 0.19.0 sa nespúšťa nový Supabase SQL skript.
