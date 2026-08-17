# v0.47.2 – Employee ServiceDesk Portal

Bezpečnostné a UX dotiahnutie roly `employee`, používateľsky zobrazenej ako **Používateľ**.

## Zmeny
- Používateľ po prihlásení smeruje priamo do ServiceDesku.
- Sidebar používateľa obsahuje iba ServiceDesk; ostatné pracovné moduly nie sú prístupné ani priamou URL/hash navigáciou.
- Globálne vyhľadávanie a snapshot synchronizačné ovládanie sú pre employee vypnuté.
- ServiceDesk ostáva self-service: katalóg služieb, vytvorenie incidentu/požiadavky, vlastné tickety, verejné komentáre/prílohy a notifikácie.
- Technické filtre/fronty, riešiteľské a administračné prvky ostávajú iba resolver/manager/admin rolám.
- Nový employee účet má default scope 3.1/3.2/shared = `none`.
- Employee klient už nenačítava centrálny app snapshot, projekty ani IAM dáta.

## Databázové hardening
- employee už nemôže priamo SELECTovať `app_snapshots`.
- employee už nemá priamy SELECT plných riadkov `service_queues`, `service_sla_policies` a `service_routing_rules`.
- nový `get_service_employee_queues()` vracia iba minimálny zoznam aktívnych frontov potrebný na čitateľný stav ticketu.
- existujúce `get_service_tickets()` naďalej vracia employee iba jeho vlastné tickety a odstraňuje interné poznámky/komentáre.

Migrácia nemaže ani nemení existujúce tickety.
