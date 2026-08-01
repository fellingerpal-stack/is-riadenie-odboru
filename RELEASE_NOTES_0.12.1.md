# Release 0.12.1 – Helpdesk / ServiceDesk v samostatnej databáze

## Hlavná zmena

Helpdesk už v cloudovom režime nepoužíva spoločný aplikačný snapshot ako primárny zdroj. Tickety, fronty riešiteľov a SLA politiky sa ukladajú do samostatných Supabase tabuliek.

## Nové tabuľky

- `service_tickets` – incidenty a požiadavky vrátane SLA, komentárov, histórie a dočasných príloh,
- `service_queues` – fronty riešiteľov,
- `service_sla_policies` – SLA pravidlá,
- `service_activity` – audit vytvorenia, úprav a odstránenia.

## Funkcie

- automatický import existujúcich dát z aktuálneho snapshotu,
- realtime načítanie zmien ostatných používateľov,
- samostatný stav synchronizácie priamo v Helpdesku,
- bezpečné sériové zapisovanie zmien,
- RLS podľa organizácie a aplikačnej roly,
- konfiguráciu frontov a SLA môžu meniť administrátor, manažér a riešiteľ,
- zamestnanec môže pracovať s ticketmi, ale nemení nastavenia ServiceDesku,
- vytvorenie úlohy z ticketu ďalej používa samostatné tabuľky Projektov a úloh z release 0.12.

## Poznámka k prílohám

Prílohy sú v tejto etape zachované v JSON dátach ticketu kvôli kompatibilite s existujúcou aplikáciou. Presun súborov do Supabase Storage je plánovaný v release 0.13.
