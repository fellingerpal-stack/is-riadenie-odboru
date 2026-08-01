IS RIADENIE ODBORU – RELEASE 0.12.1
Helpdesk / ServiceDesk v samostatných Supabase tabuľkách

PORADIE NASADENIA

1. V StackBlitz spustite jednosúborový inštalátor:
   node install-v0121-helpdesk-db.mjs

2. Overte build:
   npm run build

3. Odošlite zmeny do GitHubu:
   git add .
   git commit -m "Release 0.12.1 Helpdesk database"
   git push

4. Po úspešnom Vercel deploymente spustite v Supabase SQL Editor celý súbor:
   supabase/migration_helpdesk_v0121.sql

5. Odhláste sa, znovu sa prihláste a obnovte aplikáciu cez Ctrl + F5.

KONTROLA

- Helpdesk zobrazí panel „Samostatné Supabase tabuľky ServiceDesku“.
- Stav bude „Synchronizované“.
- V Supabase budú tabuľky service_tickets, service_queues, service_sla_policies a service_activity.
- Po úprave ticketu sa zmena zachová po obnovení stránky.
