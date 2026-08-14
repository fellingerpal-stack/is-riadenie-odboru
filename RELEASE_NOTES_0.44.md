# Release v0.44.0 – ServiceDesk Foundation

## Cieľ

Release vyčleňuje Helpdesk/ServiceDesk z pracovného priestoru ORIS a mení ho na samostatný produkčný modul **ServiceDesk CVTI SR** pre celú organizáciu. Zamestnanec dostáva jednoduchý self-service, riešiteľ pracuje iba s frontami, ku ktorým patrí, a admin/manager spravuje skupiny, členstvo, routing a SLA.

## Samostatný ServiceDesk

- nová samostatná route `#/serviceDesk`,
- vlastná položka v hlavnej navigácii Portálu odborov,
- výrazná dlaždica ServiceDesk na hlavnom paneli,
- pôvodná route `#/helpdesk` zostáva ako kompatibilný alias,
- ServiceDesk už nie je viazaný iba na scope ORIS.

## Zamestnanecký self-service

Role `employee` môže:

- nahlásiť incident,
- vytvoriť požiadavku,
- vidieť iba vlastné tickety,
- sledovať stav a SLA,
- pridávať verejné komentáre,
- pridávať prílohy,
- vidieť verejné riešenie ticketu.

Zamestnanec nemôže:

- meniť stav, prioritu, skupinu ani riešiteľa,
- zapisovať interné poznámky,
- čítať interné komentáre,
- meniť cudzie tickety,
- mazať ticket,
- upravovať routing, skupiny ani SLA.

Formulár pre zamestnanca je zjednodušený. Riešiteľskú skupinu, prípadnú prioritu a SLA určí routing a serverová databázová logika.

## Riešiteľská konzola

Role `resolver` vidí iba:

- tickety v riešiteľských skupinách, ktorých je členom,
- tickety priamo pridelené na jeho meno.

Riešiteľ môže meniť operatívne polia ticketu, komunikovať interne, priraďovať riešiteľa, meniť stav a vytvoriť prepojenú úlohu. Handoff do inej skupiny je podporovaný.

Admin a manager majú organizáciou široký pohľad.

## Riešiteľské skupiny

Release pridáva produkčný konfiguračný pohľad **Skupiny a routing**. Každá skupina eviduje:

- názov a kód,
- popis,
- členov,
- vedúceho,
- zástupcu,
- pracovný čas,
- predvolené SLA,
- e-mail skupiny,
- stav aktívna/neaktívna.

Po migrácii sa bezpečne doplnia odporúčané skupiny bez členov:

1. ServiceDesk L1
2. Prevádzka IT
3. Tlačové služby
4. Infraštruktúra
5. Sieť
6. Koncové zariadenia
7. IAM / Prístupy
8. Rozvoj IS
9. KOMIS

Existujúce historické skupiny sa nemažú ani neprepisujú.

## Matica členstva

Admin/manager dostáva maticu `zamestnanec × riešiteľská skupina`. Zaškrtnutie okamžite zmení členstvo skupiny a po synchronizácii aj databázové oprávnenie resolvera na príslušnú frontu.

## Routing matica

Nová tabuľka `service_routing_rules` podporuje pravidlá podľa:

- typu ticketu,
- kategórie,
- podkategórie,
- služby/systému,
- cieľovej skupiny,
- voliteľnej priority,
- poradia pravidla,
- aktívneho stavu.

Prvé zhodné aktívne pravidlo vyhrá. Ak sa pravidlo nenájde, server sa pokúsi použiť aktívnu skupinu `Q-SD-L1`.

Predpripravený routing smeruje napríklad:

- KOMIS a centrálne registre → KOMIS,
- tlač a skenovanie → Tlačové služby,
- prístupy → IAM / Prístupy,
- koncové zariadenia → Koncové zariadenia,
- infraštruktúra / sieť → Sieť alebo Infraštruktúra,
- Rozvoj IS → Rozvoj IS,
- ostatné → ServiceDesk L1.

## SLA

- SLA ostáva uložené v samostatnom DB registri,
- skupina môže mať vlastné predvolené SLA,
- ak skupinové SLA nie je nastavené, použije sa SLA podľa priority,
- SLA termíny nového zamestnaneckého ticketu vypočítava server, nie klient.

V tomto release sú SLA ciele naďalej počítané v kalendárnych hodinách. Pracovný čas skupiny sa eviduje a je pripravený pre neskorší business-calendar engine.

## Produkčné bezpečnostné spevnenie

`migration_servicedesk_v044.sql` mení ServiceDesk na serverom vynucovaný model:

- zamestnanec číta iba vlastné tickety,
- resolver číta iba svoje skupiny alebo priamo pridelené tickety,
- interná poznámka a interné komentáre sa zamestnancovi nevracajú,
- verejné riešenie je pre žiadateľa viditeľné,
- pri existujúcom tickete môže zamestnanec cez RPC iba pridávať verejnú komunikáciu a prílohy,
- staré komentáre sú pre zamestnanca append-only a nemožno ich zmazať prepisom payloadu,
- existujúce prílohy zamestnanec nevie odstrániť serverovým prepisom,
- priamy `INSERT/UPDATE/DELETE` na ServiceDesk tabuľkách je pre `authenticated` odobratý,
- zápis prebieha cez kontrolované SECURITY DEFINER RPC,
- PUBLIC execute na kritických RPC je odobratý,
- server validuje počet/veľkosť príloh a základné limity textov,
- generovanie nového ticket ID už nepoužíva sekvenciu odvodenú z používateľovi viditeľných ticketov.

## Databázová zmena

Tento release **vyžaduje SQL migráciu**:

`supabase/migration_servicedesk_v044.sql`

Migrácia predpokladá, že pôvodná Helpdesk DB migrácia v0.12.1 už existuje. Obsahuje preflight a pri chýbajúcom základe sa ukončí s čitateľnou chybou.

## Nie je súčasťou v0.44.0

- e-mailové notifikácie,
- inbound ticket cez e-mail,
- pracovný kalendár/SLA s pracovnými dňami a sviatkami,
- externý zákaznícky portál bez autentifikácie,
- automatické eskalačné joby.

Tieto veci sú vhodné ako ďalšia produkčná fáza po stabilizácii front, routingu a oprávnení.
