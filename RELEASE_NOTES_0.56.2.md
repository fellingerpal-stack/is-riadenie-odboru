# IS Riadenie odboru v0.56.2
## Entity Financial Allocation

v0.56.2 nadväzuje na funkčnú v0.56.1 a dopĺňa chýbajúcu finančnú väzbu medzi kontraktovými úlohami 10 / 22 / 25 a konkrétnymi CVTI 360 entitami alebo KOMIS modulmi.

### 1. Skutočné čerpanie na úrovni IS / modulu
V **CVTI 360 -> Financie** pribudla vrstva **Entity Financial Allocation**.

Admin/manager môže pri konkrétnej entite alebo KOMIS module použiť **Napárovať čerpanie** a priradiť auditný finančný riadok z úlohy 10, 22 alebo 25.

Podporované režimy:
- celý nepriradený zostatok zdrojovej položky,
- časť platby v EUR,
- percento zdrojovej platby.

Jedna platba sa preto môže rozdeliť napr. 60 % SCIDAP / 40 % SVD alebo konkrétnou sumou medzi viac modulov.

### 2. Auditná kontrola proti dvojitému započítaniu
Každá alokácia uchováva:
- zdrojovú úlohu,
- ledger ID,
- dátum a doklad,
- ZAK,
- KPD / PPD,
- PRACM,
- pôvodnú sumu,
- alokovanú sumu a percento,
- cieľovú CVTI 360 entitu a voliteľne KOMIS modul,
- poznámku a čas zmeny.

Databázová funkcia nepovolí, aby súčet alokácií jedného ledger riadku prekročil jeho zdrojovú sumu.

### 3. Manuálne aj návrhové mapovanie
V dialógu je:
- vyhľadávanie podľa dokladu, popisu, ZAK a PRACM,
- manuálny výber riadkov,
- pomocná akcia **Navrhnúť podľa názvu**.

Automatický návrh iba predvyberie riadky podľa názvu/aliasov entity alebo modulu. Nič sa neuloží bez potvrdenia používateľom.

### 4. Oddelenie zmluvnej a skutočnej finančnej vrstvy
Existujúce KOMIS SLA / kvartál, 84-mesačná podpora a statický rozvoj zostávajú zmluvným kontextom.

Nová vrstva **Alokované čerpanie YTD** zobrazuje výlučne skutočne priradené účtovné riadky z úloh 10 / 22 / 25. Hodnoty sa navzájom nemiešajú.

### 5. CVTI 360 zobrazenie
Karta entity po vytvorení alokácií zobrazuje:
- alokované čerpanie YTD,
- zdrojové úlohy,
- počet auditných alokácií,
- rozpad podľa úloh 10 / 22 / 25,
- detail dokladu, zdrojovej sumy a alokovanej sumy,
- cieľový KOMIS modul,
- možnosť odstrániť mapovanie.

Ak entita nemá priame mapovanie na celú kontraktovú úlohu, ale má alokované platby, CVTI 360 už ju neoznačuje ako entitu bez finančného mapovania.

### 6. Hierarchia KOMIS
Alokácia na konkrétny KOMIS modul sa zobrazí:
- v príslušnej 360° entite modulu, ak existuje,
- aj v nadradenom pohľade KOMIS.

Tak možno sledovať napr. KOMIS -> SCIDAP/SVD -> Úloha 10/22 -> konkrétny doklad.

### Databáza
Povinná nová migrácia:
`supabase/migration_entity_finance_allocation_v0562.sql`

Vytvára tabuľku `entity_financial_allocations` a RPC:
- `entity_finance_allocation_read()`
- `entity_finance_allocation_upsert(jsonb)`
- `entity_finance_allocation_delete(text)`

Migrácia je aditívna. Zdrojový kontraktový ledger ani existujúce projektové financovanie sa nemenia.

### Oprávnenia
- čítanie: aktívny používateľ v organizácii,
- zápis/mazanie: rola `admin` alebo `manager`,
- zdrojový ledger je naďalej read-only.
