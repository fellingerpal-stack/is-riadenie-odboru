# v0.49.0 – Microsoft Entra ID SSO & Auto-Provisioning

## Cieľ
Umožniť zamestnancom CVTI SR prihlasovať sa do IS Riadenie odboru existujúcim firemným Microsoft účtom z Microsoft Entra ID (Azure AD), bez vytvárania ďalšieho hesla v aplikácii.

## Nové funkcie
- voliteľné tlačidlo **Prihlásiť cez Microsoft** na login obrazovke,
- Supabase OAuth provider `azure` cez PKCE,
- vyžiadanie `email` scope podľa požiadavky Supabase Azure Auth,
- návrat po SSO na URL aplikácie a automatické načítanie Supabase session,
- automatické vytvorenie `public.profiles` pri prvom novom Entra prihlásení,
- nový Entra používateľ dostane vždy rolu **employee / Používateľ**,
- employee dostane serverovo explicitné scope `oit=none`, `oris=none`, `shared=none`,
- existujúce admin/manager/resolver účty a heslové prihlasovanie zostávajú zachované,
- SSO sa zapína až environment premennou `VITE_MICROSOFT_SSO_ENABLED=true`.

## Bezpečnostný princíp
- hranicou organizácie je tenant-specific Azure Tenant URL nastavená v Supabase Auth, napr. `https://login.microsoftonline.com/<TENANT_ID>`,
- OAuth používateľ si nevie z Microsoft metadata prideliť `resolver`, `manager` ani `admin`; Azure provider je v DB triggeri vždy provisionovaný ako `employee`,
- zvýšenie roly sa robí až administrátorom v IAM aplikácie,
- klasické heslové prihlásenie ostáva ako fallback počas pilotu.

## Databáza
Spustiť `supabase/migration_entra_sso_v049.sql` pred zapnutím Microsoft providera. Migrácia upraví `default_access_scopes()` a `handle_new_auth_user()` a obnoví trigger `on_auth_user_created_create_profile`.

## Dôležité obmedzenie v0.49.0
Tento release rieši **SSO + prvotné vytvorenie profilu**. Nesynchronizuje zatiaľ Entra skupiny, oddelenie, pracovnú pozíciu ani automatické resolver skupiny cez Microsoft Graph. To je vhodný ďalší krok až po úspešnom SSO pilote.
