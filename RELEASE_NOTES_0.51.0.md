# Release v0.51.0 – Riadenie projektov

## Zmena konceptu

Release **v0.51.0 je priamy upgrade zo stabilnej v0.49.0**. Nenasadená vetva v0.50.0 sa nepoužíva ani nevyžaduje.

ServiceDesk zostáva v aplikácii aj databáze zachovaný, ale v tejto fáze je v UI dostupný **iba administrátorovi**. Žiadne ServiceDesk dáta, fronty, routing, SLA ani Knowledge Base sa nemažú.

## Nový modul Riadenie projektov

Vzniká samostatný pracovný priestor **Riadenie projektov**, ktorý používa existujúci register `work_projects` / `work_tasks` ako základ a rozširuje ho o projektové riadenie naprieč aplikáciou.

Projekt eviduje najmä:

- stav, prioritu, health a percento realizácie,
- životný cyklus / fázu: Idea → Iniciácia → Analýza → Príprava → Realizácia → Testovanie → Pilot → Go-live → Stabilizácia → Prevádzka → Ukončenie,
- delivery model,
- cieľ a očakávaný výsledok,
- projektového manažéra a gestora/sponzora,
- najbližší míľnik a termín,
- rozpočet a čerpanie,
- projektové úlohy,
- projektový tím,
- zdroje financovania,
- väzby na informačné systémy, zmluvy, dodávateľov a ďalšie objekty.

## Projektové roly

Pribúdajú dve aplikačné roly:

- `project_manager` – **Projektový manažér**,
- `project_member` – **Člen projektu**.

Obe roly majú mimo modulu Riadenie projektov nulový OIT/ORIS/shared scope. Nezískavajú teda automaticky prístup do interných modulov iba preto, že pracujú na projekte.

### Projektový manažér

Projektový manažér môže:

- vidieť projektové portfólio organizácie,
- vytvárať a upravovať projekty,
- zostavovať projektový tím,
- priraďovať projektové funkcie,
- evidovať financovanie,
- vytvárať delivery míľniky a gates,
- vytvárať a prideľovať projektové úlohy,
- vytvárať väzby na existujúce registre.

### Člen projektu

Člen projektu:

- vidí iba projekty, v ktorých má aktívne členstvo,
- vidí tím, delivery, financovanie a väzby iba týchto projektov,
- môže aktualizovať stav/progress/čerpané hodiny/poznámku iba na úlohe, ktorá je pridelená jemu,
- nemôže meniť projektové portfólio, financovanie, tím ani väzby.

## Funkcia člena v projekte

Aplikačná rola `project_member` nie je totožná s funkciou človeka v konkrétnom projekte. Pri členstve je možné evidovať napríklad:

- Projektový manažér,
- Gestor,
- Analytik,
- Business analytik,
- Architekt,
- Vývojár,
- Tester,
- Bezpečnosť,
- Prevádzka,
- Financie,
- Verejné obstarávanie,
- Dodávateľ,
- Konzultant,
- Iné.

Člen má zároveň zodpovednosť, percento kapacity a časovú platnosť členstva.

## Financovanie

Projekt môže mať ľubovoľný počet zdrojov. Predpripravené typy:

- Štátny rozpočet / úloha,
- EÚ fondy,
- Plán obnovy,
- iné verejné zdroje,
- vlastné zdroje,
- externé zdroje,
- iné.

Každý zdroj eviduje program/výzvu, úlohu alebo kód, rok, rozpočet, čerpanie a percento spolufinancovania. Súhrnný projektový rozpočet a čerpanie sa dopočítavajú zo zdrojov.

## Delivery lifecycle

Nový projektový delivery pohľad obsahuje:

- fázy projektu,
- míľniky,
- rozhodovacie gates,
- vlastníka míľnika,
- termín,
- stav: Plánované / Prebieha / Splnené / Blokované / Posunuté,
- projektové úlohy a ich progress.

## Cross-module väzby

Projektový manažér dostáva cez bezpečný projektový reader iba kurátorované referencie potrebné na projektové väzby. Release využíva existujúci register informačných systémov a z neho pripravuje referencie na:

- informačné systémy,
- zmluvné čísla,
- dodávateľov.

Pre zostavenie tímu sú cez ten istý reader dostupní aktívni používatelia organizácie – meno, e-mail a útvar. Projektová rola tým nezískava všeobecný prístup do IAM modulu.

## ServiceDesk

ServiceDesk je v0.51.0 v navigácii, portáli aj renderovaní aplikácie dostupný iba pre `admin`.

- existujúce ServiceDesk dáta sa nemenia,
- databázové migrácie ServiceDesku sa nerušia,
- modul sa dá neskôr znovu publikovať bez straty dát,
- nenačítava sa pre projektové roly ani pre bežného používateľa.

## Databáza

Migrácia `supabase/migration_project_management_v051.sql`:

- pridáva nové projektové roly do profilu,
- zachováva Entra auto-provisioning ako `employee`,
- rozširuje `work_projects`,
- pridáva `project_members`, `project_funding`, `project_milestones`, `project_links`,
- pridáva scoped RLS čítanie pre projektové roly,
- pridáva bezpečný agregovaný RPC `project_portfolio_read()`,
- pridáva write RPC pre projektového manažéra/admina,
- pridáva obmedzený task update pre člena projektu,
- zapína Realtime pre nové projektové tabuľky.

## Kompatibilita

- vychádza priamo z v0.49.0,
- existujúce projekty a úlohy sa zachovávajú,
- existujúce interné roly admin/manager/resolver/viewer ostávajú zachované,
- existujúce OIT/ORIS/shared moduly sa funkčne nemenia,
- ServiceDesk dáta sa nemažú; mení sa iba jeho publikovanie v aplikácii.
