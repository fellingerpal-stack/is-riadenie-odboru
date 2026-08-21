IS Riadenie odboru – v0.49.0 Microsoft Entra ID SSO
===================================================

DÔLEŽITÉ
Tento release zachováva existujúce prihlasovanie e-mailom a heslom.
Microsoft tlačidlo sa nezobrazí, kým vo Verceli nenastavíte:
VITE_MICROSOFT_SSO_ENABLED=true

ODPORÚČANÉ PORADIE

A. DATABÁZA – ešte pred zapnutím Microsoft SSO
1. Supabase -> SQL Editor.
2. Spustite celý súbor:
   supabase/migration_entra_sso_v049.sql
3. Na konci musia byť TRUE:
   employee_scope_hardened
   auth_profile_function_ready
   auth_profile_trigger_ready

B. MICROSOFT ENTRA ID – App Registration
1. Entra admin center -> Microsoft Entra ID -> App registrations -> New registration.
2. Názov napr.: IS Riadenie odboru CVTI SR.
3. Supported account types: iba účty v tomto organizačnom tenantovi (Single tenant).
4. Redirect URI platforma: Web.
5. Redirect URI:
   https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   Presnú callback URL je vhodné skopírovať zo Supabase Azure provider konfigurácie.
6. Po vytvorení si odložte:
   - Application (client) ID
   - Directory (tenant) ID
7. Certificates & secrets -> New client secret.
8. Skopírujte VALUE secretu hneď po vytvorení. Secret nevkladajte do GitHubu ani do VITE_ premenných.

C. SUPABASE AUTH – Azure provider
1. Supabase -> Authentication -> Sign In / Providers -> Azure (Microsoft).
2. Enable Azure provider.
3. Client ID = Application (client) ID z Entra.
4. Client Secret = VALUE z Certificates & secrets.
5. Azure Tenant URL:
   https://login.microsoftonline.com/<TENANT_ID>
6. Uložte.

D. SUPABASE URL CONFIGURATION
1. Authentication -> URL Configuration.
2. Site URL nastavte na produkčnú aplikáciu, napr.:
   https://is-riadenie-odboru.vercel.app
3. Do Redirect URLs pridajte produkčnú URL aplikácie (minimálne presný root, ktorý používa VITE_APP_URL).

E. FRONTEND / VERCEL
1. Nahrajte FULL v0.49.0 do GitHub main.
2. Najprv môžete nechať VITE_MICROSOFT_SSO_ENABLED=false – staré prihlasovanie sa nezmení.
3. Keď sú Entra a Supabase pripravené, vo Verceli pridajte:
   VITE_MICROSOFT_SSO_ENABLED=true
4. Overte aj existujúce:
   VITE_APP_URL=https://is-riadenie-odboru.vercel.app
5. Redeploy.

PILOTNÝ TEST – ODPORÚČANÉ
1. Nezačínajte admin účtom. Použite bežný CVTI Entra účet, ktorý ešte nie je v Supabase Authentication.
2. Otvorte aplikáciu v anonymnom/incognito okne.
3. Na logine sa musí zobraziť tlačidlo „Prihlásiť cez Microsoft“.
4. Kliknite naň a prihláste sa CVTI Microsoft účtom.
5. Po návrate má používateľ skončiť v ServiceDesku.
6. V Supabase -> Authentication -> Users musí vzniknúť nový používateľ.
7. V SQL Editore overte profil:

select p.full_name, p.email, p.role, p.access_scopes, p.is_active
from public.profiles p
where lower(p.email)=lower('TESTOVANY_EMAIL@cvtisr.sk');

Očakávané:
role = employee
access_scopes = {"oit":"none","oris":"none","shared":"none"}
is_active = true

8. V aplikácii employee nesmie vidieť interné riadiace moduly, routing ani SLA administráciu. Má vidieť ServiceDesk, svoje tickety a publikovanú Knowledge Base.
9. Odhláste sa a znova skúste klasické heslové admin prihlásenie – musí naďalej fungovať.

AK SA TLAČIDLO MICROSOFT NEZOBRAZÍ
- skontrolujte VITE_MICROSOFT_SSO_ENABLED=true vo Verceli,
- po zmene environment premennej spravte nový deployment.

AK MICROSOFT HLÁSI AADSTS50011
- Redirect URI v Entra nesedí s callback URL Supabase,
- použite presne https://<project-ref>.supabase.co/auth/v1/callback.

AK SA POUŽÍVATEĽ PRIHLÁSI, ALE APP HLÁSI „Profil nie je pripravený“
- overte, že migration_entra_sso_v049.sql skončila TRUE/TRUE/TRUE,
- overte trigger on_auth_user_created_create_profile,
- skontrolujte public.profiles podľa e-mailu.

ROLLBACK
- nastavte vo Verceli VITE_MICROSOFT_SSO_ENABLED=false a redeploy; heslové prihlásenie ostane funkčné,
- Azure provider môžete následne vypnúť v Supabase,
- DB zmeny nie je potrebné rollbackovať; employee scope hardening je bezpečnejšie nastavenie.
