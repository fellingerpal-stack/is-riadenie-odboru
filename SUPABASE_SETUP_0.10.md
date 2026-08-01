# Supabase nastavenie pre release 0.10

## 1. Databázová schéma
V Supabase SQL Editore spustite v tomto poradí:

1. `supabase/schema_v02.sql` – iba ak ešte nebola spustená.
2. `supabase/schema_auth_users_v010.sql`.
3. V Authentication > Users vytvorte prvého používateľa.
4. V `supabase/bootstrap_first_admin.sql` nahraďte `SEM_DOPLNTE_EMAIL@cvtisr.sk` jeho e-mailom a skript spustite.

## 2. Edge Function pre pozvánky
Nasaďte obsah:

`supabase/functions/invite-user/index.ts`

Potrebné secrets funkcie:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`

`SUPABASE_SERVICE_ROLE_KEY` patrí výhradne do secrets Edge Function. Nikdy ho nevkladajte do React aplikácie, GitHubu ani Vercel klientskych premenných.

## 3. Premenné aplikácie
V StackBlitz `.env` a vo Vercel Environment Variables nastavte:

```env
VITE_SUPABASE_URL=https://VAS-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=VEREJNY_ANON_ALEBO_PUBLISHABLE_KEY
VITE_APP_URL=https://VASA-DOMENA.vercel.app
```

Po pridaní premenných reštartujte Vite alebo vytvorte nový Vercel deployment.

## 4. Auth URL
V Supabase Authentication > URL Configuration nastavte:
- Site URL na produkčnú Vercel doménu.
- Redirect URLs pre produkčnú doménu a StackBlitz preview URL.

## 5. Overenie
Po otvorení aplikácie sa musí zobraziť prihlasovacie okno. Po prihlásení administrátora:
- hore sa zobrazí „Supabase režim“,
- obrazovka Používatelia načíta účty,
- pozvánka odošle e-mail,
- zmena roly sa uloží,
- audit zaznamená administrátorskú operáciu.
