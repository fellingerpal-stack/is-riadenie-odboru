IS RIADENIE ODBORU – v0.51.1 VERCEL BUILD HOTFIX
==================================================

TOTO JE FRONTEND/BUILD HOTFIX PRE UZ NASADENU v0.51.0.

1. V Supabase nic nove nespustajte.
2. Nenasadzujte znovu migration_project_management_v051.sql, ak uz bola uspesne vykonana.
3. Nahrajte obsah FULL v0.51.1 do GitHub main tak, aby sa prepisali existujuce subory vratane tsconfig.app.json.
4. Vercel nechajte spravit novy production deployment.
5. Build musi prejst cez `tsc -b && vite build`.
6. Po deployi urobte Ctrl+F5.
7. Overte:
   - aplikacia sa otvori,
   - admin vidi ServiceDesk,
   - ne-admin ServiceDesk nevidi,
   - modul Riadenie projektov funguje,
   - projektovy manazer a clen projektu maju ocakavane pohlady.

PRICINA HOTFIXU
---------------
Repo obsahoval stare duplicitne TypeScript subory priamo v src/.
Aktualne zdroje su v src/lib/, ale povodne include ["src"] kompilovalo aj stare duplikaty.
v0.51.1 zuzuje TypeScript include na produkcnu strukturu a nepouzivane duplikaty uz build neblokuju.

DATABAZA: BEZ ZMENY.
