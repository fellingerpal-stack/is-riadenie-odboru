# Release 0.6.0 – Change management

## Nový modul
- register požiadaviek na zmenu s číslovaním `CHG-YYYY-NNNN`,
- kanban, tabuľkový register a kalendár plánovaných zásahov,
- typy štandardná, normálna a núdzová zmena,
- celý životný cyklus od návrhu po realizáciu, validáciu, dokončenie alebo rollback,
- posúdenie priority, rizika, dopadu a plánovaného výpadku,
- implementačný, testovací, rollback a komunikačný plán,
- CAB schvaľovanie – vecný vlastník, technický vlastník a prevádzka/bezpečnosť,
- väzby na služby, tickety, projekty a úlohy,
- vytvorenie realizačnej úlohy priamo z požiadavky na zmenu,
- história zmien a manažérske KPI.

## Dáta a kompatibilita
- automatická migrácia stavu na verziu `0.6.0`,
- existujúce údaje Helpdesku, projektov, RACI a ostatných modulov zostávajú zachované,
- nový SQL návrh `supabase/schema_change_management_v06.sql`,
- aplikácia naďalej funguje v lokálnom aj Supabase snapshotovom režime.
