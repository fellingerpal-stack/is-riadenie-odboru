# ServiceDesk Operations v0.45

## Prevádzkový model

### SLA
DB je zdroj pravdy pre SLA deadline. Frontend môže zobraziť okamžitý preview, ale uložený ticket dostane termín zo serverového business-calendar engine.

Predvolený pracovný kalendár skupiny je Po–Pi 08:00–16:00, `Europe/Bratislava`. Každá skupina ho môže mať iný.

### Calendar exceptions
Výnimka má dátum, typ pracovný/nepracovný, voliteľný čas od-do a popis. Typické použitie: sviatky, celoorganizačné voľno alebo mimoriadna pracovná sobota.

### Eskalácie
Warning sa riadi `slaWarningMinutes`. Breach vznikne po prekročení pending first-response alebo resolution SLA. Ticket v stave `Čaká na používateľa` sa z automatickej eskalácie vynecháva.

### Notifikácie
Notification Center je osobný. E-mail je sekundárny delivery channel a používa outbox pattern, takže chyba mail gateway nemení stav ticketu.

### Odporúčaná produkčná prevádzka
- SLA escalation scheduler: 5–15 min.
- Email outbox worker: 1–5 min.
- raz mesačne skontrolovať SLA výnimky na nasledujúce obdobie,
- vedúci skupín kontrolujú SLA health/frontu denne.
