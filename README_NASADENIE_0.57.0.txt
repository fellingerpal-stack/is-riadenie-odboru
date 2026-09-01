IS RIADENIE ODBORU v0.57.0
PROJECT UX & EXECUTIVE CARD

VYCHODISKO
- Release je pripravený ako upgrade z v0.56.2.
- Ak ešte nebola nasadená DB migrácia v0.56.2, najprv dokonči databázové kroky z v0.56.2.

DATABAZA
- v0.57.0 NEMA novu SQL migraciu.
- Neopakuj migration_project_finance_v056.sql ani migration_entity_finance_allocation_v0562.sql, ak uz boli uspesne nasadene.
- invite-user Edge Function sa nemeni.

NASADENIE
1. Nahraj obsah IS_Riadenie_odboru_v0.57.0_FULL.zip priamo do rootu GitHub repozitara.
2. Commitni zmenu a pockaj na Vercel production build.
3. V logu over:
   [v0.57.0 prebuild] legacy cleanup complete
   [v0.57.0 verify] OK; sourceFiles=75; version=0.57.0
4. Po deployi sprav Ctrl+F5.

SMOKE TEST
A) Riadenie projektov -> Prehlad / Projekty
- projektove karty maju tmavu hlavicku a health akcent,
- na karte vidno auto health + stav, fazu, PM, delivery,
- vidno rozpocet/cerpanie, tim, ulohy, governance signaly,
- vidno najblizsi milnik a termin.

B) Otvor projekt
- hore sa zobrazi nova Executive Card,
- vidno delivery, PM, termin, rozpocet/cerpanie, tim/kapacitu, governance signaly a najblizsi milnik,
- Karta projektu / Delivery / Governance / Tim / Financovanie / Vazby zostavaju funkcne.

C) Role
- Admin, Projektovy manazer a Clen projektu maju rovnake opravnenia ako vo v0.56.2.
- Zmena je UI/UX, nie access-control zmena.

ROLLBACK
- Frontend je mozne vratit na v0.56.2.
- Databazu netreba rollbackovat, pretoze v0.57.0 nema DB migraciu.
