# IS Riadenie odboru CVTI SR

React + TypeScript + Vite aplikácia pre spoločné riadenie:

- **3.1 Odbor správy a prevádzky IT infraštruktúry**,
- **3.2 Odbor prevádzky, rozvoja informačných systémov a projektové riadenie**.

Aplikácia prepája RACI, ľudí a výkon rolí, služby, projekty, úlohy, ServiceDesk, Change, Problem, IAM, CMDB, riziká, digitálne portfólio, dátové centrá, technologický katalóg a architektúru služieb.

## Verzia 0.18.0

Release dopĺňa:

- predvolený pohľad **Ľudia a výkon rolí ORIS**,
- manažérsky pohľad a nastaviteľné pravidlá pre **RACI OIT**,
- priamu editáciu kariet v module **Architektúra a závislosti**,
- doplnenie lokalít, serverov, platforiem, monitoringu, zálohovania a vlastníkov,
- prenesenie manuálnych architektonických úprav do **Technologického katalógu**,
- uloženie úprav cez existujúcu synchronizáciu snapshotov.

Podrobnosti sú v `RELEASE_NOTES_0.18.md`.

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
node install-v0180-raci-architecture.mjs
npm run build
```

Pre release 0.18.0 sa nespúšťa nový Supabase SQL skript.
