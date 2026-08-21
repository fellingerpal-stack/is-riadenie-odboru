# Microsoft Entra ID SSO – technický model v0.49.0

## Tok prihlásenia
1. Používateľ klikne **Prihlásiť cez Microsoft**.
2. React/Supabase klient spustí `signInWithOAuth({ provider: 'azure', options: { scopes: 'email' } })`.
3. Supabase presmeruje používateľa na Microsoft Entra tenant nastavený v Azure provider konfigurácii.
4. Microsoft po úspešnom prihlásení vracia odpoveď na Supabase callback `https://<project-ref>.supabase.co/auth/v1/callback`.
5. Supabase dokončí OAuth/PKCE flow a presmeruje používateľa na povolenú URL aplikácie.
6. Pri prvom novom Auth účte DB trigger vytvorí `public.profiles`.
7. Azure používateľ dostane rolu `employee` a nulové interné scope.
8. Aplikácia podľa roly otvorí ServiceDesk-only portál.

## Čo zostáva v Supabase
Supabase zostáva session/auth brokerom aplikácie. React nedostáva ani neukladá Microsoft client secret. Secret je uložený iba v Supabase Auth provider konfigurácii.

## Čo sa nemení
Existujúce email/password kontá zostávajú funkčné. Admin si môže ponechať heslový účet ako núdzový prístup počas testovania SSO.

## Neskoršia fáza – Microsoft Graph
Ak bude potrebné automaticky prenášať útvar, pracovnú pozíciu alebo Entra skupiny a mapovať ich na resolver tímy, bude potrebná samostatná Graph integrácia a schválené Graph permissions. v0.49.0 Graph nepotrebuje.
