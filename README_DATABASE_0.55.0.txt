IS RIADENIE ODBORU v0.55.0 - DATABASE
=====================================

Nova migracia: `supabase/migration_project_governance_v055.sql`

Vytvara tri nove projektove tabulky:
- project_raid_items
- project_status_reports
- project_decisions

Citanie je scoped cez `project_can_read(project_id)`.
Zapis je iba cez security-definer RPC a pred zapisom overuje `project_can_manage(project_id)`.
Priamy INSERT/UPDATE/DELETE pre authenticated/anon je odobrany.

Diagnostika po migracii:
`supabase/test_project_governance_v055.sql`
