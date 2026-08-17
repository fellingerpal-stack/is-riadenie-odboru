IS Riadenie odboru v0.47.2 – Employee ServiceDesk Portal

ODPORÚČANÉ PORADIE NASADENIA
1. Nasaď frontend v0.47.2.
   - Kód má prechodný fallback, takže employee funguje aj pred DB migráciou.
2. Spusti SQL: supabase/migration_employee_portal_v0472.sql
3. Refresh aplikácie.

SMOKE TEST – EMPLOYEE / POUŽÍVATEĽ
- prihlásenie otvorí #/serviceDesk,
- sidebar obsahuje iba ServiceDesk,
- ručné otvorenie #/enterprise360, #/itCosts, #/users alebo #/portals presmeruje späť na ServiceDesk,
- používateľ vidí iba svoje tickety,
- nevidí Skupiny a routing, SLA reporty ani resolver frontu,
- vie vytvoriť požiadavku z Katalógu služieb,
- vie pridať verejný komentár a prílohu ku svojmu ticketu,
- Môj profil a zmena vlastného hesla ostávajú dostupné.

SMOKE TEST – ADMIN/RESOLVER
- ostatné moduly ostávajú dostupné podľa pôvodných rolí/scope,
- ServiceDesk fronty, routing, SLA a konfigurácia fungujú bez zmeny.

SQL READINESS
Výstup na konci migrácie má mať:
employee_queue_reader_ready = true
snapshot_policy_ready = true
