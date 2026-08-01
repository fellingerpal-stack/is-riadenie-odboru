# Nastavenie Supabase – IS Riadenie odboru v0.2

## 1. Vytvorenie projektu

V Supabase vytvorte nový projekt určený pre toto prostredie. Pre test a produkciu odporúčame samostatné projekty.

## 2. Databázová schéma

V Supabase otvorte **SQL Editor**, vložte celý obsah súboru:

```text
supabase/schema_v02.sql
```

a spustite ho.

Skript vytvorí:

- organizácie,
- používateľské profily a aplikačné roly,
- verzované snapshoty aplikácie,
- Row Level Security politiky,
- funkciu `save_app_snapshot` pre bezpečné ukladanie.

## 3. Prvý administrátor

V **Authentication > Users** vytvorte prvého používateľa. Následne v súbore:

```text
supabase/bootstrap_first_admin.sql
```

nahraďte `SEM_DOPLNTE_EMAIL@cvtisr.sk` skutočným e-mailom a skript spustite v SQL Editore.

## 4. URL a kľúč klienta

V Supabase otvorte nastavenia projektu/API a skopírujte:

- Project URL,
- anon key alebo publishable key určený pre klienta.

V koreňovom priečinku aplikácie vytvorte `.env`:

```text
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=CLIENT_KEY
VITE_APP_URL=https://VAS-PROJEKT.vercel.app
```

Service role alebo secret key nesmie byť v klientskom `.env`.

## 5. Auth URL Configuration

V **Authentication > URL Configuration** nastavte:

- Site URL: URL aplikácie na Verceli,
- Redirect URLs: pridajte produkčnú URL a prípadne StackBlitz/local URL používanú na testovanie.

Aplikácia používa návrat na:

```text
https://VAS-PROJEKT.vercel.app/?reset=1
```

## 6. Edge Function pre pozývanie používateľov

Nasadiť treba funkciu:

```text
supabase/functions/invite-user/index.ts
```

Pri použití Supabase CLI:

```bash
supabase functions deploy invite-user
supabase secrets set APP_URL=https://VAS-PROJEKT.vercel.app
```

Hosted Edge Functions majú projektové Supabase secrets dostupné serverovo. Service role kľúč zostáva iba vo funkcii/serverovom prostredí.

## 7. Vercel environment variables

Vo Verceli otvorte **Project Settings > Environment Variables** a pridajte:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_URL
```

Nastavte ich minimálne pre Production, podľa potreby aj Preview a Development. Potom spustite nový deployment.

## 8. Prvý test

1. Otvorte aplikáciu a prihláste sa prvým admin účtom.
2. Skontrolujte, že sa v menu zobrazí **Používatelia**.
3. V hornej lište kliknite na uloženie do databázy.
4. V Supabase Table Editor overte nový riadok v `app_snapshots`.
5. Upravte jeden údaj, znova ho uložte a overte zvýšenie čísla verzie.
6. Otestujte účet s rolou `viewer` – nesmie mať možnosť editovať ani ukladať.

## 9. Bezpečnostné pravidlo

Do prehliadača patria iba verejné klientské údaje projektu. Secret/service role kľúč obchádza RLS a musí zostať výhradne v bezpečnom serverovom prostredí alebo Supabase Edge Function.
