# Release v0.48.1 – ServiceDesk Ticket Workflow & Handover

## Cieľ
Dotiahnuť každodenný resolver workflow: bezpečné presuny ticketov medzi skupinami a riešiteľmi, úplný tracking presunov a sprístupnenie pracovníkov odboru 3.1/OIT pri konfigurácii riešiteľských skupín.

## Nové funkcie
- pri detaile ticketu je jasne označená **Riešiteľská skupina / presun** a **Riešiteľ / odovzdanie**,
- po výbere skupiny sa v zozname riešiteľov prioritne zobrazujú jej členovia; ak skupina členov ešte nemá, zobrazia sa všetci dostupní riešitelia,
- nové pole **Dôvod odovzdania** sa pri zmene skupiny/riešiteľa zapíše do auditnej histórie,
- história ticketu eviduje zmenu stavu, skupiny, riešiteľa a priority,
- nový serverový trigger notifikuje členov novej skupiny pri presune ticketu,
- rýchle akcie **Vyriešiť** a **Uzatvoriť**,
- vyriešenie/uzatvorenie vyžaduje vyplnené pole **Riešenie / výsledok**.

## Riešitelia 3.1 OIT / prevádzka
ServiceDesk resolver directory teraz zjednocuje:
- existujúci register ľudí ORIS,
- pracovníkov odboru 3.1/OIT zo zdrojovej RACI matice.

Do matice skupín sa tak dopĺňajú aj prevádzkoví pracovníci pre Lamačskú cestu, Staré Grunty, DC VaV Žilina a Teslovu. OIT osoby sú v zozname označené ako `3.1 OIT · prevádzka`.

Dôležité: zaradenie mena do skupiny určuje ServiceDesk routing/členstvo. Aby sa konkrétny pracovník mohol do aplikácie prihlásiť ako riešiteľ, musí mať zároveň aktívny používateľský účet s rolou `resolver` (alebo vyššou) a jeho meno/e-mail musí zodpovedať profilu.

## Rola Používateľ / employee
Bez zmeny zostáva produkčný model z v0.47.2:
- rola `employee` sa v UI používa ako **Používateľ**,
- vidí iba ServiceDesk,
- vidí iba svoje tickety,
- môže zakladať požiadavky cez katalóg, komentovať a pridávať prílohy,
- vidí publikované články Knowledge Base / Known Errors,
- nevidí resolver fronty, konfiguráciu skupín, routing, SLA administráciu ani ostatné interné moduly.

## Databáza
Nová migrácia `supabase/migration_servicedesk_v0481.sql` nepridáva tabuľky ani nemení existujúce dáta. Pridáva iba trigger pre notifikáciu novej riešiteľskej skupiny pri handoveri ticketu.

## Kompatibilita
Release nadväzuje na v0.48.0. Existujúce tickety, SLA, routing, katalóg, e-mailové kanály a Knowledge Base ostávajú zachované. Nepridáva sa nová npm dependency.
