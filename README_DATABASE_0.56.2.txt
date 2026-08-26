v0.56.2 DATABASE
================

Povinne z v0.56.1:
1. Spusti migration_entity_finance_allocation_v0562.sql.
2. Skontroluj 5x TRUE v zaverecnom SELECTe.
3. Volitelne spusti test_entity_finance_allocation_v0562.sql.

Nova schema:
- public.entity_financial_allocations
- public.entity_finance_allocation_read()
- public.entity_finance_allocation_upsert(jsonb)
- public.entity_finance_allocation_delete(text)

Migracia nemeni source ledger, project_funding, project_links ani stare zaznamy.
