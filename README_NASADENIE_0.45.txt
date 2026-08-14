IS RIADENIE ODBORU – v0.45.0 SERVICEDESK OPERATIONS & NOTIFICATIONS
===================================================================

DÔLEŽITÉ: tento release obsahuje databázovú migráciu.

PORADIE NASADENIA
-----------------
1. Overte funkčný produkčný ServiceDesk v0.44.0.
2. V Supabase SQL Editore spustite celý súbor:

   supabase/migration_servicedesk_v045.sql

3. Finálny SELECT musí ukázať najmä:
   - notifications_ready = true
   - email_outbox_ready = true
   - business_calendar_ready = true
   - escalation_ready = true
   - notification_reader_ready = true

4. Až potom nasaďte frontend v0.45.0.
5. Ctrl+F5 a overte v aplikácii verziu v0.45.0.
6. ServiceDesk -> Skupiny a routing:
   - overte pracovné dni,
   - začiatok/koniec pracovného času,
   - timezone,
   - SLA warning predstih,
   - vedúceho a zástupcu.
7. V časti SLA kalendár doplňte organizačné sviatky/nepracovné dni a prípadné mimoriadne pracovné dni.

POVINNÝ SMOKE TEST
------------------
A. Business SLA
- vytvorte testovací ticket v skupine s business calendar,
- deadline musí rešpektovať pracovné hodiny,
- ticket mimo pracovného času sa začne počítať od ďalšieho pracovného intervalu.

B. Notifikácie
- založenie ticketu -> žiadateľ má potvrdenie v Notification Center,
- pridelenie -> riešiteľ dostane notifikáciu,
- zmena stavu/verejný komentár -> žiadateľ dostane notifikáciu,
- notifikácia sa dá označiť ako prečítaná.

C. SLA warning/breach
- pri testovacom SLA v blízkom čase spustite ServiceDesk alebo RPC process_service_sla_escalations(),
- vedúci/zástupca/riešiteľ podľa konfigurácie dostane warning alebo breach notice,
- opakované spustenie nesmie vytvárať nekontrolované duplikáty.

D. Oprávnenia
- employee naďalej vidí iba svoje tickety,
- resolver iba svoje fronty/pridelené tickety,
- admin/manager môže meniť business calendar a výnimky,
- employee/resolver nemôže meniť calendar exceptions.

E-MAIL – VOLITEĽNÝ DRUHÝ KROK
-----------------------------
In-app notifikácie fungujú bez e-mailového providera.

Pre fyzické e-maily nasaďte Edge Function:
   supabase/functions/service-notifications/index.ts

Nastavte secrets:
   SERVICEDESK_WORKER_SECRET
   SERVICEDESK_EMAIL_WEBHOOK_URL
   SERVICEDESK_EMAIL_WEBHOOK_TOKEN   (voliteľný Bearer token)
   SERVICEDESK_APP_URL               (odporúčané)

SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY poskytne prostredie Edge Function.

Worker volajte pravidelne s HTTP headerom:
   x-servicedesk-worker-secret: <SERVICEDESK_WORKER_SECRET>

Odporúčaná frekvencia: každých 1-5 minút podľa prevádzky.

PG_CRON
-------
Ak bol pg_cron už povolený, migrácia sa pokúsi vytvoriť job servicdesk-sla-v045 každých 15 minút.
Ak pg_cron nie je dostupný, migrácia nezlyhá. SLA kontrola sa spúšťa aj z aktívneho ServiceDesk UI.
Pre 24/7 prevádzku však nastavte serverový scheduler.

ROLLBACK
--------
Frontend možno vrátiť na v0.44.0. Nové DB tabuľky/stĺpce sú spätne kompatibilné a pri frontend rollbacku ich netreba odstraňovať.
