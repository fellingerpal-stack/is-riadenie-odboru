IS RIADENIE ODBORU – v0.47.1
================================

AK STE TERAZ NA v0.46 (odporúčané pre aktuálny stav):
1. NESPÚŠŤAJTE pôvodný migration_servicedesk_v047.sql.
2. V Supabase SQL Editore spustite iba:
   supabase/migration_servicedesk_v0471.sql
3. Overovací SELECT na konci musí ukázať calendar_reader_ready=true, email_channel_reader_ready=true, calendar_writer_ready=true, email_channel_writer_ready=true.
4. Nasaďte frontend v0.47.1.
5. Ctrl+F5.
6. ServiceDesk -> Skupiny a routing: sekcie E-mail → Ticket a SLA kalendár sa musia načítať bez chyby 42702.
7. Otestujte uloženie jednej SLA výnimky a následné zmazanie.
8. Otestujte otvorenie/pridanie prijímacej e-mailovej adresy.
9. Otestujte employee Service Catalog a vytvorenie ticketu.

AK UŽ BOLA v0.47 SQL MIGRÁCIA SPUSTENÁ:
- spustite iba supabase/migration_servicedesk_v0471_hotfix_only.sql
- potom nasaďte frontend v0.47.1.

SQL nemení existujúce tickety ani konfiguráciu; iba vytvorí Service Catalog (ak ešte nie je) a nahradí dotknuté RPC bezpečne kvalifikovanou verziou.
