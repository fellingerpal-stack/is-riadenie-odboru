IS Riadenie odboru v0.52.0 – DATABASE

Spusti iba po úspešne nasadenej migration_project_management_v051.sql.

1. supabase/migration_project_capacity_v052.sql
2. Voliteľne spusti read-only kontrolu supabase/test_project_capacity_v052.sql

Migrácia v0.52.0:
- nemení projektové business dáta,
- dopĺňa project_can_manage(uuid),
- sprísňuje project_can_read(uuid) pre project_manager na vlastné projekty,
- pridáva server-side guard proti zápisu PM do cudzieho projektu,
- nevyžaduje redeploy Edge Function invite-user.
