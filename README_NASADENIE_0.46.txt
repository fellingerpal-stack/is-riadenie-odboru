IS RIADENIE ODBORU – v0.46.0 SERVICEDESK EMAIL -> TICKET
========================================================

DÔLEŽITÉ: release obsahuje databázovú migráciu a novú Supabase Edge Function.

PORADIE NASADENIA
-----------------
1. Produkcia musí mať úspešne nasadenú v0.45.0.
2. V Supabase SQL Editore spustite celý súbor:

   supabase/migration_servicedesk_v046.sql

3. Finálny SELECT musí ukázať:
   - inbound_channels_ready = true
   - inbound_log_ready = true
   - inbound_rpc_ready = true
   - inbound_config_ready = true
   - subject_threading_ready = true
   - active_email_channels >= 1 (ak existujú fronty s e-mailom)

4. Nasaďte frontend v0.46.0 na Vercel.
5. Otvorte ServiceDesk -> Skupiny a routing -> E-mail -> Ticket.
6. Skontrolujte reálne prijímacie adresy a ich routing.

EDGE FUNCTION
-------------
7. Nasaďte:

   supabase/functions/service-email-inbound/index.ts

8. Nastavte secrets:
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   SERVICEDESK_INBOUND_SECRET
   SERVICEDESK_OUTBOUND_FROM

9. Mail gateway nastavte tak, aby inbound e-mail POSToval do Edge Function a posielal header:

   x-servicedesk-inbound-secret: <SERVICEDESK_INBOUND_SECRET>

Odporúčaný JSON payload je opísaný v SERVICEDESK_EMAIL_INBOUND_0.46.md.

POVINNÝ SMOKE TEST
------------------
A. Nový e-mail
- pošlite správu na nakonfigurovanú centrálnu adresu,
- vznikne nový ticket s kanálom E-mail,
- fronta/kategória/priorita sedia s e-mailovým kanálom,
- žiadateľ dostane štandardné potvrdenie podľa nastavenia e-mail outboxu.

B. Reply threading
- odpovedzte na ServiceDesk e-mail s predmetom obsahujúcim [ID-TICKETU],
- nesmie vzniknúť nový ticket,
- odpoveď sa objaví ako verejný komentár existujúceho ticketu,
- resolver dostane in-app notifikáciu.

C. Idempotencia
- pošlite rovnaký webhook dvakrát s rovnakým messageId,
- druhý request musí vrátiť duplicate=true a nesmie pridať ďalší ticket/komentár.

D. Loop protection
- pošlite webhook s from = SERVICEDESK_OUTBOUND_FROM,
- Edge Function vráti ignored=true / outbound-loop-protection.

E. Chybový banner
- pri databázovej chybe už UI nesmie zobrazovať [object Object], ale čitateľný detail.

ROLLBACK
--------
Frontend môžete vrátiť na v0.45.0. Nové DB tabuľky v0.46 sú aditívne; pri rollbacku frontendu môžu zostať v DB bez vplyvu na v0.45.
