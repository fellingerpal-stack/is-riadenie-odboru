# IS Riadenie odboru v0.55.0
## Project Governance & Control

Release nad v0.54.1 rozsiruje modul Riadenie projektov o riadiacu vrstvu pre projektove portfolio.

### Novinky
- Manažérsky `Control Center` pre Admina a Projektového manažéra.
- Automaticky Project Health vypocitany z otvorenych RAID poloziek, meskajucich milnikov, rozpoctu, cakajucich rozhodnuti, status reportingu a terminu projektu.
- RAID register: Riziko / Problem / Zavislost / Predpoklad.
- Status report po mesiacoch s historiou a progressom.
- Decision log s rozhodovatelom, terminom, dopadom a stavom.
- Governance karta priamo v detaile projektu.
- Drill-down z Control Center do konkretneho projektu.

### Opravnenia
- Admin vidi a riadi governance vsetkych projektov.
- Projektovy manazer vidi Control Center iba pre projekty, ktore skutocne riadi. Projekty, kde je iba clenom, ostavaju read-only.
- Clen projektu vidi governance iba v projektoch, kde ma aktivne clenstvo; nezobrazuje sa mu globalny Control Center a nema governance zapis.

### Databaza
Nova migracia `supabase/migration_project_governance_v055.sql` vytvara:
- `project_raid_items`
- `project_status_reports`
- `project_decisions`
- scoped reader `project_governance_read()`
- scoped write/delete RPC pre RAID, status reporty a rozhodnutia.

### Poznamka k auto health
Auto health je riadiaci signal. Povodny manualny health projektu ostava zachovany a vstupuje do vyhodnotenia, ale UI zobrazuje automaticky vypocitany stav.
