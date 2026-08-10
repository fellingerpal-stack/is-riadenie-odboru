# Log Management 0.34 – metodika

## Čo je auditná udalosť
Auditná udalosť je nemenný záznam úspešnej administrátorskej alebo dátovej operácie. Odpovedá na štyri základné otázky:

1. **Kto** – autentifikovaný používateľ / systém.
2. **Kedy** – serverový čas udalosti.
3. **Kde** – modul, scope a typ objektu.
4. **Čo** – akcia, identifikácia objektu a delta zmeny.

## Dve vrstvy auditu
### Snapshot audit
Používa sa pre registre uložené v spoločnom aplikačnom snapshote. Delta sa počíta až nad výsledným serverovým payloadom po uplatnení scope a rolových pravidiel.

### Row audit
Používa sa pre moduly so samostatnými Supabase tabuľkami. Trigger vzniká po úspešnom INSERT/UPDATE/DELETE a používateľský actor sa berie zo serverovej auth session.

## Nemennosť
Aplikácia dostáva iba SELECT oprávnenie na app_audit_log. Priamy klientsky update alebo delete auditu nie je povolený.

## Citlivé údaje
Audit nie je určený na ukladanie hesiel, tokenov ani binárnych príloh. Pomocné diff funkcie vylučujú známe citlivé/objemné polia a detail má veľkostné limity.

## Retencia
v0.34.0 automaticky nemaže auditné udalosti. Retenčnú politiku odporúčame nastaviť až po dohode s bezpečnosťou / internou správou registratúry, pretože audit môže mať organizačnú alebo compliance hodnotu.
