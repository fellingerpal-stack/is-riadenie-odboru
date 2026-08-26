IS RIADENIE ODBORU v0.56.2
ENTITY FINANCIAL ALLOCATION
===========================

VYCHODISKOVY STAV
- Produkcia je funkcna na v0.56.1.
- migration_project_finance_v056.sql z v0.56.0/0.56.1 uz bola nasadena.

PORADIE NASADENIA
1. Urob standardny DB backup / restore point.
2. Supabase -> SQL Editor.
3. Spusti cely subor:
   supabase/migration_entity_finance_allocation_v0562.sql
4. Finalny SELECT musi vratit 5x TRUE:
   - entity_finance_table_ready
   - entity_finance_read_ready
   - entity_finance_write_ready
   - entity_finance_delete_ready
   - entity_finance_amount_ready
5. Volitelne spusti read-only diagnostiku:
   supabase/test_entity_finance_allocation_v0562.sql
6. Nahraj obsah IS_Riadenie_odboru_v0.56.2_FULL.zip do ROOTU GitHub repozitara.
7. Vercel build ma ukazat:
   [v0.56.2 prebuild] legacy cleanup complete
   [v0.56.2 verify] OK; sourceFiles=75; version=0.56.2
8. Po deployi Ctrl+F5.

SMOKE TEST
A. CVTI 360 -> SCIDAP / SVD -> Financie
- zmluvna KOMIS SLA vrstva zostava zobrazena,
- nova sekcia Entity Financial Allocation je viditelna,
- Admin/manager vidi tlacidlo Naparovat cerpanie.

B. Naparovat cerpanie
- vyber ciel: cela entita alebo SCIDAP/SVD modul,
- vyber Ulohu 10, 22 alebo 25,
- vyber auditny riadok,
- otestuj Cely zostatok / Cast platby EUR / Percento,
- ulozenie vytvori alokaciu a detail sa zobrazi v tabulke.

C. Kontrola dvojiteho zapocitania
- skus z tej istej platby alokovat viac, ako ostava,
- databaza musi operaciu odmietnut.

D. Hierarchia KOMIS
- alokacia na modul SCIDAP/SVD sa ma zobrazit v module aj v nadradenom pohlade KOMIS.

E. Existujuce priame mapovanie
- CRZP/APS a ostatne doterajsie priame financne mapovania musia zostat bez zmeny.
- projektove financovanie v0.56.1 musi ostat funkcne.

DATABAZA
- v0.56.2 pridava iba novu auditnu mapovaciu tabulku.
- NESPÚŠŤAJ znova stare projektove migracie, ak uz boli nasadene.
- invite-user Edge Function sa NEMENI a nere-deployuje sa.

ROLLBACK
- Frontend vrat na v0.56.1.
- Tabulku entity_financial_allocations nemusis mazat; je aditivna a v0.56.1 ju ignoruje.
