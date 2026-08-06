# Release 0.14.0 – Portál odborov ORIS a OIT

## Hlavná zmena
Aplikácia je rozdelená na dva samostatné pracovné bloky:

- **ORIS – Odbor riadenia informačných systémov**: zachováva existujúce moduly a dáta verzie 0.13.2.
- **OIT – Odbor informačných technológií**: nový manažérsky a prevádzkový pohľad nad RACI OIT, dátovým centrom, sieťovou architektúrou, systémami a rizikami.

Po prihlásení sa otvorí nový **Hlavný panel odborov**, z ktorého sa vstupuje do ORIS alebo OIT. Každý blok má vlastné menu, názov pracovného priestoru a navigáciu.

## Nové OIT moduly
1. **Prehľad OIT** – päť samostatných aplikačných kariet.
2. **RACI OIT** – 79 procesov, 8 oblastí, 13 pracovníkov, matica, filtre, medzery a koncentrácia zodpovedností.
3. **Dátové centrum** – kapacity reportu, rack inventár R1–R5 a podporné non-IT technológie.
4. **Sieťová architektúra** – hlavná topológia a OOB topológia so zväčšeným náhľadom.
5. **Systémy a projekty** – register projektov a systémov uvedených v prevádzkovom reporte.
6. **Prevádzka a riziká** – životný cyklus zariadení, stará aktívna technika, plánované vyradenie a kontrolné kroky.

## Zdrojové podklady
- RACI_OIT.xlsx
- DC.xlsx
- ReportProjekt-Vyuzivanie datoveho centra 2023v1.2.docx
- nonIT_zoznam.rtf
- topologia.png
- OOB.png

Údaje, ktoré v podkladoch neboli potvrdené, zostávajú označené ako neurčené alebo sa používajú iba ako pracovné manažérske členenie.

## Bezpečnosť a oprávnenia
- Používatelia a Roadmapa/nastavenia zostávajú viditeľné iba administrátorovi.
- Priamy vstup na zakázanú trasu je blokovaný existujúcim rolovým mechanizmom.
- OIT register je v tomto release iba na čítanie.
- Sieťové topológie sa zámerne neukladajú do verejného priečinka aplikácie; načítavajú sa cez časovo obmedzené odkazy z privátneho Supabase Storage.

## Technické poznámky
- Verzia aplikácie: 0.14.0
- SQL skript vytvára iba privátny Storage bucket `oit-documents` a jeho RLS pravidlá; nemení aplikačné tabuľky.
- Existujúce ORIS dáta a funkcie zostávajú zachované.
