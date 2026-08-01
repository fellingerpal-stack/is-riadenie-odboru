# IS Riadenie odboru – release 0.5.0

## ServiceDesk

- nové čísla ticketov `INC-YYYY-0001` a `REQ-YYYY-0001`,
- fronty riešiteľov a filtrovanie podľa fronty,
- kategórie a podkategórie,
- SLA prvej reakcie a vyriešenia podľa priority,
- upozornenia na prekročené a rizikové SLA,
- osobný pohľad **Moje tickety**,
- prílohy v prototype do 750 kB na súbor, maximálne 5 príloh,
- komentáre, interné poznámky a auditná história,
- export aktuálne filtrovaných ticketov do CSV pre Excel,
- reporty podľa stavu, služby, riešiteľa a veku ticketu,
- nastaviteľné SLA politiky a aktívne fronty,
- pripravený SQL návrh samostatných Supabase tabuliek.

## Stabilizácia

- migrácia existujúcich ticketov z verzie 0.4,
- zachovanie existujúcich lokálnych aj cloudových dát,
- opravený vysvetľovací panel RACI, aby sa texty neprekrývali.

## Poznámka

E-mailové notifikácie a reálne ukladanie príloh do Supabase Storage vyžadujú Edge Function, odosielaciu doménu a nasadenie samostatnej ServiceDesk schémy. V tejto verzii sú aktívne upozornenia priamo v aplikácii.
