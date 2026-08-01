# IS Riadenie odboru – release 0.10.0

## Prihlásenie a účty
- Supabase Auth prihlasovacie okno, obnova hesla a nastavenie nového hesla.
- Zobrazenie/skrytie hesla a samostatné odhlásenie v hornej lište.
- Automatické obnovenie relácie a kontrola aktívneho profilu.
- Zápis posledného prihlásenia používateľa.

## Používatelia
- Funkčná obrazovka Používatelia aj v lokálnom demo režime.
- Meno, e-mail, útvar, pozícia, telefón, rola, stav, posledné prihlásenie a dátum pozvania.
- Pozvanie používateľa, úprava profilu, aktivácia/deaktivácia a odoslanie obnovy hesla.
- Vyhľadávanie a filtre podľa roly a stavu.
- Audit administrátorských zmien.

## Roly
- Administrátor
- Riaditeľ / manažér
- Riešiteľ
- Zamestnanec
- Čitateľ

Navigácia a editácia modulov sa prispôsobujú aplikačnej role. Bezpečnostné pravidlá sú pripravené aj v Supabase RLS.

## Synchronizácia
- Pri Supabase režime sa zmeny po krátkom odklade automaticky ukladajú.
- Manuálne tlačidlo „Uložiť do databázy“ zostáva ako záložná možnosť.

## Databáza
Spustite po pôvodnej schéme:
- `supabase/schema_auth_users_v010.sql`
- `supabase/bootstrap_first_admin.sql`

Aktualizujte a nasaďte Edge Function:
- `supabase/functions/invite-user/index.ts`
