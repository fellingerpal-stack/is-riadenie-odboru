IS Riadenie odboru – nasadenie v0.48.0
======================================

PREDPOKLAD
- produkcia je na v0.47.2,
- definitívny ServiceDesk 42702 hotfix bol už aplikovaný; migrácia v0.48 ho bezpečne aplikuje znovu.

PORADIE NASADENIA
1. Supabase SQL Editor:
   spusti `supabase/migration_servicedesk_v048.sql`

2. Na konci SQL musia byť TRUE:
   knowledge_articles_ready
   knowledge_feedback_ready
   knowledge_reader_ready
   knowledge_writer_ready
   knowledge_feedback_rpc_ready
   servicedesk_context_ready

3. Nasaď frontend v0.48.0.

4. Ctrl+F5 a otestuj:
   - ServiceDesk → Riešenia a návody,
   - admin/manager: vytvor článok a publikuj ho,
   - employee: vidí publikovaný článok, ale nie návrh,
   - employee: otvor katalogovú službu naviazanú na článok → nad ticket formulárom sa zobrazí odporúčané riešenie,
   - resolver: uzavretý ticket → „Vytvoriť návrh KB z riešenia“ → vznikne predvyplnený návrh,
   - feedback „Áno, pomohlo“ sa uloží.

DÔLEŽITÉ
- SQL je ne-deštruktívne a idempotentné.
- Nepridáva sa žiadna nová npm dependency.
- Existujúce ServiceDesk dáta sa nemažú.
- Employee stále vidí iba svoje tickety a iba publikované KB články.
