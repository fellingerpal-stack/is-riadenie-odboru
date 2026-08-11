# Management Action Center 0.36 – metodika

Management Action Center nie je nový workflow engine. Je to konsolidovaný pohľad nad už existujúcimi registrami aplikácie.

## Princíp

`SIGNÁL → DÔVOD → OWNER → TERMÍN → STAV → ZDROJ`

Zdrojový register ostáva autoritatívny. Action Center iba zjednotí otvorené položky, zoradí ich podľa významu a umožní jedným klikom prejsť na miesto, kde sa položka reálne rieši.

## Prioritizácia
1. Kritická / vysoké riziko / kritická kritickosť.
2. Prekročený termín – vždy kritické.
3. Termín do 7 dní – minimálne vysoká pozornosť.
4. Termín do 14 dní – minimálne stredná pozornosť.
5. Chýbajúci owner sa zobrazuje ako samostatný riadiaci signál.

## CMDB
CMDB položka vstupuje do Action Center najmä ak:
- nemá business/technical/assigned ownera,
- je v lifecycle „Na obnovu“,
- inventúra hlási „Nenájdené“ alebo „Nezhoda“,
- je kritická.

## Bez duplicity
Release zámerne nepridáva `management_actions` do AppState ani do databázy. Takýto duplicitný register by mohol vytvoriť rozdiel medzi stavom Action Center a stavom pôvodného objektu. Zmena sa preto vždy vykonáva v zdrojovom module.
