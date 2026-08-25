IS RIADENIE ODBORU v0.52.0
KARTA PROJEKTU + KAPACITY

Východiskový stav:
- v0.51.0 databázová migrácia pre Riadenie projektov už musí byť nasadená.
- v0.51.2 build fix je obsiahnutý vo FULL balíku v0.52.0.

PORADIE NASADENIA
1. Supabase SQL Editor:
   spusti supabase/migration_project_capacity_v052.sql

2. Na konci migrácie skontroluj tri hodnoty:
   project_manage_scope_ready = true
   project_read_scope_ready = true
   project_write_guard_ready = true

3. Nahraj obsah IS_Riadenie_odboru_v0.52.0_FULL.zip do rootu GitHub repozitára.

4. Vercel musí v logu ukázať:
   [v0.52.0 prebuild] legacy cleanup complete
   [v0.52.0 verify] OK
   a package build verziu 0.52.0.

5. Smoke test Admin:
   - Riadenie projektov -> Projekty -> klik na ISOVAV.
   - otvorí sa samostatná Karta projektu.
   - Upraviť projekt funguje.
   - Tím a kapacity -> Pridať člena -> uloženie funguje.
   - Kapacity -> zmena mesiaca a súčty alokácií fungujú.

6. Smoke test Projektový manažér:
   - vidí iba projekty, ku ktorým je priradený ako projektový manažér.
   - môže spravovať členov, úlohy, financovanie, míľniky a väzby len svojich projektov.

7. Smoke test Člen projektu:
   - vidí iba projekty, kde je zaradený.
   - Karta projektu je read-only okrem jeho existujúcich pridelených úloh podľa pravidiel v0.51.0.
   - Kapacity zobrazujú iba jeho vlastné projektové alokácie.

Poznámka:
- Edge Function invite-user sa vo v0.52.0 nemení. Ak je nasadená z v0.51.0, nere-deployuj ju.
