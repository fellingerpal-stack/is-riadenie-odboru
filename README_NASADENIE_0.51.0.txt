IS RIADENIE ODBORU – v0.51.0 RIADENIE PROJEKTOV
================================================

DÔLEŽITÉ
---------
Tento release je PRIAMY upgrade zo stabilnej v0.49.0.
Release v0.50.0 NEINŠTALUJTE a nie je podmienkou v0.51.0.

ServiceDesk zostáva v databáze zachovaný, ale po v0.51.0 ho v aplikácii vidí iba admin.

ODPORÚČANÉ PORADIE NASADENIA
----------------------------
1. Overte, že produkcia je na v0.49.0.
2. Urobte štandardnú databázovú zálohu / restore point.
3. Supabase -> SQL Editor.
4. Spustite celý súbor:

   supabase/migration_project_management_v051.sql

5. Finálny SELECT musí vrátiť TRUE vo všetkých 5 stĺpcoch:
   - project_extension_ready
   - project_tables_ready
   - project_rpc_ready
   - project_scope_hardened
   - project_roles_ready

6. Voliteľne spustite read-only diagnostiku:

   supabase/test_project_management_v051.sql

7. Keďže sa rozširuje zoznam rolí, redeploynite existujúcu Edge Function:

   supabase/functions/invite-user/index.ts

   Nemenia sa žiadne secrets.

8. Nahrajte FULL v0.51.0 do GitHub main a nechajte Vercel spraviť production build.
9. Po deployi Ctrl+F5 a overte verziu v0.51.0.

POVINNÝ SMOKE TEST
------------------
A. ADMIN
- vidí ServiceDesk,
- vidí Riadenie projektov,
- existujúce ServiceDesk tickety a konfigurácia ostali zachované,
- vie v Správe používateľov priradiť rolu Projektový manažér / Člen projektu.

B. PROJEKTOVÝ MANAŽÉR
- po prihlásení vidí Hlavný panel a Riadenie projektov,
- nevidí ServiceDesk, ORIS, OIT, CVTI 360, IAM ani ostatné interné moduly,
- vidí projektové portfólio,
- vytvorí projekt,
- vyberie PM alebo člena z aktívnych používateľov,
- pridá člena tímu a rolu Analytik / Tester / Gestor atď.,
- pridá zdroj financovania,
- pridá míľnik a projektovú úlohu,
- prepojí projekt s informačným systémom / zmluvou / dodávateľom.

C. ČLEN PROJEKTU
- účet má aplikačnú rolu Člen projektu,
- je vložený do konkrétneho projektu cez e-mail alebo User ID,
- po prihlásení vidí iba projekt, v ktorom je aktívnym členom,
- nevidí cudzie projekty,
- môže upraviť iba svoju pridelenú projektovú úlohu,
- nemôže meniť tím, financovanie, projekt ani väzby.

D. EXISTUJÚCE ROLY
- manager/resolver/viewer majú pôvodné interné moduly podľa svojich scope,
- ServiceDesk sa im už nezobrazuje,
- existujúce ORIS/OIT/shared dáta a workflow ostávajú funkčné.

POZNÁMKA K BUILD TESTU
----------------------
Release balík obsahuje zdrojové kontroly a statické syntax kontroly.
Ak lokálne prostredie nemá nainštalované npm dependencies, finálnou bránou je štandardný
Vercel CI build: tsc -b && vite build. Produkciu publikujte iba po úspešnom CI builde.

ROLLBACK
--------
Frontend je možné vrátiť na v0.49.0. Nové projektové tabuľky a stĺpce sú aditívne a môžu
v databáze zostať. Pred rollbackom nemažte projektové dáta. Roly project_manager/project_member
je pri dlhodobom rollbacku vhodné administratívne zmeniť na existujúcu v0.49 rolu.
