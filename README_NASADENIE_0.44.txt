IS RIADENIE ODBORU – v0.44.0 SERVICEDESK FOUNDATION
====================================================

DÔLEŽITÉ: tento release obsahuje databázovú migráciu.

PORADIE NASADENIA
-----------------
1. Zálohujte/overte aktuálny produkčný deployment v0.43.0.
2. V Supabase SQL Editore spustite celý súbor:

   supabase/migration_servicedesk_v044.sql

3. Na konci SQL musí overovací SELECT ukázať najmä:
   - routing_ready = true
   - secure_reader_ready = true
   - seeded_groups >= 9
   - routing_rules >= 8

4. Až potom nasaďte frontend v0.44.0 na Vercel.
5. Prihláste sa ako admin/manager.
6. Otvorte ServiceDesk -> Skupiny a routing.
7. V matici členstva priraďte reálnych zamestnancov do riešiteľských skupín.
8. Skontrolujte/úpravte routing pravidlá podľa vašej organizácie.
9. Nastavte vedúceho, zástupcu, pracovný čas a prípadné skupinové SLA.

POVINNÝ SMOKE TEST
------------------
A. Employee účet
- vidí ServiceDesk ako samostatný modul,
- vytvorí požiadavku,
- vytvorí incident,
- ticket sa automaticky zaradí do správnej skupiny,
- employee nevidí cudzie tickety,
- employee nevidí internú poznámku ani interné komentáre,
- employee nemôže meniť stav/frontu/riešiteľa ani ticket zmazať.

B. Resolver účet
- po zaradení do skupiny vidí jej tickety,
- bez členstva cudziu skupinu nevidí,
- vie prijať/prideliť ticket, zmeniť stav, doplniť internú poznámku a riešenie,
- po presune ticketu do inej skupiny sa oprávnenie správa podľa členstva/pridelenia.

C. Admin/manager
- vidí všetky tickety,
- vie meniť skupiny, členstvo, routing a SLA,
- zmena konfigurácie sa uloží do samostatných ServiceDesk DB tabuliek.

D. Routing
- Tlač a skenovanie -> Q-TLAC
- KOMIS a centrálne registre -> Q-KOMIS
- Prístupy a oprávnenia -> Q-IAM
- Koncové zariadenia -> Q-ENDPOINT
- Infraštruktúra / Sieť -> Q-SIET
- Infraštruktúra / Server -> Q-INFRA
- Rozvoj IS -> Q-ROZVOJ
- Ostatné -> Q-SD-L1

ROLLBACK
--------
Frontend je možné vrátiť na v0.43.0.

DB migrácia je zámerne dopredne kompatibilná: nové stĺpce a routing tabuľku nie je potrebné pri frontend rollbacku mazať. Neodporúča sa ručne obnovovať staré široké UPDATE/DELETE RLS policy pre employee.

POZNÁMKY
--------
- Nové odporúčané skupiny sa vytvoria bez členov. Po nasadení ich musí admin naplniť.
- Existujúce staré skupiny a tickety migrácia nemaže.
- E-mailové notifikácie ešte nie sú súčasťou v0.44.0.
- SLA je zatiaľ v kalendárnych hodinách; pracovný čas skupiny sa už eviduje pre ďalšiu fázu.
