# Release v0.48.0 – ServiceDesk Knowledge Base & Known Errors

## Cieľ
Doplniť ServiceDesk o znalostnú databázu, ktorá znižuje počet opakovaných ticketov a umožňuje z vyriešených incidentov vytvárať opakovateľné riešenia.

## Nové funkcie
- nová záložka **Riešenia a návody** dostupná aj role Používateľ (`employee`),
- dva typy obsahu: **Návod** a **Known Error**,
- stavy: **Návrh / Publikované / Archivované**,
- vyhľadávanie podľa názvu, textu, príznakov, kategórie a kľúčových slov,
- väzba článku na Service Catalog, službu/systém, kategóriu a zdrojový ticket,
- odporúčané články pri vypĺňaní nového ticketu,
- hodnotenie „Pomohlo / Nepomohlo“ a počítadlo zobrazení,
- resolver môže z uzatvoreného ticketu jedným klikom vytvoriť predvyplnený návrh KB,
- admin/manager schvaľuje publikovanie, označenie „Odporúčané“ a archiváciu.

## Bezpečnostný model
- employee/viewer dostáva z DB iba publikované články,
- návrhy sú dostupné iba admin/manager/resolver,
- resolver nemôže priamo prepísať publikovaný článok ani ho publikovať,
- zdrojový ticket sa employee/viewer cez reader RPC neposiela,
- priame INSERT/UPDATE/DELETE/SELECT na KB tabuľkách pre `authenticated` nie sú podporované; používa sa SECURITY DEFINER RPC,
- migrácia znovu aplikuje opravený `assert_service_member()` / `assert_service_configurator()` a tým zachováva definitívny fix SQLSTATE 42702.

## Databáza
Nové tabuľky:
- `service_knowledge_articles`
- `service_knowledge_feedback`

Nové RPC:
- `get_service_knowledge_articles(boolean)`
- `upsert_service_knowledge_article(jsonb)`
- `archive_service_knowledge_article(text)`
- `record_service_knowledge_view(text)`
- `rate_service_knowledge_article(text, boolean)`

## Kompatibilita
Release nadväzuje na v0.47.2. Neodstraňuje ani nemení existujúce tickety, routing, SLA, e-mailové kanály alebo katalogové položky. Nepridáva novú npm závislosť.
