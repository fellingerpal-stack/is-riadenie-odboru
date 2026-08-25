IS RIADENIE ODBORU v0.53.0
PROJECT MEMBERSHIP & CAPACITY GOVERNANCE

VÝCHODISKOVÝ STAV
- v0.52.0 je nasadená a funkčná.
- v0.51.0 a v0.52.0 projektové SQL migrácie už musia byť v Supabase.

PORADIE NASADENIA
1. Supabase SQL Editor:
   spusti supabase/migration_project_membership_v053.sql

2. Na konci migrácie skontroluj:
   membership_identity_ready = true
   project_read_scope_ready = true
   project_manage_scope_ready = true
   member_uuid_trigger_ready = true

   active_members_without_user_id = ideálne 0.
   Ak je > 0, nejde automaticky o chybu. Znamená to, že niektoré staré textové členstvo nemalo jednoznačnú zhodu s aktívnym profilom. Admin ho otvorí v Riadenie projektov -> Zaradenia a vyberie konkrétneho používateľa.

3. Voliteľná diagnostika po migrácii:
   spusti supabase/test_project_membership_v053.sql
   a skontroluj Pál/Fellinger záznam a user_id.

4. Nahraj obsah IS_Riadenie_odboru_v0.53.0_FULL.zip do rootu GitHub repozitára.

5. Vercel musí v logu ukázať:
   [v0.53.0 prebuild] legacy cleanup complete
   [v0.53.0 verify] OK
   a package build verziu 0.53.0.

SMOKE TEST – ADMIN
- Riadenie projektov -> Zaradenia.
- pri Pálovi/Fellingerovi má byť Väzba účtu = Prepojené.
- jeho projekt CdU musí byť v zozname zaradení s rolou Tester.
- Admin môže zaradenie upraviť a vybrať konkrétneho používateľa zo zoznamu.

SMOKE TEST – ČLEN PROJEKTU
- prihlás Pála s aplikačnou rolou Člen projektu.
- musí vidieť CdU, ak má aktívne členstvo v CdU, bez ohľadu na to, že projektová rola je Tester.
- vidí iba svoje projekty.
- Kapacity zobrazia iba jeho vlastné projektové alokácie.

SMOKE TEST – PROJEKTOVÝ MANAŽÉR
- projekty, ktoré riadi ako PM: plná projektová editácia.
- projekt, kde je iba Tester/Analytik/člen: projekt vidí, ale karta je read-only pre riadiace zmeny.

SYNCHRONIZÁCIA
- v Riadení projektov musí horný aj spodný indikátor hovoriť o projektoch.
- po úspešnom načítaní: Projekty synchronizované.
- text DB bez dát sa v projektovom module už nemá zobrazovať len kvôli chýbajúcemu globálnemu snapshotu.

EDGE FUNCTION
- invite-user sa vo v0.53.0 nemení. Nere-deployuj ju.
