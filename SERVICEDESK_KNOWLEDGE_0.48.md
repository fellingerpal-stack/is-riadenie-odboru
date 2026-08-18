# ServiceDesk Knowledge Base & Known Errors – v0.48

## Používateľský tok
1. Zamestnanec otvorí ServiceDesk → Katalóg služieb.
2. Vyberie službu a začne vypĺňať požiadavku/incident.
3. ServiceDesk z publikovanej KB vyhodnotí relevantné riešenia podľa:
   - katalogovej položky,
   - služby/systému,
   - kategórie a podkategórie,
   - kľúčových slov a textu požiadavky.
4. Nad formulárom sa zobrazí blok „Možno pomôže ešte pred odoslaním“.
5. Ak návod pomôže, používateľ nemusí ticket vytvoriť.

## Životný cyklus článku
- Resolver: vytvorí **Návrh** ručne alebo z vyriešeného ticketu.
- Admin/manager: skontroluje a zmení stav na **Publikované**.
- Admin/manager: môže označiť článok ako **Odporúčané**.
- Admin/manager: starý článok **Archivuje**.

## Known Error
Known Error môže obsahovať:
- príznaky,
- známu príčinu,
- workaround/riešenie,
- kompletný postup,
- väzbu na systém/katalógovú službu,
- zdrojový ticket.

## Governance
Resolver publikovaný obsah priamo neprepisuje. Ak treba zmenu publikovaného článku, upravuje ho admin/manager. Tým sa zabráni nechcenému stiahnutiu alebo zmene schváleného postupu.

## Metriky
Každý publikovaný článok eviduje:
- počet zobrazení,
- počet hodnotení „Pomohlo“,
- počet hodnotení „Nepomohlo“.

Feedback je per-user, takže opakované hlasovanie toho istého účtu aktualizuje existujúcu voľbu namiesto nekontrolovaného navyšovania počítadla.
