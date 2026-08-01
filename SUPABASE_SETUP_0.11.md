# Supabase nastavenie – IS Riadenie odboru 0.11

Release 0.11 používa Supabase Auth, profily používateľov, aplikačné roly, RLS a spoločný cloudový dátový snapshot. Bez premenných môže aplikácia ďalej fungovať v lokálnom demo režime. Po nastavení `VITE_APP_MODE=cloud` sa bez platného Supabase pripojenia aplikácia nespustí do lokálneho režimu omylom, ale zobrazí konfiguračnú kontrolu.

## 1. Vytvorenie projektu

V Supabase vytvorte projekt pre IS Riadenie odboru. Zapíšte si:

- Project URL,
- Publishable key alebo pôvodný anon key,
- service-role secret – patrí iba do Edge Function, nikdy nie do React aplikácie.

## 2. Databáza, RLS a funkcie

V Supabase otvorte SQL Editor a spustite celý súbor:

```text
supabase/setup_v011.sql
```

Skript vytvorí alebo bezpečne aktualizuje:

- organizáciu CVTI SR,
- používateľské profily a roly,
- verzie spoločného dátového snapshotu,
- audit administrácie používateľov,
- automatické vytvorenie profilu pri novom Auth používateľovi,
- RLS pravidlá a bezpečné RPC funkcie.

## 3. Prvý administrátor

1. V **Authentication → Users** vytvorte prvého používateľa s pracovným e-mailom a heslom.
2. Otvorte:

```text
supabase/bootstrap_first_admin_v011.sql
```

3. Nahraďte oba výskyty:

```text
SEM_DOPLNTE_EMAIL@cvtisr.sk
```

4. Skript spustite v SQL Editore.
5. Výsledný riadok musí mať rolu `admin` a stav `true`.

## 4. Premenné v StackBlitz

V koreňovom `.env` nastavte:

```env
VITE_APP_MODE=cloud
VITE_SUPABASE_URL=https://VAS-PROJEKT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=VEREJNY_PUBLISHABLE_KLUC
VITE_APP_URL=https://AKTUALNA-ADRESA-APLIKACIE
```

Pri staršom projekte možno namiesto publishable key použiť:

```env
VITE_SUPABASE_ANON_KEY=VEREJNY_ANON_KLUC
```

Do klientskych premenných nikdy nevkladajte service-role secret.

Po zmene `.env` zastavte a znova spustite Vite:

```bash
npm run dev
```

## 5. URL pre prihlásenie a obnovu hesla

V Supabase Authentication nastavte:

- Site URL na aktuálnu Vercel alebo StackBlitz URL,
- povolenú Redirect URL pre tú istú adresu,
- pri neskoršom prechode na produkčnú doménu pridajte aj produkčnú URL.

`VITE_APP_URL` musí zodpovedať povolenej URL, inak sa používateľ po pozvaní alebo obnove hesla nevráti správne do aplikácie.

## 6. Edge Function pre pozývanie účtov

Nasaďte funkciu:

```text
supabase/functions/invite-user/index.ts
```

Funkcia potrebuje secrets:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
APP_URL
```

`APP_URL` je verejná URL aplikácie. Pozvanie môže spustiť iba prihlásený používateľ s rolou `admin`; Edge Function to kontroluje aj na serverovej strane.

Ak Edge Function ešte nie je nasadená, účty možno dočasne vytvárať cez Supabase Authentication a následne im upraviť profil v tabuľke `profiles`.

## 7. Prvé prihlásenie a prenos dát

Po reštarte aplikácie:

1. zobrazí sa prihlasovacia obrazovka,
2. prihláste prvého administrátora,
3. otvorí sa cloudový režim,
4. ak databáza ešte nemá snapshot, administrátor alebo manažér môže uložiť aktuálny stav,
5. ďalší používatelia už načítajú rovnaké údaje organizácie.

## 8. Kontrola

Overte:

- prihlásenie a odhlásenie,
- zmenu a obnovu hesla,
- obrazovku Používatelia,
- pozvanie testovacieho účtu,
- zmenu roly a deaktiváciu účtu,
- načítanie a uloženie dát,
- rozdielne menu pre roly administrátor, manažér, riešiteľ, zamestnanec a čitateľ.

## 9. Vercel

Vo Vercel Environment Variables nastavte rovnaké `VITE_*` premenné. Po ich pridaní vytvorte nový deployment. Pre produkciu používajte:

```env
VITE_APP_MODE=cloud
```

Tým sa zabráni tomu, aby produkčná aplikácia pri chýbajúcej premennej nepozorovane prepla na lokálne dáta.
