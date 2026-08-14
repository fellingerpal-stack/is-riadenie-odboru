# ServiceDesk CVTI SR – prevádzkový model v0.44.0

## Role

| Rola | Tickety | Práca s ticketom | Konfigurácia |
|---|---|---|---|
| employee | iba vlastné | verejný komentár, príloha, sledovanie | nie |
| viewer | iba vlastné, read-only | nie | nie |
| resolver | členské fronty + priamo pridelené | plná operatívna práca | nie |
| manager | všetky | plná operatívna práca | skupiny, členstvo, routing, SLA |
| admin | všetky | plná operatívna práca | plná konfigurácia |

## Odporúčaný model front

- **ServiceDesk L1** – fallback a prvotné triedenie.
- **Prevádzka IT** – bežná prevádzka a všeobecné operatívne zásahy.
- **Tlačové služby** – tlačiarne, skenery, tonery.
- **Infraštruktúra** – servery, virtualizácia, storage, DC, backup.
- **Sieť** – LAN/WAN/Wi-Fi/VPN.
- **Koncové zariadenia** – PC, notebooky, monitory a periférie.
- **IAM / Prístupy** – účty, heslá a oprávnenia.
- **Rozvoj IS** – aplikácie, zmeny a rozvoj.
- **KOMIS** – CRZP/ANTIPLAG, CREPČ, CREUČ, SK CRIS, SVD, SCIDAP, PRIMO a súvisiace centrálne registre.

## Routing princíp

Routing je deterministický: pravidlá sa vyhodnocujú podľa `sortOrder` a vyhrá prvé aktívne pravidlo, ktoré zodpovedá zadaným podmienkam. Server routing opakuje nezávisle od klienta, preto employee nemôže podvrhnúť cieľovú skupinu.

## Oprávnenia resolvera

Členstvo v skupine nie je iba vizuálny filter. DB reader aj write RPC kontrolujú členstvo skupiny. Resolver mimo skupiny nemôže načítať ani modifikovať jej ticket, pokiaľ mu ticket nie je priamo pridelený.

## Bezpečnosť employee komunikácie

Interné poznámky a interné komentáre sú oddelené od verejnej komunikácie. Employee reader ich odfiltruje na serveri. Employee update existujúceho ticketu je serverom obmedzený na komunikáciu a prílohy a nevie prepísať operatívne polia.

## Odporúčaný rollout

1. Najprv vytvoriť/overiť skupiny.
2. Priradiť resolverov do skupín.
3. Nastaviť routing.
4. Otestovať 2–3 employee účty a 2 resolver účty.
5. Až potom komunikovať ServiceDesk ako hlavný vstup pre zamestnancov.
6. Po 1–2 týždňoch vyhodnotiť kategórie a routing podľa reálnych ticketov.
