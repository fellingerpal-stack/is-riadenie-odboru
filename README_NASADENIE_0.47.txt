IS RIADENIE ODBORU – v0.47.0 SERVICE CATALOG & SMART REQUEST FORMS
===================================================================

DÔLEŽITÉ: release obsahuje databázovú migráciu.

PORADIE NASADENIA
-----------------
1. Overte, že produkcia je na v0.46.0 a funguje ServiceDesk.
2. V Supabase SQL Editore spustite celý súbor:

   supabase/migration_servicedesk_v047.sql

3. Posledný SELECT musí ukázať najmä:
   - catalog_ready = true
   - catalog_reader_ready = true
   - catalog_writer_ready = true
   - ticket_catalog_link_ready = true
   - smart_form_data_ready = true
   - catalog_items >= 16

4. Až potom nasaďte frontend v0.47.0 na Vercel.
5. Ctrl+F5 a overte verziu v0.47.0.

SMOKE TEST – EMPLOYEE
---------------------
1. Prihláste sa ako employee.
2. ServiceDesk sa otvorí na záložke Katalóg služieb.
3. Otvorte CRZP / ANTIPLAG.
4. Bez povinného poľa Prostredie sa ticket nesmie uložiť.
5. Po vyplnení vytvorte ticket.
6. Ticket musí mať kategóriu KOMIS a centrálne registre / CRZP / ANTIPLAG.
7. Server ho musí zaradiť do Q-KOMIS podľa routing pravidiel (ak je pravidlo aktívne).
8. Zamestnanec stále nesmie meniť technickú frontu, prioritu ani interné polia.

SMOKE TEST – ADMIN/MANAGER
--------------------------
1. ServiceDesk → Skupiny a routing.
2. Hore je blok Katalóg služieb.
3. Upravte testovaciu položku alebo vytvorte novú.
4. Pridajte pole typu text/select a označte ho ako povinné.
5. Uložte a obnovte stránku.
6. Zmena musí zostať v DB a zobrazovať sa v katalógu.

REGRESIA
--------
- Moja fronta funguje.
- Moje tickety fungujú.
- SLA a reporty fungujú.
- Skupiny/routing fungujú.
- Notifikácie fungujú.
- E-mail → Ticket konfigurácia ostáva dostupná.
- Inbound Edge Function z v0.46 sa nemení.

ROLLBACK
--------
Frontend je možné vrátiť na v0.46.0. Nové DB stĺpce a katalogovú tabuľku odporúčame ponechať; sú spätne kompatibilné a v0.46 ich ignoruje.
