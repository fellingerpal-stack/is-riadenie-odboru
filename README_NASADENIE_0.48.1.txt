IS Riadenie odboru – nasadenie v0.48.1
======================================

PREDPOKLAD
- produkcia je na v0.48.0,
- ServiceDesk v0.48 Knowledge Base je funkčný.

ODPORÚČANÉ PORADIE
1. Supabase SQL Editor:
   spusti `supabase/migration_servicedesk_v0481.sql`

2. Na konci SQL majú byť TRUE:
   handover_notification_function_ready
   handover_notification_trigger_ready

3. Nasaď frontend v0.48.1.

4. Ctrl+F5.

SMOKE TEST – RIEŠITELIA
- ServiceDesk → Skupiny a routing.
- V matici členov musia byť okrem ORIS pracovníkov viditeľní aj ľudia označení `3.1 OIT · prevádzka`.
- Priraď napr. OIT pracovníka do skupiny Koncové zariadenia / Tlačové služby / Infraštruktúra.
- Ulož skupiny.

SMOKE TEST – HANDOVER
- otvor existujúci ticket ako admin/manager/resolver,
- zmeň Riešiteľskú skupinu,
- vyber riešiteľa novej skupiny,
- doplň Dôvod odovzdania,
- Ulož ticket,
- v Histórii musí byť viditeľný presun skupiny, zmena riešiteľa a dôvod,
- člen novej skupiny má dostať in-app notifikáciu (e-mail podľa nastavenia outboxu).

SMOKE TEST – UKONČENIE
- otvor ticket a doplň `Riešenie / výsledok`,
- klikni Vyriešiť,
- po opätovnom otvorení môžeš kliknúť Uzatvoriť,
- bez vyplneného riešenia musí UI ukázať validačné hlásenie.

SMOKE TEST – EMPLOYEE
- účet s rolou Používateľ / employee sa po prihlásení otvorí v ServiceDesku,
- vidí iba svoje tickety + Katalóg + publikovanú Knowledge Base,
- nevidí Skupiny/routing/SLA ani ostatné interné moduly.

DÔLEŽITÉ
- OIT osoba v matici je dostupná na priradenie už zo zdrojovej RACI.
- Na reálne prihlásenie a spracovanie ticketov potrebuje vlastný aktívny účet s rolou resolver (alebo vyššou).
- SQL migrácia je ne-deštruktívna.
