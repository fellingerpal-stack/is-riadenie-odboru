v0.49.0 DATABASE
===============

Spustiť pred zapnutím Microsoft Entra SSO:
  migration_entra_sso_v049.sql

Očakávaný readiness výstup:
  employee_scope_hardened = true
  auth_profile_function_ready = true
  auth_profile_trigger_ready = true

Migrácia nemaže tickety, KB, ServiceDesk konfiguráciu ani používateľov.
Existujúce admin/manager/resolver roly nemení.

Po prvom SSO teste môžete spustiť:
  test_entra_sso_v049.sql
