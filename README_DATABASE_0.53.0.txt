IS Riadenie odboru v0.53.0 – DATABASE

Spusti iba:
  supabase/migration_project_membership_v053.sql

Predpoklad:
  migration_project_management_v051.sql a migration_project_capacity_v052.sql už boli nasadené.

Migrácia:
- dopáruje staré project_members na profiles.id/auth.uid(),
- pridá trigger pre budúce UUID dopárovanie,
- upraví read scope člena projektu,
- umožní PM čítať aj projekty, kde je členom v inej projektovej roli,
- PM zapisuje iba do projektu, ktorý skutočne riadi.

Voliteľne spusti:
  supabase/test_project_membership_v053.sql
