# Release v0.51.1 – Vercel build hotfix

## Cieľ
Hotfix pre v0.51.0 po produkčnom Vercel build logu. Databázová migrácia v0.51.0 zostáva platná a znova sa nespúšťa.

## Príčina
V repozitári zostali staršie duplicitné TypeScript súbory priamo v `src/` (napr. `src/accessControl.ts`, `src/cloud.ts`, `src/storage.ts`). Aktuálna aplikácia používa správne súbory v `src/lib/`, ale pôvodné `tsconfig.app.json` malo široké `include: ["src"]`. TypeScript preto kompiloval aj nepoužívané historické duplikáty. Ich importy typu `../types` a `../data/...` sú správne iba z umiestnenia `src/lib/`, nie zo `src/`, a Vercel build skončil na TS2307 a následných typových chybách.

## Oprava
`tsconfig.app.json` teraz explicitne kompiluje produkčnú stromovú štruktúru:
- vstupné súbory `src/main.tsx`, `src/App.tsx`, `src/types.ts`, `src/vite-env.d.ts`,
- `src/auth/**`,
- `src/components/**`,
- `src/views/**`,
- `src/lib/**`,
- `src/data/**`.

Historické nepoužívané `.ts` súbory priamo v `src/` už build neblokujú. Vite ich zároveň nebaluje, pretože nie sú importované z aplikačného entrypointu.

## Funkčné zmeny
Žiadne. Funkčný rozsah v0.51.0 zostáva nezmenený:
- ServiceDesk iba pre admina,
- nový modul Riadenie projektov,
- role Projektový manažér a Člen projektu,
- projektové funkcie, financovanie, lifecycle, úlohy, míľniky a väzby.

## Databáza
Žiadna nová migrácia. Ak bola `migration_project_management_v051.sql` úspešne spustená, NEOPAKOVAŤ ju kvôli tomuto hotfixu.
