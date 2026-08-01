# IS Riadenie odboru – release 0.11.0

## Supabase produkčný základ

- podpora nového publishable key aj pôvodného anon key,
- režimy `auto`, `local` a `cloud`,
- konfiguračná obrazovka pri chýbajúcich cloudových premenných,
- stabilnejšie načítanie profilu po vytvorení alebo pozvaní účtu,
- spracovanie udalosti obnovy hesla,
- zrozumiteľnejšie prihlasovacie chyby,
- bezpečné odhlásenie deaktivovaného účtu,
- idempotentný all-in-one SQL skript,
- aktualizovaná Edge Function na pozývanie používateľov,
- jeden postup pre StackBlitz a Vercel,
- zachované moduly RACI, projekty, ServiceDesk, Change, Problem, IAM a CMDB.

## Kompatibilita

- existujúce lokálne dáta sa zachovajú,
- existujúci Supabase snapshot zostáva kompatibilný,
- databázový skript možno spustiť aj nad schémou z release 0.10,
- release zahŕňa RACI opravu 0.10B a responzívne tabuľky 0.10A.
