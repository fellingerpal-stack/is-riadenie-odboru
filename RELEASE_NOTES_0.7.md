# IS Riadenie odboru – release 0.7.0

## Nový modul: Problem management

Release dopĺňa riadenie problémov medzi ServiceDesk a Change management:

- register problémov s číslami `PRB-YYYY-0001`,
- vytvorenie problému z incidentu a prepojenie viacerých incidentov,
- životný cyklus od nového problému cez RCA a známu chybu po uzatvorenie,
- analýza koreňovej príčiny vrátane metódy 5× prečo,
- evidencia symptómu, opakujúceho sa vzorca, workaroundu a trvalého riešenia,
- Known Error Database pre riešiteľov incidentov,
- prepojenie na služby, projekty, zmeny, incidenty a úlohy,
- akčný plán nápravných opatrení s vlastníkmi a termínmi,
- vytvorenie úlohy z nápravného opatrenia,
- komentáre, interné poznámky a auditná história,
- manažérsky prehľad otvorených problémov, známych chýb, problémov bez RCA a problémov po termíne,
- 6 vzorových problémov z prostredia odboru.

## Migrácia

Existujúce dáta z verzie 0.6 zostávajú zachované. Migrácia doplní pole `problems` a zvýši verziu dát na `0.7.0`.

## Supabase

Súbor `supabase/schema_problem_management_v07.sql` pripravuje normalizovaný model pre neskorší prechod zo snapshotového ukladania. V tejto iterácii ho nie je potrebné spúšťať.
