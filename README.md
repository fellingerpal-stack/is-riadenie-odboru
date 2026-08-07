# IS Riadenie odboru CVTI SR

React + TypeScript + Vite aplikácia pre spoločné riadenie:

- **3.1 Odbor správy a prevádzky IT infraštruktúry**,
- **3.2 Odbor prevádzky, rozvoja informačných systémov a projektové riadenie**.

Aplikácia prepája RACI, ľudí a výkon rolí, služby, projekty, úlohy, ServiceDesk, Change, Problem, IAM, CMDB, riziká, digitálne portfólio, dátové centrá, technologický katalóg a architektúru služieb.

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
node install-v0190-raci-comparison.mjs
npm run build
```

Pre release 0.20.0 sa nespúšťa nový Supabase SQL skript.

Pre release 0.19.0 sa nespúšťa nový Supabase SQL skript.
